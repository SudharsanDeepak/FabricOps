import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../src/app.js';
import {
  User,
  Notification,
  Order,
  OrderRequest,
  Quotation,
  InventoryItem,
  Machine,
  BreakdownReport,
  ProductionJob,
  ProductionRun,
  QualityInspection,
  FabricRoll,
  Dispatch,
  Invoice,
  CustomerPayment,
  Attendance,
  Shift,
  ShiftHandover,
  Supplier,
  Product,
} from '../src/models/index.js';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env.js';
import {
  createAndSendNotification,
  notifyAllAdmins,
  notifyNewOrderRequest,
  notifyQuotationEvent,
  notifyMaterialShortage,
  notifySupplierDeliveryDelayed,
  notifyProductionStageChanged,
  notifyMilestoneMissed,
  notifyMachineBreakdown,
  notifyTaskReassigned,
  notifyQualityEvent,
  notifyFinishedGoodsAvailable,
  notifyDispatchShipped,
  notifyInvoiceGenerated,
  notifyPaymentReceived,
  notifyDeliveryCompleted,
} from '../src/services/notification.service.js';

describe('Prompt 11 — Notifications, Analytics, and Reporting', () => {
  let replSet;
  let adminUser, customerUser, anotherCustomerUser, operatorUser;
  let adminCookie, customerCookie, anotherCustomerCookie, operatorCookie;
  let testProduct;

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

    // Ensure all model indexes are initialized
    await Promise.all([
      User.init(),
      Notification.init(),
      Order.init(),
      OrderRequest.init(),
      Quotation.init(),
      InventoryItem.init(),
      Machine.init(),
      BreakdownReport.init(),
      ProductionJob.init(),
      ProductionRun.init(),
      QualityInspection.init(),
      FabricRoll.init(),
      Dispatch.init(),
      Invoice.init(),
      CustomerPayment.init(),
      Attendance.init(),
      Shift.init(),
      ShiftHandover.init(),
    ]);

    // Seed test product
    testProduct = await Product.create({
      productCode: 'PRD-POP-001',
      name: 'Executive Cotton Poplin',
      category: 'FINISHED_FABRIC',
      specifications: {
        gsm: 125,
        weaveType: 'PLAIN',
        composition: '100% Giza Cotton',
        construction: '60s x 60s',
      },
      pricing: { basePricePerUnit: 5.5, minimumOrderQuantity: 500 },
      isPublished: true,
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (replSet) await replSet.stop();
  });

  beforeEach(async () => {
    // Clear all collections between tests
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      if (key !== 'products') {
        await collections[key].deleteMany({});
      }
    }

    // Seed standard users
    adminUser = await User.create({
      name: 'System Admin',
      email: 'admin@fabricops.io',
      role: 'ADMIN',
      status: 'ACTIVE',
      passwordHash: 'dummy',
    });

    customerUser = await User.create({
      name: 'Vikas Apparel Corp',
      email: 'vikas@apparel.com',
      role: 'CUSTOMER',
      status: 'ACTIVE',
      passwordHash: 'dummy',
      companyName: 'Vikas Apparel Corp',
    });

    anotherCustomerUser = await User.create({
      name: 'Global Fabrics Ltd',
      email: 'global@textiles.com',
      role: 'CUSTOMER',
      status: 'ACTIVE',
      passwordHash: 'dummy',
      companyName: 'Global Fabrics Ltd',
    });

    operatorUser = await User.create({
      name: 'Ramesh Weaver',
      email: 'ramesh@mill.fabricops.io',
      role: 'OPERATOR',
      status: 'ACTIVE',
      passwordHash: 'dummy',
    });

    adminCookie = createAuthCookie(adminUser);
    customerCookie = createAuthCookie(customerUser);
    anotherCustomerCookie = createAuthCookie(anotherCustomerUser);
    operatorCookie = createAuthCookie(operatorUser);
  });

  // ===========================================================================
  // SECTION 1: BUSINESS EVENT NOTIFICATIONS & DEDUPLICATION
  // ===========================================================================
  describe('Notification Engine & Deduplication', () => {
    it('should create and persist notification and suppress duplicates with identical eventReference', async () => {
      const eventRef = 'EVT-TEST-DEDUP-001';

      const firstNotif = await createAndSendNotification({
        recipientId: adminUser._id,
        recipientRole: 'ADMIN',
        title: 'Loom Test Alert',
        message: 'Loom AirJet-01 pinged test signal',
        type: 'BREAKDOWN_ALERT',
        priority: 'HIGH',
        eventReference: eventRef,
      });

      expect(firstNotif).toBeDefined();
      expect(firstNotif._id).toBeDefined();
      expect(firstNotif.title).toBe('Loom Test Alert');

      // Attempt duplicate notification with identical eventReference
      const duplicateNotif = await createAndSendNotification({
        recipientId: adminUser._id,
        recipientRole: 'ADMIN',
        title: 'Duplicate Loom Test Alert',
        message: 'Duplicate alert should be suppressed',
        type: 'BREAKDOWN_ALERT',
        priority: 'HIGH',
        eventReference: eventRef,
      });

      expect(duplicateNotif).toBeDefined();
      // Should return the original notification
      expect(duplicateNotif._id.toString()).toBe(firstNotif._id.toString());

      const count = await Notification.countDocuments({ eventReference: eventRef });
      expect(count).toBe(1);
    });

    it('should dispatch all business event notifications with correct roles and types', async () => {
      // 1. Order Request notification
      const dummyOrderReq = { _id: new mongoose.Types.ObjectId(), fabricType: 'Oxford Cotton', quantity: 2500 };
      const orderReqNotifs = await notifyNewOrderRequest(dummyOrderReq);
      expect(orderReqNotifs.length).toBeGreaterThan(0);
      expect(orderReqNotifs[0].type).toBe('ORDER_REQUEST_SUBMITTED');

      // 2. Quotation Proposed notification (to customer)
      const dummyQuote = {
        _id: new mongoose.Types.ObjectId(),
        quotationNumber: 'QT-2026-99',
        customerId: customerUser._id,
        version: 1,
      };
      const quotePropNotif = await notifyQuotationEvent(dummyQuote, 'PROPOSED');
      expect(quotePropNotif.recipientId.toString()).toBe(customerUser._id.toString());
      expect(quotePropNotif.type).toBe('QUOTATION_PROPOSED');

      // 3. Quotation Accepted notification (to admin)
      const quoteAccNotifs = await notifyQuotationEvent(dummyQuote, 'ACCEPTED', 'Vikas Apparel');
      expect(quoteAccNotifs[0].type).toBe('QUOTATION_ACCEPTED');

      // 4. Material Shortage notification
      const dummyInv = { _id: new mongoose.Types.ObjectId(), yarnName: '40s Combed Cotton' };
      const shortageNotifs = await notifyMaterialShortage({
        inventoryItem: dummyInv,
        requiredQuantity: 1200,
        shortageQuantity: 400,
      });
      expect(shortageNotifs[0].type).toBe('MATERIAL_SHORTAGE');

      // 5. Supplier Delivery Delayed
      const dummyPO = { _id: new mongoose.Types.ObjectId(), poNumber: 'PO-2026-004' };
      const delayNotifs = await notifySupplierDeliveryDelayed(dummyPO, 4);
      expect(delayNotifs[0].type).toBe('SUPPLIER_DELIVERY_DELAYED');

      // 6. Production Stage Changed
      const dummyJob = { _id: new mongoose.Types.ObjectId(), jobNumber: 'JOB-001', stage: 'WEAVING' };
      const stageNotifs = await notifyProductionStageChanged(dummyJob, 'DYEING');
      expect(stageNotifs[0].type).toBe('PRODUCTION_STAGE_CHANGED');

      // 7. Milestone Missed
      const dummyOrder = { _id: new mongoose.Types.ObjectId(), orderNumber: 'ORD-101' };
      const milestoneNotifs = await notifyMilestoneMissed(dummyOrder, 'Yarn sizing delayed');
      expect(milestoneNotifs[0].type).toBe('PRODUCTION_MILESTONE_MISSED');

      // 8. Breakdown Alert
      const dummyBreakdown = { _id: new mongoose.Types.ObjectId(), breakdownType: 'MECHANICAL', description: 'Warp stop broken' };
      const dummyMachine = { _id: new mongoose.Types.ObjectId(), machineCode: 'LOOM-01' };
      const breakdownNotifs = await notifyMachineBreakdown(dummyBreakdown, dummyMachine);
      expect(breakdownNotifs[0].type).toBe('BREAKDOWN_ALERT');

      // 9. Task Reassigned (to operator)
      const taskNotif = await notifyTaskReassigned(dummyJob, operatorUser, 'Suresh');
      expect(taskNotif.recipientId.toString()).toBe(operatorUser._id.toString());
      expect(taskNotif.type).toBe('TASK_REASSIGNED');

      // 10. Quality Failure and Passed
      const dummyInspection = { _id: new mongoose.Types.ObjectId(), rollNumber: 'ROL-889', grade: 'GRADE_A' };
      const qcPassNotifs = await notifyQualityEvent(dummyInspection, 'PASSED');
      expect(qcPassNotifs[0].type).toBe('QC_PASSED');

      const dummyFailInspection = { _id: new mongoose.Types.ObjectId(), rollNumber: 'ROL-890', defects: [{ type: 'Hole' }] };
      const qcFailNotifs = await notifyQualityEvent(dummyFailInspection, 'FAILED');
      expect(qcFailNotifs[0].type).toBe('QUALITY_FAILURE');

      // 11. Finished Goods Available
      const dummyFG = { _id: new mongoose.Types.ObjectId(), warehouseLocation: 'BAY-A1' };
      const fgNotifs = await notifyFinishedGoodsAvailable(dummyFG);
      expect(fgNotifs[0].type).toBe('FINISHED_GOODS_AVAILABLE');

      // 12. Dispatch Shipped
      const dummyDispatch = {
        _id: new mongoose.Types.ObjectId(),
        dispatchNumber: 'DSP-001',
        customerId: customerUser._id,
        carrierName: 'FastLogistics',
        waybillNumber: 'WB-9901',
        dispatchedMeters: 2000,
        vehicleNumber: 'KA-01-9988',
      };
      const dispatchNotifs = await notifyDispatchShipped(dummyDispatch);
      expect(dispatchNotifs[0].type).toBe('DISPATCH_SHIPPED');

      // 13. Invoice Generated
      const dummyInvoice = {
        _id: new mongoose.Types.ObjectId(),
        customerId: customerUser._id,
        invoiceNumber: 'INV-2026-001',
        totalInvoiceAmount: 11000,
      };
      await notifyInvoiceGenerated(dummyInvoice);

      // Verify customer received their invoice notification
      const custInvNotif = await Notification.findOne({
        recipientId: customerUser._id,
        type: 'INVOICE_GENERATED',
      });
      expect(custInvNotif).toBeDefined();

      // 14. Payment Received
      const dummyPayment = { _id: new mongoose.Types.ObjectId(), amountPaid: 5000, referenceNumber: 'UTR-998877' };
      const payNotifs = await notifyPaymentReceived(dummyPayment, dummyInvoice);
      expect(payNotifs[0].type).toBe('PAYMENT_RECEIVED');

      // 15. Delivery Completed
      await notifyDeliveryCompleted(dummyDispatch);
      const delvNotif = await Notification.findOne({
        recipientId: customerUser._id,
        type: 'DELIVERY_COMPLETED',
      });
      expect(delvNotif).toBeDefined();
    });
  });

  // ===========================================================================
  // SECTION 2: NOTIFICATION API & READ TRANSITIONS
  // ===========================================================================
  describe('Notification API Endpoints', () => {
    it('should list notifications for authenticated user with accurate unread counts', async () => {
      // Create 3 notifications for customer
      await Notification.create([
        {
          recipientId: customerUser._id,
          recipientRole: 'CUSTOMER',
          title: 'Order Approved',
          message: 'Your order has been approved.',
          type: 'ORDER_CONFIRMED',
          isRead: false,
        },
        {
          recipientId: customerUser._id,
          recipientRole: 'CUSTOMER',
          title: 'Quotation Issued',
          message: 'Quotation ready for review.',
          type: 'QUOTATION_PROPOSED',
          isRead: false,
        },
        {
          recipientId: customerUser._id,
          recipientRole: 'CUSTOMER',
          title: 'Dispatch Initiated',
          message: 'Rolls have left the mill.',
          type: 'DISPATCH_SHIPPED',
          isRead: true,
          readAt: new Date(),
        },
      ]);

      const res = await request(app)
        .get('/api/v1/notifications')
        .set('Cookie', customerCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(3);
      expect(res.body.unreadCount).toBe(2);
    });

    it('should mark a single notification as read and set readAt timestamp', async () => {
      const notif = await Notification.create({
        recipientId: customerUser._id,
        recipientRole: 'CUSTOMER',
        title: 'Review Quote',
        message: 'Action needed.',
        type: 'QUOTATION_PROPOSED',
        isRead: false,
      });

      const res = await request(app)
        .patch(`/api/v1/notifications/${notif._id}/read`)
        .set('Cookie', customerCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isRead).toBe(true);
      expect(res.body.data.readAt).toBeDefined();

      const updated = await Notification.findById(notif._id);
      expect(updated.isRead).toBe(true);
      expect(updated.readAt).toBeDefined();
    });

    it('should prevent cross-user mark as read (returns 404)', async () => {
      const notif = await Notification.create({
        recipientId: customerUser._id,
        recipientRole: 'CUSTOMER',
        title: 'Private Note',
        message: 'Customer only.',
        type: 'ORDER_CONFIRMED',
        isRead: false,
      });

      // Another customer tries to mark it as read
      const res = await request(app)
        .patch(`/api/v1/notifications/${notif._id}/read`)
        .set('Cookie', anotherCustomerCookie);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should mark all notifications as read in bulk', async () => {
      await Notification.create([
        {
          recipientId: operatorUser._id,
          recipientRole: 'OPERATOR',
          title: 'Shift Task 1',
          message: 'Task assigned',
          type: 'TASK_REASSIGNED',
          isRead: false,
        },
        {
          recipientId: operatorUser._id,
          recipientRole: 'OPERATOR',
          title: 'Shift Task 2',
          message: 'Task assigned',
          type: 'TASK_REASSIGNED',
          isRead: false,
        },
      ]);

      const res = await request(app)
        .patch('/api/v1/notifications/read-all')
        .set('Cookie', operatorCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const unread = await Notification.countDocuments({
        recipientId: operatorUser._id,
        isRead: false,
      });
      expect(unread).toBe(0);
    });
  });

  // ===========================================================================
  // SECTION 3: ADMIN DASHBOARD ANALYTICS (REAL DATABASE AGGREGATIONS)
  // ===========================================================================
  describe('Admin Dashboard Analytics', () => {
    it('should return resilient default zero values when collections are empty', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/admin')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const data = res.body.data;

      expect(data.ordersAwaitingDecisions.total).toBe(0);
      expect(data.ordersAtRiskOfDelay.count).toBe(0);
      expect(data.materialShortages.count).toBe(0);
      expect(data.materialShortages.totalShortageQuantity).toBe(0);
      expect(data.machineFleet.totalMachines).toBe(0);
      expect(data.machineFleet.fleetUtilizationRate).toBe(0);
      expect(data.dailyProduction.todayProducedMeters).toBe(0);
      expect(data.defectAndRework.totalInspections).toBe(0);
      expect(data.defectAndRework.defectRate).toBe(0);
      expect(data.defectAndRework.reworkRate).toBe(0);
      expect(data.dispatchesAndFinancials.totalInvoiced).toBe(0);
      expect(data.dispatchesAndFinancials.totalReceivables).toBe(0);
    });

    it('should calculate accurate aggregations with populated operational data', async () => {
      // 1. Seed pending order request & confirmed order
      await OrderRequest.create({
        requestNumber: 'REQ-1001',
        customerId: customerUser._id,
        items: [
          {
            productId: testProduct._id,
            fabricSpecSnapshot: { weaveType: 'Plain Twill' },
            targetQuantity: 3000,
            targetUnit: 'METER',
          },
        ],
        status: 'PENDING_REVIEW',
      });

      const testOrder = await Order.create({
        orderNumber: 'ORD-9001',
        quotationId: new mongoose.Types.ObjectId(),
        customerId: customerUser._id,
        items: [
          {
            productId: testProduct._id,
            quantity: 2000,
            unit: 'METER',
            unitPrice: 5.5,
            lineTotal: 11000,
          },
        ],
        subtotal: 11000,
        taxAmount: 550,
        totalAmount: 11550,
        confirmedDeliveryDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday -> delayed!
        status: 'IN_PRODUCTION',
        isAtRiskOfDelay: true,
        delayRiskReason: 'Yarn dye lot mismatch',
        totalMetersOrdered: 2000,
        producedMeters: 800,
      });

      // 2. Seed inventory with shortage
      await InventoryItem.create([
        {
          sku: 'YRN-COT-40S',
          name: '40s Combed Warp Yarn',
          category: 'RAW_YARN',
          unit: 'KILOGRAM',
          quantityOnHand: 200,
          quantityReserved: 150, // available = 50
          minimumReorderLevel: 300, // deficit = 250
          unitCost: 4.2,
        },
        {
          sku: 'YRN-POLY-30S',
          name: '30s Polyester Yarn',
          category: 'RAW_YARN',
          unit: 'KILOGRAM',
          quantityOnHand: 800,
          quantityReserved: 100, // available = 700
          minimumReorderLevel: 200, // sufficient
          unitCost: 3.1,
        },
      ]);

      // 3. Seed machines
      const loom1 = await Machine.create({
        machineCode: 'LOOM-01',
        name: 'Toyota AirJet Loom 1',
        type: 'AIR_JET_LOOM',
        location: { shed: 'Shed 1', bay: 'Bay A' },
        status: 'RUNNING',
      });
      const loom2 = await Machine.create({
        machineCode: 'LOOM-02',
        name: 'Toyota AirJet Loom 2',
        type: 'AIR_JET_LOOM',
        location: { shed: 'Shed 1', bay: 'Bay B' },
        status: 'BREAKDOWN',
      });

      await BreakdownReport.create({
        reportNumber: 'BRK-001',
        machineId: loom2._id,
        reportedBy: operatorUser._id,
        breakdownType: 'MECHANICAL',
        severity: 'CRITICAL',
        description: 'Main motor drive slippage',
        status: 'REPORTED',
        downtimeMinutes: 120,
      });

      // 4. Seed production run output today
      await ProductionRun.create({
        runNumber: 'RUN-501',
        productionJobId: new mongoose.Types.ObjectId(),
        orderId: testOrder._id,
        machineId: loom1._id,
        plannedMeters: 1000,
        actualProducedMeters: 650,
        status: 'RUNNING',
      });

      // 5. Seed inspections (1 pass, 1 rework)
      const dummyJobId = new mongoose.Types.ObjectId();
      const roll1 = await FabricRoll.create({
        rollNumber: 'ROL-001',
        orderId: testOrder._id,
        productionJobId: dummyJobId,
        loomMachineId: loom1._id,
        genealogy: { yarnBatchNumbers: ['BATCH-01'], loomCode: 'LOOM-01', operatorIds: [] },
        grossMeters: 300,
        netMeters: 300,
        weightKg: 45,
        status: 'IN_INSPECTION',
      });
      const roll2 = await FabricRoll.create({
        rollNumber: 'ROL-002',
        orderId: testOrder._id,
        productionJobId: dummyJobId,
        loomMachineId: loom1._id,
        genealogy: { yarnBatchNumbers: ['BATCH-01'], loomCode: 'LOOM-01', operatorIds: [] },
        grossMeters: 350,
        netMeters: 350,
        weightKg: 52,
        status: 'IN_INSPECTION',
      });

      await QualityInspection.create({
        inspectionNumber: 'QC-001',
        fabricRollId: roll1._id,
        orderId: testOrder._id,
        inspectorId: adminUser._id,
        inspectedLengthMeters: 300,
        fabricWidthInches: 58,
        defects: [],
        grade: 'GRADE_A',
        verdict: 'PASSED',
        inspectionStatus: 'PASSED',
      });

      await QualityInspection.create({
        inspectionNumber: 'QC-002',
        fabricRollId: roll2._id,
        orderId: testOrder._id,
        inspectorId: adminUser._id,
        inspectedLengthMeters: 10,
        fabricWidthInches: 58,
        defects: [
          { defectType: 'Hole', points: 4, meterPosition: 2 },
          { defectType: 'Broken Pick', points: 4, meterPosition: 5 },
          { defectType: 'Hole', points: 4, meterPosition: 8 },
        ],
        grade: 'REJECT',
        verdict: 'REWORK',
        inspectionStatus: 'REWORK_REQUIRED',
        reworkInstructions: 'Mend broken pick area and re-scour',
      });

      // 6. Seed Invoices & Dispatches
      const dispatch = await Dispatch.create({
        dispatchNumber: 'DSP-8001',
        orderId: testOrder._id,
        customerId: customerUser._id,
        dispatchedRollIds: [roll1._id],
        totalRolls: 1,
        totalMetersDispatched: 300,
        carrierName: 'SafeExpress',
        vehicleNumber: 'MH-12-AB-1234',
        waybillNumber: 'WB-8001',
        gatePassNumber: 'GP-8001',
        idempotencyKey: 'IDEMP-DSP-8001',
        status: 'IN_TRANSIT',
      });

      await Invoice.create({
        invoiceNumber: 'INV-8001',
        dispatchId: dispatch._id,
        orderId: testOrder._id,
        customerId: customerUser._id,
        lineItems: [{ rollNumber: 'ROL-001', meters: 300, ratePerMeter: 5.5, lineTotal: 1650 }],
        subtotal: 1650,
        taxAmount: 82.5,
        totalInvoiceAmount: 1732.5,
        amountPaid: 1000,
        balanceDue: 732.5,
        dueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // Overdue!
        paymentStatus: 'PARTIALLY_PAID',
      });

      // Query admin dashboard endpoint
      const res = await request(app)
        .get('/api/v1/analytics/admin')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      const data = res.body.data;

      // Assert Orders Awaiting Decisions
      expect(data.ordersAwaitingDecisions.pendingRequestsCount).toBe(1);

      // Assert Delayed Orders
      expect(data.ordersAtRiskOfDelay.count).toBe(1);
      expect(data.ordersAtRiskOfDelay.orders[0].orderNumber).toBe('ORD-9001');

      // Assert Material Shortages
      expect(data.materialShortages.count).toBe(1);
      expect(data.materialShortages.criticalItems[0].sku).toBe('YRN-COT-40S');
      expect(data.materialShortages.criticalItems[0].shortageQuantity).toBe(250);

      // Assert Fleet Utilization
      expect(data.machineFleet.totalMachines).toBe(2);
      expect(data.machineFleet.runningCount).toBe(1);
      expect(data.machineFleet.breakdownCount).toBe(1);
      expect(data.machineFleet.fleetUtilizationRate).toBe(50.0);
      expect(data.machineFleet.activeBreakdownsCount).toBe(1);
      expect(data.machineFleet.totalDowntimeHours).toBe(2.0);

      // Assert Daily Production
      expect(data.dailyProduction.todayProducedMeters).toBe(650);

      // Assert Defect & Rework Rates
      expect(data.defectAndRework.totalInspections).toBe(2);
      expect(data.defectAndRework.passedCount).toBe(1);
      expect(data.defectAndRework.reworkCount).toBe(1);
      expect(data.defectAndRework.reworkRate).toBe(50.0);
      expect(data.defectAndRework.topDefectTypes.length).toBeGreaterThan(0);

      // Assert Dispatches & Financials
      expect(data.dispatchesAndFinancials.dispatchesByStatus.IN_TRANSIT).toBe(1);
      expect(data.dispatchesAndFinancials.totalInvoiced).toBe(1732.5);
      expect(data.dispatchesAndFinancials.totalCollected).toBe(1000);
      expect(data.dispatchesAndFinancials.totalReceivables).toBe(732.5);
      expect(data.dispatchesAndFinancials.overdueInvoicesCount).toBe(1);
    });

    it('should block non-admins from accessing /analytics/admin (RBAC)', async () => {
      const resCustomer = await request(app)
        .get('/api/v1/analytics/admin')
        .set('Cookie', customerCookie);
      expect(resCustomer.status).toBe(403);

      const resOperator = await request(app)
        .get('/api/v1/analytics/admin')
        .set('Cookie', operatorCookie);
      expect(resOperator.status).toBe(403);
    });
  });

  // ===========================================================================
  // SECTION 4: CUSTOMER DASHBOARD ANALYTICS (TENANT ISOLATION)
  // ===========================================================================
  describe('Customer Dashboard Analytics', () => {
    it('should strictly isolate customer analytics to the requesting customer', async () => {
      // Seed order for customer 1
      const order1 = await Order.create({
        orderNumber: 'ORD-CUST-1',
        quotationId: new mongoose.Types.ObjectId(),
        customerId: customerUser._id,
        items: [
          {
            productId: testProduct._id,
            quantity: 1500,
            unit: 'METER',
            unitPrice: 6.0,
            lineTotal: 9000,
          },
        ],
        subtotal: 9000,
        taxAmount: 450,
        totalAmount: 9450,
        confirmedDeliveryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        status: 'IN_PRODUCTION',
        totalMetersOrdered: 1500,
        producedMeters: 750,
      });

      // Seed order for customer 2 (should NOT leak to customer 1)
      await Order.create({
        orderNumber: 'ORD-CUST-2',
        quotationId: new mongoose.Types.ObjectId(),
        customerId: anotherCustomerUser._id,
        items: [
          {
            productId: testProduct._id,
            quantity: 5000,
            unit: 'METER',
            unitPrice: 5.0,
            lineTotal: 25000,
          },
        ],
        subtotal: 25000,
        taxAmount: 1250,
        totalAmount: 26250,
        confirmedDeliveryDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
        status: 'IN_PRODUCTION',
        totalMetersOrdered: 5000,
        producedMeters: 1000,
      });

      // Seed pending quotation for customer 1
      await Quotation.create({
        quotationNumber: 'QT-CUST-1',
        customerId: customerUser._id,
        items: [
          {
            productId: testProduct._id,
            quantity: 1000,
            unit: 'METER',
            unitPrice: 6.2,
            lineTotal: 6200,
          },
        ],
        subtotal: 6200,
        taxAmount: 310,
        totalAmount: 6510,
        proposedDeliveryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        validUntil: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        status: 'ISSUED',
        customerDecision: { decision: 'PENDING' },
      });

      // Seed invoice for customer 1
      await Invoice.create({
        invoiceNumber: 'INV-CUST-1',
        dispatchId: new mongoose.Types.ObjectId(),
        orderId: order1._id,
        customerId: customerUser._id,
        lineItems: [{ rollNumber: 'ROL-99', meters: 750, ratePerMeter: 6.0, lineTotal: 4500 }],
        subtotal: 4500,
        taxAmount: 225,
        totalInvoiceAmount: 4725,
        amountPaid: 2000,
        balanceDue: 2725,
        dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        paymentStatus: 'PARTIALLY_PAID',
      });

      const res = await request(app)
        .get('/api/v1/analytics/customer')
        .set('Cookie', customerCookie);

      expect(res.status).toBe(200);
      const data = res.body.data;

      // Should only see customer 1's order
      expect(data.activeOrders.count).toBe(1);
      expect(data.activeOrders.orders[0].orderNumber).toBe('ORD-CUST-1');
      expect(data.activeOrders.orders[0].progressPercentage).toBe(50);

      // Should see pending quotation
      expect(data.quotationDecisions.pendingCount).toBe(1);
      expect(data.quotationDecisions.quotations[0].quotationNumber).toBe('QT-CUST-1');

      // Should see financial metrics
      expect(data.invoicesAndPayments.totalInvoiced).toBe(4725);
      expect(data.invoicesAndPayments.totalPaid).toBe(2000);
      expect(data.invoicesAndPayments.outstandingBalance).toBe(2725);

      // Verify customer 2 sees only their own data
      const resAnother = await request(app)
        .get('/api/v1/analytics/customer')
        .set('Cookie', anotherCustomerCookie);

      expect(resAnother.status).toBe(200);
      expect(resAnother.body.data.activeOrders.count).toBe(1);
      expect(resAnother.body.data.activeOrders.orders[0].orderNumber).toBe('ORD-CUST-2');
      expect(resAnother.body.data.invoicesAndPayments.totalInvoiced).toBe(0);
    });

    it('should block operators from accessing customer analytics', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/customer')
        .set('Cookie', operatorCookie);
      expect(res.status).toBe(403);
    });
  });

  // ===========================================================================
  // SECTION 5: OPERATOR DASHBOARD ANALYTICS
  // ===========================================================================
  describe('Operator Dashboard Analytics', () => {
    it('should provide factory floor telemetry, assigned jobs, attendance, and breakdown halts', async () => {
      const loom = await Machine.create({
        machineCode: 'LOOM-08',
        name: 'Picanol Rapier Loom 8',
        type: 'RAPIER_LOOM',
        location: { shed: 'Shed 2', bay: 'Bay D' },
        status: 'RUNNING',
      });

      const job = await ProductionJob.create({
        jobNumber: 'JOB-909',
        orderId: new mongoose.Types.ObjectId(),
        machineId: loom._id,
        stage: 'WEAVING',
        targetQuantity: 1200,
        producedQuantity: 720,
        assignedOperatorIds: [operatorUser._id],
        status: 'RUNNING',
      });

      // Seed attendance today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      await Attendance.create({
        operatorId: operatorUser._id,
        date: today,
        shiftId: new mongoose.Types.ObjectId(),
        status: 'PRESENT',
        checkInTime: new Date(Date.now() - 4 * 60 * 60 * 1000),
        hoursWorked: 4.5,
        overtimeHours: 0.5,
        approvedOvertimeHours: 0.5,
      });

      // Seed breakdown on assigned loom
      await BreakdownReport.create({
        reportNumber: 'BRK-808',
        machineId: loom._id,
        reportedBy: operatorUser._id,
        breakdownType: 'YARN_BREAKAGE',
        severity: 'MEDIUM',
        description: 'Multiple warp yarn breakages',
        status: 'REPORTED',
      });

      const res = await request(app)
        .get('/api/v1/analytics/operator')
        .set('Cookie', operatorCookie);

      expect(res.status).toBe(200);
      const data = res.body.data;

      // Assigned tasks
      expect(data.assignedTasks.activeJobsCount).toBe(1);
      expect(data.assignedTasks.jobs[0].jobNumber).toBe('JOB-909');
      expect(data.assignedTasks.machines[0].machineCode).toBe('LOOM-08');

      // Attendance
      expect(data.shiftAndAttendance.attendanceStatus).toBe('PRESENT');
      expect(data.shiftAndAttendance.hoursWorked).toBe(4.5);
      expect(data.shiftAndAttendance.approvedOvertimeHours).toBe(0.5);

      // Production targets
      expect(data.productionProgress.totalTargetMeters).toBe(1200);
      expect(data.productionProgress.totalProducedMeters).toBe(720);
      expect(data.productionProgress.targetAttainmentPercentage).toBe(60.0);

      // Breakdowns affecting operator
      expect(data.breakdownsAndAlerts.activeBreakdownsCount).toBe(1);
      expect(data.breakdownsAndAlerts.breakdowns[0].reportNumber).toBe('BRK-808');
    });

    it('should block customers from accessing operator analytics', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/operator')
        .set('Cookie', customerCookie);
      expect(res.status).toBe(403);
    });
  });

  // ===========================================================================
  // SECTION 6: UNIFIED /ME ENDPOINT DISPATCH
  // ===========================================================================
  describe('Unified Dashboard Endpoint (/analytics/me)', () => {
    it('should correctly dispatch for ADMIN, CUSTOMER, and OPERATOR roles', async () => {
      // 1. Admin
      const resAdmin = await request(app)
        .get('/api/v1/analytics/me')
        .set('Cookie', adminCookie);
      expect(resAdmin.status).toBe(200);
      expect(resAdmin.body.role).toBe('ADMIN');
      expect(resAdmin.body.data.machineFleet).toBeDefined();

      // 2. Customer
      const resCust = await request(app)
        .get('/api/v1/analytics/me')
        .set('Cookie', customerCookie);
      expect(resCust.status).toBe(200);
      expect(resCust.body.role).toBe('CUSTOMER');
      expect(resCust.body.data.activeOrders).toBeDefined();

      // 3. Operator
      const resOp = await request(app)
        .get('/api/v1/analytics/me')
        .set('Cookie', operatorCookie);
      expect(resOp.status).toBe(200);
      expect(resOp.body.role).toBe('OPERATOR');
      expect(resOp.body.data.assignedTasks).toBeDefined();
    });
  });
});
