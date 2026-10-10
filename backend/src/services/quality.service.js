import mongoose from 'mongoose';
import { logger } from '../config/logger.js';
import {
  FabricRoll,
  QualityInspection,
  DefectObservation,
  ReworkEvent,
  ProductionRun,
  ProductionJob,
  Order,
  Machine,
  YarnBatch,
  FinishedGoodsInventory,
  AuditLog,
} from '../models/index.js';
import { withTransaction } from './transaction.service.js';

/**
 * Assign unique roll identifier and register roll with full genealogy.
 */
export async function createFabricRoll({
  rollNumber,
  productionJobId,
  orderId,
  loomMachineId,
  genealogy,
  grossMeters,
  netMeters,
  weightKg,
  gsmActual,
  widthInchesActual,
  productionStage = 'WEAVING',
  rollType = 'FINAL_ROLL',
  notes = '',
  actorUser,
}) {
  const generatedRollNumber = rollNumber
    ? rollNumber.trim().toUpperCase()
    : `ROL-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

  const order = await Order.findById(orderId);
  if (!order) throw new Error('Order not found');

  const machine = await Machine.findById(loomMachineId);
  if (!machine) throw new Error('Machine not found');

  const roll = await FabricRoll.create({
    rollNumber: generatedRollNumber,
    productionJobId,
    orderId,
    loomMachineId,
    genealogy: {
      yarnBatchNumbers: genealogy?.yarnBatchNumbers || [],
      warpBeamId: genealogy?.warpBeamId || `BEAM-${machine.machineCode}`,
      loomCode: machine.machineCode,
      operatorIds: genealogy?.operatorIds || (actorUser ? [actorUser._id] : []),
    },
    grossMeters: Number(grossMeters),
    netMeters: Number(netMeters !== undefined ? netMeters : grossMeters),
    weightKg: Number(weightKg || (grossMeters * 0.25)),
    gsmActual: Number(gsmActual || 120),
    widthInchesActual: Number(widthInchesActual || 58),
    grade: 'UNGRADED',
    inspectionStatus: 'PENDING',
    productionStage,
    rollType,
    status: 'GREY_OFF_LOOM',
    notes,
  });

  // If production job exists, update produced quantity
  if (productionJobId) {
    await ProductionJob.findByIdAndUpdate(productionJobId, {
      $inc: { producedQuantity: roll.netMeters },
    });
  }

  if (actorUser) {
    await AuditLog.create({
      actorId: actorUser._id,
      actorRole: actorUser.role,
      action: 'CREATE_FABRIC_ROLL',
      entityType: 'FabricRoll',
      entityId: roll._id,
      newState: { rollNumber: roll.rollNumber, grossMeters: roll.grossMeters },
      notes: `Doffed fabric roll ${roll.rollNumber} from loom ${machine.machineCode}`,
    });
  }

  return roll;
}

/**
 * List fabric rolls with rich filters and pagination.
 */
export async function getFabricRolls({
  orderId,
  loomMachineId,
  status,
  inspectionStatus,
  grade,
  search,
  page = 1,
  limit = 30,
} = {}) {
  const query = {};
  if (orderId) query.orderId = orderId;
  if (loomMachineId) query.loomMachineId = loomMachineId;
  if (status && status !== 'ALL') query.status = status;
  if (inspectionStatus && inspectionStatus !== 'ALL') query.inspectionStatus = inspectionStatus;
  if (grade && grade !== 'ALL') query.grade = grade;

  if (search) {
    const s = search.trim();
    query.$or = [
      { rollNumber: new RegExp(s, 'i') },
      { 'genealogy.yarnBatchNumbers': new RegExp(s, 'i') },
      { 'genealogy.loomCode': new RegExp(s, 'i') },
    ];
  }

  const skip = (Math.max(1, Number(page)) - 1) * Number(limit);

  const [rolls, total] = await Promise.all([
    FabricRoll.find(query)
      .populate('orderId', 'orderNumber status confirmedDeliveryDate')
      .populate('loomMachineId', 'machineCode name type location')
      .populate('latestInspectionId', 'inspectionNumber grade verdict totalPenaltyPoints pointsPer100SqMeters inspectionDate')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    FabricRoll.countDocuments(query),
  ]);

  return {
    rolls,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / limit),
    },
  };
}

/**
 * Deep fabric roll traceability explorer:
 * roll -> order -> machine -> production run -> yarn batches (suppliers) -> inspection history -> defects -> rework.
 */
export async function getFabricRollTraceability(rollIdOrNumber) {
  let query = {};
  if (mongoose.Types.ObjectId.isValid(rollIdOrNumber)) {
    query = { _id: rollIdOrNumber };
  } else {
    query = { rollNumber: rollIdOrNumber.trim().toUpperCase() };
  }

  const roll = await FabricRoll.findOne(query)
    .populate('orderId')
    .populate('loomMachineId')
    .populate('productionJobId')
    .populate('genealogy.operatorIds', 'name email role')
    .lean();

  if (!roll) {
    throw new Error('Fabric roll not found');
  }

  // 1. Resolve Yarn Batches and Suppliers
  const yarnBatches = await YarnBatch.find({
    batchNumber: { $in: roll.genealogy?.yarnBatchNumbers || [] },
  })
    .populate('supplierId', 'name supplierCode contactPerson rating')
    .populate('inventoryItemId', 'sku name category yarnType unit')
    .lean();

  // 2. Resolve Chronological Quality Inspections (initial + all reinspections)
  const inspections = await QualityInspection.find({ fabricRollId: roll._id })
    .populate('inspectorId', 'name email role')
    .sort({ inspectionDate: 1 })
    .lean();

  // 3. Resolve Itemized Defect Observations
  const defectObservations = await DefectObservation.find({ fabricRollId: roll._id })
    .populate('verifiedBy', 'name email')
    .sort({ 'location.meterPosition': 1 })
    .lean();

  // 4. Resolve Rework Events
  const reworkEvents = await ReworkEvent.find({ fabricRollId: roll._id })
    .populate('authorizedBy', 'name email')
    .populate('assignedOperatorId', 'name email')
    .populate('reinspectionId', 'inspectionNumber grade verdict')
    .sort({ createdAt: 1 })
    .lean();

  return {
    roll,
    order: roll.orderId,
    machine: roll.loomMachineId,
    yarnBatches,
    inspections,
    defectObservations,
    reworkEvents,
    summary: {
      totalInspections: inspections.length,
      currentGrade: roll.grade,
      currentVerdict: roll.currentVerdict,
      inspectionStatus: roll.inspectionStatus,
      reworkCycles: reworkEvents.length,
      confirmedDefectsCount: defectObservations.filter((d) => d.isVerifiedByInspector && d.status === 'ACTIVE').length,
      isEligibleForDispatch: ['GRADE_A', 'GRADE_B', 'PACKED_FOR_DISPATCH'].includes(roll.status),
    },
  };
}

/**
 * Record standard 4-Point quality inspection.
 * Supports authorized rework and reinspections without overwriting historical records.
 */
export async function recordInspection({
  fabricRollId,
  inspectorId,
  inspectionStandard = 'FOUR_POINT_SYSTEM',
  inspectedLengthMeters,
  fabricWidthInches = 58,
  defects = [],
  reworkInstructions = '',
  aiConfidenceScore,
  isReinspection = false,
  reworkEventId = null,
  actorUser,
}) {
  return withTransaction(async (session) => {
    const roll = await FabricRoll.findById(fabricRollId).session(session);
    if (!roll) {
      throw new Error('Fabric roll not found');
    }

    const length = Number(inspectedLengthMeters || roll.netMeters || roll.grossMeters);
    const width = Number(fabricWidthInches || roll.widthInchesActual || 58);

    // Compute 4-point penalty metrics
    const totalPenaltyPoints = defects.reduce((acc, d) => acc + (Number(d.points) || 1), 0);
    const pointsPer100SqMeters = parseFloat(
      ((totalPenaltyPoints * 100 * 39.37) / (length * width)).toFixed(2)
    );

    let grade = 'GRADE_A';
    let verdict = 'PASSED';
    let inspectionStatus = 'PASSED';

    if (pointsPer100SqMeters <= 20) {
      grade = 'GRADE_A';
      verdict = 'PASSED';
      inspectionStatus = 'PASSED';
    } else if (pointsPer100SqMeters <= 28) {
      grade = 'GRADE_B';
      verdict = 'PASSED';
      inspectionStatus = 'PASSED';
    } else {
      grade = 'REJECT';
      if (reworkInstructions && reworkInstructions.trim().length > 0) {
        verdict = 'REWORK';
        inspectionStatus = 'REWORK_REQUIRED';
      } else {
        verdict = 'SCRAP';
        inspectionStatus = 'REJECTED';
      }
    }

    const inspectionCycle = (roll.inspectionCount || 0) + 1;
    const inspectionNumber = `QC-${Date.now().toString().slice(-6)}-C${inspectionCycle}`;

    // 1. Create inspection record
    const [inspection] = await QualityInspection.create(
      [
        {
          inspectionNumber,
          fabricRollId: roll._id,
          orderId: roll.orderId,
          inspectorId: inspectorId || actorUser._id,
          inspectionStandard,
          inspectedLengthMeters: length,
          fabricWidthInches: width,
          defects: defects.map((d) => ({
            defectType: d.defectType,
            points: Number(d.points) || 1,
            meterPosition: Number(d.meterPosition || 0),
            lengthInches: Number(d.lengthInches || 1),
            warpOrWeft: d.warpOrWeft || 'UNKNOWN',
            severity: d.severity || 'MINOR',
            imageUri: d.imageUri,
            notes: d.notes,
          })),
          totalPenaltyPoints,
          pointsPer100SqMeters,
          grade,
          verdict,
          inspectionStatus,
          inspectionCycle,
          isReinspection: Boolean(isReinspection || reworkEventId),
          reworkEventId: reworkEventId || undefined,
          reworkInstructions: verdict === 'REWORK' ? reworkInstructions : undefined,
          aiConfidenceScore,
          inspectionDate: new Date(),
        },
      ],
      { session }
    );

    // 2. Persist granular DefectObservations in dedicated collection
    if (defects.length > 0) {
      const defectDocs = defects.map((d, idx) => ({
        defectCode: `DEF-${Date.now().toString().slice(-5)}-${idx + 1}`,
        fabricRollId: roll._id,
        inspectionId: inspection._id,
        orderId: roll.orderId,
        machineId: roll.loomMachineId,
        productionJobId: roll.productionJobId,
        timestamp: new Date(),
        source: d.source || 'HUMAN_INSPECTION',
        defectCategory: (d.defectCategory || d.defectType || 'OTHER').toUpperCase().replace(/\s+/g, '_'),
        location: {
          meterPosition: Number(d.meterPosition || 0),
          widthInchesFromSelvedge: d.widthInchesFromSelvedge,
          warpOrWeft: d.warpOrWeft || 'UNKNOWN',
          zone: d.zone || 'CENTER_BODY',
        },
        severity: d.severity || 'MINOR',
        penaltyPoints: Number(d.points) || 1,
        affectedLengthMeters: Number(d.lengthInches ? d.lengthInches * 0.0254 : 0.1),
        confidenceScore: d.confidenceScore !== undefined ? Number(d.confidenceScore) : 1.0,
        isVerifiedByInspector: true,
        verifiedBy: actorUser._id,
        verifiedAt: new Date(),
        evidenceReference: {
          imageUri: d.imageUri,
          notes: d.notes,
        },
        status: verdict === 'REWORK' ? 'ACTIVE' : 'ACTIVE',
      }));

      await DefectObservation.insertMany(defectDocs, { session });
    }

    // 3. Handle Rework Events
    let createdReworkEvent = null;
    if (verdict === 'REWORK') {
      const reworkNumber = `RWK-${Date.now().toString().slice(-6)}`;
      const [rework] = await ReworkEvent.create(
        [
          {
            reworkNumber,
            fabricRollId: roll._id,
            inspectionId: inspection._id,
            reworkType: 'MENDING_DARNING',
            reworkInstructions,
            authorizedBy: actorUser._id,
            status: 'REQUESTED',
            metersBeforeRework: roll.netMeters,
            resultingVerdict: 'PENDING_REINSPECTION',
          },
        ],
        { session }
      );
      createdReworkEvent = rework;
    }

    // If this was a reinspection for an existing rework event, update that event
    if (reworkEventId) {
      const existingRework = await ReworkEvent.findById(reworkEventId).session(session);
      if (existingRework) {
        existingRework.reinspectionId = inspection._id;
        existingRework.resultingVerdict = verdict === 'PASSED' ? 'PASSED' : 'REJECTED';
        if (verdict === 'PASSED') {
          existingRework.status = 'COMPLETED';
        }
        await existingRework.save({ session });
      }
    }

    // 4. Update FabricRoll status and grade
    roll.grade = grade;
    roll.latestInspectionId = inspection._id;
    roll.currentVerdict = verdict;
    roll.inspectionCount = inspectionCycle;

    if (verdict === 'PASSED') {
      roll.status = grade; // GRADE_A or GRADE_B
      roll.inspectionStatus = 'PASSED';

      // Create / update FinishedGoodsInventory entry
      await FinishedGoodsInventory.findOneAndUpdate(
        { fabricRollId: roll._id },
        {
          fabricRollId: roll._id,
          orderId: roll.orderId,
          productId: roll.orderId?.productId || roll._id,
          grade,
          netMeters: roll.netMeters,
          warehouseLocation: 'FG-WAREHOUSE-A',
          isAllocatedToDispatch: false,
        },
        { upsert: true, session }
      );
    } else if (verdict === 'REWORK') {
      roll.status = 'REWORK_REQUIRED';
      roll.inspectionStatus = 'REWORK_REQUIRED';
      roll.reworkCount = (roll.reworkCount || 0) + 1;
    } else {
      roll.status = 'REJECTED_SCRAP';
      roll.inspectionStatus = 'REJECTED';
    }

    await roll.save({ session });

    await AuditLog.create(
      [
        {
          actorId: actorUser._id,
          actorRole: actorUser.role,
          action: isReinspection ? 'REINSPECT_FABRIC_ROLL' : 'INSPECT_FABRIC_ROLL',
          entityType: 'QualityInspection',
          entityId: inspection._id,
          newState: {
            rollNumber: roll.rollNumber,
            grade,
            verdict,
            pointsPer100SqMeters,
            inspectionCycle,
          },
          notes: `Inspected roll ${roll.rollNumber}: ${grade} (${verdict}) at ${pointsPer100SqMeters} pts/100m²`,
        },
      ],
      { session }
    );

    return { inspection, roll, reworkEvent: createdReworkEvent };
  });
}

/**
 * Authorize and assign a rework event for a defective roll.
 */
export async function authorizeRework({
  reworkId,
  fabricRollId,
  reworkType,
  reworkInstructions,
  assignedOperatorId,
  actorUser,
}) {
  let rework;
  if (reworkId) {
    rework = await ReworkEvent.findById(reworkId);
  } else if (fabricRollId) {
    rework = await ReworkEvent.findOne({ fabricRollId, status: 'REQUESTED' }).sort({ createdAt: -1 });
  }

  if (!rework) {
    throw new Error('Rework event not found');
  }

  rework.status = 'IN_PROGRESS';
  rework.reworkType = reworkType || rework.reworkType;
  if (reworkInstructions) rework.reworkInstructions = reworkInstructions;
  if (assignedOperatorId) rework.assignedOperatorId = assignedOperatorId;
  rework.authorizedBy = actorUser._id;
  rework.startedAt = new Date();

  await rework.save();

  await AuditLog.create({
    actorId: actorUser._id,
    actorRole: actorUser.role,
    action: 'AUTHORIZE_REWORK',
    entityType: 'ReworkEvent',
    entityId: rework._id,
    newState: { status: 'IN_PROGRESS', reworkType: rework.reworkType },
    notes: `Authorized rework ${rework.reworkNumber} (${rework.reworkType})`,
  });

  return rework;
}

/**
 * Complete rework actions with recorded output metrics, preparing roll for reinspection.
 */
export async function completeRework({
  reworkId,
  actionTaken,
  metersAfterRework,
  notes,
  actorUser,
}) {
  const rework = await ReworkEvent.findById(reworkId);
  if (!rework) throw new Error('Rework event not found');

  rework.status = 'COMPLETED';
  rework.actionTaken = actionTaken || 'Mending and restorative finishing completed';
  rework.metersAfterRework = Number(metersAfterRework || rework.metersBeforeRework);
  rework.completedAt = new Date();
  if (notes) rework.notes = notes;
  await rework.save();

  // Update roll netMeters and reset inspectionStatus to PENDING (for reinspection cycle)
  const roll = await FabricRoll.findById(rework.fabricRollId);
  if (roll) {
    if (metersAfterRework) roll.netMeters = Number(metersAfterRework);
    roll.inspectionStatus = 'PENDING';
    roll.status = 'IN_INSPECTION';
    await roll.save();
  }

  await AuditLog.create({
    actorId: actorUser._id,
    actorRole: actorUser.role,
    action: 'COMPLETE_REWORK',
    entityType: 'ReworkEvent',
    entityId: rework._id,
    newState: { status: 'COMPLETED', actionTaken },
    notes: `Completed rework for roll ${roll?.rollNumber}`,
  });

  return { rework, roll };
}

/**
 * Record a defect observation (supports AI predictions, sensors, or manual input).
 */
export async function recordDefectObservation({
  fabricRollId,
  machineId,
  productionRunId,
  source = 'HUMAN_INSPECTION',
  defectCategory,
  location,
  severity = 'MINOR',
  penaltyPoints = 1,
  confidenceScore = 1.0,
  isVerifiedByInspector = false,
  evidenceReference,
  actorUser,
}) {
  const isHuman = source === 'HUMAN_INSPECTION';
  const verified = isHuman ? true : Boolean(isVerifiedByInspector);

  const defectCode = `DEF-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

  const defect = await DefectObservation.create({
    defectCode,
    fabricRollId: fabricRollId || undefined,
    machineId,
    productionRunId: productionRunId || undefined,
    source,
    defectCategory,
    location,
    severity,
    penaltyPoints: Number(penaltyPoints),
    confidenceScore: Number(confidenceScore),
    isVerifiedByInspector: verified,
    verifiedBy: verified && actorUser ? actorUser._id : undefined,
    verifiedAt: verified ? new Date() : undefined,
    evidenceReference,
  });

  return defect;
}

/**
 * Inspector verification of an AI or sensor defect observation.
 */
export async function verifyDefectObservation({ defectId, isConfirmed, dismissReason, actorUser }) {
  const defect = await DefectObservation.findById(defectId);
  if (!defect) throw new Error('Defect observation not found');

  if (isConfirmed) {
    defect.isVerifiedByInspector = true;
    defect.verifiedBy = actorUser._id;
    defect.verifiedAt = new Date();
    defect.status = 'ACTIVE';
  } else {
    defect.status = 'DISMISSED_FALSE_POSITIVE';
    defect.evidenceReference = {
      ...defect.evidenceReference,
      dismissReason,
      dismissedBy: actorUser._id,
      dismissedAt: new Date(),
    };
  }

  await defect.save();
  return defect;
}

/**
 * High-performance Quality Dashboard analytics.
 */
export async function getQualityDashboardMetrics({ timeRange = '30d', orderId, machineId } = {}) {
  const rollFilter = {};
  if (orderId) rollFilter.orderId = orderId;
  if (machineId) rollFilter.loomMachineId = machineId;

  const [rolls, inspections, defects, reworks, machines] = await Promise.all([
    FabricRoll.find(rollFilter).lean(),
    QualityInspection.find().lean(),
    DefectObservation.find().lean(),
    ReworkEvent.find().lean(),
    Machine.find().lean(),
  ]);

  const totalRolls = rolls.length;
  const gradeARolls = rolls.filter((r) => r.grade === 'GRADE_A').length;
  const gradeBRolls = rolls.filter((r) => r.grade === 'GRADE_B').length;
  const passedRolls = gradeARolls + gradeBRolls;
  const reworkRolls = rolls.filter((r) => r.status === 'REWORK_REQUIRED' || r.inspectionStatus === 'REWORK_REQUIRED').length;
  const rejectedRolls = rolls.filter((r) => r.status === 'REJECTED_SCRAP' || r.grade === 'REJECT').length;
  const pendingRolls = rolls.filter((r) => r.inspectionStatus === 'PENDING').length;

  // First-Pass Yield (rolls passed on cycle 1 without requiring rework)
  const firstPassPassed = inspections.filter((i) => i.inspectionCycle === 1 && i.verdict === 'PASSED').length;
  const firstPassTotal = inspections.filter((i) => i.inspectionCycle === 1).length;
  const firstPassYield = firstPassTotal > 0 ? parseFloat(((firstPassPassed / firstPassTotal) * 100).toFixed(1)) : 100;

  // Defect category breakdown (only verified or human defects)
  const confirmedDefects = defects.filter((d) => d.isVerifiedByInspector && d.status === 'ACTIVE');
  const defectCategoryCounts = {};
  for (const d of confirmedDefects) {
    defectCategoryCounts[d.defectCategory] = (defectCategoryCounts[d.defectCategory] || 0) + 1;
  }

  // Machine-related quality ranking (penalty points per machine)
  const machinePointsMap = {};
  for (const d of confirmedDefects) {
    const mId = d.machineId?.toString();
    if (mId) {
      machinePointsMap[mId] = (machinePointsMap[mId] || 0) + (d.penaltyPoints || 1);
    }
  }

  const machineTrends = machines.map((m) => {
    const penaltyPoints = machinePointsMap[m._id.toString()] || 0;
    const rollsCount = rolls.filter((r) => r.loomMachineId?.toString() === m._id.toString()).length;
    return {
      _id: m._id,
      machineCode: m.machineCode,
      name: m.name,
      type: m.type,
      totalRolls: rollsCount,
      totalPenaltyPoints: penaltyPoints,
      avgPointsPerRoll: rollsCount > 0 ? parseFloat((penaltyPoints / rollsCount).toFixed(1)) : 0,
    };
  }).sort((a, b) => b.totalPenaltyPoints - a.totalPenaltyPoints);

  // Rework metrics
  const completedReworks = reworks.filter((r) => r.status === 'COMPLETED');
  const successfulReworks = reworks.filter((r) => r.resultingVerdict === 'PASSED');
  const reworkSuccessRate = completedReworks.length > 0
    ? parseFloat(((successfulReworks.length / completedReworks.length) * 100).toFixed(1))
    : 100;

  return {
    overview: {
      totalRolls,
      passedRolls,
      gradeARolls,
      gradeBRolls,
      reworkRolls,
      rejectedRolls,
      pendingRolls,
      firstPassYield,
      reworkSuccessRate,
      passPercentage: totalRolls > 0 ? parseFloat(((passedRolls / totalRolls) * 100).toFixed(1)) : 0,
    },
    defectCategoryCounts,
    machineTrends: machineTrends.slice(0, 10),
    reworkSummary: {
      totalRequested: reworks.length,
      inProgress: reworks.filter((r) => r.status === 'IN_PROGRESS').length,
      completed: completedReworks.length,
      passedAfterReinspection: successfulReworks.length,
      reworkSuccessRate,
    },
    aiTelemetry: {
      totalAiPredictions: defects.filter((d) => d.source === 'AI_VISION_PREDICTION').length,
      confirmedAiPredictions: defects.filter((d) => d.source === 'AI_VISION_PREDICTION' && d.isVerifiedByInspector).length,
      pendingVerification: defects.filter((d) => d.source === 'AI_VISION_PREDICTION' && !d.isVerifiedByInspector && d.status === 'ACTIVE').length,
    },
  };
}

