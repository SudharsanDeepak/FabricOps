import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { connectTestDB, clearTestDB, disconnectTestDB } from './mongoTestHelper.js';
import {
  User,
  CustomerProfile,
  OperatorProfile,
  Machine,
  Product,
  Quotation,
  Order,
  OrderTimelineEvent,
  ProductionJob,
  FabricRoll,
  QualityInspection,
  FinishedGoodsInventory,
  Dispatch,
} from '../src/models/index.js';
import { env } from '../src/config/env.js';
import {
  initializeOrderTimeline,
  getOrderTimeline,
  updateTimelineStage,
  recalculateOrderEstimates,
  getAdminControlTowerOverview,
  getOperatorTaskBoard,
} from '../src/services/timeline.service.js';

describe('Prompt 7 — End-to-End Production Transparency & Control Tower', () => {
  let adminUser;
  let customerUserA;
  let customerUserB;
  let operatorUser;
  let adminToken;
  let customerAToken;
  let customerBToken;
  let operatorToken;
  let testProduct;
  let testMachine;
  let sampleOrder;

  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();

    // 1. Users
    adminUser = await User.create({
      name: 'Prakash Sharma',
      email: 'admin@fabricops.com',
      passwordHash: 'dummyhash',
      role: 'ADMIN',
      status: 'ACTIVE',
    });

    customerUserA = await User.create({
      name: 'Aditi Rao (Apex Garments)',
      email: 'aditi@apexgarments.com',
      passwordHash: 'dummyhash',
      role: 'CUSTOMER',
      status: 'ACTIVE',
    });

    customerUserB = await User.create({
      name: 'Vikas Mehta (Zenith Apparel)',
      email: 'vikas@zenithapparel.com',
      passwordHash: 'dummyhash',
      role: 'CUSTOMER',
      status: 'ACTIVE',
    });

    operatorUser = await User.create({
      name: 'Rajesh Kumar',
      email: 'rajesh.weaver@fabricops.com',
      passwordHash: 'dummyhash',
      role: 'OPERATOR',
      status: 'ACTIVE',
    });

    // 2. Tokens
    adminToken = jwt.sign({ id: adminUser._id, role: 'ADMIN' }, env.JWT_SECRET, { expiresIn: '1h' });
    customerAToken = jwt.sign({ id: customerUserA._id, role: 'CUSTOMER' }, env.JWT_SECRET, { expiresIn: '1h' });
    customerBToken = jwt.sign({ id: customerUserB._id, role: 'CUSTOMER' }, env.JWT_SECRET, { expiresIn: '1h' });
    operatorToken = jwt.sign({ id: operatorUser._id, role: 'OPERATOR' }, env.JWT_SECRET, { expiresIn: '1h' });

    // 3. Profiles
    await CustomerProfile.create({
      userId: customerUserA._id,
      customerCode: 'CUST-APEX-001',
      companyName: 'Apex Garments Pvt Ltd',
      taxId: '33AABCA1234F1Z5',
    });

    await CustomerProfile.create({
      userId: customerUserB._id,
      customerCode: 'CUST-ZENITH-002',
      companyName: 'Zenith Apparel Exports',
      taxId: '33AABCA9999F1Z9',
    });

    testMachine = await Machine.create({
      machineCode: 'LOOM-AJ-01',
      name: 'Tsudakoma ZAX9100 Air-Jet Loom',
      type: 'AIR_JET_LOOM',
      location: { shed: 'Weaving Shed 1', bay: 'Bay 104' },
      status: 'IDLE',
      telemetrySnapshot: { rpm: 850, picksPerMinute: 820, efficiencyPercentage: 94 },
    });

    await OperatorProfile.create({
      userId: operatorUser._id,
      employeeCode: 'EMP-WEAV-042',
      department: 'WEAVING',
      skillLevel: 'MASTER_WEAVER',
      assignedMachines: [testMachine._id],
      hourlyWageRate: 180, // Confidential factory wage
    });

    testProduct = await Product.create({
      productCode: 'FAB-POP-40S',
      name: 'Premium Combed Cotton Poplin 40s',
      category: 'FINISHED_FABRIC',
      measurementUnit: 'METER',
      pricing: { basePricePerUnit: 140, currency: 'INR', minimumOrderQuantity: 1000 },
      fabricSpecification: {
        gsm: 120,
        weaveType: 'PLAIN',
        composition: '100% Combed Cotton',
        yarnCountWarp: '40s Ne',
        yarnCountWeft: '40s Ne',
        construction: '132x72',
        widthInches: 58,
      },
    });

    // 4. Create sample Confirmed Order
    sampleOrder = await Order.create({
      orderNumber: 'ORD-2026-TEST-701',
      quotationId: new mongoose.Types.ObjectId(),
      customerId: customerUserA._id,
      items: [
        {
          productId: testProduct._id,
          fabricSpecSnapshot: {
            gsm: 120,
            weaveType: 'PLAIN',
            composition: '100% Combed Cotton',
            yarnCountWarp: '40s Ne',
            yarnCountWeft: '40s Ne',
            construction: '132x72',
            widthInches: 58,
            colorName: 'Optic White',
          },
          quantity: 2000,
          unit: 'METER',
          unitPrice: 140,
          lineTotal: 280000,
        },
      ],
      subtotal: 280000,
      taxAmount: 14000,
      totalAmount: 294000,
      confirmedDeliveryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // Committed date
      status: 'CONFIRMED',
    });
  });

  // =========================================================================
  // 1. ORDER TIMELINE INITIALIZATION & PERSISTENCE
  // =========================================================================
  describe('1. Timeline Initialization in Dedicated Collection', () => {
    it('initializes 9 standardized milestone stages in OrderTimelineEvent collection', async () => {
      const milestones = await initializeOrderTimeline(sampleOrder._id);

      expect(milestones).toHaveLength(9);

      // Verify sequence order
      expect(milestones[0].stage).toBe('ORDER_CONFIRMATION');
      expect(milestones[0].sequence).toBe(1);
      expect(milestones[0].status).toBe('COMPLETED');
      expect(milestones[0].completedQuantity).toBe(2000);

      expect(milestones[1].stage).toBe('MATERIAL_PROCUREMENT');
      expect(milestones[1].status).toBe('PENDING');

      expect(milestones[3].stage).toBe('WEAVING');
      expect(milestones[4].stage).toBe('QUALITY_INSPECTION');
      expect(milestones[7].stage).toBe('DISPATCH');
      expect(milestones[8].stage).toBe('DELIVERY');

      // Verify DB persistence in dedicated collection
      const count = await OrderTimelineEvent.countDocuments({ orderId: sampleOrder._id });
      expect(count).toBe(9);
    });

    it('sets dynamic estimatedDeliveryDate matching committed date at initiation', async () => {
      await initializeOrderTimeline(sampleOrder._id);
      const order = await Order.findById(sampleOrder._id);

      expect(order.estimatedDeliveryDate).toBeDefined();
      expect(order.isAtRiskOfDelay).toBe(false);
      expect(new Date(order.estimatedDeliveryDate).toISOString()).toBe(
        new Date(order.confirmedDeliveryDate).toISOString()
      );
    });
  });

  // =========================================================================
  // 2. PRIVACY SCRUBBING & CROSS-CUSTOMER ISOLATION
  // =========================================================================
  describe('2. Customer Privacy & Data Scrubbing', () => {
    it('allows customer A to access their own order timeline', async () => {
      const res = await request(app)
        .get(`/api/v1/orders/${sampleOrder._id}/timeline`)
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.order.orderNumber).toBe('ORD-2026-TEST-701');
      expect(res.body.data.milestones).toHaveLength(9);
    });

    it('strictly forbids Customer B from viewing Customer A order timeline (Cross-Customer Prohibited)', async () => {
      const res = await request(app)
        .get(`/api/v1/orders/${sampleOrder._id}/timeline`)
        .set('Authorization', `Bearer ${customerBToken}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/Cross-customer access prohibited/i);
    });

    it('never exposes internal operator wage rates, supplier raw pricing, or confidential mill logs to customer', async () => {
      const res = await request(app)
        .get(`/api/v1/orders/${sampleOrder._id}/timeline`)
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.statusCode).toBe(200);
      const strResponse = JSON.stringify(res.body.data);

      // Verify no confidential data leaks
      expect(strResponse).not.toContain('hourlyWageRate');
      expect(strResponse).not.toContain('180'); // Rajesh's wage rate
      expect(strResponse).not.toContain('supplierCost');
      expect(strResponse).not.toContain('internalNotes');
    });

    it('never fabricates completion percentages (strictly computed from verified output)', async () => {
      const res = await request(app)
        .get(`/api/v1/orders/${sampleOrder._id}/timeline`)
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.statusCode).toBe(200);
      // With 0 meters produced so far, progress percentage must be strictly 0%
      expect(res.body.data.genuineProgress.completedQuantity).toBe(0);
      expect(res.body.data.genuineProgress.progressPercentage).toBe(0);
    });
  });

  // =========================================================================
  // 3. MANUFACTURING STAGES PROGRESSION & DYNAMIC RECALCULATION
  // =========================================================================
  describe('3. Dynamic Estimate Recalculation on Breakdown & Rework', () => {
    beforeEach(async () => {
      await initializeOrderTimeline(sampleOrder._id);
    });

    it('advances stages and calculates genuine non-fabricated completion percentages', async () => {
      // 1. Advance Material Procurement
      await updateTimelineStage({
        orderId: sampleOrder._id,
        stage: 'MATERIAL_PROCUREMENT',
        status: 'COMPLETED',
        actualCompletionDate: new Date(),
        actorUser: adminUser,
      });

      // 2. Advance Material Issuance
      await updateTimelineStage({
        orderId: sampleOrder._id,
        stage: 'MATERIAL_ISSUANCE',
        status: 'COMPLETED',
        actualCompletionDate: new Date(),
        actorUser: adminUser,
      });

      // 3. Create production job and log 1,000 meters output on loom
      const job = await ProductionJob.create({
        jobNumber: 'JOB-WEAV-TEST-701',
        orderId: sampleOrder._id,
        machineId: testMachine._id,
        stage: 'WEAVING',
        targetQuantity: 2000,
        producedQuantity: 1000,
        status: 'RUNNING',
        assignedOperatorIds: [operatorUser._id],
      });

      await Order.findByIdAndUpdate(sampleOrder._id, {
        $push: { productionJobIds: job._id },
        status: 'IN_PRODUCTION',
      });

      // Update Weaving Milestone
      await updateTimelineStage({
        orderId: sampleOrder._id,
        stage: 'WEAVING',
        status: 'IN_PROGRESS',
        completedQuantity: 1000,
        responsibleMachineId: testMachine._id,
        actorUser: operatorUser,
      });

      // Query timeline as customer
      const res = await request(app)
        .get(`/api/v1/orders/${sampleOrder._id}/timeline`)
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.genuineProgress.completedQuantity).toBe(1000);
      expect(res.body.data.genuineProgress.progressPercentage).toBe(50); // 1000 / 2000 = exactly 50%
    });

    it('dynamically recalculates delivery estimate when machine breakdown occurs, distinguishing estimated from committed date', async () => {
      // Machine breakdown delays weaving schedule by 4 days
      const result = await recalculateOrderEstimates(sampleOrder._id, {
        reason: 'Loom LOOM-AJ-01 pneumatic valve failure caused 4-day stoppage',
        delayDays: 4,
        triggerType: 'BREAKDOWN',
      });

      expect(result.order.isAtRiskOfDelay).toBe(true);
      expect(result.order.delayRiskReason).toMatch(/pneumatic valve failure/i);

      // Verify estimated delivery date is pushed out beyond committed date
      const estimatedTime = new Date(result.order.estimatedDeliveryDate).getTime();
      const committedTime = new Date(result.order.confirmedDeliveryDate).getTime();
      expect(estimatedTime).toBeGreaterThan(committedTime);

      // Verify client retrieval via API distinguishes both dates
      const res = await request(app)
        .get(`/api/v1/orders/${sampleOrder._id}/timeline`)
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.order.isAtRiskOfDelay).toBe(true);
      expect(res.body.data.order.confirmedDeliveryDate).toBeDefined();
      expect(res.body.data.order.estimatedDeliveryDate).toBeDefined();
      expect(res.body.data.order.delayRiskReason).toBeDefined();
    });
  });

  // =========================================================================
  // 4. COMPLETE END-TO-END FLOW: CONFIRMATION -> QC -> FG -> DISPATCH
  // =========================================================================
  describe('4. Full Lifecycle: Confirmation -> 4-Point QC -> FG -> Dispatch', () => {
    it('follows an order all the way through 4-point QC pass, finished goods, and dispatch delivery', async () => {
      await initializeOrderTimeline(sampleOrder._id);

      // 1. Complete Weaving with roll creation
      const job = await ProductionJob.create({
        jobNumber: 'JOB-LIFE-01',
        orderId: sampleOrder._id,
        machineId: testMachine._id,
        stage: 'WEAVING',
        targetQuantity: 2000,
        producedQuantity: 2000,
        status: 'COMPLETED',
      });
      await Order.findByIdAndUpdate(sampleOrder._id, {
        $push: { productionJobIds: job._id },
      });

      const roll = await FabricRoll.create({
        rollNumber: 'ROLL-LIFE-001',
        productionJobId: job._id,
        orderId: sampleOrder._id,
        loomMachineId: testMachine._id,
        genealogy: {
          yarnBatchNumbers: ['LOT-2026-C40-089'],
          warpBeamId: 'BEAM-042',
          loomCode: testMachine.machineCode,
          operatorIds: [operatorUser._id],
        },
        grossMeters: 2010,
        netMeters: 2000,
        weightKg: 242,
        grade: 'GRADE_A',
        status: 'PACKED_FOR_DISPATCH',
      });

      // 2. Perform 4-Point ASTM Quality Inspection
      const qc = await QualityInspection.create({
        inspectionNumber: 'QC-LIFE-001',
        fabricRollId: roll._id,
        orderId: sampleOrder._id,
        inspectorId: adminUser._id,
        inspectedLengthMeters: 100,
        fabricWidthInches: 58,
        defects: [
          { defectType: 'Slub', points: 1, meterPosition: 14.5, severity: 'MINOR' },
          { defectType: 'Broken Pick', points: 1, meterPosition: 62.0, severity: 'MINOR' },
        ],
        // 2 penalty points => Grade A, Passed
      });

      expect(qc.grade).toBe('GRADE_A');
      expect(qc.verdict).toBe('PASSED');

      await updateTimelineStage({
        orderId: sampleOrder._id,
        stage: 'QUALITY_INSPECTION',
        status: 'COMPLETED',
        completedQuantity: 2000,
        actorUser: adminUser,
      });

      // 3. Finished Goods Warehouse Staging
      const fg = await FinishedGoodsInventory.create({
        fabricRollId: roll._id,
        rollNumber: roll.rollNumber,
        orderId: sampleOrder._id,
        productName: testProduct.name,
        grade: 'GRADE_A',
        netMeters: 2000,
        weightKg: 242,
        warehouseLocation: 'FG-Bay-B-04',
        isAllocatedToDispatch: true,
      });

      await updateTimelineStage({
        orderId: sampleOrder._id,
        stage: 'FINISHED_GOODS',
        status: 'COMPLETED',
        completedQuantity: 2000,
        actorUser: adminUser,
      });

      // 4. Logistics Gate Pass & Dispatch
      const dispatch = await Dispatch.create({
        dispatchNumber: 'DSP-2026-9001',
        orderId: sampleOrder._id,
        customerId: customerUserA._id,
        dispatchedRollIds: [roll._id],
        totalRolls: 1,
        totalMetersDispatched: 2000,
        carrierName: 'VRL Logistics Express',
        vehicleNumber: 'TN-38-BZ-4412',
        waybillNumber: 'WB-991204882',
        gatePassNumber: 'GP-2026-0411',
        idempotencyKey: 'DSP-IDEMP-LIFE-001',
        status: 'IN_TRANSIT',
        dispatchedBy: adminUser._id,
      });

      await updateTimelineStage({
        orderId: sampleOrder._id,
        stage: 'DISPATCH',
        status: 'COMPLETED',
        completedQuantity: 2000,
        actorUser: adminUser,
      });

      await Order.findByIdAndUpdate(sampleOrder._id, { status: 'PARTIALLY_DISPATCHED' });

      // 5. Query Customer Timeline and verify all milestones, ASTM rating, and carrier tracking
      const res = await request(app)
        .get(`/api/v1/orders/${sampleOrder._id}/timeline`)
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.statusCode).toBe(200);
      const data = res.body.data;

      // Check Quality Inspection Badge
      expect(data.qualitySummary.overallGrade).toBe('GRADE_A');
      expect(data.qualitySummary.passedRollsCount).toBe(1);

      // Check Dispatch Carrier Waybill
      expect(data.dispatchDetails).toHaveLength(1);
      expect(data.dispatchDetails[0].carrierName).toBe('VRL Logistics Express');
      expect(data.dispatchDetails[0].waybillNumber).toBe('WB-991204882');
      expect(data.dispatchDetails[0].vehicleNumber).toBe('TN-38-BZ-4412');

      // Check genuine progress
      expect(data.genuineProgress.totalMetersDispatched).toBe(2000);
    });
  });

  // =========================================================================
  // 5. THREE VIEWS: ADMIN CONTROL TOWER & OPERATOR TASK BOARD
  // =========================================================================
  describe('5. Admin Production Control Tower & Operator Task Board', () => {
    it('Admin queries Production Control Tower overview with active orders, fleet status, and bottlenecks', async () => {
      await initializeOrderTimeline(sampleOrder._id);

      const res = await request(app)
        .get('/api/v1/production-planning/control-tower')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      const { data } = res.body;
      expect(data.overview.activeOrdersCount).toBeGreaterThanOrEqual(1);
      expect(data.activeOrders).toBeInstanceOf(Array);
      expect(data.machineFleet.total).toBeGreaterThanOrEqual(1);
      expect(data.bottlenecks).toBeDefined();
    });

    it('rejects Customer from accessing Admin Production Control Tower (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/v1/production-planning/control-tower')
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('Operator queries floor task board showing assigned jobs and loom alerts', async () => {
      const res = await request(app)
        .get('/api/v1/operator/task-board')
        .set('Authorization', `Bearer ${operatorToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      const { data } = res.body;
      expect(data.operator.employeeCode).toBe('EMP-WEAV-042');
      expect(data.assignedMachines).toHaveLength(1);
      expect(data.activeJobs).toBeInstanceOf(Array);
    });
  });
});
