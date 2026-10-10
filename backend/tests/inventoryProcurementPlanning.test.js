import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import {
  User,
  Supplier,
  InventoryItem,
  PurchaseRequest,
  PurchaseOrder,
  GoodsReceipt,
  StockMovement,
  Order,
  Machine,
  ProductionPlan,
  AuditLog,
} from '../src/models/index.js';
import {
  getInventoryStockLevels,
  recordGoodsReceiptTransaction,
  issueMaterialToProduction,
  adjustStockPhysicalAudit,
  getShortageSummary,
} from '../src/services/inventory.service.js';
import {
  createPurchaseRequest,
  approvePurchaseRequest,
  createPurchaseOrder,
} from '../src/services/procurement.service.js';
import {
  evaluateProductionReadiness,
  createProductionPlan,
  rescheduleProductionPlan,
  updateProductionPlanStatus,
  getPlanningOverview,
} from '../src/services/planning.service.js';

describe('Prompt 5 — Admin Inventory, Procurement & Production Planning', () => {
  let replSet;
  let adminUser;
  let sampleSupplier;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const uri = replSet.getUri();
    await mongoose.connect(uri);

    // Ensure model indexes are initialized
    await InventoryItem.init();
    await GoodsReceipt.init();
    await PurchaseOrder.init();
    await PurchaseRequest.init();
    await StockMovement.init();
    await Machine.init();
    await ProductionPlan.init();
    await Order.init();
    await AuditLog.init();
  }, 120000);

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (replSet) {
      await replSet.stop();
    }
  });

  beforeEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }

    adminUser = await User.create({
      name: 'Mill Ops Admin',
      email: 'ops.admin@fabricops.com',
      passwordHash: 'dummyhashedpw123',
      role: 'ADMIN',
      status: 'ACTIVE',
    });

    sampleSupplier = await Supplier.create({
      supplierCode: 'SUP-COT-01',
      name: 'Vardhman Cotton Mills',
      contactPerson: { name: 'Rajesh Kumar', email: 'rajesh@vardhman.com', phone: '+91 9876543210' },
      rating: 4.8,
      status: 'ACTIVE',
    });
  });

  // 1. Stock Arithmetic & Low-Stock Alerts
  it('1. Correctly calculates on-hand, reserved, available, incoming stock and low-stock alerts', async () => {
    const yarnItem = await InventoryItem.create({
      sku: 'YRN-COT-40S',
      name: '40s Combed Cotton Yarn',
      category: 'RAW_YARN',
      yarnType: '40s Combed',
      yarnColor: 'Natural Ecru',
      supplierId: sampleSupplier._id,
      unit: 'KILOGRAM',
      quantityOnHand: 1000,
      quantityReserved: 300,
      minimumReorderLevel: 800,
      unitCost: 280,
    });

    // Create an open Purchase Order with pending quantity
    await PurchaseOrder.create({
      poNumber: 'PO-2026-001',
      supplierId: sampleSupplier._id,
      items: [
        {
          inventoryItemId: yarnItem._id,
          description: '40s Combed Cotton Yarn',
          quantity: 500,
          receivedQuantity: 100,
          unit: 'KILOGRAM',
          unitPrice: 280,
          lineTotal: 140000,
        },
      ],
      subtotal: 140000,
      taxAmount: 7000,
      totalAmount: 147000,
      status: 'PARTIALLY_RECEIVED',
    });

    const result = await getInventoryStockLevels();
    const itemData = result.items.find((i) => i.sku === 'YRN-COT-40S');

    expect(itemData).toBeDefined();
    expect(itemData.quantityOnHand).toBe(1000);
    expect(itemData.quantityReserved).toBe(300);
    expect(itemData.availableStock).toBe(700); // 1000 - 300
    expect(itemData.incomingStock).toBe(400); // 500 - 100 pending
    expect(itemData.isLowStock).toBe(true); // 700 <= 800 minimumReorderLevel
    expect(itemData.stockHealth).toBe('LOW_STOCK');

    expect(result.summary.totalOnHand).toBe(1000);
    expect(result.summary.totalReserved).toBe(300);
    expect(result.summary.totalAvailable).toBe(700);
    expect(result.summary.totalIncoming).toBe(400);
    expect(result.summary.lowStockCount).toBe(1);
  });

  // 2. Concurrency & Negative Stock Prevention
  it('2. Prevents over-reservation and negative stock under concurrent reservation attempts', async () => {
    const yarnItem = await InventoryItem.create({
      sku: 'YRN-POLY-30S',
      name: '30s Polyester Spun Yarn',
      category: 'RAW_YARN',
      unit: 'KILOGRAM',
      quantityOnHand: 500,
      quantityReserved: 0,
      minimumReorderLevel: 100,
      unitCost: 180,
    });

    // Attempt 3 concurrent reservations of 200 kg each (Total 600 kg requested, but only 500 kg available)
    const reserveAttempts = [200, 200, 200].map((amount) =>
      InventoryItem.reserveStock(yarnItem._id, amount)
        .then(() => ({ success: true }))
        .catch((err) => ({ success: false, error: err.message }))
    );

    const outcomes = await Promise.all(reserveAttempts);
    const successful = outcomes.filter((o) => o.success);
    const failed = outcomes.filter((o) => !o.success);

    // Exactly 2 reservations must succeed (400 kg reserved), and 1 must fail safely
    expect(successful.length).toBe(2);
    expect(failed.length).toBe(1);
    expect(failed[0].error).toMatch(/Insufficient unreserved stock/);

    const reloaded = await InventoryItem.findById(yarnItem._id);
    expect(reloaded.quantityReserved).toBe(400);
    expect(reloaded.quantityOnHand).toBe(500);

    // Attempting to reserve even 150 kg more must be rejected
    await expect(InventoryItem.reserveStock(yarnItem._id, 150)).rejects.toThrow(
      /Insufficient unreserved stock/
    );
  });

  // 3. Goods Receipt Transaction, PO Progress & Supplier Delay
  it('3. Atomically processes goods receipt, updates PO, creates YarnBatch and immutable StockMovement', async () => {
    const yarnItem = await InventoryItem.create({
      sku: 'YRN-MODAL-60S',
      name: '60s MicroModal Yarn',
      category: 'RAW_YARN',
      unit: 'KILOGRAM',
      quantityOnHand: 200,
      quantityReserved: 0,
      minimumReorderLevel: 100,
      unitCost: 450,
    });

    const expectedDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000); // 5 days ago (delayed)
    const po = await PurchaseOrder.create({
      poNumber: 'PO-MODAL-001',
      supplierId: sampleSupplier._id,
      items: [
        {
          inventoryItemId: yarnItem._id,
          description: '60s MicroModal Yarn',
          quantity: 1000,
          receivedQuantity: 0,
          acceptedQuantity: 0,
          rejectedQuantity: 0,
          unit: 'KILOGRAM',
          unitPrice: 450,
          lineTotal: 450000,
        },
      ],
      subtotal: 450000,
      taxAmount: 22500,
      totalAmount: 472500,
      expectedDeliveryDate: expectedDate,
      status: 'ISSUED',
    });

    // Record receipt of 1000 kg: 950 accepted, 50 rejected
    const receiptPayload = {
      purchaseOrderId: po._id,
      deliveryChallanNumber: 'DC-VARDHMAN-8821',
      receivedDate: new Date(),
      items: [
        {
          inventoryItemId: yarnItem._id,
          poItemId: po.items[0]._id,
          yarnBatchNumber: 'BAT-MOD-2026-A',
          receivedQuantity: 1000,
          acceptedQuantity: 950,
          rejectedQuantity: 50,
          rejectionReason: 'Moisture content exceeded ISO tolerance in 50 kg cones',
          unit: 'KILOGRAM',
        },
      ],
      remarks: 'Delivered at Main Cotton Godown Bay 2',
      actorUser: adminUser,
    };

    const { goodsReceipt, purchaseOrder } = await recordGoodsReceiptTransaction(receiptPayload);

    expect(goodsReceipt).toBeDefined();
    expect(goodsReceipt.grnNumber).toMatch(/^GRN-/);
    expect(goodsReceipt.supplierDelayDays).toBeGreaterThanOrEqual(4);

    // Purchase Order must now be COMPLETED because full 1000 kg was received
    expect(purchaseOrder.status).toBe('COMPLETED');
    expect(purchaseOrder.items[0].receivedQuantity).toBe(1000);
    expect(purchaseOrder.items[0].acceptedQuantity).toBe(950);
    expect(purchaseOrder.items[0].rejectedQuantity).toBe(50);
    expect(purchaseOrder.supplierDelayDays).toBeGreaterThanOrEqual(4);

    // InventoryItem quantity on hand must increase by accepted quantity (200 + 950 = 1150)
    const updatedItem = await InventoryItem.findById(yarnItem._id);
    expect(updatedItem.quantityOnHand).toBe(1150);
    expect(updatedItem.batchNumbers).toContain('BAT-MOD-2026-A');

    // Immutable StockMovement must be logged
    const movement = await StockMovement.findOne({
      inventoryItemId: yarnItem._id,
      movementType: 'PURCHASE_RECEIPT',
    });
    expect(movement).toBeDefined();
    expect(movement.quantity).toBe(950);
    expect(movement.previousQuantityOnHand).toBe(200);
    expect(movement.newQuantityOnHand).toBe(1150);
    expect(movement.referenceModel).toBe('GoodsReceipt');
  });

  // 4. Duplicate Goods Receipt Prevention
  it('4. Strictly prevents duplicate goods receipts using identical challan and supplier', async () => {
    const yarnItem = await InventoryItem.create({
      sku: 'YRN-LINEN-20S',
      name: '20s Pure Linen Yarn',
      category: 'RAW_YARN',
      unit: 'KILOGRAM',
      quantityOnHand: 100,
      unitCost: 600,
    });

    const po = await PurchaseOrder.create({
      poNumber: 'PO-LINEN-101',
      supplierId: sampleSupplier._id,
      items: [
        {
          inventoryItemId: yarnItem._id,
          description: '20s Pure Linen Yarn',
          quantity: 300,
          unit: 'KILOGRAM',
          unitPrice: 600,
          lineTotal: 180000,
        },
      ],
      subtotal: 180000,
      totalAmount: 189000,
      status: 'ISSUED',
    });

    // First receipt succeeds
    await recordGoodsReceiptTransaction({
      purchaseOrderId: po._id,
      deliveryChallanNumber: 'CHALLAN-DUP-999',
      items: [
        {
          inventoryItemId: yarnItem._id,
          poItemId: po.items[0]._id,
          receivedQuantity: 100,
          acceptedQuantity: 100,
          unit: 'KILOGRAM',
        },
      ],
      actorUser: adminUser,
    });

    // Attempting to submit receipt again with same challan for same supplier must be rejected
    await expect(
      recordGoodsReceiptTransaction({
        purchaseOrderId: po._id,
        deliveryChallanNumber: 'CHALLAN-DUP-999',
        items: [
          {
            inventoryItemId: yarnItem._id,
            poItemId: po.items[0]._id,
            receivedQuantity: 100,
            acceptedQuantity: 100,
            unit: 'KILOGRAM',
          },
        ],
        actorUser: adminUser,
      })
    ).rejects.toThrow(/Duplicate goods receipt/);
  });

  // 5. Over-Receipt Protection & Authorized Override
  it('5. Blocks unauthorized over-receipts but permits authorized exceptions with audit reason', async () => {
    const yarnItem = await InventoryItem.create({
      sku: 'YRN-SILK-20S',
      name: '20s Mulberry Silk Yarn',
      category: 'RAW_YARN',
      unit: 'KILOGRAM',
      quantityOnHand: 50,
      unitCost: 1200,
    });

    const po = await PurchaseOrder.create({
      poNumber: 'PO-SILK-202',
      supplierId: sampleSupplier._id,
      items: [
        {
          inventoryItemId: yarnItem._id,
          description: '20s Mulberry Silk',
          quantity: 200,
          receivedQuantity: 0,
          unit: 'KILOGRAM',
          unitPrice: 1200,
          lineTotal: 240000,
        },
      ],
      subtotal: 240000,
      totalAmount: 252000,
      status: 'ISSUED',
    });

    // 1. Attempt unauthorized over-receipt (250 kg received against 200 kg authorized)
    await expect(
      recordGoodsReceiptTransaction({
        purchaseOrderId: po._id,
        deliveryChallanNumber: 'CHALLAN-OVER-01',
        items: [
          {
            inventoryItemId: yarnItem._id,
            poItemId: po.items[0]._id,
            receivedQuantity: 250,
            acceptedQuantity: 250,
            unit: 'KILOGRAM',
          },
        ],
        allowOverReceipt: false,
        actorUser: adminUser,
      })
    ).rejects.toThrow(/Over-receipt violation/);

    // 2. Now attempt with explicit authorization and reason
    const { goodsReceipt, purchaseOrder } = await recordGoodsReceiptTransaction({
      purchaseOrderId: po._id,
      deliveryChallanNumber: 'CHALLAN-OVER-01',
      items: [
        {
          inventoryItemId: yarnItem._id,
          poItemId: po.items[0]._id,
          receivedQuantity: 250,
          acceptedQuantity: 250,
          unit: 'KILOGRAM',
        },
      ],
      allowOverReceipt: true,
      overReceiptReason: 'Approved extra lot delivery to cover seasonal spike',
      actorUser: adminUser,
    });

    expect(goodsReceipt.isOverReceipt).toBe(true);
    expect(goodsReceipt.overReceiptReason).toBe('Approved extra lot delivery to cover seasonal spike');
    expect(purchaseOrder.items[0].receivedQuantity).toBe(250);
  });

  // 6. Material Issue to Production Order
  it('6. Issues material against confirmed order, safely deducting stock and writing stock movement', async () => {
    const yarnItem = await InventoryItem.create({
      sku: 'YRN-BAMBOO-30S',
      name: '30s Bamboo Organic Yarn',
      category: 'RAW_YARN',
      unit: 'KILOGRAM',
      quantityOnHand: 800,
      quantityReserved: 300,
      unitCost: 350,
    });

    const order = await Order.create({
      orderNumber: 'ORD-PROD-901',
      quotationId: new mongoose.Types.ObjectId(),
      customerId: adminUser._id,
      items: [
        {
          productId: new mongoose.Types.ObjectId(),
          quantity: 2000,
          unit: 'METER',
          unitPrice: 220,
          lineTotal: 440000,
        },
      ],
      subtotal: 440000,
      taxAmount: 22000,
      totalAmount: 462000,
      confirmedDeliveryDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
      status: 'CONFIRMED',
    });

    const { stockMovement, inventoryItem } = await issueMaterialToProduction({
      orderId: order._id,
      inventoryItemId: yarnItem._id,
      quantity: 300,
      unit: 'KILOGRAM',
      reason: 'Issued for Warping and Sizing stage',
      actorUser: adminUser,
    });

    expect(inventoryItem.quantityOnHand).toBe(500); // 800 - 300
    expect(inventoryItem.quantityReserved).toBe(0); // 300 reserved deducted
    expect(stockMovement.movementType).toBe('PRODUCTION_ISSUE');
    expect(stockMovement.quantity).toBe(-300);

    const reloadedOrder = await Order.findById(order._id);
    expect(reloadedOrder.status).toBe('YARN_ALLOCATED');
  });

  // 7. Physical Audit Adjustment Bounds
  it('7. Rejects physical audit adjustment if on-hand would drop below reserved stock', async () => {
    const yarnItem = await InventoryItem.create({
      sku: 'YRN-AUDIT-01',
      name: 'Audit Test Yarn',
      category: 'RAW_YARN',
      unit: 'KILOGRAM',
      quantityOnHand: 400,
      quantityReserved: 300,
      unitCost: 200,
    });

    // Attempting to deduct 200 kg via audit would leave 200 on hand, which is below 300 reserved
    await expect(
      adjustStockPhysicalAudit({
        inventoryItemId: yarnItem._id,
        deltaAmount: -200,
        reason: 'Physical inventory discrepancy',
        actorUser: adminUser,
      })
    ).rejects.toThrow(/Cannot adjust below reserved stock/);

    // Deducting 50 kg is valid (leaves 350 >= 300 reserved)
    const { inventoryItem, stockMovement } = await adjustStockPhysicalAudit({
      inventoryItemId: yarnItem._id,
      deltaAmount: -50,
      reason: 'Physical shrinkage adjustment',
      actorUser: adminUser,
    });

    expect(inventoryItem.quantityOnHand).toBe(350);
    expect(stockMovement.movementType).toBe('PHYSICAL_AUDIT_ADJUSTMENT');
    expect(stockMovement.quantity).toBe(-50);
  });

  // 8. Purchase Request & Procurement Workflow for Shortages
  it('8. Supports shortage PR creation, approval, and PO generation', async () => {
    const yarnItem = await InventoryItem.create({
      sku: 'YRN-SHORTAGE-01',
      name: 'High-Shrinkage Yarn',
      category: 'RAW_YARN',
      unit: 'KILOGRAM',
      quantityOnHand: 50,
      quantityReserved: 0,
      minimumReorderLevel: 200,
      unitCost: 310,
    });

    // 1. Create Purchase Request
    const pr = await createPurchaseRequest({
      inventoryItemId: yarnItem._id,
      requiredQuantity: 300,
      unit: 'KILOGRAM',
      reason: 'SHORTAGE_FOR_ORDER',
      notes: 'Urgent order commitment for export shipment',
      actorUser: adminUser,
    });

    expect(pr.status).toBe('PENDING');
    expect(pr.requiredQuantity).toBe(300);

    // 2. Approve PR
    const approvedPr = await approvePurchaseRequest(pr._id, adminUser);
    expect(approvedPr.status).toBe('APPROVED');

    // 3. Create PO linked to PR
    const po = await createPurchaseOrder({
      supplierId: sampleSupplier._id,
      purchaseRequestId: pr._id,
      items: [
        {
          inventoryItemId: yarnItem._id,
          quantity: 300,
          unitPrice: 310,
        },
      ],
      expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      notes: 'Generated from PRQ',
      actorUser: adminUser,
    });

    expect(po.status).toBe('ISSUED');
    expect(po.totalAmount).toBe(300 * 310 * 1.05); // 93000 + 5% tax = 97650

    const updatedPr = await PurchaseRequest.findById(pr._id);
    expect(updatedPr.status).toBe('PO_CREATED');
    expect(updatedPr.purchaseOrderId.toString()).toBe(po._id.toString());
  });

  // 9. Production Planning — Material Readiness Barrier
  it('9. Blocks normal scheduling when material is lacking and enforces DRAFT until resolved', async () => {
    // Only 50 kg available
    await InventoryItem.create({
      sku: 'YRN-READY-01',
      name: 'Ready Check Yarn',
      category: 'RAW_YARN',
      unit: 'KILOGRAM',
      quantityOnHand: 50,
      quantityReserved: 0,
      minimumReorderLevel: 100,
      unitCost: 200,
    });

    // Order requires ~1000 meters -> ~150 kg yarn
    const order = await Order.create({
      orderNumber: 'ORD-PLAN-001',
      quotationId: new mongoose.Types.ObjectId(),
      customerId: adminUser._id,
      items: [
        {
          productId: new mongoose.Types.ObjectId(),
          fabricSpecSnapshot: { gsm: 150, widthInches: 58 },
          quantity: 1000,
          unit: 'METER',
          unitPrice: 300,
          lineTotal: 300000,
        },
      ],
      subtotal: 300000,
      taxAmount: 15000,
      totalAmount: 315000,
      confirmedDeliveryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      status: 'CONFIRMED',
    });

    const readiness = await evaluateProductionReadiness(order._id);
    expect(readiness.materialReadiness.isReady).toBe(false);
    expect(readiness.materialReadiness.shortageKg).toBeGreaterThan(0);

    // Attempting to create plan in APPROVED status must be strictly blocked
    await expect(
      createProductionPlan({
        orderId: order._id,
        plannedStartDate: new Date(),
        plannedCompletionDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        stages: [
          {
            stageName: 'WEAVING',
            sequence: 1,
            targetQuantity: 1000,
            unit: 'METER',
            estimatedHours: 48,
          },
        ],
        status: 'APPROVED',
        actorUser: adminUser,
      })
    ).rejects.toThrow(/Material readiness check failed/);

    // Creating plan in DRAFT status is allowed and flags material shortage
    const draftPlan = await createProductionPlan({
      orderId: order._id,
      plannedStartDate: new Date(),
      plannedCompletionDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      stages: [
        {
          stageName: 'WEAVING',
          sequence: 1,
          targetQuantity: 1000,
          unit: 'METER',
          estimatedHours: 48,
        },
      ],
      status: 'DRAFT',
      actorUser: adminUser,
    });

    expect(draftPlan.status).toBe('DRAFT');
    expect(draftPlan.materialReadinessStatus).toBe('SHORTAGE');
    expect(draftPlan.materialShortageDetails.shortageKg).toBeGreaterThan(0);
  });

  // 10. Machine Conflicts, Bottlenecks & Authorized Rescheduling
  it('10. Detects machine conflicts, logs authorized rescheduling history, and reports analytics', async () => {
    // Setup Machines
    const loom1 = await Machine.create({
      machineCode: 'LOOM-AJ-01',
      name: 'Air Jet Loom #1',
      type: 'AIR_JET_LOOM',
      location: { shed: 'Weaving Shed A', bay: 'Bay 3' },
      status: 'IDLE',
    });

    const order1 = await Order.create({
      orderNumber: 'ORD-CONFLICT-1',
      quotationId: new mongoose.Types.ObjectId(),
      customerId: adminUser._id,
      items: [{ productId: new mongoose.Types.ObjectId(), quantity: 1000, unit: 'METER', unitPrice: 200, lineTotal: 200000 }],
      subtotal: 200000,
      taxAmount: 10000,
      totalAmount: 210000,
      confirmedDeliveryDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
      status: 'CONFIRMED',
    });

    const order2 = await Order.create({
      orderNumber: 'ORD-CONFLICT-2',
      quotationId: new mongoose.Types.ObjectId(),
      customerId: adminUser._id,
      items: [{ productId: new mongoose.Types.ObjectId(), quantity: 1500, unit: 'METER', unitPrice: 200, lineTotal: 300000 }],
      subtotal: 300000,
      taxAmount: 15000,
      totalAmount: 315000,
      confirmedDeliveryDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000), // Tighter deadline
      status: 'CONFIRMED',
    });

    // Provide sufficient yarn for readiness
    await InventoryItem.create({
      sku: 'YRN-CONF-01',
      name: 'Conflict Test Yarn',
      category: 'RAW_YARN',
      unit: 'KILOGRAM',
      quantityOnHand: 2000,
      quantityReserved: 0,
      unitCost: 200,
    });

    const start1 = new Date();
    const end1 = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);

    // Create Plan 1 (Approved on Loom 1)
    const plan1 = await createProductionPlan({
      orderId: order1._id,
      plannedStartDate: start1,
      plannedCompletionDate: end1,
      stages: [
        {
          stageName: 'WEAVING',
          sequence: 1,
          targetQuantity: 1000,
          unit: 'METER',
          estimatedHours: 40,
          assignedMachineIds: [loom1._id],
        },
      ],
      status: 'APPROVED',
      actorUser: adminUser,
    });

    expect(plan1.stages[0].machineConflict.hasConflict).toBe(false);

    // Create Plan 2 overlapping with Plan 1 on the exact same Loom 1
    const plan2 = await createProductionPlan({
      orderId: order2._id,
      plannedStartDate: start1,
      plannedCompletionDate: end1,
      stages: [
        {
          stageName: 'WEAVING',
          sequence: 1,
          targetQuantity: 1500,
          unit: 'METER',
          estimatedHours: 60,
          assignedMachineIds: [loom1._id],
        },
      ],
      status: 'DRAFT',
      actorUser: adminUser,
    });

    // Machine conflict must be detected
    expect(plan2.stages[0].machineConflict.hasConflict).toBe(true);
    expect(plan2.stages[0].machineConflict.conflictingPlanNumber).toBe(plan1.planNumber);

    // Authorized Rescheduling of Plan 2 to avoid conflict
    const newStart = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000);
    const newEnd = new Date(Date.now() + 16 * 24 * 60 * 60 * 1000); // Exceeds order 2's confirmed delivery (12 days)

    const rescheduledPlan2 = await rescheduleProductionPlan({
      planId: plan2._id,
      newStartDate: newStart,
      newCompletionDate: newEnd,
      reason: 'Shifted schedule to resolve machine conflict with Plan 1 on Loom AJ-01',
      actorUser: adminUser,
    });

    expect(rescheduledPlan2.rescheduledHistory.length).toBe(1);
    expect(rescheduledPlan2.rescheduledHistory[0].reason).toBe(
      'Shifted schedule to resolve machine conflict with Plan 1 on Loom AJ-01'
    );
    // Since newEnd (16 days) exceeds order2 confirmedDeliveryDate (12 days), delay risk must be flagged
    expect(rescheduledPlan2.isAtRiskOfDelay).toBe(true);
    expect(rescheduledPlan2.riskReason).toMatch(/exceeds customer agreed delivery date/);

    // Planning Overview Analytics
    const overview = await getPlanningOverview();
    expect(overview.activePlansCount).toBe(2);
    expect(overview.ordersAtRiskCount).toBe(1);
    expect(overview.conflictsCount).toBe(1);
  });
});

