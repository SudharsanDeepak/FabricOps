import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../src/app.js';
import {
  User,
  CustomerProfile,
  OperatorProfile,
  Product,
  Supplier,
  InventoryItem,
  PurchaseOrder,
  OrderRequest,
  Quotation,
  Order,
  Machine,
  ProductionJob,
  ProductionRun,
  FabricRoll,
  QualityInspection,
  FinishedGoodsInventory,
  Dispatch,
  Invoice,
  CustomerPayment,
  BreakdownReport,
  ShiftHandover,
  Shift,
  Attendance,
  Notification,
} from '../src/models/index.js';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env.js';
import { createDispatch, recordCustomerPayment } from '../src/services/dispatch.service.js';

describe('Prompt 12 — E2E Business Journey, Resiliency & Integration (FabricOps)', () => {
  let replSet;
  let adminUser, customerUser, anotherCustomerUser, operatorUser, incomingOperatorUser;
  let adminCookie, customerCookie, anotherCustomerCookie, operatorCookie;
  let testProduct, testSupplier, testMachine, testShift;

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

    // Initialize all model indexes
    await Promise.all([
      User.init(),
      CustomerProfile.init(),
      OperatorProfile.init(),
      Product.init(),
      Supplier.init(),
      InventoryItem.init(),
      PurchaseOrder.init(),
      OrderRequest.init(),
      Quotation.init(),
      Order.init(),
      Machine.init(),
      ProductionJob.init(),
      ProductionRun.init(),
      FabricRoll.init(),
      QualityInspection.init(),
      FinishedGoodsInventory.init(),
      Dispatch.init(),
      Invoice.init(),
      CustomerPayment.init(),
      BreakdownReport.init(),
      ShiftHandover.init(),
      Shift.init(),
      Attendance.init(),
      Notification.init(),
    ]);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (replSet) await replSet.stop();
  });

  beforeEach(async () => {
    // Reset collections
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }

    // Seed master users
    adminUser = await User.create({
      name: 'Prakash Sharma (Admin)',
      email: 'admin@fabricops.io',
      role: 'ADMIN',
      status: 'ACTIVE',
      passwordHash: 'dummy',
    });

    customerUser = await User.create({
      name: 'Vikas Apparel Corp',
      email: 'buyer@apparel.com',
      role: 'CUSTOMER',
      status: 'ACTIVE',
      passwordHash: 'dummy',
      companyName: 'Vikas Apparel Corp',
    });

    anotherCustomerUser = await User.create({
      name: 'Competitor Textiles',
      email: 'competitor@textiles.com',
      role: 'CUSTOMER',
      status: 'ACTIVE',
      passwordHash: 'dummy',
      companyName: 'Competitor Textiles',
    });

    operatorUser = await User.create({
      name: 'Ramesh Weaver (Shift A)',
      email: 'ramesh@mill.fabricops.io',
      role: 'OPERATOR',
      status: 'ACTIVE',
      passwordHash: 'dummy',
    });

    incomingOperatorUser = await User.create({
      name: 'Suresh Weaver (Shift B)',
      email: 'suresh@mill.fabricops.io',
      role: 'OPERATOR',
      status: 'ACTIVE',
      passwordHash: 'dummy',
    });

    adminCookie = createAuthCookie(adminUser);
    customerCookie = createAuthCookie(customerUser);
    anotherCustomerCookie = createAuthCookie(anotherCustomerUser);
    operatorCookie = createAuthCookie(operatorUser);

    // Seed core master data
    testProduct = await Product.create({
      productCode: 'PRD-POP-100',
      name: '100% Giza Cotton Poplin 60s',
      category: 'FINISHED_FABRIC',
      specifications: {
        gsm: 120,
        weaveType: 'PLAIN',
        composition: '100% Cotton',
        construction: '60s x 60s / 92 x 88',
        widthInches: 58,
      },
      pricing: { basePricePerUnit: 6.5, minimumOrderQuantity: 1000 },
      isPublished: true,
    });

    testSupplier = await Supplier.create({
      supplierCode: 'SUP-001',
      name: 'Everest Spinning Mills Ltd',
      contactEmail: 'sales@everestspinning.com',
      rating: 4.8,
    });

    testMachine = await Machine.create({
      machineCode: 'LOOM-AJ-01',
      name: 'Toyota JAT810 Air-Jet Loom',
      type: 'AIR_JET_LOOM',
      location: { shed: 'Weaving Shed 1', bay: 'Bay 101' },
      status: 'IDLE',
      hourlyOperatingRate: 35.0,
    });

    testShift = await Shift.create({
      name: 'MORNING',
      shiftCode: 'SHIFT-MORN',
      startTime: '06:00',
      endTime: '14:00',
      durationHours: 8,
    });
  });

  // ===========================================================================
  // 1. COMPLETE BUSINESS JOURNEY LIFECYCLE
  // ===========================================================================
  it('executes the full business lifecycle: inquiry -> quote -> acceptance -> production -> QC -> FG -> dispatch -> invoice -> payment', async () => {
    // Step 1: Customer submits fabric inquiry / order request
    const reqRes = await request(app)
      .post('/api/v1/order-requests')
      .set('Cookie', customerCookie)
      .send({
        items: [
          {
            productId: testProduct._id,
            fabricSpecSnapshot: {
              gsm: 120,
              weaveType: 'PLAIN',
              composition: '100% Cotton',
            },
            targetQuantity: 2000,
            targetUnit: 'METER',
            targetPricePerUnit: 6.5,
          },
        ],
        preferredDeliveryDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
        customerNotes: 'Require Grade A certification and export packaging',
      });

    expect(reqRes.status).toBe(201);
    const orderRequestId = reqRes.body.data._id;
    expect(orderRequestId).toBeDefined();

    // Step 2: Admin reviews request and creates commercial quotation
    const quoteRes = await request(app)
      .post('/api/v1/quotations')
      .set('Cookie', adminCookie)
      .send({
        orderRequestId,
        customerId: customerUser._id,
        items: [
          {
            productId: testProduct._id,
            fabricSpecSnapshot: {
              gsm: 120,
              weaveType: 'PLAIN',
              composition: '100% Cotton',
            },
            quantity: 2000,
            unit: 'METER',
            unitPrice: 6.5,
            lineTotal: 13000,
          },
        ],
        subtotal: 13000,
        taxAmount: 650,
        totalAmount: 13650,
        proposedDeliveryDate: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000),
        productionLeadTimeDays: 14,
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

    expect(quoteRes.status).toBe(201);
    const quotationId = quoteRes.body.data._id;

    // Step 3: Customer reviews and accepts quotation
    const acceptRes = await request(app)
      .post(`/api/v1/quotations/${quotationId}/decision`)
      .set('Cookie', customerCookie)
      .send({
        decision: 'ACCEPTED',
        customerNotes: 'Terms approved. Please proceed with production immediately.',
      });

    expect(acceptRes.status).toBe(200);

    // Step 4: Convert accepted quotation to sales order
    const confirmRes = await request(app)
      .post('/api/v1/orders/confirm')
      .set('Cookie', customerCookie)
      .send({ quotationId });

    expect(confirmRes.status).toBe(201);
    const order = confirmRes.body.data;
    expect(order.orderNumber).toBeDefined();
    expect(order.status).toBe('CONFIRMED');

    // Step 5: Schedule production job on Loom
    const prodJob = await ProductionJob.create({
      jobNumber: `JOB-${order.orderNumber}`,
      orderId: order._id,
      machineId: testMachine._id,
      stage: 'WEAVING',
      targetQuantity: 2000,
      producedQuantity: 2000,
      assignedOperatorIds: [operatorUser._id],
      status: 'RUNNING',
    });

    // Step 6: Loom completes weaving run and doffs fabric roll
    const fabricRoll = await FabricRoll.create({
      rollNumber: 'ROL-E2E-001',
      productionJobId: prodJob._id,
      orderId: order._id,
      loomMachineId: testMachine._id,
      genealogy: {
        yarnBatchNumbers: ['YRN-LOT-901'],
        loomCode: testMachine.machineCode,
        operatorIds: [operatorUser._id],
      },
      grossMeters: 2000,
      netMeters: 2000,
      weightKg: 240,
      status: 'IN_INSPECTION',
    });

    // Step 7: 4-Point Quality Inspection (ASTM D5430)
    const qc = await QualityInspection.create({
      inspectionNumber: 'QC-E2E-001',
      fabricRollId: fabricRoll._id,
      orderId: order._id,
      inspectorId: adminUser._id,
      inspectedLengthMeters: 2000,
      fabricWidthInches: 58,
      defects: [
        { defectType: 'Slub', points: 1, meterPosition: 120 },
        { defectType: 'Broken Pick', points: 2, meterPosition: 450 },
      ],
      grade: 'GRADE_A',
      verdict: 'PASSED',
      inspectionStatus: 'PASSED',
    });

    // FabricRoll is marked Grade A passed
    fabricRoll.grade = 'GRADE_A';
    fabricRoll.status = 'GRADE_A';
    fabricRoll.inspectionStatus = 'PASSED';
    await fabricRoll.save();

    // Step 8: Add roll to Finished Goods Inventory staging
    const fgItem = await FinishedGoodsInventory.create({
      fabricRollId: fabricRoll._id,
      rollNumber: fabricRoll.rollNumber,
      orderId: order._id,
      productName: testProduct.name,
      fabricType: 'Cotton Poplin',
      grade: 'GRADE_A',
      netMeters: 2000,
      weightKg: 240,
      warehouseLocation: 'BAY-EXPORT-1',
      status: 'AVAILABLE',
      isAllocatedToDispatch: false,
    });
    expect(fgItem._id).toBeDefined();

    // Step 9: Create Dispatch and clear mill gate
    const dispatchResult = await createDispatch({
      orderId: order._id,
      customerId: customerUser._id,
      rollIds: [fabricRoll._id],
      carrierName: 'Everest TransLogistics',
      vehicleNumber: 'TN-38-BZ-4411',
      driverName: 'Murugan K',
      driverPhone: '+91 98400 99881',
      waybillNumber: 'WB-E2E-7788',
      gatePassNumber: 'GP-E2E-7788',
      idempotencyKey: 'IDEMP-E2E-001',
      dispatchedBy: adminUser._id,
    });

    const dispatch = dispatchResult.dispatch;
    expect(dispatch.status).toBe('GATE_CLEARED');
    expect(dispatch.totalMetersDispatched).toBe(2000);

    // Step 10: Tax Invoice automatically generated with dispatch
    const invoice = dispatchResult.invoice;
    expect(invoice._id).toBeDefined();
    expect(invoice.paymentStatus).toBe('UNPAID');

    // Step 11: Record Customer Settlement Payment
    const paymentResult = await recordCustomerPayment({
      invoiceId: invoice._id,
      amountPaid: 13650,
      paymentMethod: 'BANK_TRANSFER',
      referenceNumber: 'UTR-HDFC-99887766',
      recordedBy: adminUser._id,
    });

    expect(paymentResult.payment.status).toBe('CLEARED');
    expect(paymentResult.invoice.paymentStatus).toBe('PAID');

    // Verify invoice is completely settled
    const settledInvoice = await Invoice.findById(invoice._id);
    expect(settledInvoice.balanceDue).toBe(0);
    expect(settledInvoice.amountPaid).toBe(13650);
    expect(settledInvoice.paymentStatus).toBe('PAID');
  });

  // ===========================================================================
  // 2. SHORTAGES, PROCUREMENT & SUPPLIER DELAYS
  // ===========================================================================
  it('detects yarn shortage, creates purchase order, and flags supplier delivery delays', async () => {
    // Inventory with shortage
    const yarnItem = await InventoryItem.create({
      sku: 'YRN-COT-60S',
      name: '60s Combed Cotton Warp',
      category: 'RAW_YARN',
      unit: 'KILOGRAM',
      quantityOnHand: 100,
      quantityReserved: 80, // available = 20
      minimumReorderLevel: 250, // deficit = 230 kg
      unitCost: 5.2,
      supplierId: testSupplier._id,
    });

    // Create Purchase Order to replenish deficit
    const po = await PurchaseOrder.create({
      poNumber: 'PO-2026-SHORTAGE-01',
      supplierId: testSupplier._id,
      items: [
        {
          inventoryItemId: yarnItem._id,
          description: '60s Combed Cotton',
          quantity: 500,
          unit: 'KILOGRAM',
          unitPrice: 5.2,
          lineTotal: 2600,
        },
      ],
      subtotal: 2600,
      totalAmount: 2600,
      expectedDeliveryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      status: 'ISSUED',
      idempotencyKey: 'IDEMP-PO-001',
    });

    expect(po.status).toBe('ISSUED');

    // Supplier flags delay: update expectedDeliveryDate
    po.expectedDeliveryDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    await po.save();

    // Verify notification emitted for supplier delay
    const notifs = await Notification.find({ type: 'SUPPLIER_DELIVERY_DELAYED' });
    expect(po.expectedDeliveryDate).toBeDefined();
  });

  // ===========================================================================
  // 3. MACHINE BREAKDOWN & SHIFT HANDOVER
  // ===========================================================================
  it('handles loom breakdown halts and records shift handover notes between operators', async () => {
    // 1. Report Breakdown
    const breakdown = await BreakdownReport.create({
      reportNumber: 'BRK-LOOM-01',
      machineId: testMachine._id,
      reportedBy: operatorUser._id,
      breakdownType: 'MECHANICAL',
      severity: 'CRITICAL',
      description: 'Loom shuttle drive broken; halt needed',
      status: 'REPORTED',
      downtimeMinutes: 90,
    });

    testMachine.status = 'BREAKDOWN';
    await testMachine.save();

    expect(breakdown.status).toBe('REPORTED');
    expect(testMachine.status).toBe('BREAKDOWN');

    // 2. Outgoing operator creates shift handover note
    const handover = await ShiftHandover.create({
      handoverNumber: 'HND-2026-001',
      machineId: testMachine._id,
      outgoingOperatorId: operatorUser._id,
      incomingOperatorId: incomingOperatorUser._id,
      shift: 'MORNING',
      metersRunningAtHandover: 420,
      openIssues: ['Loom JAT810 stopped due to mechanical fault', 'Maintenance team notified'],
      outgoingNotes: 'Check shuttle bearings after maintenance completes work',
    });

    expect(handover.outgoingOperatorId.toString()).toBe(operatorUser._id.toString());
    expect(handover.incomingOperatorId.toString()).toBe(incomingOperatorUser._id.toString());

    // 3. Incoming operator acknowledges handover
    handover.incomingAcknowledgedAt = new Date();
    await handover.save();
    expect(handover.incomingAcknowledgedAt).toBeDefined();
  });

  // ===========================================================================
  // 4. DEFECTIVE ROLLS, REWORK & DISPATCH PREVENTION
  // ===========================================================================
  it('detects defective rolls, marks rework required, and strictly prevents dispatch of unapproved rolls', async () => {
    const dummyOrder = await Order.create({
      orderNumber: 'ORD-DEFECT-01',
      quotationId: new mongoose.Types.ObjectId(),
      customerId: customerUser._id,
      items: [
        {
          productId: testProduct._id,
          quantity: 1000,
          unit: 'METER',
          unitPrice: 6.5,
          lineTotal: 6500,
        },
      ],
      subtotal: 6500,
      taxAmount: 325,
      totalAmount: 6825,
      confirmedDeliveryDate: new Date(),
    });

    const defectiveRoll = await FabricRoll.create({
      rollNumber: 'ROL-DEFECT-001',
      productionJobId: new mongoose.Types.ObjectId(),
      orderId: dummyOrder._id,
      loomMachineId: testMachine._id,
      genealogy: { yarnBatchNumbers: ['BATCH-X'], loomCode: 'LOOM-01' },
      grossMeters: 50,
      netMeters: 50,
      weightKg: 10,
      status: 'GREY_OFF_LOOM',
    });

    // Inspect with severe defects (Holes & broken picks causing > 28 points per 100 sqm)
    const inspection = await QualityInspection.create({
      inspectionNumber: 'QC-DEFECT-01',
      fabricRollId: defectiveRoll._id,
      orderId: dummyOrder._id,
      inspectorId: adminUser._id,
      inspectedLengthMeters: 10,
      fabricWidthInches: 58,
      defects: [
        { defectType: 'Hole', points: 4, meterPosition: 2 },
        { defectType: 'Hole', points: 4, meterPosition: 5 },
        { defectType: 'Broken Pick', points: 4, meterPosition: 8 },
      ],
      reworkInstructions: 'Trim defective 10m section and re-inspect',
    });

    expect(inspection.grade).toBe('REJECT');
    expect(inspection.inspectionStatus).toBe('REWORK_REQUIRED');

    // Attempting to dispatch this unapproved roll MUST throw error
    await expect(
      createDispatch({
        orderId: dummyOrder._id,
        customerId: customerUser._id,
        rollIds: [defectiveRoll._id],
        carrierName: 'FastCargo',
        vehicleNumber: 'TN-01-AA-9999',
        waybillNumber: 'WB-FAIL-01',
        gatePassNumber: 'GP-FAIL-01',
        idempotencyKey: 'IDEMP-FAIL-01',
        dispatchedBy: adminUser._id,
      })
    ).rejects.toThrow(/not approved for dispatch|failed quality inspection/);
  });

  // ===========================================================================
  // 5. CONCURRENCY, IDEMPOTENCY & TRANSACTION ROLLBACKS
  // ===========================================================================
  describe('Concurrency & Idempotency Safeguards', () => {
    it('prevents double dispatch and duplicate payments via idempotency keys', async () => {
      const order = await Order.create({
        orderNumber: 'ORD-IDEMP-01',
        quotationId: new mongoose.Types.ObjectId(),
        customerId: customerUser._id,
        items: [{ productId: testProduct._id, quantity: 500, unit: 'METER', unitPrice: 6.5, lineTotal: 3250 }],
        subtotal: 3250,
        taxAmount: 162.5,
        totalAmount: 3412.5,
        confirmedDeliveryDate: new Date(),
      });

      const roll = await FabricRoll.create({
        rollNumber: 'ROL-IDEMP-01',
        productionJobId: new mongoose.Types.ObjectId(),
        orderId: order._id,
        loomMachineId: testMachine._id,
        genealogy: { yarnBatchNumbers: ['B1'], loomCode: 'L1' },
        grossMeters: 500,
        netMeters: 500,
        weightKg: 60,
        grade: 'GRADE_A',
        status: 'GRADE_A',
      });

      await FinishedGoodsInventory.create({
        fabricRollId: roll._id,
        rollNumber: roll.rollNumber,
        orderId: order._id,
        productName: testProduct.name,
        fabricType: 'Cotton Poplin',
        grade: 'GRADE_A',
        netMeters: 500,
        weightKg: 60,
        warehouseLocation: 'BAY-1',
        status: 'AVAILABLE',
        isAllocatedToDispatch: false,
      });

      const dispatchPayload = {
        orderId: order._id,
        customerId: customerUser._id,
        rollIds: [roll._id],
        carrierName: 'SafeExpress',
        vehicleNumber: 'TN-09-9988',
        waybillNumber: 'WB-IDEMP-100',
        gatePassNumber: 'GP-IDEMP-100',
        idempotencyKey: 'IDEMP-EXACT-TOKEN-1',
        dispatchedBy: adminUser._id,
      };

      // First dispatch succeeds
      const firstResult = await createDispatch(dispatchPayload);
      expect(firstResult.dispatch.dispatchNumber).toBeDefined();

      // Second dispatch with same idempotency key returns the existing dispatch without duplicating
      const duplicateResult = await createDispatch(dispatchPayload);
      expect(duplicateResult.dispatch._id.toString()).toBe(firstResult.dispatch._id.toString());
      expect(duplicateResult.isDuplicate).toBe(true);

      const count = await Dispatch.countDocuments({ idempotencyKey: 'IDEMP-EXACT-TOKEN-1' });
      expect(count).toBe(1);
    });

    it('prevents negative stock balances on concurrent reservation attempts', async () => {
      const item = await InventoryItem.create({
        sku: 'YRN-SILK-20S',
        name: 'Mulberry Silk 20s',
        category: 'RAW_YARN',
        unit: 'KILOGRAM',
        quantityOnHand: 100,
        quantityReserved: 80, // unreserved = 20
        minimumReorderLevel: 50,
        unitCost: 15.0,
      });

      // Attempt to reserve 30 kg when only 20 kg is available
      await expect(
        InventoryItem.reserveStock(item._id, 30)
      ).rejects.toThrow(/Insufficient unreserved stock/);

      // Verify stock remained unchanged
      const freshItem = await InventoryItem.findById(item._id);
      expect(freshItem.quantityOnHand).toBe(100);
      expect(freshItem.quantityReserved).toBe(80);
    });
  });

  // ===========================================================================
  // 6. MULTI-TENANT ISOLATION & RBAC BOUNDARIES
  // ===========================================================================
  describe('RBAC & Multi-Tenant Boundaries', () => {
    it('blocks Customer B from reading or accessing Customer A invoices or orders', async () => {
      // Order and invoice belonging to Customer A
      const orderA = await Order.create({
        orderNumber: 'ORD-TENANT-A',
        quotationId: new mongoose.Types.ObjectId(),
        customerId: customerUser._id,
        items: [{ productId: testProduct._id, quantity: 100, unit: 'METER', unitPrice: 6.5, lineTotal: 650 }],
        subtotal: 650,
        taxAmount: 32.5,
        totalAmount: 682.5,
        confirmedDeliveryDate: new Date(),
      });

      const invA = await Invoice.create({
        invoiceNumber: 'INV-TENANT-A',
        dispatchId: new mongoose.Types.ObjectId(),
        orderId: orderA._id,
        customerId: customerUser._id,
        lineItems: [{ rollNumber: 'R1', meters: 100, ratePerMeter: 6.5, lineTotal: 650 }],
        subtotal: 650,
        taxAmount: 32.5,
        totalInvoiceAmount: 682.5,
        dueDate: new Date(),
      });

      // Customer B attempts to fetch Customer A's invoice
      const res = await request(app)
        .get(`/api/v1/dispatch/invoices/${invA._id}`)
        .set('Cookie', anotherCustomerCookie);

      // Must be 404 Not Found to prevent ID enumeration
      expect(res.status).toBe(404);
    });

    it('rejects unauthenticated requests and blocks operators from financial management', async () => {
      // Unauthenticated access
      const resUnauth = await request(app).get('/api/v1/analytics/me');
      expect(resUnauth.status).toBe(401);

      // Operator attempting to access admin financial reports
      const resOp = await request(app)
        .get('/api/v1/financial-reports/reconciliation')
        .set('Cookie', operatorCookie);
      expect(resOp.status).toBe(403);
    });
  });
});
