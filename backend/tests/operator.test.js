import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { connectTestDB, clearTestDB, disconnectTestDB } from './mongoTestHelper.js';
import {
  User,
  OperatorProfile,
  Machine,
  ProductionJob,
  ProductionLog,
  BreakdownReport,
  ShiftHandover,
  Attendance,
  Shift,
  Order,
  AuditLog,
} from '../src/models/index.js';
import { env } from '../src/config/env.js';

describe('Prompt 6 — Operator Machine Dashboard & Floor Terminal', () => {
  let adminUser;
  let operatorUser;
  let unassignedOperator;
  let customerUser;
  let adminToken;
  let operatorToken;
  let unassignedOperatorToken;
  let customerToken;
  let airJetLoom;
  let dummyOrder;
  let morningShift;

  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();

    // 1. Create Users
    adminUser = await User.create({
      name: 'Prakash Sharma',
      email: 'admin@fabricops.com',
      passwordHash: 'dummyhash',
      role: 'ADMIN',
      status: 'ACTIVE',
    });

    operatorUser = await User.create({
      name: 'Rajesh Kumar',
      email: 'rajesh.weaver@fabricops.com',
      passwordHash: 'dummyhash',
      role: 'OPERATOR',
      status: 'ACTIVE',
    });

    unassignedOperator = await User.create({
      name: 'Suresh Patil',
      email: 'suresh.spinner@fabricops.com',
      passwordHash: 'dummyhash',
      role: 'OPERATOR',
      status: 'ACTIVE',
    });

    customerUser = await User.create({
      name: 'Aditi Rao',
      email: 'aditi@apexgarments.com',
      passwordHash: 'dummyhash',
      role: 'CUSTOMER',
      status: 'ACTIVE',
    });

    // 2. Generate JWT Auth Tokens
    adminToken = jwt.sign({ id: adminUser._id, role: 'ADMIN' }, env.JWT_SECRET, { expiresIn: '1h' });
    operatorToken = jwt.sign({ id: operatorUser._id, role: 'OPERATOR' }, env.JWT_SECRET, { expiresIn: '1h' });
    unassignedOperatorToken = jwt.sign(
      { id: unassignedOperator._id, role: 'OPERATOR' },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    customerToken = jwt.sign({ id: customerUser._id, role: 'CUSTOMER' }, env.JWT_SECRET, { expiresIn: '1h' });

    // 3. Create Machine
    airJetLoom = await Machine.create({
      machineCode: 'LOOM-AJ-01',
      name: 'Tsudakoma ZAX9100 Air-Jet Loom',
      type: 'AIR_JET_LOOM',
      location: { shed: 'Shed 1', bay: 'Bay 101' },
      status: 'IDLE',
      telemetrySnapshot: { rpm: 850, picksPerMinute: 820, efficiencyPercentage: 92 },
    });

    // 4. Create Operator Profile with machine assignment
    await OperatorProfile.create({
      userId: operatorUser._id,
      employeeCode: 'EMP-WEAV-042',
      department: 'WEAVING',
      skillLevel: 'MASTER_WEAVER',
      assignedMachines: [airJetLoom._id],
      hourlyWageRate: 180,
    });

    await OperatorProfile.create({
      userId: unassignedOperator._id,
      employeeCode: 'EMP-SPIN-011',
      department: 'SPINNING',
      skillLevel: 'LEVEL_1',
      assignedMachines: [], // Not assigned to airJetLoom
      hourlyWageRate: 140,
    });

    // 5. Create Shift
    morningShift = await Shift.create({
      shiftCode: 'SHIFT-MORNING',
      name: 'MORNING',
      startTime: '06:00',
      endTime: '14:00',
      durationHours: 8,
      isActive: true,
    });

    // 6. Create Dummy Order
    dummyOrder = await Order.create({
      orderNumber: 'ORD-2026-0099',
      quotationId: new mongoose.Types.ObjectId(),
      customerId: customerUser._id,
      items: [
        {
          productId: new mongoose.Types.ObjectId(),
          fabricSpecSnapshot: {
            gsm: 120,
            weaveType: 'PLAIN',
            composition: '100% Cotton',
            yarnCountWarp: '40s Ne',
            yarnCountWeft: '40s Ne',
            construction: '132x72',
            widthInches: 58,
          },
          quantity: 2000,
          unit: 'METER',
          unitPrice: 150,
          lineTotal: 300000,
        },
      ],
      subtotal: 300000,
      taxAmount: 15000,
      totalAmount: 315000,
      confirmedDeliveryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      status: 'IN_PRODUCTION',
    });
  });

  // =========================================================================
  // 1. BUSINESS RULES & ROLE-BASED ACCESS CONTROL (RBAC)
  // =========================================================================
  describe('1. RBAC & Security Boundaries', () => {
    it('strictly forbids operators from editing commercial quotations', async () => {
      const res = await request(app)
        .post('/api/v1/quotations')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({
          customerId: customerUser._id,
          items: [],
        });

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('strictly forbids operators from viewing commercial quotations list', async () => {
      const res = await request(app)
        .get('/api/v1/quotations')
        .set('Authorization', `Bearer ${operatorToken}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('blocks customers from accessing operator floor terminals', async () => {
      const res = await request(app)
        .get('/api/v1/operator/dashboard')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('blocks unauthorized operators from operating on jobs assigned to others', async () => {
      const job = await ProductionJob.create({
        jobNumber: 'JOB-UNAUTH-01',
        orderId: dummyOrder._id,
        machineId: airJetLoom._id,
        stage: 'WEAVING',
        targetQuantity: 1000,
        producedQuantity: 0,
        status: 'SCHEDULED',
        assignedOperatorIds: [operatorUser._id], // Only Rajesh is assigned
      });

      // Suresh (unassigned operator) attempts to start the task
      const res = await request(app)
        .patch(`/api/v1/operator/tasks/${job._id}/transition`)
        .set('Authorization', `Bearer ${unassignedOperatorToken}`)
        .send({
          action: 'START',
          expectedVersion: job.__v,
        });

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/Unauthorized task/i);
    });
  });

  // =========================================================================
  // 2. STATE TRANSITIONS & OPTIMISTIC CONCURRENCY
  // =========================================================================
  describe('2. Validated State Transitions & Machine Availability', () => {
    it('executes validated state machine flow (SCHEDULED -> START -> PAUSE -> RESUME -> COMPLETE)', async () => {
      const job = await ProductionJob.create({
        jobNumber: 'JOB-FLOW-01',
        orderId: dummyOrder._id,
        machineId: airJetLoom._id,
        stage: 'WEAVING',
        targetQuantity: 2000,
        producedQuantity: 0,
        status: 'SCHEDULED',
        assignedOperatorIds: [operatorUser._id],
      });

      // 1. START: SCHEDULED -> RUNNING
      const startRes = await request(app)
        .patch(`/api/v1/operator/tasks/${job._id}/transition`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({ action: 'START', expectedVersion: job.__v });

      expect(startRes.statusCode).toBe(200);
      expect(startRes.body.data.job.status).toBe('RUNNING');
      expect(startRes.body.data.machine.status).toBe('RUNNING');
      expect(startRes.body.data.machine.currentProductionJobId.toString()).toBe(job._id.toString());

      const runningJobVersion = startRes.body.data.job.__v;

      // 2. PAUSE: RUNNING -> PAUSED
      const pauseRes = await request(app)
        .patch(`/api/v1/operator/tasks/${job._id}/transition`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({ action: 'PAUSE', expectedVersion: runningJobVersion, notes: 'Bobbin thread inspection' });

      expect(pauseRes.statusCode).toBe(200);
      expect(pauseRes.body.data.job.status).toBe('PAUSED');
      expect(pauseRes.body.data.machine.status).toBe('IDLE');

      const pausedJobVersion = pauseRes.body.data.job.__v;

      // 3. RESUME: PAUSED -> RUNNING
      const resumeRes = await request(app)
        .patch(`/api/v1/operator/tasks/${job._id}/transition`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({ action: 'RESUME', expectedVersion: pausedJobVersion });

      expect(resumeRes.statusCode).toBe(200);
      expect(resumeRes.body.data.job.status).toBe('RUNNING');
      expect(resumeRes.body.data.machine.status).toBe('RUNNING');

      const resumedJobVersion = resumeRes.body.data.job.__v;

      // 4. COMPLETE: RUNNING -> COMPLETED
      const completeRes = await request(app)
        .patch(`/api/v1/operator/tasks/${job._id}/transition`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({ action: 'COMPLETE', expectedVersion: resumedJobVersion });

      expect(completeRes.statusCode).toBe(200);
      expect(completeRes.body.data.job.status).toBe('COMPLETED');
      expect(completeRes.body.data.machine.status).toBe('IDLE');
      expect(completeRes.body.data.machine.currentProductionJobId).toBeNull();
    });

    it('rejects invalid state transitions with 400 Bad Request', async () => {
      const job = await ProductionJob.create({
        jobNumber: 'JOB-INVALID-01',
        orderId: dummyOrder._id,
        machineId: airJetLoom._id,
        stage: 'WEAVING',
        targetQuantity: 1000,
        producedQuantity: 0,
        status: 'SCHEDULED',
        assignedOperatorIds: [operatorUser._id],
      });

      // Attempting to PAUSE a task that is SCHEDULED
      const res = await request(app)
        .patch(`/api/v1/operator/tasks/${job._id}/transition`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({ action: 'PAUSE', expectedVersion: job.__v });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/Cannot PAUSE task/i);
    });

    it('prevents conflicting task transitions when version check detects concurrent update (409 Conflict)', async () => {
      const job = await ProductionJob.create({
        jobNumber: 'JOB-CONCURRENT-01',
        orderId: dummyOrder._id,
        machineId: airJetLoom._id,
        stage: 'WEAVING',
        targetQuantity: 1000,
        status: 'SCHEDULED',
        assignedOperatorIds: [operatorUser._id],
      });

      // Stale version passed (e.g. 99 instead of 0)
      const res = await request(app)
        .patch(`/api/v1/operator/tasks/${job._id}/transition`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({ action: 'START', expectedVersion: 99 });

      expect(res.statusCode).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('strictly enforces machine availability: cannot start task on machine in BREAKDOWN or MAINTENANCE state', async () => {
      // Put machine in BREAKDOWN state
      airJetLoom.status = 'BREAKDOWN';
      await airJetLoom.save();

      const job = await ProductionJob.create({
        jobNumber: 'JOB-FAULT-01',
        orderId: dummyOrder._id,
        machineId: airJetLoom._id,
        stage: 'WEAVING',
        targetQuantity: 1000,
        status: 'SCHEDULED',
        assignedOperatorIds: [operatorUser._id],
      });

      const res = await request(app)
        .patch(`/api/v1/operator/tasks/${job._id}/transition`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({ action: 'START', expectedVersion: job.__v });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/Machine .* is in BREAKDOWN state/i);
    });
  });

  // =========================================================================
  // 3. PRODUCTION LOGS, IDEMPOTENCY & CUMULATIVE PLAN OVERRUNS
  // =========================================================================
  describe('3. Production Logs, Cumulative Validation & Idempotency', () => {
    it('records valid production output and updates cumulative quantity and waste', async () => {
      const job = await ProductionJob.create({
        jobNumber: 'JOB-LOG-01',
        orderId: dummyOrder._id,
        machineId: airJetLoom._id,
        stage: 'WEAVING',
        targetQuantity: 2000,
        producedQuantity: 500,
        wasteQuantity: 5,
        status: 'RUNNING',
        assignedOperatorIds: [operatorUser._id],
      });

      const res = await request(app)
        .post('/api/v1/operator/production-logs')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({
          jobId: job._id,
          machineId: airJetLoom._id,
          metersProduced: 400,
          wasteMeters: 4,
          durationMinutes: 180,
          downtimeMinutes: 10,
          shift: 'MORNING',
          shiftId: morningShift._id,
          source: 'OPERATOR',
          idempotencyKey: 'IDEMP-PLOG-001',
          remarks: 'Standard run with no defects',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.log.metersProduced).toBe(400);
      expect(res.body.data.log.source).toBe('OPERATOR');
      expect(res.body.data.log.orderId.toString()).toBe(dummyOrder._id.toString());

      // Verify job cumulative output updated in DB
      const updatedJob = await ProductionJob.findById(job._id);
      expect(updatedJob.producedQuantity).toBe(900); // 500 + 400
      expect(updatedJob.wasteQuantity).toBe(9); // 5 + 4
    });

    it('prevents duplicate submissions using idempotency key without double-counting production', async () => {
      const job = await ProductionJob.create({
        jobNumber: 'JOB-DUP-01',
        orderId: dummyOrder._id,
        machineId: airJetLoom._id,
        stage: 'WEAVING',
        targetQuantity: 2000,
        producedQuantity: 200,
        status: 'RUNNING',
        assignedOperatorIds: [operatorUser._id],
      });

      const payload = {
        jobId: job._id,
        machineId: airJetLoom._id,
        metersProduced: 300,
        durationMinutes: 120,
        shift: 'MORNING',
        shiftId: morningShift._id,
        idempotencyKey: 'IDEMP-DUP-KEY-777',
      };

      // First submission
      const res1 = await request(app)
        .post('/api/v1/operator/production-logs')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send(payload);

      expect(res1.statusCode).toBe(201);
      expect(res1.body.data.isDuplicate).toBe(false);

      // Duplicate submission with identical idempotency key
      const res2 = await request(app)
        .post('/api/v1/operator/production-logs')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send(payload);

      expect(res2.statusCode).toBe(200);
      expect(res2.body.data.isDuplicate).toBe(true);
      expect(res2.body.message).toMatch(/Duplicate submission intercepted/i);

      // Verify produced quantity was NOT double-incremented
      const refreshedJob = await ProductionJob.findById(job._id);
      expect(refreshedJob.producedQuantity).toBe(500); // 200 + 300, NOT 200 + 300 + 300
    });

    it('rejects cumulative output exceeding target without authorized supervisor override', async () => {
      const job = await ProductionJob.create({
        jobNumber: 'JOB-OVERRUN-01',
        orderId: dummyOrder._id,
        machineId: airJetLoom._id,
        stage: 'WEAVING',
        targetQuantity: 1000,
        producedQuantity: 900,
        status: 'RUNNING',
        assignedOperatorIds: [operatorUser._id],
      });

      // Attempt to log 200 meters (projected = 1100 > target 1000) without override
      const res = await request(app)
        .post('/api/v1/operator/production-logs')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({
          jobId: job._id,
          machineId: airJetLoom._id,
          metersProduced: 200,
          durationMinutes: 60,
          shift: 'MORNING',
          overrunAuthorized: false,
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('OVERRUN_AUTHORIZATION_REQUIRED');
      expect(res.body.error.message).toMatch(/Overrun violation/i);

      // Produced quantity remains unchanged
      const checkJob = await ProductionJob.findById(job._id);
      expect(checkJob.producedQuantity).toBe(900);
    });

    it('permits authorized output overrun when authorized exception and reason are provided', async () => {
      const job = await ProductionJob.create({
        jobNumber: 'JOB-OVERRUN-02',
        orderId: dummyOrder._id,
        machineId: airJetLoom._id,
        stage: 'WEAVING',
        targetQuantity: 1000,
        producedQuantity: 900,
        status: 'RUNNING',
        assignedOperatorIds: [operatorUser._id],
      });

      const res = await request(app)
        .post('/api/v1/operator/production-logs')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({
          jobId: job._id,
          machineId: airJetLoom._id,
          metersProduced: 150,
          durationMinutes: 60,
          shift: 'MORNING',
          overrunAuthorized: true,
          overrunReason: 'Customer requested 5% extra tolerance for sample cuttings',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);

      const checkJob = await ProductionJob.findById(job._id);
      expect(checkJob.producedQuantity).toBe(1050); // 900 + 150
    });
  });

  // =========================================================================
  // 4. BREAKDOWNS, MAINTENANCE & MISSING MATERIALS
  // =========================================================================
  describe('4. Machine Breakdown & Maintenance Reporting', () => {
    it('reports breakdown, transitions machine to BREAKDOWN state, and respects idempotency', async () => {
      const res = await request(app)
        .post('/api/v1/operator/breakdowns')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({
          machineId: airJetLoom._id,
          breakdownType: 'MECHANICAL',
          severity: 'CRITICAL',
          description: 'Main loom drive belt snapped in Bay 101',
          idempotencyKey: 'BRK-IDEMP-001',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.machine.status).toBe('BREAKDOWN');

      // Check DB persistence
      const report = await BreakdownReport.findOne({ idempotencyKey: 'BRK-IDEMP-001' });
      expect(report).toBeDefined();
      expect(report.breakdownType).toBe('MECHANICAL');
      expect(report.severity).toBe('CRITICAL');

      // Duplicate report with same idempotency key
      const dupRes = await request(app)
        .post('/api/v1/operator/breakdowns')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({
          machineId: airJetLoom._id,
          breakdownType: 'MECHANICAL',
          severity: 'CRITICAL',
          description: 'Main loom drive belt snapped in Bay 101',
          idempotencyKey: 'BRK-IDEMP-001',
        });

      expect(dupRes.statusCode).toBe(200);
      expect(dupRes.body.data.isDuplicate).toBe(true);
    });

    it('reports maintenance need and transitions machine to MAINTENANCE state', async () => {
      const res = await request(app)
        .post('/api/v1/operator/breakdowns')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({
          machineId: airJetLoom._id,
          breakdownType: 'MAINTENANCE_REQUIRED',
          severity: 'MEDIUM',
          description: 'Oil pump pressure indicator below threshold',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.machine.status).toBe('MAINTENANCE');
    });

    it('reports missing material details without faulting the machine', async () => {
      airJetLoom.status = 'IDLE';
      await airJetLoom.save();

      const res = await request(app)
        .post('/api/v1/operator/breakdowns')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({
          machineId: airJetLoom._id,
          breakdownType: 'MISSING_MATERIAL',
          severity: 'MEDIUM',
          description: 'Awaiting weft package replacement for LOT-2026-C40',
          missingMaterialDetails: {
            materialName: '40s Ne Combed Ring Spun Cotton Yarn',
            requiredQuantity: 50,
            unit: 'KILOGRAM',
          },
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.report.missingMaterialDetails.materialName).toBe(
        '40s Ne Combed Ring Spun Cotton Yarn'
      );
    });
  });

  // =========================================================================
  // 5. SHIFT HANDOVER & ATTENDANCE
  // =========================================================================
  describe('5. Shift Handover & Attendance Terminal', () => {
    it('records shift handover in dedicated collection with unfinished tasks', async () => {
      const job = await ProductionJob.create({
        jobNumber: 'JOB-HANDOVER-01',
        orderId: dummyOrder._id,
        machineId: airJetLoom._id,
        stage: 'WEAVING',
        targetQuantity: 3000,
        producedQuantity: 1800,
        status: 'RUNNING',
        assignedOperatorIds: [operatorUser._id],
      });

      const res = await request(app)
        .post('/api/v1/operator/shift-handover')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({
          machineId: airJetLoom._id,
          incomingOperatorId: unassignedOperator._id,
          shift: 'EVENING',
          metersRunningAtHandover: 1800,
          remainingWarpBeamPercentage: 42,
          openIssues: ['Weft sensor #3 dust cleaning advised at 2,000m mark'],
          unfinishedTasks: [
            {
              jobId: job._id,
              jobNumber: job.jobNumber,
              stage: 'WEAVING',
              remainingQuantity: 1200,
              notes: 'Running smooth at 850 RPM',
            },
          ],
          outgoingNotes: 'Completed morning shift handover. Beam 42% remaining.',
          idempotencyKey: 'HND-IDEMP-001',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.handover.metersRunningAtHandover).toBe(1800);
      expect(res.body.data.handover.remainingWarpBeamPercentage).toBe(42);
      expect(res.body.data.handover.unfinishedTasks).toHaveLength(1);

      // Verify dedicated collection document
      const record = await ShiftHandover.findOne({ idempotencyKey: 'HND-IDEMP-001' });
      expect(record).toBeDefined();
    });

    it('records operator check-in and check-out and returns attendance history', async () => {
      // 1. Check-In
      const checkInRes = await request(app)
        .post('/api/v1/operator/attendance/clock')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({
          action: 'CHECK_IN',
          shiftId: morningShift._id,
          remarks: 'Morning shift start',
        });

      expect(checkInRes.statusCode).toBe(200);
      expect(checkInRes.body.data.status).toBe('PRESENT');
      expect(checkInRes.body.data.checkInTime).toBeDefined();

      // Duplicate check-in fails
      const dupCheckIn = await request(app)
        .post('/api/v1/operator/attendance/clock')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({ action: 'CHECK_IN' });
      expect(dupCheckIn.statusCode).toBe(400);

      // 2. Check-Out
      const checkOutRes = await request(app)
        .post('/api/v1/operator/attendance/clock')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({
          action: 'CHECK_OUT',
          remarks: 'Shift ended safely',
        });

      expect(checkOutRes.statusCode).toBe(200);
      expect(checkOutRes.body.data.checkOutTime).toBeDefined();

      // 3. Query Attendance History
      const histRes = await request(app)
        .get('/api/v1/operator/attendance')
        .set('Authorization', `Bearer ${operatorToken}`);

      expect(histRes.statusCode).toBe(200);
      expect(histRes.body.data.records).toHaveLength(1);
      expect(histRes.body.data.summary.totalRecords).toBe(1);
    });

    it('fetches complete operator dashboard state with assigned machines, active jobs, specs, and next process', async () => {
      const job = await ProductionJob.create({
        jobNumber: 'JOB-DASH-01',
        orderId: dummyOrder._id,
        machineId: airJetLoom._id,
        stage: 'WEAVING',
        targetQuantity: 2000,
        producedQuantity: 1200,
        status: 'RUNNING',
        assignedOperatorIds: [operatorUser._id],
      });

      const res = await request(app)
        .get('/api/v1/operator/dashboard')
        .set('Authorization', `Bearer ${operatorToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      const { data } = res.body;
      expect(data.operator.name).toBe('Rajesh Kumar');
      expect(data.operator.employeeCode).toBe('EMP-WEAV-042');
      expect(data.assignedMachines).toHaveLength(1);
      expect(data.activeJobs).toHaveLength(1);

      const activeJob = data.activeJobs[0];
      expect(activeJob.jobNumber).toBe('JOB-DASH-01');
      expect(activeJob.orderNumber).toBe('ORD-2026-0099');
      expect(activeJob.targetQuantity).toBe(2000);
      expect(activeJob.producedQuantity).toBe(1200);
      expect(activeJob.remainingQuantity).toBe(800);
      expect(activeJob.progressPercentage).toBe(60);
      expect(activeJob.nextProcess).toBe('DYEING'); // Weaving -> Dyeing
      expect(activeJob.fabricSpecs.gsm).toBe(120);
      expect(activeJob.fabricSpecs.weaveType).toBe('PLAIN');
      expect(activeJob.version).toBeDefined();
    });
  });

  // =========================================================================
  // 6. FACTORY WORKER ATTENDANCE MANAGEMENT SYSTEM (ADMIN)
  // =========================================================================
  describe('6. Worker Attendance Management System (Admin)', () => {
    it('rejects unauthorized roles (Customer & Operator) from marking attendance', async () => {
      const res = await request(app)
        .post('/api/v1/operator/attendance/mark')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          operatorId: operatorUser._id,
          date: '2026-10-11',
          status: 'PRESENT',
        });
      expect(res.statusCode).toBe(403);

      const opRes = await request(app)
        .post('/api/v1/operator/attendance/mark')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({
          operatorId: operatorUser._id,
          date: '2026-10-11',
          status: 'PRESENT',
        });
      expect(opRes.statusCode).toBe(403);
    });

    it('allows Admin to mark worker attendance, computes hours & overtime, and writes audit log', async () => {
      const markDate = '2026-10-11';
      const checkIn = new Date('2026-10-11T08:00:00.000Z');
      const checkOut = new Date('2026-10-11T17:30:00.000Z'); // 9.5 hours

      const res = await request(app)
        .post('/api/v1/operator/attendance/mark')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          operatorId: operatorUser._id,
          date: markDate,
          status: 'PRESENT',
          checkInTime: checkIn.toISOString(),
          checkOutTime: checkOut.toISOString(),
          remarks: 'Full morning and overtime run on loom #1',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('PRESENT');
      expect(res.body.data.hoursWorked).toBe(9.5);
      expect(res.body.data.overtimeHours).toBe(1.5);

      // Verify AuditLog was created
      const audit = await AuditLog.findOne({
        entityType: 'ATTENDANCE',
        entityId: res.body.data._id,
      });
      expect(audit).toBeDefined();
      expect(audit.action).toBe('ATTENDANCE_MARKED');
      expect(audit.actorId.toString()).toBe(adminUser._id.toString());
    });

    it('updates attendance, prevents duplicate documents for same date, and records previous state in audit', async () => {
      const markDate = '2026-10-12';

      // 1. Initial mark as PRESENT
      const res1 = await request(app)
        .post('/api/v1/operator/attendance/mark')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          operatorId: operatorUser._id,
          date: markDate,
          status: 'PRESENT',
        });
      expect(res1.statusCode).toBe(200);
      const recordId = res1.body.data._id;

      // 2. Update to HALF_DAY
      const res2 = await request(app)
        .post('/api/v1/operator/attendance/mark')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          operatorId: operatorUser._id,
          date: markDate,
          status: 'HALF_DAY',
          remarks: 'Left early for doctor appointment',
        });
      expect(res2.statusCode).toBe(200);
      expect(res2.body.data._id).toBe(recordId); // Same document, no duplicate!
      expect(res2.body.data.status).toBe('HALF_DAY');
      expect(res2.body.data.hoursWorked).toBe(4);

      // Verify AuditLog for update
      const updateAudit = await AuditLog.findOne({
        entityType: 'ATTENDANCE',
        entityId: recordId,
        action: 'ATTENDANCE_UPDATED',
      });
      expect(updateAudit).toBeDefined();
      expect(updateAudit.previousState.status).toBe('PRESENT');
      expect(updateAudit.newState.status).toBe('HALF_DAY');
    });

    it('returns attendance dashboard summary with accurate real-time metrics and percentages', async () => {
      const summaryDate = '2026-10-13';

      // Mark operatorUser as PRESENT
      await request(app)
        .post('/api/v1/operator/attendance/mark')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          operatorId: operatorUser._id,
          date: summaryDate,
          status: 'PRESENT',
        });

      // Mark unassignedOperator as ON_LEAVE
      await request(app)
        .post('/api/v1/operator/attendance/mark')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          operatorId: unassignedOperator._id,
          date: summaryDate,
          status: 'ON_LEAVE',
          remarks: 'Planned annual leave',
        });

      const res = await request(app)
        .get(`/api/v1/operator/attendance/dashboard-summary?date=${summaryDate}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      const { data } = res.body;
      expect(data.totalWorkers).toBe(2);
      expect(data.presentCount).toBe(1);
      expect(data.onLeaveCount).toBe(1);
      expect(data.absentCount).toBe(0);
      expect(data.attendancePercentage).toBe(50);
    });

    it('queries attendance records with filters for daily view and date range view', async () => {
      const queryDate = '2026-10-14';

      await request(app)
        .post('/api/v1/operator/attendance/mark')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          operatorId: operatorUser._id,
          date: queryDate,
          status: 'PRESENT',
        });

      // Daily view query
      const dailyRes = await request(app)
        .get(`/api/v1/operator/attendance/records?date=${queryDate}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(dailyRes.statusCode).toBe(200);
      expect(dailyRes.body.data.records).toHaveLength(2); // Both operators listed, 1 PRESENT, 1 UNMARKED

      // Search filter
      const searchRes = await request(app)
        .get(`/api/v1/operator/attendance/records?date=${queryDate}&search=Rajesh`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(searchRes.statusCode).toBe(200);
      expect(searchRes.body.data.records).toHaveLength(1);
      expect(searchRes.body.data.records[0].workerName).toBe('Rajesh Kumar');

      // Department filter
      const deptRes = await request(app)
        .get(`/api/v1/operator/attendance/records?date=${queryDate}&department=WEAVING`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(deptRes.statusCode).toBe(200);
      expect(deptRes.body.data.records).toHaveLength(1);
      expect(deptRes.body.data.records[0].department).toBe('WEAVING');
    });

    it('exports attendance records to CSV and returns downloadable text/csv content', async () => {
      const exportDate = '2026-10-15';

      await request(app)
        .post('/api/v1/operator/attendance/mark')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          operatorId: operatorUser._id,
          date: exportDate,
          status: 'PRESENT',
        });

      const res = await request(app)
        .get(`/api/v1/operator/attendance/export?date=${exportDate}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('Employee Code');
      expect(res.text).toContain('Rajesh Kumar');
      expect(res.text).toContain('WEAVING');
      expect(res.text).toContain('PRESENT');
    });
  });
});

