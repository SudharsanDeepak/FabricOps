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
} from '../services/quality.service.js';
import { DefectObservation, ReworkEvent, Machine } from '../models/index.js';

export const createRollHandler = async (req, res, next) => {
  try {
    const roll = await createFabricRoll({
      ...req.body,
      actorUser: req.user,
    });
    res.status(201).json({
      success: true,
      message: `Fabric roll ${roll.rollNumber} created and doffed successfully`,
      data: roll,
    });
  } catch (error) {
    next(error);
  }
};

export const getRollsHandler = async (req, res, next) => {
  try {
    const { orderId, loomMachineId, status, inspectionStatus, grade, search, page, limit } = req.query;
    const result = await getFabricRolls({
      orderId,
      loomMachineId,
      status,
      inspectionStatus,
      grade,
      search,
      page,
      limit,
    });
    res.json({
      success: true,
      data: result.rolls,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const getRollTraceabilityHandler = async (req, res, next) => {
  try {
    const traceability = await getFabricRollTraceability(req.params.idOrNumber);
    res.json({
      success: true,
      data: traceability,
    });
  } catch (error) {
    next(error);
  }
};

export const recordInspectionHandler = async (req, res, next) => {
  try {
    const result = await recordInspection({
      ...req.body,
      actorUser: req.user,
    });
    res.status(201).json({
      success: true,
      message: `Inspection ${result.inspection.inspectionNumber} recorded successfully (Grade: ${result.roll.grade})`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const authorizeReworkHandler = async (req, res, next) => {
  try {
    const rework = await authorizeRework({
      reworkId: req.params.id,
      ...req.body,
      actorUser: req.user,
    });
    res.json({
      success: true,
      message: `Rework ${rework.reworkNumber} authorized successfully`,
      data: rework,
    });
  } catch (error) {
    next(error);
  }
};

export const completeReworkHandler = async (req, res, next) => {
  try {
    const result = await completeRework({
      reworkId: req.params.id,
      ...req.body,
      actorUser: req.user,
    });
    res.json({
      success: true,
      message: `Rework ${result.rework.reworkNumber} completed. Roll ready for reinspection.`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const recordDefectObservationHandler = async (req, res, next) => {
  try {
    const defect = await recordDefectObservation({
      ...req.body,
      actorUser: req.user,
    });
    res.status(201).json({
      success: true,
      message: `Defect observation ${defect.defectCode} recorded`,
      data: defect,
    });
  } catch (error) {
    next(error);
  }
};

export const verifyDefectObservationHandler = async (req, res, next) => {
  try {
    const { isConfirmed, dismissReason } = req.body;
    const defect = await verifyDefectObservation({
      defectId: req.params.id,
      isConfirmed,
      dismissReason,
      actorUser: req.user,
    });
    res.json({
      success: true,
      message: isConfirmed ? 'Defect verified by inspector' : 'Defect dismissed as false positive',
      data: defect,
    });
  } catch (error) {
    next(error);
  }
};

export const getQualityDashboardHandler = async (req, res, next) => {
  try {
    const { timeRange, orderId, machineId } = req.query;
    const metrics = await getQualityDashboardMetrics({ timeRange, orderId, machineId });
    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    next(error);
  }
};

export const getReworkQueueHandler = async (req, res, next) => {
  try {
    const { status } = req.query;
    const query = {};
    if (status && status !== 'ALL') query.status = status;

    const reworks = await ReworkEvent.find(query)
      .populate('fabricRollId', 'rollNumber grade grossMeters netMeters loomMachineId')
      .populate('authorizedBy', 'name email')
      .populate('assignedOperatorId', 'name email')
      .populate('inspectionId', 'inspectionNumber totalPenaltyPoints pointsPer100SqMeters')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: reworks,
      count: reworks.length,
    });
  } catch (error) {
    next(error);
  }
};

export const getAiDefectsHandler = async (req, res, next) => {
  try {
    const { unverifiedOnly } = req.query;
    const query = { source: 'AI_VISION_PREDICTION' };
    if (unverifiedOnly === 'true') {
      query.isVerifiedByInspector = false;
      query.status = 'ACTIVE';
    }

    const defects = await DefectObservation.find(query)
      .populate('fabricRollId', 'rollNumber')
      .populate('machineId', 'machineCode name type')
      .populate('verifiedBy', 'name email')
      .sort({ timestamp: -1 })
      .limit(50)
      .lean();

    res.json({
      success: true,
      data: defects,
      count: defects.length,
    });
  } catch (error) {
    next(error);
  }
};

export const getQualityMachinesHandler = async (req, res, next) => {
  try {
    const machines = await Machine.find({ isDeleted: { $ne: true } })
      .select('machineCode name type status department')
      .sort({ machineCode: 1 })
      .lean();
    res.json({
      success: true,
      data: machines,
    });
  } catch (error) {
    next(error);
  }
};

