import mongoose from 'mongoose';
import { logger } from '../config/logger.js';
import {
  InventoryItem,
  StockMovement,
  PurchaseOrder,
  GoodsReceipt,
  YarnBatch,
  Order,
  PurchaseRequest,
  AuditLog,
} from '../models/index.js';
import { withTransaction } from './transaction.service.js';

/**
 * Get comprehensive stock levels with on-hand, reserved, available, incoming breakdown,
 * and low-stock / reorder indicators.
 */
export async function getInventoryStockLevels({ search, category, lowStockOnly } = {}) {
  const query = {};

  if (category && category !== 'ALL') {
    query.category = category;
  }

  if (search) {
    const searchRegex = new RegExp(search.trim(), 'i');
    query.$or = [
      { sku: searchRegex },
      { name: searchRegex },
      { yarnType: searchRegex },
      { yarnColor: searchRegex },
      { warehouseLocation: searchRegex },
    ];
  }

  const items = await InventoryItem.find(query)
    .populate('supplierId', 'name supplierCode contactPerson')
    .sort({ updatedAt: -1 })
    .lean();

  // Aggregate incoming PO quantities for each inventory item
  const openPurchaseOrders = await PurchaseOrder.find({
    status: { $in: ['ISSUED', 'PARTIALLY_RECEIVED'] },
  }).lean();

  const incomingMap = {};
  for (const po of openPurchaseOrders) {
    for (const line of po.items) {
      const itemId = line.inventoryItemId.toString();
      const pendingQty = Math.max(0, line.quantity - (line.receivedQuantity || 0));
      incomingMap[itemId] = (incomingMap[itemId] || 0) + pendingQty;
    }
  }

  let enrichedItems = items.map((item) => {
    const onHand = Number(item.quantityOnHand || 0);
    const reserved = Number(item.quantityReserved || 0);
    const available = Math.max(0, onHand - reserved);
    const incoming = incomingMap[item._id.toString()] || 0;
    const isLowStock = available <= (item.minimumReorderLevel || 0);

    return {
      ...item,
      quantityOnHand: onHand,
      quantityReserved: reserved,
      availableStock: available,
      incomingStock: incoming,
      isLowStock,
      stockHealth:
        available === 0
          ? 'OUT_OF_STOCK'
          : isLowStock
          ? 'LOW_STOCK'
          : 'HEALTHY',
    };
  });

  if (lowStockOnly === true || lowStockOnly === 'true') {
    enrichedItems = enrichedItems.filter((i) => i.isLowStock);
  }

  const summary = {
    totalSkus: items.length,
    totalOnHand: items.reduce((acc, i) => acc + Number(i.quantityOnHand || 0), 0),
    totalReserved: items.reduce((acc, i) => acc + Number(i.quantityReserved || 0), 0),
    totalAvailable: enrichedItems.reduce((acc, i) => acc + i.availableStock, 0),
    totalIncoming: Object.values(incomingMap).reduce((acc, v) => acc + v, 0),
    lowStockCount: items.filter((i) => Math.max(0, (i.quantityOnHand || 0) - (i.quantityReserved || 0)) <= (i.minimumReorderLevel || 0)).length,
  };

  return { items: enrichedItems, summary };
}

/**
 * Get inventory item details by ID with batches and recent stock movements.
 */
export async function getInventoryItemById(itemId) {
  const item = await InventoryItem.findById(itemId)
    .populate('supplierId', 'name supplierCode contactPerson')
    .lean();

  if (!item) {
    throw new Error('Inventory item not found');
  }

  const batches = await YarnBatch.find({ inventoryItemId: itemId })
    .sort({ receivedDate: -1 })
    .lean();

  const movements = await StockMovement.find({ inventoryItemId: itemId })
    .populate('recordedBy', 'name email role')
    .sort({ createdAt: -1 })
    .limit(30)
    .lean();

  const availableStock = Math.max(0, (item.quantityOnHand || 0) - (item.quantityReserved || 0));

  return {
    ...item,
    availableStock,
    batches,
    movements,
  };
}

/**
 * Create a new inventory item with optional initial stock.
 */
export async function createInventoryItem(data, actorUser) {
  return withTransaction(async (session) => {
    const existing = await InventoryItem.findOne({ sku: data.sku.toUpperCase() }).session(session);
    if (existing) {
      throw new Error(`Inventory item with SKU ${data.sku.toUpperCase()} already exists`);
    }

    const initialQuantity = Number(data.initialQuantity || 0);

    const [item] = await InventoryItem.create(
      [
        {
          sku: data.sku.toUpperCase().trim(),
          name: data.name.trim(),
          category: data.category,
          yarnType: data.yarnType?.trim(),
          yarnColor: data.yarnColor?.trim(),
          supplierId: data.supplierId || null,
          unit: data.unit,
          quantityOnHand: initialQuantity,
          quantityReserved: 0,
          minimumReorderLevel: Number(data.minimumReorderLevel || 100),
          unitCost: Number(data.unitCost || 0),
          warehouseLocation: data.warehouseLocation?.trim() || 'WAREHOUSE-MAIN',
        },
      ],
      { session }
    );

    if (initialQuantity > 0) {
      const movementNumber = `MOV-INIT-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
      await StockMovement.create(
        [
          {
            movementNumber,
            inventoryItemId: item._id,
            movementType: 'PHYSICAL_AUDIT_ADJUSTMENT',
            quantity: initialQuantity,
            previousQuantityOnHand: 0,
            newQuantityOnHand: initialQuantity,
            unit: item.unit,
            referenceModel: 'ManualAdjustment',
            referenceId: actorUser._id,
            recordedBy: actorUser._id,
            reason: 'Initial stock intake upon SKU creation',
          },
        ],
        { session }
      );
    }

    await AuditLog.create(
      [
        {
          actorId: actorUser._id,
          actorRole: actorUser.role,
          action: 'CREATE_INVENTORY_ITEM',
          entityType: 'InventoryItem',
          entityId: item._id,
          newState: item.toObject(),
          notes: `Created inventory item ${item.sku} (${item.name})`,
        },
      ],
      { session }
    );

    return item;
  });
}

/**
 * Update inventory item metadata.
 */
export async function updateInventoryItem(itemId, updateData, actorUser) {
  const allowed = [
    'name',
    'yarnType',
    'yarnColor',
    'supplierId',
    'unitCost',
    'minimumReorderLevel',
    'warehouseLocation',
  ];

  const update = {};
  for (const field of allowed) {
    if (updateData[field] !== undefined) {
      update[field] = updateData[field];
    }
  }

  const updated = await InventoryItem.findByIdAndUpdate(itemId, { $set: update }, { new: true, runValidators: true });
  if (!updated) {
    throw new Error('Inventory item not found');
  }

  await AuditLog.create({
    actorId: actorUser._id,
    actorRole: actorUser.role,
    action: 'UPDATE_INVENTORY_ITEM',
    entityType: 'InventoryItem',
    entityId: updated._id,
    newState: update,
    notes: `Updated item metadata for ${updated.sku}`,
  });

  return updated;
}

/**
 * Record Goods Receipt against Purchase Order (ACID Multi-Document Transaction).
 * Invariants enforced:
 * 1. Duplicate receipt prevention: Checks supplierId + deliveryChallanNumber.
 * 2. Over-receipt protection: Rejects quantities exceeding authorized PO limit unless explicitly approved.
 * 3. Line reconciliation: acceptedQuantity + rejectedQuantity == receivedQuantity.
 * 4. Atomic inventory balance increment: Updates quantityOnHand safely.
 * 5. YarnBatch creation/linking.
 * 6. PO status update (COMPLETED or PARTIALLY_RECEIVED) + supplier delay calculation.
 * 7. Immutable StockMovement ledger entries.
 */
export async function recordGoodsReceiptTransaction({
  purchaseOrderId,
  deliveryChallanNumber,
  receivedDate = new Date(),
  items,
  allowOverReceipt = false,
  overReceiptReason = '',
  remarks = '',
  actorUser,
}) {
  return withTransaction(async (session) => {
    if (!deliveryChallanNumber || !deliveryChallanNumber.trim()) {
      throw new Error('Delivery challan number is required for Goods Receipt');
    }

    if (!items || !items.length) {
      throw new Error('Goods receipt must have at least one line item');
    }

    // 1. Fetch Purchase Order within session
    const po = await PurchaseOrder.findById(purchaseOrderId).session(session);
    if (!po) {
      throw new Error('Purchase order not found');
    }

    if (po.status === 'COMPLETED' || po.status === 'CANCELLED') {
      throw new Error(`Cannot receive goods against a purchase order with status ${po.status}`);
    }

    // 2. Duplicate receipt verification by supplier and challan number
    const challanClean = deliveryChallanNumber.trim();
    const existingGRN = await GoodsReceipt.findOne({
      supplierId: po.supplierId,
      deliveryChallanNumber: challanClean,
    }).session(session);

    if (existingGRN) {
      throw new Error(
        `Duplicate goods receipt: Challan number "${challanClean}" has already been recorded for this supplier under GRN ${existingGRN.grnNumber}`
      );
    }

    // 3. Supplier delay calculation
    const recDate = new Date(receivedDate);
    let supplierDelayDays = 0;
    if (po.expectedDeliveryDate) {
      const expDate = new Date(po.expectedDeliveryDate);
      const diffMs = recDate - expDate;
      if (diffMs > 0) {
        supplierDelayDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      }
    }

    const processedReceivedItems = [];
    const stockMovementsToCreate = [];
    let hasOverReceipt = false;
    const grnNumber = `GRN-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    // Temp placeholder for GRN id to link stock movements
    const tempGrnId = new mongoose.Types.ObjectId();

    // 4. Process each received item line
    for (const line of items) {
      const poItem = po.items.find(
        (pi) =>
          (line.poItemId && pi._id.toString() === line.poItemId.toString()) ||
          pi.inventoryItemId.toString() === line.inventoryItemId?.toString()
      );

      if (!poItem) {
        throw new Error(`Item ${line.inventoryItemId} is not part of Purchase Order ${po.poNumber}`);
      }

      const receivedQty = Number(line.receivedQuantity);
      if (receivedQty <= 0) {
        throw new Error('Received quantity must be greater than zero');
      }

      const acceptedQty = Number(line.acceptedQuantity !== undefined ? line.acceptedQuantity : receivedQty);
      const rejectedQty = Number(line.rejectedQuantity || 0);

      if (Math.abs(acceptedQty + rejectedQty - receivedQty) > 0.001) {
        throw new Error(
          `Line reconciliation failed: Accepted quantity (${acceptedQty}) + rejected quantity (${rejectedQty}) must equal received quantity (${receivedQty})`
        );
      }

      // Over-receipt check
      const remainingAuthorized = Math.max(0, poItem.quantity - (poItem.receivedQuantity || 0));
      const isLineOver = receivedQty > remainingAuthorized;

      if (isLineOver) {
        const authorized = allowOverReceipt || po.allowOverReceipt;
        if (!authorized) {
          throw new Error(
            `Over-receipt violation: Line "${poItem.description}" received ${receivedQty} exceeds remaining authorized limit of ${remainingAuthorized}. Explicit override and reason required.`
          );
        }
        hasOverReceipt = true;
      }

      // Update PO line item
      poItem.receivedQuantity = (poItem.receivedQuantity || 0) + receivedQty;
      poItem.acceptedQuantity = (poItem.acceptedQuantity || 0) + acceptedQty;
      poItem.rejectedQuantity = (poItem.rejectedQuantity || 0) + rejectedQty;

      // Update InventoryItem balance atomically
      const invItem = await InventoryItem.findById(poItem.inventoryItemId).session(session);
      if (!invItem) {
        throw new Error(`Inventory item ${poItem.inventoryItemId} not found`);
      }

      const prevOnHand = invItem.quantityOnHand;
      invItem.quantityOnHand += acceptedQty;

      // Yarn batch processing if yarn batch number given
      let batchId = null;
      if (line.yarnBatchNumber && line.yarnBatchNumber.trim()) {
        const batchNum = line.yarnBatchNumber.trim().toUpperCase();
        let batch = await YarnBatch.findOne({ batchNumber: batchNum }).session(session);
        if (batch) {
          batch.receivedQuantity += acceptedQty;
          batch.remainingQuantity += acceptedQty;
          await batch.save({ session });
          batchId = batch._id;
        } else {
          const [newBatch] = await YarnBatch.create(
            [
              {
                batchNumber: batchNum,
                supplierId: po.supplierId,
                inventoryItemId: invItem._id,
                yarnSpecification: {
                  count: invItem.yarnType || '30s Cotton',
                  blend: '100% Cotton',
                  origin: 'Local Mill',
                  lotNumber: batchNum,
                },
                receivedQuantity: acceptedQty,
                remainingQuantity: acceptedQty,
                unit: invItem.unit === 'CONE' ? 'CONE' : 'KILOGRAM',
                unitPrice: poItem.unitPrice || invItem.unitCost,
                receivedDate: recDate,
              },
            ],
            { session }
          );
          batchId = newBatch._id;
        }

        if (!invItem.batchNumbers.includes(batchNum)) {
          invItem.batchNumbers.push(batchNum);
        }
      }

      await invItem.save({ session });

      processedReceivedItems.push({
        inventoryItemId: invItem._id,
        yarnBatchNumber: line.yarnBatchNumber?.trim().toUpperCase(),
        receivedQuantity: receivedQty,
        acceptedQuantity: acceptedQty,
        rejectedQuantity: rejectedQty,
        rejectionReason: line.rejectionReason,
        unit: line.unit || invItem.unit,
        warehouseLocation: line.warehouseLocation || invItem.warehouseLocation,
      });

      // Immutable stock movement record
      if (acceptedQty > 0) {
        stockMovementsToCreate.push({
          movementNumber: `MOV-REC-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
          inventoryItemId: invItem._id,
          yarnBatchId: batchId,
          movementType: 'PURCHASE_RECEIPT',
          quantity: acceptedQty,
          previousQuantityOnHand: prevOnHand,
          newQuantityOnHand: invItem.quantityOnHand,
          unit: invItem.unit,
          referenceModel: 'GoodsReceipt',
          referenceId: tempGrnId,
          recordedBy: actorUser._id,
          reason: `Goods receipt for PO ${po.poNumber}, Challan #${challanClean}${
            rejectedQty > 0 ? ` (${rejectedQty} rejected)` : ''
          }`,
        });
      }
    }

    // 5. Update PO status
    const allItemsCompleted = po.items.every((i) => (i.receivedQuantity || 0) >= i.quantity);
    po.status = allItemsCompleted ? 'COMPLETED' : 'PARTIALLY_RECEIVED';
    po.actualDeliveryDate = recDate;
    po.supplierDelayDays = supplierDelayDays;
    if (allowOverReceipt) {
      po.allowOverReceipt = true;
      po.overReceiptReason = overReceiptReason || 'Approved at goods receipt checkpoint';
    }
    await po.save({ session });

    // 6. Create GoodsReceipt
    const [goodsReceipt] = await GoodsReceipt.create(
      [
        {
          _id: tempGrnId,
          grnNumber,
          purchaseOrderId: po._id,
          supplierId: po.supplierId,
          receivedItems: processedReceivedItems,
          receivedBy: actorUser._id,
          receivedDate: recDate,
          deliveryChallanNumber: challanClean,
          isOverReceipt: hasOverReceipt,
          overReceiptReason: hasOverReceipt ? overReceiptReason : undefined,
          overReceiptAuthorizedBy: hasOverReceipt ? actorUser._id : undefined,
          supplierDelayDays,
          remarks,
        },
      ],
      { session }
    );

    // 7. Write StockMovements
    if (stockMovementsToCreate.length > 0) {
      await StockMovement.create(stockMovementsToCreate, { session });
    }

    // 8. Record audit log
    await AuditLog.create(
      [
        {
          actorId: actorUser._id,
          actorRole: actorUser.role,
          action: 'RECORD_GOODS_RECEIPT',
          entityType: 'GoodsReceipt',
          entityId: goodsReceipt._id,
          newState: {
            grnNumber,
            poNumber: po.poNumber,
            poStatus: po.status,
            supplierDelayDays,
            isOverReceipt: hasOverReceipt,
          },
          notes: `Goods receipt ${grnNumber} processed against PO ${po.poNumber}`,
        },
      ],
      { session }
    );

    logger.info(`GoodsReceipt ${grnNumber} recorded successfully against PO ${po.poNumber}`);
    return { goodsReceipt, purchaseOrder: po };
  });
}

/**
 * Record Material Issue to Production against Confirmed Order or Job.
 * Invariants:
 * 1. Checks that sufficient on-hand stock exists.
 * 2. Safely deducts stock atomically without allowing negative balances.
 * 3. Releases from reservation if stock was previously reserved for this order.
 * 4. Creates immutable StockMovement record with movementType 'PRODUCTION_ISSUE'.
 */
export async function issueMaterialToProduction({
  orderId,
  productionJobId = null,
  inventoryItemId,
  quantity,
  unit,
  reason = '',
  actorUser,
}) {
  return withTransaction(async (session) => {
    const deductQty = Number(quantity);
    if (deductQty <= 0) {
      throw new Error('Issue quantity must be greater than zero');
    }

    const order = await Order.findById(orderId).session(session);
    if (!order) {
      throw new Error('Order not found');
    }

    const item = await InventoryItem.findById(inventoryItemId).session(session);
    if (!item) {
      throw new Error('Inventory item not found');
    }

    if (item.quantityOnHand < deductQty) {
      throw new Error(
        `Insufficient stock for issue: Requested ${deductQty} ${item.unit}, but only ${item.quantityOnHand} ${item.unit} on hand`
      );
    }

    const prevOnHand = item.quantityOnHand;

    // Determine how much reserved stock can be released alongside on-hand deduction
    const reservedToDeduct = Math.min(item.quantityReserved, deductQty);

    // Atomic conditional deduction
    const updatedItem = await InventoryItem.findOneAndUpdate(
      {
        _id: item._id,
        quantityOnHand: { $gte: deductQty },
        ...(reservedToDeduct > 0 ? { quantityReserved: { $gte: reservedToDeduct } } : {}),
      },
      {
        $inc: {
          quantityOnHand: -deductQty,
          ...(reservedToDeduct > 0 ? { quantityReserved: -reservedToDeduct } : {}),
        },
      },
      { session, new: true, runValidators: true }
    );

    if (!updatedItem) {
      throw new Error('Atomic stock deduction failed due to concurrent modification');
    }

    const movementNumber = `MOV-ISS-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const [movement] = await StockMovement.create(
      [
        {
          movementNumber,
          inventoryItemId: item._id,
          movementType: 'PRODUCTION_ISSUE',
          quantity: -deductQty,
          previousQuantityOnHand: prevOnHand,
          newQuantityOnHand: updatedItem.quantityOnHand,
          unit: unit || item.unit,
          referenceModel: productionJobId ? 'ProductionJob' : 'Order',
          referenceId: productionJobId || order._id,
          recordedBy: actorUser._id,
          reason: reason || `Material issued to production order ${order.orderNumber}`,
        },
      ],
      { session }
    );

    if (order.status === 'CONFIRMED') {
      order.status = 'YARN_ALLOCATED';
      await order.save({ session });
    }

    await AuditLog.create(
      [
        {
          actorId: actorUser._id,
          actorRole: actorUser.role,
          action: 'ISSUE_PRODUCTION_MATERIAL',
          entityType: 'StockMovement',
          entityId: movement._id,
          newState: {
            orderNumber: order.orderNumber,
            quantityIssued: deductQty,
            remainingOnHand: updatedItem.quantityOnHand,
          },
          notes: `Material ${item.sku} issued to order ${order.orderNumber}`,
        },
      ],
      { session }
    );

    return { stockMovement: movement, inventoryItem: updatedItem };
  });
}

/**
 * Perform authorized physical audit stock adjustment.
 * Enforces that on-hand quantity cannot fall below reserved quantity or zero.
 */
export async function adjustStockPhysicalAudit({ inventoryItemId, deltaAmount, reason, actorUser }) {
  return withTransaction(async (session) => {
    const delta = Number(deltaAmount);
    if (delta === 0) {
      throw new Error('Adjustment delta cannot be zero');
    }

    const item = await InventoryItem.findById(inventoryItemId).session(session);
    if (!item) {
      throw new Error('Inventory item not found');
    }

    const prevOnHand = item.quantityOnHand;

    // Use atomic adjustment static method
    const updatedItem = await InventoryItem.adjustStock(inventoryItemId, delta, session);

    const movementNumber = `MOV-ADJ-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const [movement] = await StockMovement.create(
      [
        {
          movementNumber,
          inventoryItemId: item._id,
          movementType: 'PHYSICAL_AUDIT_ADJUSTMENT',
          quantity: delta,
          previousQuantityOnHand: prevOnHand,
          newQuantityOnHand: updatedItem.quantityOnHand,
          unit: item.unit,
          referenceModel: 'ManualAdjustment',
          referenceId: actorUser._id,
          recordedBy: actorUser._id,
          reason: reason || 'Authorized physical audit count adjustment',
        },
      ],
      { session }
    );

    await AuditLog.create(
      [
        {
          actorId: actorUser._id,
          actorRole: actorUser.role,
          action: 'PHYSICAL_AUDIT_ADJUSTMENT',
          entityType: 'InventoryItem',
          entityId: item._id,
          previousState: { quantityOnHand: prevOnHand },
          newState: { quantityOnHand: updatedItem.quantityOnHand, delta },
          notes: reason || 'Physical audit count adjustment',
        },
      ],
      { session }
    );

    return { inventoryItem: updatedItem, stockMovement: movement };
  });
}

/**
 * Query immutable stock movements ledger.
 */
export async function getStockMovements({ inventoryItemId, movementType, limit = 50, page = 1 } = {}) {
  const query = {};
  if (inventoryItemId) query.inventoryItemId = inventoryItemId;
  if (movementType && movementType !== 'ALL') query.movementType = movementType;

  const skip = (Math.max(1, page) - 1) * limit;

  const [movements, total] = await Promise.all([
    StockMovement.find(query)
      .populate('inventoryItemId', 'sku name category yarnType unit')
      .populate('recordedBy', 'name email role')
      .populate('yarnBatchId', 'batchNumber lotNumber')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    StockMovement.countDocuments(query),
  ]);

  return {
    movements,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / limit),
    },
  };
}

/**
 * Generate shortage summaries comparing active orders against stock availability.
 */
export async function getShortageSummary() {
  const confirmedOrders = await Order.find({
    status: { $in: ['CONFIRMED', 'YARN_ALLOCATED', 'IN_PRODUCTION'] },
  }).lean();

  const inventoryItems = await InventoryItem.find({ category: 'RAW_YARN' }).lean();
  const openPurchaseRequests = await PurchaseRequest.find({
    status: { $in: ['PENDING', 'APPROVED', 'PO_CREATED'] },
  }).lean();

  // Compute yarn requirements from active orders
  const shortages = [];

  for (const item of inventoryItems) {
    const available = Math.max(0, (item.quantityOnHand || 0) - (item.quantityReserved || 0));
    const isBelowThreshold = available <= (item.minimumReorderLevel || 0);

    // Check open purchase requests for this item
    const pendingReqs = openPurchaseRequests.filter(
      (pr) => pr.inventoryItemId.toString() === item._id.toString()
    );
    const pendingReqQuantity = pendingReqs.reduce((acc, r) => acc + r.requiredQuantity, 0);

    if (isBelowThreshold || available < 100) {
      shortages.push({
        inventoryItemId: item._id,
        sku: item.sku,
        name: item.name,
        yarnType: item.yarnType,
        yarnColor: item.yarnColor,
        quantityOnHand: item.quantityOnHand,
        quantityReserved: item.quantityReserved,
        availableStock: available,
        minimumReorderLevel: item.minimumReorderLevel,
        deficitQuantity: Math.max(0, item.minimumReorderLevel - available),
        pendingPurchaseRequestQuantity: pendingReqQuantity,
        openRequestCount: pendingReqs.length,
        severity: available === 0 ? 'CRITICAL' : 'WARNING',
      });
    }
  }

  return {
    activeOrdersCount: confirmedOrders.length,
    shortages,
    totalShortageSkus: shortages.length,
    criticalCount: shortages.filter((s) => s.severity === 'CRITICAL').length,
  };
}

