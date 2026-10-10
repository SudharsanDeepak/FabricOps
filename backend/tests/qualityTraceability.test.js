import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import {
  User,
  Supplier,
  YarnBatch,
  Order,
  Machine,
  ProductionJob,
  FabricRoll,
  QualityInspection,
  DefectObservation,
  ReworkEvent,
  FinishedGoodsInventory,
  Dispatch,
  Invoice,
  StockMovement,
  AuditLog,
} from '../src/models/index.js';
import {
  createFabricRoll,
  getFabricRolls,
  getFabricRollTraceability,
  recordInspection,
  authorizeRework,
  completeRework,
  recordDefectObservation,
  verifyDefectObservation,
  getQualityDashboardMetrics,
} from '../src/services/quality.service.js';
import { executeDispatchTransaction } from '../src/services/transaction.service.js';

describe('Prompt 8 — Quality Control and Fabric-Roll Traceability', () => {
  let replSet;
  let adminUser;
  let operatorUser;
  let sampleOrder;
  let sampleLoom;
  let sampleJob;
  let sampleSupplier;
  let sampleYarnBatch;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const uri = replSet.getUri();
    await mongoose.connect(uri);

    // Initialize indexes
    await FabricRoll.init();
    await QualityInspection.init();
    await DefectObservation.init();
    await ReworkEvent.init();
    await Machine.init();
    await Order.init();
    await Dispatch.init();
    await Invoice.init();
    await StockMovement.init();
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
      name: 'QC Officer Maya',
      email: 'maya.qc@fabricops.com',
      passwordHash: 'dummyhashedpw123',
      role: 'ADMIN',
      status: 'ACTIVE',
    });

    operatorUser = await User.create({
      name: 'Weaver Rajesh',
      email: 'rajesh.weaver@fabricops.com',
      passwordHash: 'dummyhashedpw123',
      role: 'OPERATOR',
      status: 'ACTIVE',
    });

    sampleSupplier = await Supplier.create({
      supplierCode: 'SUP-COT-88',
      name: 'Coimbatore Spinners Ltd',
      status: 'ACTIVE',
    });

    sampleYarnBatch = await YarnBatch.create({
      batchNumber: 'BAT-40S-COMBED-01',
      supplierId: sampleSupplier._id,
      inventoryItemId: new mongoose.Types.ObjectId(),
      yarnSpecification: { count: '40s Ne', blend: '100% Cotton', lotNumber: 'LOT-C88' },
      receivedQuantity: 500,
      remainingQuantity: 500,
      unitPrice: 280,
    });

    sampleLoom = await Machine.create({
      machineCode: 'LOOM-AJ-04',
      name: 'Toyota Air Jet Loom #4',
      type: 'AIR_JET_LOOM',
      location: { shed: 'Weaving Shed B', bay: 'Bay 12' },
      status: 'RUNNING',
    });

    sampleOrder = await Order.create({
      orderNumber: 'ORD-QC-2026-001',
      quotationId: new mongoose.Types.ObjectId(),
      customerId: adminUser._id,
      items: [
        {
          productId: new mongoose.Types.ObjectId(),
          fabricSpecSnapshot: { gsm: 125, widthInches: 58 },
          quantity: 2000,
          unit: 'METER',
          unitPrice: 250,
          lineTotal: 500000,
        },
      ],
      subtotal: 500000,
      taxAmount: 25000,
      totalAmount: 525000,
      confirmedDeliveryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      status: 'IN_PRODUCTION',
    });

    sampleJob = await ProductionJob.create({
      jobNumber: 'JOB-WV-9001',
      orderId: sampleOrder._id,
      machineId: sampleLoom._id,
      stage: 'WEAVING',
      targetQuantity: 2000,
      producedQuantity: 0,
      unit: 'METER',
      status: 'RUNNING',
      assignedOperatorIds: [operatorUser._id],
    });
  });

  // 1. Roll creation with complete genealogy
  it('1. Creates fabric roll with unique roll identifier and complete originating genealogy', async () => {
    const roll = await createFabricRoll({
      rollNumber: 'ROL-AJ04-101',
      productionJobId: sampleJob._id,
      orderId: sampleOrder._id,
      loomMachineId: sampleLoom._id,
      genealogy: {
        yarnBatchNumbers: [sampleYarnBatch.batchNumber],
        warpBeamId: 'BEAM-AJ04-W1',
        loomCode: sampleLoom.machineCode,
        operatorIds: [operatorUser._id],
      },
      grossMeters: 120,
      netMeters: 118,
      weightKg: 29.5,
      gsmActual: 124,
      widthInchesActual: 58,
      actorUser: operatorUser,
    });

    expect(roll).toBeDefined();
    expect(roll.rollNumber).toBe('ROL-AJ04-101');
    expect(roll.grade).toBe('UNGRADED');
    expect(roll.inspectionStatus).toBe('PENDING');
    expect(roll.genealogy.yarnBatchNumbers).toContain('BAT-40S-COMBED-01');
    expect(roll.genealogy.loomCode).toBe('LOOM-AJ-04');

    const updatedJob = await ProductionJob.findById(sampleJob._id);
    expect(updatedJob.producedQuantity).toBe(118);
  });

  // 2. 4-Point inspection and automatic grading
  it('2. Records 4-point inspection, calculates penalty points per 100m², and assigns GRADE_A', async () => {
    const roll = await createFabricRoll({
      productionJobId: sampleJob._id,
      orderId: sampleOrder._id,
      loomMachineId: sampleLoom._id,
      genealogy: { yarnBatchNumbers: [sampleYarnBatch.batchNumber] },
      grossMeters: 100,
      netMeters: 100,
      widthInchesActual: 58,
      actorUser: operatorUser,
    });

    // 2 minor defects totaling 4 points:
    // (4 * 100 * 39.37) / (100 * 58) = 2.72 points / 100m² <= 20 -> GRADE_A
    const inspectionResult = await recordInspection({
      fabricRollId: roll._id,
      inspectorId: adminUser._id,
      inspectedLengthMeters: 100,
      fabricWidthInches: 58,
      defects: [
        { defectType: 'Slub', points: 2, meterPosition: 15.2, warpOrWeft: 'WEFT', severity: 'MINOR' },
        { defectType: 'Broken Pick', points: 2, meterPosition: 68.0, warpOrWeft: 'WARP', severity: 'MINOR' },
      ],
      actorUser: adminUser,
    });

    expect(inspectionResult.inspection.grade).toBe('GRADE_A');
    expect(inspectionResult.inspection.verdict).toBe('PASSED');
    expect(inspectionResult.inspection.pointsPer100SqMeters).toBeLessThanOrEqual(20);

    const reloadedRoll = await FabricRoll.findById(roll._id);
    expect(reloadedRoll.grade).toBe('GRADE_A');
    expect(reloadedRoll.status).toBe('GRADE_A');
    expect(reloadedRoll.inspectionStatus).toBe('PASSED');

    // Dedicated DefectObservation collection records
    const defectDocs = await DefectObservation.find({ fabricRollId: roll._id });
    expect(defectDocs.length).toBe(2);
    expect(defectDocs[0].isVerifiedByInspector).toBe(true);
    expect(defectDocs[0].source).toBe('HUMAN_INSPECTION');
  });

  // 3. Authorized rework and reinspection cycle without overwriting history
  it('3. Supports rework cycle and reinspection preserving historical inspection records', async () => {
    const roll = await createFabricRoll({
      productionJobId: sampleJob._id,
      orderId: sampleOrder._id,
      loomMachineId: sampleLoom._id,
      genealogy: { yarnBatchNumbers: [sampleYarnBatch.batchNumber] },
      grossMeters: 100,
      netMeters: 100,
      widthInchesActual: 58,
      actorUser: operatorUser,
    });

    // Cycle 1: Severe defects resulting in REWORK
    const cycle1Result = await recordInspection({
      fabricRollId: roll._id,
      inspectedLengthMeters: 100,
      fabricWidthInches: 58,
      defects: [
        { defectType: 'Hole', points: 4, meterPosition: 20 },
        { defectType: 'Uneven Weaving', points: 4, meterPosition: 35 },
        { defectType: 'Stain', points: 4, meterPosition: 50 },
        { defectType: 'Mispick', points: 4, meterPosition: 65 },
        { defectType: 'Warp Float', points: 4, meterPosition: 80 },
        { defectType: 'Weft Bar', points: 4, meterPosition: 90 },
        { defectType: 'Coarse Yarn', points: 4, meterPosition: 95 },
        { defectType: 'Slub', points: 4, meterPosition: 98 },
      ],
      reworkInstructions: 'Send to mending table for yarn darning and spot washing at meter 50',
      actorUser: adminUser,
    });

    expect(cycle1Result.inspection.verdict).toBe('REWORK');
    expect(cycle1Result.inspection.inspectionCycle).toBe(1);

    const rollAfterCycle1 = await FabricRoll.findById(roll._id);
    expect(rollAfterCycle1.status).toBe('REWORK_REQUIRED');
    expect(rollAfterCycle1.inspectionStatus).toBe('REWORK_REQUIRED');

    // Rework Event exists
    const reworkEvent = await ReworkEvent.findOne({ fabricRollId: roll._id });
    expect(reworkEvent).toBeDefined();
    expect(reworkEvent.status).toBe('REQUESTED');

    // Authorize Rework
    await authorizeRework({
      reworkId: reworkEvent._id,
      assignedOperatorId: operatorUser._id,
      actorUser: adminUser,
    });

    // Complete Rework (mending trimmed 2 meters)
    await completeRework({
      reworkId: reworkEvent._id,
      actionTaken: 'Holes mended and oil spot chemically cleaned; 2m end defect trimmed',
      metersAfterRework: 98,
      actorUser: operatorUser,
    });

    // Cycle 2: Reinspection passes with Grade A
    const cycle2Result = await recordInspection({
      fabricRollId: roll._id,
      inspectedLengthMeters: 98,
      fabricWidthInches: 58,
      defects: [
        { defectType: 'Slub', points: 1, meterPosition: 12.0 },
      ],
      isReinspection: true,
      reworkEventId: reworkEvent._id,
      actorUser: adminUser,
    });

    expect(cycle2Result.inspection.grade).toBe('GRADE_A');
    expect(cycle2Result.inspection.verdict).toBe('PASSED');
    expect(cycle2Result.inspection.inspectionCycle).toBe(2);

    // Verify both inspection cycles exist independently in MongoDB
    const allInspections = await QualityInspection.find({ fabricRollId: roll._id }).sort({ inspectionCycle: 1 });
    expect(allInspections.length).toBe(2);
    expect(allInspections[0].inspectionCycle).toBe(1);
    expect(allInspections[0].verdict).toBe('REWORK');
    expect(allInspections[1].inspectionCycle).toBe(2);
    expect(allInspections[1].verdict).toBe('PASSED');

    const finalRoll = await FabricRoll.findById(roll._id);
    expect(finalRoll.grade).toBe('GRADE_A');
    expect(finalRoll.status).toBe('GRADE_A');
    expect(finalRoll.reworkCount).toBe(1);
  });

  // 4. Strict dispatch restrictions against unapproved/failed rolls
  it('4. Prevents unapproved or rework-pending rolls from entering dispatch', async () => {
    // Roll 1: Pending inspection (Ungraded)
    const rollUngraded = await createFabricRoll({
      productionJobId: sampleJob._id,
      orderId: sampleOrder._id,
      loomMachineId: sampleLoom._id,
      grossMeters: 80,
      netMeters: 80,
      actorUser: operatorUser,
    });

    // Roll 2: In Rework required
    const rollRework = await createFabricRoll({
      productionJobId: sampleJob._id,
      orderId: sampleOrder._id,
      loomMachineId: sampleLoom._id,
      grossMeters: 90,
      netMeters: 90,
      actorUser: operatorUser,
    });
    await recordInspection({
      fabricRollId: rollRework._id,
      inspectedLengthMeters: 90,
      defects: [
        { defectType: 'Hole', points: 4, meterPosition: 10 },
        { defectType: 'Hole', points: 4, meterPosition: 20 },
        { defectType: 'Hole', points: 4, meterPosition: 30 },
        { defectType: 'Hole', points: 4, meterPosition: 40 },
        { defectType: 'Hole', points: 4, meterPosition: 50 },
        { defectType: 'Hole', points: 4, meterPosition: 60 },
        { defectType: 'Hole', points: 4, meterPosition: 70 },
      ],
      reworkInstructions: 'Major darning required',
      actorUser: adminUser,
    });

    // Roll 3: Approved Grade A
    const rollApproved = await createFabricRoll({
      productionJobId: sampleJob._id,
      orderId: sampleOrder._id,
      loomMachineId: sampleLoom._id,
      grossMeters: 100,
      netMeters: 100,
      actorUser: operatorUser,
    });
    await recordInspection({
      fabricRollId: rollApproved._id,
      inspectedLengthMeters: 100,
      defects: [],
      actorUser: adminUser,
    });

    // Attempt 1: Dispatch containing unapproved roll must be rejected
    await expect(
      executeDispatchTransaction({
        orderId: sampleOrder._id,
        customerId: adminUser._id,
        rollIds: [rollUngraded._id],
        carrierName: 'FastLogistics',
        vehicleNumber: 'TN-38-BZ-9090',
        waybillNumber: 'WB-001',
        gatePassNumber: 'GP-001',
        idempotencyKey: 'IDEMP-FAIL-1',
        actorUser: adminUser,
      })
    ).rejects.toThrow(/Dispatch rejected/);

    // Attempt 2: Dispatch containing roll in REWORK_REQUIRED must be rejected
    await expect(
      executeDispatchTransaction({
        orderId: sampleOrder._id,
        customerId: adminUser._id,
        rollIds: [rollRework._id],
        carrierName: 'FastLogistics',
        vehicleNumber: 'TN-38-BZ-9090',
        waybillNumber: 'WB-002',
        gatePassNumber: 'GP-002',
        idempotencyKey: 'IDEMP-FAIL-2',
        actorUser: adminUser,
      })
    ).rejects.toThrow(/requires rework/);

    // Attempt 3: Dispatch containing only approved Grade A roll succeeds
    const dispatchResult = await executeDispatchTransaction({
      orderId: sampleOrder._id,
      customerId: adminUser._id,
      rollIds: [rollApproved._id],
      carrierName: 'FastLogistics',
      vehicleNumber: 'TN-38-BZ-9090',
      waybillNumber: 'WB-003',
      gatePassNumber: 'GP-003',
      idempotencyKey: 'IDEMP-PASS-3',
      actorUser: adminUser,
    });

    expect(dispatchResult.dispatch).toBeDefined();
    expect(dispatchResult.dispatch.totalMetersDispatched).toBe(100);

    const reloadedApprovedRoll = await FabricRoll.findById(rollApproved._id);
    expect(reloadedApprovedRoll.status).toBe('DISPATCHED');
  });

  // 5. Deep roll traceability explorer
  it('5. Retrieves full immutable traceability tree from roll to yarn batch, machine, and inspections', async () => {
    const roll = await createFabricRoll({
      rollNumber: 'ROL-TRACE-99',
      productionJobId: sampleJob._id,
      orderId: sampleOrder._id,
      loomMachineId: sampleLoom._id,
      genealogy: { yarnBatchNumbers: [sampleYarnBatch.batchNumber] },
      grossMeters: 150,
      netMeters: 150,
      actorUser: operatorUser,
    });

    await recordInspection({
      fabricRollId: roll._id,
      inspectedLengthMeters: 150,
      defects: [{ defectType: 'Slub', points: 1, meterPosition: 40 }],
      actorUser: adminUser,
    });

    const trace = await getFabricRollTraceability('ROL-TRACE-99');

    expect(trace.roll.rollNumber).toBe('ROL-TRACE-99');
    expect(trace.order.orderNumber).toBe(sampleOrder.orderNumber);
    expect(trace.machine.machineCode).toBe('LOOM-AJ-04');
    expect(trace.yarnBatches.length).toBe(1);
    expect(trace.yarnBatches[0].batchNumber).toBe(sampleYarnBatch.batchNumber);
    expect(trace.yarnBatches[0].supplierId.name).toBe('Coimbatore Spinners Ltd');
    expect(trace.inspections.length).toBe(1);
    expect(trace.summary.isEligibleForDispatch).toBe(true);
  });

  // 6. Provenance & AI observation distinction
  it('6. Clearly distinguishes human inspection from unverified AI vision predictions', async () => {
    // Record AI prediction (unverified by default)
    const aiDefect = await recordDefectObservation({
      machineId: sampleLoom._id,
      source: 'AI_VISION_PREDICTION',
      defectCategory: 'HOLE',
      location: { meterPosition: 42.5 },
      severity: 'MAJOR',
      penaltyPoints: 3,
      confidenceScore: 0.88,
      isVerifiedByInspector: false,
      evidenceReference: { imageUri: 'https://cdn.fabricops.com/qc/ai-scan-042.jpg' },
    });

    expect(aiDefect.source).toBe('AI_VISION_PREDICTION');
    expect(aiDefect.isVerifiedByInspector).toBe(false);
    expect(aiDefect.confidenceScore).toBe(0.88);

    // Inspector verifies prediction
    const verified = await verifyDefectObservation({
      defectId: aiDefect._id,
      isConfirmed: true,
      actorUser: adminUser,
    });

    expect(verified.isVerifiedByInspector).toBe(true);
    expect(verified.verifiedBy.toString()).toBe(adminUser._id.toString());
  });

  // 7. Quality dashboard metrics calculation
  it('7. Accurately calculates First-Pass Yield (FPY %), defect rates, and machine rankings', async () => {
    const roll1 = await createFabricRoll({
      productionJobId: sampleJob._id,
      orderId: sampleOrder._id,
      loomMachineId: sampleLoom._id,
      grossMeters: 100,
      netMeters: 100,
      actorUser: operatorUser,
    });
    await recordInspection({
      fabricRollId: roll1._id,
      inspectedLengthMeters: 100,
      defects: [{ defectType: 'Slub', points: 1, meterPosition: 10 }],
      actorUser: adminUser,
    });

    const metrics = await getQualityDashboardMetrics();

    expect(metrics.overview.totalRolls).toBeGreaterThanOrEqual(1);
    expect(metrics.overview.passedRolls).toBeGreaterThanOrEqual(1);
    expect(metrics.overview.firstPassYield).toBeGreaterThan(0);
    expect(metrics.machineTrends.length).toBeGreaterThanOrEqual(1);
    expect(metrics.machineTrends[0].machineCode).toBe('LOOM-AJ-04');
  });
});

