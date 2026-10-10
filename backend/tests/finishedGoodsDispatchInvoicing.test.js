import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../src/app.js';
import {
  User,
  Order,
  FabricRoll,
  QualityInspection,
  FinishedGoodsInventory,
  Dispatch,
  DispatchItem,
  Invoice,
  CustomerPayment,
  StockMovement,
  AuditLog,
} from '../src/models/index.js';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env.js';
import {
  addToFinishedGoods,
  reserveRollsForDispatch,
  releaseReservedRolls,
  createDispatch,
  updateDeliveryStatus,
  recordCustomerPayment,
  getDispatchDashboardMetrics,
} from '../src/services/dispatch.service.js';

describe('Prompt 9 — Finished Goods, Dispatch, and Invoicing', () => {
  let replSet;
  let adminUser, customerUser, anotherCustomer;
  let adminCookie, customerCookie, anotherCustomerCookie;
  let testOrder;

  const createAuthCookie = (user) => {
    const token = jwt.sign(
      { id: user._id.toString(), email: user.email, role: user.role },
      env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    return `${env.COOKIE_NAME}=${token}`;
  };

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const uri = replSet.getUri();
    await mongoose.connect(uri);

    // Initialize all indexes
    await User.init();
    await Order.init();
    await FabricRoll.init();
    await FinishedGoodsInventory.init();
    await Dispatch.init();
    await DispatchItem.init();
    await Invoice.init();
    await CustomerPayment.init();
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

    adminUser = await User.create({
      name: 'Dispatch Head',
      email: 'dispatch.head@fabricops.io',
      passwordHash: 'dummy',
      role: 'ADMIN',
    });

    customerUser = await User.create({
      name: 'Zara Sourcing Global',
      email: 'buyer.zara@domain.com',
      passwordHash: 'dummy',
      role: 'CUSTOMER',
    });

    anotherCustomer = await User.create({
      name: 'H&M Sourcing',
      email: 'buyer.hm@domain.com',
      passwordHash: 'dummy',
      role: 'CUSTOMER',
    });

    adminCookie = createAuthCookie(adminUser);
    customerCookie = createAuthCookie(customerUser);
    anotherCustomerCookie = createAuthCookie(anotherCustomer);

    const mockProductId = new mongoose.Types.ObjectId();
    const mockQuotationId = new mongoose.Types.ObjectId();

    testOrder = await Order.create({
      orderNumber: `ORD-PROMPT9-${Date.now().toString().slice(-4)}`,
      quotationId: mockQuotationId,
      idempotencyKey: `idemp-order-key-${Date.now()}`,
      customerId: customerUser._id,
      fabricType: 'Combed Cotton Poplin',
      color: 'Optical White',
      totalMetersOrdered: 500,
      producedMeters: 0,
      subtotal: 150000,
      taxAmount: 7500,
      totalAmount: 157500,
      pricing: { unitPrice: 300, subtotal: 150000, totalAmount: 157500 },
      items: [
        {
          productId: mockProductId,
          quantity: 500,
          unit: 'METER',
          unitPrice: 300,
          lineTotal: 150000,
        },
      ],
      status: 'CONFIRMED',
      confirmedDeliveryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    });
  });

  const createTestRoll = async (overrides = {}) => {
    const mockLoomId = new mongoose.Types.ObjectId();
    const mockJobId = new mongoose.Types.ObjectId();
    return await FabricRoll.create({
      rollNumber: `ROL-${Date.now().toString().slice(-5)}-${Math.floor(100 + Math.random() * 900)}`,
      orderId: testOrder._id,
      productionJobId: mockJobId,
      loomMachineId: mockLoomId,
      genealogy: { yarnBatchNumbers: ['BATCH-P9-01'], loomCode: 'LM-01' },
      grossMeters: 105,
      netMeters: 100,
      weightKg: 25,
      grade: 'GRADE_A',
      status: 'PACKED_FOR_DISPATCH',
      inspectionStatus: 'PASSED',
      ...overrides,
    });
  };

  it('1. Quality & packing gating: adds eligible rolls to Finished Goods and blocks unapproved rolls', async () => {
    // A: Approved Grade A roll
    const passedRoll = await createTestRoll({
      rollNumber: 'ROL-FG-PASS-01',
      status: 'GRADE_A',
    });

    // B: Failed / Rework roll
    const failedRoll = await createTestRoll({
      rollNumber: 'ROL-FG-FAIL-02',
      grade: 'REJECT',
      status: 'REWORK_REQUIRED',
      inspectionStatus: 'REWORK_REQUIRED',
    });

    // Adding passed roll succeeds
    const fgItem = await addToFinishedGoods({
      fabricRollId: passedRoll._id,
      warehouseLocation: 'FG-BAY-C3-RACK-12',
      packingStatus: 'POLY_WRAPPED',
      actorUser: adminUser,
    });

    expect(fgItem).toBeDefined();
    expect(fgItem.rollNumber).toBe('ROL-FG-PASS-01');
    expect(fgItem.status).toBe('AVAILABLE');
    expect(fgItem.warehouseLocation).toBe('FG-BAY-C3-RACK-12');

    // Roll status updated to PACKED_FOR_DISPATCH
    const updatedRoll = await FabricRoll.findById(passedRoll._id);
    expect(updatedRoll.status).toBe('PACKED_FOR_DISPATCH');

    // Adding failed roll must throw validation error
    await expect(
      addToFinishedGoods({
        fabricRollId: failedRoll._id,
        warehouseLocation: 'FG-BAY-C3-RACK-12',
        actorUser: adminUser,
      })
    ).rejects.toThrow(/Cannot add roll.*failed inspection or requires rework/);
  });

  it('2. Roll reservation during dispatch preparation prevents double allocation', async () => {
    const roll = await createTestRoll({
      rollNumber: 'ROL-RES-01',
    });

    await addToFinishedGoods({
      fabricRollId: roll._id,
      actorUser: adminUser,
    });

    // Reserve rolls
    const resResult = await reserveRollsForDispatch({
      orderId: testOrder._id,
      rollIds: [roll._id],
      actorUser: adminUser,
    });

    expect(resResult.success).toBe(true);

    const fgRecord = await FinishedGoodsInventory.findOne({ fabricRollId: roll._id });
    expect(fgRecord.status).toBe('RESERVED_FOR_DISPATCH');
    expect(fgRecord.reservedAt).toBeDefined();

    // Trying to reserve again when already reserved should fail
    await expect(
      reserveRollsForDispatch({
        orderId: testOrder._id,
        rollIds: [roll._id],
        actorUser: adminUser,
      })
    ).rejects.toThrow(/Reservation failed.*not currently AVAILABLE/);

    // Release rolls back to AVAILABLE
    await releaseReservedRolls({ rollIds: [roll._id], actorUser: adminUser });
    const releasedFG = await FinishedGoodsInventory.findOne({ fabricRollId: roll._id });
    expect(releasedFG.status).toBe('AVAILABLE');
  });

  it('3. Atomically creates dispatch, dedicated DispatchItem records, matching tax Invoice, and stock movements', async () => {
    const roll1 = await createTestRoll({
      rollNumber: 'ROL-DSP-01',
      grade: 'GRADE_A',
    });

    const roll2 = await createTestRoll({
      rollNumber: 'ROL-DSP-02',
      grade: 'GRADE_B',
    });

    await addToFinishedGoods({ fabricRollId: roll1._id, actorUser: adminUser });
    await addToFinishedGoods({ fabricRollId: roll2._id, actorUser: adminUser });

    const dispatchResult = await createDispatch({
      orderId: testOrder._id,
      customerId: customerUser._id,
      rollIds: [roll1._id, roll2._id],
      carrierName: 'VRL Logistics Fleet',
      vehicleNumber: 'KA-04-AB-1234',
      driverName: 'Suresh Kumar',
      driverPhone: '+91 98765 43210',
      waybillNumber: 'VRL-WB-990112',
      gatePassNumber: 'GP-2026-0044',
      deliveryReference: 'DEL-NOTE-001',
      packagingType: 'POLY_WRAPPED_BALES',
      idempotencyKey: 'idemp-dsp-token-001',
      actorUser: adminUser,
    });

    expect(dispatchResult.isDuplicate).toBe(false);
    expect(dispatchResult.dispatch).toBeDefined();
    expect(dispatchResult.dispatch.totalRolls).toBe(2);
    expect(dispatchResult.dispatch.totalMetersDispatched).toBe(200);
    expect(dispatchResult.dispatch.waybillNumber).toBe('VRL-WB-990112');
    expect(dispatchResult.dispatch.carrierName).toBe('VRL Logistics Fleet');

    // Dedicated DispatchItem collection populated
    expect(dispatchResult.dispatchItems).toHaveLength(2);
    const item1 = dispatchResult.dispatchItems.find((i) => i.rollNumber === 'ROL-DSP-01');
    expect(item1).toBeDefined();
    expect(item1.ratePerMeter).toBe(300); // Derived from order unitPrice
    expect(item1.lineTotal).toBe(30000); // 100m * 300

    // Invoice correctly generated with 5% tax and line items
    expect(dispatchResult.invoice).toBeDefined();
    expect(dispatchResult.invoice.subtotal).toBe(60000); // 200m * 300
    expect(dispatchResult.invoice.taxAmount).toBe(3000); // 5% of 60000
    expect(dispatchResult.invoice.totalInvoiceAmount).toBe(63000);
    expect(dispatchResult.invoice.paymentStatus).toBe('UNPAID');

    // Rolls updated to DISPATCHED
    const updatedRoll1 = await FabricRoll.findById(roll1._id);
    expect(updatedRoll1.status).toBe('DISPATCHED');

    // Finished Goods records allocated
    const fgItem1 = await FinishedGoodsInventory.findOne({ fabricRollId: roll1._id });
    expect(fgItem1.status).toBe('DISPATCHED');
    expect(fgItem1.isAllocatedToDispatch).toBe(true);

    // Stock Movements recorded
    const movements = await StockMovement.find({ referenceId: dispatchResult.dispatch._id });
    expect(movements).toHaveLength(2);
  });

  it('4. Supports partial dispatches and accurately calculates remaining order quantity', async () => {
    // Order quantity is 500 meters
    const rollA = await createTestRoll({
      rollNumber: 'ROL-PART-01',
      netMeters: 200,
    });

    const rollB = await createTestRoll({
      rollNumber: 'ROL-PART-02',
      netMeters: 300,
    });

    await addToFinishedGoods({ fabricRollId: rollA._id, actorUser: adminUser });
    await addToFinishedGoods({ fabricRollId: rollB._id, actorUser: adminUser });

    // Partial Dispatch 1: 200m
    const dispatch1 = await createDispatch({
      orderId: testOrder._id,
      customerId: customerUser._id,
      rollIds: [rollA._id],
      carrierName: 'Gati Express',
      vehicleNumber: 'TN-38-CC-9900',
      waybillNumber: 'GATI-WB-101',
      gatePassNumber: 'GP-PART-01',
      idempotencyKey: 'idemp-part-01',
      actorUser: adminUser,
    });

    expect(dispatch1.isPartialDispatch).toBe(true);
    expect(dispatch1.remainingOrderMeters).toBe(300); // 500 - 200

    const orderAfterP1 = await Order.findById(testOrder._id);
    expect(orderAfterP1.status).toBe('PARTIALLY_DISPATCHED');
    expect(orderAfterP1.dispatchedMeters).toBe(200);

    // Partial Dispatch 2: Remaining 300m
    const dispatch2 = await createDispatch({
      orderId: testOrder._id,
      customerId: customerUser._id,
      rollIds: [rollB._id],
      carrierName: 'Gati Express',
      vehicleNumber: 'TN-38-CC-9900',
      waybillNumber: 'GATI-WB-102',
      gatePassNumber: 'GP-PART-02',
      idempotencyKey: 'idemp-part-02',
      actorUser: adminUser,
    });

    expect(dispatch2.isPartialDispatch).toBe(false);
    expect(dispatch2.remainingOrderMeters).toBe(0); // 500 - 500

    const orderAfterP2 = await Order.findById(testOrder._id);
    expect(orderAfterP2.status).toBe('COMPLETED');
    expect(orderAfterP2.dispatchedMeters).toBe(500);
  });

  it('5. Strictly blocks over-dispatch beyond order limits unless explicitly authorized', async () => {
    // Order is for 500m
    const hugeRoll = await createTestRoll({
      rollNumber: 'ROL-OVER-01',
      netMeters: 600, // 600 > 500
    });

    await addToFinishedGoods({ fabricRollId: hugeRoll._id, actorUser: adminUser });

    // Unauthorized over-dispatch must fail
    await expect(
      createDispatch({
        orderId: testOrder._id,
        customerId: customerUser._id,
        rollIds: [hugeRoll._id],
        carrierName: 'Safe Express',
        vehicleNumber: 'KA-01-EE-7788',
        waybillNumber: 'WB-OVER-01',
        gatePassNumber: 'GP-OVER-01',
        idempotencyKey: 'idemp-over-01',
        allowOverDispatch: false,
        actorUser: adminUser,
      })
    ).rejects.toThrow(/Over-dispatch violation: Total cumulative dispatch 600m exceeds authorized order quantity/);

    // Authorized over-dispatch with reason succeeds
    const authorizedDispatch = await createDispatch({
      orderId: testOrder._id,
      customerId: customerUser._id,
      rollIds: [hugeRoll._id],
      carrierName: 'Safe Express',
      vehicleNumber: 'KA-01-EE-7788',
      waybillNumber: 'WB-OVER-01',
      gatePassNumber: 'GP-OVER-01',
      idempotencyKey: 'idemp-over-01',
      allowOverDispatch: true,
      overDispatchReason: 'Customer approved 20% allowance for dye lot overrun',
      actorUser: adminUser,
    });

    expect(authorizedDispatch.dispatch).toBeDefined();
    expect(authorizedDispatch.dispatch.totalMetersDispatched).toBe(600);
  });

  it('6. Double-commit guard prevents allocating the same roll to two dispatches concurrently', async () => {
    const roll = await createTestRoll({
      rollNumber: 'ROL-CONCURR-01',
      netMeters: 100,
    });

    await addToFinishedGoods({ fabricRollId: roll._id, actorUser: adminUser });

    // First dispatch commits the roll
    await createDispatch({
      orderId: testOrder._id,
      customerId: customerUser._id,
      rollIds: [roll._id],
      carrierName: 'Carrier A',
      vehicleNumber: 'KA-01-1111',
      waybillNumber: 'WB-CONCURR-1',
      gatePassNumber: 'GP-CONCURR-1',
      idempotencyKey: 'idemp-concurr-1',
      actorUser: adminUser,
    });

    // Second dispatch attempt for the same roll must fail with concurrency conflict or unapproved status
    await expect(
      createDispatch({
        orderId: testOrder._id,
        customerId: customerUser._id,
        rollIds: [roll._id],
        carrierName: 'Carrier B',
        vehicleNumber: 'KA-01-2222',
        waybillNumber: 'WB-CONCURR-2',
        gatePassNumber: 'GP-CONCURR-2',
        idempotencyKey: 'idemp-concurr-2',
        actorUser: adminUser,
      })
    ).rejects.toThrow(/Concurrency conflict|Dispatch rejected: Roll .* is not approved for dispatch/);
  });

  it('7. Idempotency control intercepts repeated dispatch requests gracefully without double writes', async () => {
    const roll = await createTestRoll({
      rollNumber: 'ROL-IDEMP-01',
      netMeters: 100,
    });

    await addToFinishedGoods({ fabricRollId: roll._id, actorUser: adminUser });

    const key = 'idemp-unique-client-key-888';

    // 1st call
    const res1 = await createDispatch({
      orderId: testOrder._id,
      customerId: customerUser._id,
      rollIds: [roll._id],
      carrierName: 'VRL Fleet',
      vehicleNumber: 'KA-01-9999',
      waybillNumber: 'WB-IDEMP-01',
      gatePassNumber: 'GP-IDEMP-01',
      idempotencyKey: key,
      actorUser: adminUser,
    });

    expect(res1.isDuplicate).toBe(false);

    // 2nd call with identical idempotencyKey
    const res2 = await createDispatch({
      orderId: testOrder._id,
      customerId: customerUser._id,
      rollIds: [roll._id],
      carrierName: 'VRL Fleet',
      vehicleNumber: 'KA-01-9999',
      waybillNumber: 'WB-IDEMP-01',
      gatePassNumber: 'GP-IDEMP-01',
      idempotencyKey: key,
      actorUser: adminUser,
    });

    expect(res2.isDuplicate).toBe(true);
    expect(res2.dispatch._id.toString()).toBe(res1.dispatch._id.toString());

    // Invoices count remains exactly 1
    const totalInvoices = await Invoice.countDocuments({ dispatchId: res1.dispatch._id });
    expect(totalInvoices).toBe(1);
  });

  it('8. Delivery tracking: transitions dispatch status to DELIVERED with receiver signature', async () => {
    const roll = await createTestRoll({
      rollNumber: 'ROL-DELIV-01',
      netMeters: 100,
    });

    await addToFinishedGoods({ fabricRollId: roll._id, actorUser: adminUser });

    const { dispatch } = await createDispatch({
      orderId: testOrder._id,
      customerId: customerUser._id,
      rollIds: [roll._id],
      carrierName: 'FedEx Freight',
      vehicleNumber: 'KA-04-FED-11',
      waybillNumber: 'WB-DELIV-777',
      gatePassNumber: 'GP-DELIV-777',
      idempotencyKey: 'idemp-deliv-777',
      actorUser: adminUser,
    });

    // Update to IN_TRANSIT
    await updateDeliveryStatus({
      dispatchId: dispatch._id,
      status: 'IN_TRANSIT',
      actorUser: adminUser,
    });

    const inTransit = await Dispatch.findById(dispatch._id);
    expect(inTransit.status).toBe('IN_TRANSIT');

    // Confirm DELIVERED
    const delivered = await updateDeliveryStatus({
      dispatchId: dispatch._id,
      status: 'DELIVERED',
      actualDeliveryDate: new Date(),
      receiverSignatureAck: 'Received by Warehouse Manager Rajesh (ID: ZAR-99)',
      proofOfDeliveryNotes: 'Seals intact, 1 pallet verified and accepted.',
      actorUser: adminUser,
    });

    expect(delivered.status).toBe('DELIVERED');
    expect(delivered.receiverSignatureAck).toContain('Received by Warehouse Manager');
    expect(delivered.actualDeliveryDate).toBeDefined();
  });

  it('9. Invoicing, payment recording, and outstanding balance reconciliation', async () => {
    const roll = await createTestRoll({
      rollNumber: 'ROL-PAY-01',
      netMeters: 100,
    });

    await addToFinishedGoods({ fabricRollId: roll._id, actorUser: adminUser });

    const { invoice } = await createDispatch({
      orderId: testOrder._id,
      customerId: customerUser._id,
      rollIds: [roll._id],
      carrierName: 'TCI Freight',
      vehicleNumber: 'KA-05-9988',
      waybillNumber: 'WB-PAY-01',
      gatePassNumber: 'GP-PAY-01',
      idempotencyKey: 'idemp-pay-01',
      actorUser: adminUser,
    });

    // Invoice total: 100m * 300 = 30,000 + 5% tax (1,500) = 31,500
    expect(invoice.totalInvoiceAmount).toBe(31500);
    expect(invoice.paymentStatus).toBe('UNPAID');

    // Payment 1: Partial payment of 15,000
    const pay1 = await recordCustomerPayment({
      invoiceId: invoice._id,
      amountPaid: 15000,
      paymentMethod: 'BANK_TRANSFER',
      referenceNumber: 'UTR-HDFC-202610-001',
      actorUser: adminUser,
    });

    expect(pay1.invoice.amountPaid).toBe(15000);
    expect(pay1.invoice.balanceDue).toBe(16500);
    expect(pay1.invoice.paymentStatus).toBe('PARTIALLY_PAID');

    // Duplicate UTR prevention
    await expect(
      recordCustomerPayment({
        invoiceId: invoice._id,
        amountPaid: 5000,
        paymentMethod: 'BANK_TRANSFER',
        referenceNumber: 'UTR-HDFC-202610-001', // duplicate!
        actorUser: adminUser,
      })
    ).rejects.toThrow(/Duplicate payment reference/);

    // Payment 2: Settle remaining 16,500
    const pay2 = await recordCustomerPayment({
      invoiceId: invoice._id,
      amountPaid: 16500,
      paymentMethod: 'BANK_TRANSFER',
      referenceNumber: 'UTR-HDFC-202610-002',
      actorUser: adminUser,
    });

    expect(pay2.invoice.amountPaid).toBe(31500);
    expect(pay2.invoice.balanceDue).toBe(0);
    expect(pay2.invoice.paymentStatus).toBe('PAID');
  });

  it('10. RBAC and Customer Isolation: customers view only their authorized invoices and dispatches', async () => {
    const roll = await createTestRoll({
      rollNumber: 'ROL-ISOL-01',
      netMeters: 100,
    });

    await addToFinishedGoods({ fabricRollId: roll._id, actorUser: adminUser });

    const { dispatch, invoice } = await createDispatch({
      orderId: testOrder._id,
      customerId: customerUser._id,
      rollIds: [roll._id],
      carrierName: 'Bluedart Logistics',
      vehicleNumber: 'DL-01-BD-4422',
      waybillNumber: 'WB-ISOL-01',
      gatePassNumber: 'GP-ISOL-01',
      idempotencyKey: 'idemp-isol-01',
      actorUser: adminUser,
    });

    // 1. Authorized Customer accesses their own dispatch list
    const resOwnDispatches = await request(app)
      .get('/api/v1/dispatch')
      .set('Cookie', customerCookie);

    expect(resOwnDispatches.status).toBe(200);
    expect(resOwnDispatches.body.data).toHaveLength(1);
    expect(resOwnDispatches.body.data[0].dispatchNumber).toBe(dispatch.dispatchNumber);

    // 2. Authorized Customer accesses their own invoice list
    const resOwnInvoices = await request(app)
      .get('/api/v1/dispatch/invoices')
      .set('Cookie', customerCookie);

    expect(resOwnInvoices.status).toBe(200);
    expect(resOwnInvoices.body.data).toHaveLength(1);
    expect(resOwnInvoices.body.data[0].invoiceNumber).toBe(invoice.invoiceNumber);

    // 3. Different Customer attempting to access Customer A's invoice is blocked
    const resCrossInvoice = await request(app)
      .get(`/api/v1/dispatch/invoices/${invoice._id}`)
      .set('Cookie', anotherCustomerCookie);

    expect(resCrossInvoice.status).toBe(404); // Throws 'Invoice not found or access unauthorized'
  });
});
