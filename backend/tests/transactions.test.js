import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import {
  User,
  Quotation,
  Order,
  FabricRoll,
  QualityInspection,
  FinishedGoodsInventory,
  Dispatch,
  Invoice,
  StockMovement,
  AuditLog,
} from '../src/models/index.js';
import {
  confirmOrderTransaction,
  executeDispatchTransaction,
} from '../src/services/transaction.service.js';

describe('Everest Textile OS — Multi-Document ACID Transactions', () => {
  let replSet;

  beforeAll(async () => {
    // Spin up an in-memory replica set to support multi-document ACID transactions
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const uri = replSet.getUri();
    await mongoose.connect(uri);

    // Initialize model indexes
    await Quotation.init();
    await Order.init();
    await FabricRoll.init();
    await FinishedGoodsInventory.init();
    await Dispatch.init();
    await Invoice.init();
    await StockMovement.init();
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
  });

  it('atomically converts an accepted quotation to an order and creates audit log in a single transaction', async () => {
    const adminUser = await User.create({
      name: 'Admin Supervisor',
      email: 'admin.trans@domain.com',
      passwordHash: 'dummy',
      role: 'ADMIN',
    });

    const customerUser = await User.create({
      name: 'Apparel Corp',
      email: 'apparel.trans@domain.com',
      passwordHash: 'dummy',
      role: 'CUSTOMER',
    });

    const quote = await Quotation.create({
      quotationNumber: 'QT-ACID-001',
      customerId: customerUser._id,
      items: [
        {
          productId: new mongoose.Types.ObjectId(),
          quantity: 1000,
          unit: 'METER',
          unitPrice: 120,
          lineTotal: 120000,
        },
      ],
      subtotal: 120000,
      taxPercent: 5,
      taxAmount: 6000,
      totalAmount: 126000,
      proposedDeliveryDate: new Date(Date.now() + 10 * 86400000),
      validUntil: new Date(Date.now() + 5 * 86400000),
      status: 'CUSTOMER_ACCEPTED',
      customerDecision: {
        decision: 'ACCEPTED',
        agreedDeliveryDate: new Date(Date.now() + 10 * 86400000),
        agreedPrice: 120,
      },
    });

    // Execute atomic confirmation
    const order = await confirmOrderTransaction({
      quotationId: quote._id,
      customerId: customerUser._id,
      actorUser: adminUser,
    });

    expect(order).toBeDefined();
    expect(order.status).toBe('CONFIRMED');
    expect(order.totalAmount).toBe(126000);

    // Verify quotation status transitioned inside transaction
    const updatedQuote = await Quotation.findById(quote._id);
    expect(updatedQuote.status).toBe('CONVERTED_TO_ORDER');

    // Verify AuditLog written inside transaction
    const auditLogs = await AuditLog.find({ entityId: order._id });
    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0].action).toBe('QUOTATION_CONVERTED_TO_ORDER');
  });

  it('atomically executes a dispatch, creates invoice, updates finished goods, and prevents duplicates via idempotency key', async () => {
    const adminUser = await User.create({
      name: 'Dispatch Manager',
      email: 'dispatch.trans@domain.com',
      passwordHash: 'dummy',
      role: 'ADMIN',
    });

    const customerUser = await User.create({
      name: 'Buyer Retail',
      email: 'buyer.trans@domain.com',
      passwordHash: 'dummy',
      role: 'CUSTOMER',
    });

    const orderId = new mongoose.Types.ObjectId();
    const loomId = new mongoose.Types.ObjectId();
    const jobId = new mongoose.Types.ObjectId();

    // Create 2 approved fabric rolls
    const roll1 = await FabricRoll.create({
      rollNumber: 'ROLL-ACID-1',
      productionJobId: jobId,
      orderId,
      loomMachineId: loomId,
      genealogy: { yarnBatchNumbers: ['BATCH-01'] },
      grossMeters: 105,
      netMeters: 100,
      weightKg: 12,
      grade: 'GRADE_A',
      status: 'PACKED_FOR_DISPATCH',
    });

    const roll2 = await FabricRoll.create({
      rollNumber: 'ROLL-ACID-2',
      productionJobId: jobId,
      orderId,
      loomMachineId: loomId,
      genealogy: { yarnBatchNumbers: ['BATCH-01'] },
      grossMeters: 105,
      netMeters: 100,
      weightKg: 12,
      grade: 'GRADE_A',
      status: 'PACKED_FOR_DISPATCH',
    });

    await FinishedGoodsInventory.create({
      fabricRollId: roll1._id,
      rollNumber: roll1.rollNumber,
      orderId,
      productName: 'Combed Poplin',
      grade: 'GRADE_A',
      netMeters: 100,
      weightKg: 12,
      isAllocatedToDispatch: false,
    });

    await FinishedGoodsInventory.create({
      fabricRollId: roll2._id,
      rollNumber: roll2.rollNumber,
      orderId,
      productName: 'Combed Poplin',
      grade: 'GRADE_A',
      netMeters: 100,
      weightKg: 12,
      isAllocatedToDispatch: false,
    });

    const idempotencyKey = 'idemp-acid-token-999';

    // 1. First transaction execution
    const result1 = await executeDispatchTransaction({
      orderId,
      customerId: customerUser._id,
      rollIds: [roll1._id, roll2._id],
      carrierName: 'VRL Logistics',
      vehicleNumber: 'KA-01-JJ-5566',
      driverPhone: '+91 99001 22334',
      waybillNumber: 'WB-ACID-001',
      gatePassNumber: 'GP-ACID-001',
      idempotencyKey,
      actorUser: adminUser,
    });

    expect(result1.isDuplicate).toBe(false);
    expect(result1.dispatch.totalMetersDispatched).toBe(200);
    expect(result1.invoice.totalInvoiceAmount).toBeGreaterThan(0);

    // Verify rolls updated to DISPATCHED
    const updatedRoll1 = await FabricRoll.findById(roll1._id);
    expect(updatedRoll1.status).toBe('DISPATCHED');

    // Verify finished goods allocation updated
    const fgRecord = await FinishedGoodsInventory.findOne({ fabricRollId: roll1._id });
    expect(fgRecord.isAllocatedToDispatch).toBe(true);

    // Verify stock movements recorded
    const movements = await StockMovement.find({ referenceId: result1.dispatch._id });
    expect(movements).toHaveLength(2);

    // 2. Second attempt with SAME idempotencyKey must be gracefully recognized as duplicate without error or double write
    const result2 = await executeDispatchTransaction({
      orderId,
      customerId: customerUser._id,
      rollIds: [roll1._id, roll2._id],
      carrierName: 'VRL Logistics',
      vehicleNumber: 'KA-01-JJ-5566',
      waybillNumber: 'WB-ACID-002',
      gatePassNumber: 'GP-ACID-002',
      idempotencyKey, // Duplicate!
      actorUser: adminUser,
    });

    expect(result2.isDuplicate).toBe(true);
    expect(result2.dispatch._id.toString()).toBe(result1.dispatch._id.toString());
  });
});

