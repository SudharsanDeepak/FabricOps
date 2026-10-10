import mongoose from 'mongoose';
import { logger } from '../config/logger.js';
import {
  PurchaseOrder,
  PurchaseRequest,
  GoodsReceipt,
  Supplier,
  InventoryItem,
  Order,
  AuditLog,
} from '../models/index.js';
import { withTransaction } from './transaction.service.js';

/**
 * Create a new purchase request for material shortages.
 */
export async function createPurchaseRequest({
  inventoryItemId,
  requiredQuantity,
  unit,
  reason = 'SHORTAGE_FOR_ORDER',
  relatedOrderId = null,
  notes = '',
  actorUser,
}) {
  const item = await InventoryItem.findById(inventoryItemId);
  if (!item) {
    throw new Error('Inventory item not found');
  }

  const qty = Number(requiredQuantity);
  if (qty <= 0) {
    throw new Error('Required quantity must be positive');
  }

  if (relatedOrderId) {
    const order = await Order.findById(relatedOrderId);
    if (!order) {
      throw new Error('Linked order not found');
    }
  }

  const requestNumber = `PRQ-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

  const pr = await PurchaseRequest.create({
    requestNumber,
    inventoryItemId,
    requiredQuantity: qty,
    unit: unit || item.unit,
    reason,
    relatedOrderId: relatedOrderId || null,
    status: 'PENDING',
    requestedBy: actorUser._id,
    notes,
  });

  await AuditLog.create({
    actorId: actorUser._id,
    actorRole: actorUser.role,
    action: 'CREATE_PURCHASE_REQUEST',
    entityType: 'PurchaseRequest',
    entityId: pr._id,
    newState: pr.toObject(),
    notes: `Created purchase request ${requestNumber} for ${qty} ${pr.unit} of ${item.sku}`,
  });

  return pr;
}

/**
 * Get all purchase requests with filters.
 */
export async function getPurchaseRequests({ status } = {}) {
  const query = {};
  if (status && status !== 'ALL') {
    query.status = status;
  }

  return PurchaseRequest.find(query)
    .populate('inventoryItemId', 'sku name category yarnType yarnColor unit quantityOnHand quantityReserved')
    .populate('relatedOrderId', 'orderNumber status confirmedDeliveryDate')
    .populate('requestedBy', 'name email')
    .populate('approvedBy', 'name email')
    .populate('purchaseOrderId', 'poNumber status expectedDeliveryDate')
    .sort({ createdAt: -1 })
    .lean();
}

/**
 * Approve a purchase request.
 */
export async function approvePurchaseRequest(requestId, actorUser) {
  const pr = await PurchaseRequest.findById(requestId);
  if (!pr) {
    throw new Error('Purchase request not found');
  }

  if (pr.status !== 'PENDING') {
    throw new Error(`Cannot approve purchase request in ${pr.status} status`);
  }

  pr.status = 'APPROVED';
  pr.approvedBy = actorUser._id;
  await pr.save();

  await AuditLog.create({
    actorId: actorUser._id,
    actorRole: actorUser.role,
    action: 'APPROVE_PURCHASE_REQUEST',
    entityType: 'PurchaseRequest',
    entityId: pr._id,
    newState: { status: 'APPROVED' },
    notes: `Approved purchase request ${pr.requestNumber}`,
  });

  return pr;
}

/**
 * Reject a purchase request.
 */
export async function rejectPurchaseRequest(requestId, reason, actorUser) {
  const pr = await PurchaseRequest.findById(requestId);
  if (!pr) {
    throw new Error('Purchase request not found');
  }

  if (pr.status !== 'PENDING') {
    throw new Error(`Cannot reject purchase request in ${pr.status} status`);
  }

  pr.status = 'REJECTED';
  pr.notes = pr.notes ? `${pr.notes} | Rejected: ${reason}` : `Rejected: ${reason}`;
  await pr.save();

  await AuditLog.create({
    actorId: actorUser._id,
    actorRole: actorUser.role,
    action: 'REJECT_PURCHASE_REQUEST',
    entityType: 'PurchaseRequest',
    entityId: pr._id,
    newState: { status: 'REJECTED', reason },
    notes: `Rejected purchase request ${pr.requestNumber}`,
  });

  return pr;
}

/**
 * Create a new supplier Purchase Order (ACID Multi-Document Transaction).
 */
export async function createPurchaseOrder({
  supplierId,
  purchaseRequestId = null,
  items,
  expectedDeliveryDate,
  allowOverReceipt = false,
  overReceiptReason = '',
  notes = '',
  actorUser,
}) {
  return withTransaction(async (session) => {
    if (!supplierId) {
      throw new Error('Supplier is required for Purchase Order');
    }

    if (!items || !items.length) {
      throw new Error('Purchase order must have at least one line item');
    }

    const supplier = await Supplier.findById(supplierId).session(session);
    if (!supplier) {
      throw new Error('Supplier not found');
    }

    let subtotal = 0;
    const processedItems = [];

    for (const item of items) {
      const invItem = await InventoryItem.findById(item.inventoryItemId).session(session);
      if (!invItem) {
        throw new Error(`Inventory item ${item.inventoryItemId} not found`);
      }

      const qty = Number(item.quantity);
      const unitPrice = Number(item.unitPrice !== undefined ? item.unitPrice : invItem.unitCost);

      if (qty <= 0) {
        throw new Error('Line item quantity must be positive');
      }
      if (unitPrice < 0) {
        throw new Error('Line item unit price cannot be negative');
      }

      const lineTotal = Number((qty * unitPrice).toFixed(2));
      subtotal += lineTotal;

      processedItems.push({
        inventoryItemId: invItem._id,
        description: item.description || `${invItem.sku} - ${invItem.name}`,
        quantity: qty,
        receivedQuantity: 0,
        acceptedQuantity: 0,
        rejectedQuantity: 0,
        unit: item.unit || invItem.unit,
        unitPrice,
        lineTotal,
      });
    }

    const taxAmount = Number((subtotal * 0.05).toFixed(2)); // Standard 5% GST
    const totalAmount = Number((subtotal + taxAmount).toFixed(2));
    const poNumber = `PO-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    const [po] = await PurchaseOrder.create(
      [
        {
          poNumber,
          supplierId,
          purchaseRequestId: purchaseRequestId || undefined,
          items: processedItems,
          subtotal,
          taxAmount,
          totalAmount,
          status: 'ISSUED',
          expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
          allowOverReceipt: Boolean(allowOverReceipt),
          overReceiptReason: overReceiptReason?.trim() || undefined,
          issuedBy: actorUser._id,
          notes,
        },
      ],
      { session }
    );

    // If linked to a purchase request, update PR status to PO_CREATED
    if (purchaseRequestId) {
      const pr = await PurchaseRequest.findById(purchaseRequestId).session(session);
      if (pr) {
        pr.status = 'PO_CREATED';
        pr.purchaseOrderId = po._id;
        await pr.save({ session });
      }
    }

    await AuditLog.create(
      [
        {
          actorId: actorUser._id,
          actorRole: actorUser.role,
          action: 'CREATE_PURCHASE_ORDER',
          entityType: 'PurchaseOrder',
          entityId: po._id,
          newState: { poNumber, totalAmount, supplierId },
          notes: `Issued Purchase Order ${poNumber} to supplier ${supplier.name}`,
        },
      ],
      { session }
    );

    return po;
  });
}

/**
 * Get all purchase orders with receipt tracking.
 */
export async function getPurchaseOrders({ supplierId, status } = {}) {
  const query = {};
  if (supplierId) query.supplierId = supplierId;
  if (status && status !== 'ALL') query.status = status;

  const pos = await PurchaseOrder.find(query)
    .populate('supplierId', 'name supplierCode contactPerson rating')
    .populate('purchaseRequestId', 'requestNumber reason')
    .populate('issuedBy', 'name email')
    .sort({ createdAt: -1 })
    .lean();

  const now = new Date();
  return pos.map((po) => {
    const totalOrdered = po.items.reduce((acc, i) => acc + (i.quantity || 0), 0);
    const totalReceived = po.items.reduce((acc, i) => acc + (i.receivedQuantity || 0), 0);
    const totalAccepted = po.items.reduce((acc, i) => acc + (i.acceptedQuantity || 0), 0);
    const totalRejected = po.items.reduce((acc, i) => acc + (i.rejectedQuantity || 0), 0);
    const completionPct = totalOrdered > 0 ? Math.round((totalReceived / totalOrdered) * 100) : 0;

    const isOverdue =
      po.status !== 'COMPLETED' &&
      po.status !== 'CANCELLED' &&
      po.expectedDeliveryDate &&
      new Date(po.expectedDeliveryDate) < now;

    return {
      ...po,
      totalOrdered,
      totalReceived,
      totalAccepted,
      totalRejected,
      completionPercentage: completionPct,
      isOverdue,
    };
  });
}

/**
 * Get PO by ID with linked GoodsReceipt documents.
 */
export async function getPurchaseOrderById(poId) {
  const po = await PurchaseOrder.findById(poId)
    .populate('supplierId', 'name supplierCode contactPerson address rating')
    .populate('purchaseRequestId', 'requestNumber reason relatedOrderId')
    .populate('issuedBy', 'name email')
    .lean();

  if (!po) {
    throw new Error('Purchase order not found');
  }

  const receipts = await GoodsReceipt.find({ purchaseOrderId: poId })
    .populate('receivedBy', 'name email')
    .sort({ receivedDate: -1 })
    .lean();

  return { ...po, receipts };
}

/**
 * Cancel a purchase order.
 */
export async function cancelPurchaseOrder(poId, reason, actorUser) {
  const po = await PurchaseOrder.findById(poId);
  if (!po) {
    throw new Error('Purchase order not found');
  }

  if (po.status === 'COMPLETED') {
    throw new Error('Cannot cancel an already completed purchase order');
  }

  po.status = 'CANCELLED';
  po.notes = po.notes ? `${po.notes} | Cancelled: ${reason}` : `Cancelled: ${reason}`;
  await po.save();

  await AuditLog.create({
    actorId: actorUser._id,
    actorRole: actorUser.role,
    action: 'CANCEL_PURCHASE_ORDER',
    entityType: 'PurchaseOrder',
    entityId: po._id,
    newState: { status: 'CANCELLED', reason },
    notes: `Cancelled Purchase Order ${po.poNumber}`,
  });

  return po;
}

/**
 * Get suppliers list.
 */
export async function getSuppliers() {
  return Supplier.find({ status: 'ACTIVE' }).sort({ name: 1 }).lean();
}

/**
 * Create a new supplier.
 */
export async function createSupplier(data) {
  const supplierCode = data.supplierCode?.trim().toUpperCase() || `SUP-${Date.now().toString().slice(-4)}`;
  return Supplier.create({
    ...data,
    supplierCode,
  });
}

/**
 * Get procurement overview analytics.
 */
export async function getProcurementOverview() {
  const [pos, prs] = await Promise.all([
    PurchaseOrder.find().lean(),
    PurchaseRequest.find().lean(),
  ]);

  const now = new Date();
  const openPos = pos.filter((p) => p.status === 'ISSUED' || p.status === 'PARTIALLY_RECEIVED');
  const delayedPos = openPos.filter((p) => p.expectedDeliveryDate && new Date(p.expectedDeliveryDate) < now);
  const completedPos = pos.filter((p) => p.status === 'COMPLETED');

  const totalPoSpend = pos
    .filter((p) => p.status !== 'CANCELLED')
    .reduce((acc, p) => acc + (p.totalAmount || 0), 0);

  const totalDelays = pos.filter((p) => (p.supplierDelayDays || 0) > 0);
  const avgDelayDays =
    totalDelays.length > 0
      ? Math.round(totalDelays.reduce((acc, p) => acc + p.supplierDelayDays, 0) / totalDelays.length)
      : 0;

  return {
    totalPurchaseOrders: pos.length,
    openOrdersCount: openPos.length,
    delayedOrdersCount: delayedPos.length,
    completedOrdersCount: completedPos.length,
    pendingRequestsCount: prs.filter((r) => r.status === 'PENDING').length,
    approvedRequestsCount: prs.filter((r) => r.status === 'APPROVED').length,
    totalPoSpend,
    delayedPosSummary: delayedPos.map((p) => ({
      _id: p._id,
      poNumber: p.poNumber,
      expectedDeliveryDate: p.expectedDeliveryDate,
      daysOverdue: Math.ceil((now - new Date(p.expectedDeliveryDate)) / (1000 * 60 * 60 * 24)),
      totalAmount: p.totalAmount,
    })),
    avgSupplierDelayDays: avgDelayDays,
  };
}

