import mongoose from 'mongoose';
import { logger } from '../config/logger.js';
import {
  Machine,
  ProductionJob,
  ProductionLog,
  ProductionPlan,
  BreakdownReport,
  ShiftHandover,
  Attendance,
  Shift,
  OperatorProfile,
  AuditLog,
  User,
  Order,
} from '../models/index.js';
import { broadcastEvent } from '../sockets/socketManager.js';

// Standard textile manufacturing stage pipeline
const PIPELINE_ORDER = [
  'SPINNING',
  'WARPING',
  'SIZING',
  'WEAVING',
  'DYEING',
  'FINISHING',
  'INSPECTION',
  'PACKING',
];

/**
 * Determine the next process stage for a production job.
 */
function getNextProcess(currentStage, planStages = []) {
  if (planStages && planStages.length > 0) {
    const currentIdx = planStages.findIndex((s) => s.stageName === currentStage);
    if (currentIdx >= 0 && currentIdx < planStages.length - 1) {
      return planStages[currentIdx + 1].stageName;
    }
  }
  const stdIdx = PIPELINE_ORDER.indexOf(currentStage);
  if (stdIdx >= 0 && stdIdx < PIPELINE_ORDER.length - 1) {
    return PIPELINE_ORDER[stdIdx + 1];
  }
  return 'DISPATCH_READY';
}

/**
 * Format fabric specification snapshot cleanly for floor display.
 */
function extractFabricSpecs(orderItem) {
  const spec = orderItem?.fabricSpecSnapshot || {};
  return {
    gsm: spec.gsm || 120,
    weaveType: spec.weaveType || 'PLAIN',
    composition: spec.composition || '100% Cotton',
    yarnCountWarp: spec.yarnCountWarp || '40s Ne',
    yarnCountWeft: spec.yarnCountWeft || '40s Ne',
    construction: spec.construction || '132x72',
    widthInches: spec.widthInches || 58,
    colorName: spec.colorName || 'Natural Ecru',
  };
}

/**
 * Fetch complete floor dashboard state for an operator.
 */
export async function getOperatorDashboardData(operatorUserId) {
  const user = await User.findById(operatorUserId).lean();
  if (!user) {
    throw new Error('Operator user not found');
  }

  // Retrieve operator profile with machine assignments
  const profile = await OperatorProfile.findOne({ userId: operatorUserId })
    .populate('assignedMachines')
    .lean();

  const assignedMachineIds = (profile?.assignedMachines || []).map((m) => m._id);

  // If admin, show all machines; if operator, show assigned machines
  const machineFilter =
    user.role === 'ADMIN' ? {} : { _id: { $in: assignedMachineIds } };

  const [
    machines,
    rawJobs,
    shifts,
    todayAttendance,
    recentLogs,
    recentHandovers,
    openBreakdowns,
    allOperators,
  ] = await Promise.all([
    Machine.find(machineFilter)
      .populate('currentProductionJobId')
      .populate('currentOperatorId', 'name email phone')
      .lean(),
    ProductionJob.find({
      $or: [
        { assignedOperatorIds: operatorUserId },
        { machineId: { $in: assignedMachineIds } },
      ],
      status: { $in: ['SCHEDULED', 'RUNNING', 'PAUSED'] },
    })
      .populate('orderId', 'orderNumber status confirmedDeliveryDate items')
      .populate('machineId', 'machineCode name type status telemetrySnapshot location')
      .sort({ createdAt: -1 })
      .lean(),
    Shift.find({ isActive: true }).lean(),
    Attendance.findOne({
      operatorId: operatorUserId,
      date: {
        $gte: new Date(new Date().setUTCHours(0, 0, 0, 0)),
        $lt: new Date(new Date().setUTCHours(23, 59, 59, 999)),
      },
    })
      .populate('shiftId')
      .lean(),
    ProductionLog.find({
      $or: [
        { operatorId: operatorUserId },
        { machineId: { $in: assignedMachineIds } },
      ],
    })
      .populate('jobId', 'jobNumber stage')
      .populate('machineId', 'machineCode name')
      .populate('operatorId', 'name')
      .sort({ logDate: -1 })
      .limit(10)
      .lean(),
    ShiftHandover.find({
      $or: [
        { outgoingOperatorId: operatorUserId },
        { incomingOperatorId: operatorUserId },
        { machineId: { $in: assignedMachineIds } },
      ],
    })
      .populate('machineId', 'machineCode name')
      .populate('outgoingOperatorId', 'name')
      .populate('incomingOperatorId', 'name')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
    BreakdownReport.find({
      machineId: { $in: assignedMachineIds },
      status: { $ne: 'RESOLVED' },
    })
      .populate('machineId', 'machineCode name location')
      .populate('reportedBy', 'name')
      .sort({ reportedAt: -1 })
      .lean(),
    User.find({ role: 'OPERATOR', status: 'ACTIVE' })
      .select('name email phone')
      .lean(),
  ]);

  // Enrich jobs with remaining quantity, progress, next process, fabric specs, and version
  const enrichedJobs = await Promise.all(
    rawJobs.map(async (job) => {
      const order = job.orderId;
      const orderItem = order?.items?.[0] || {};
      const fabricSpecs = extractFabricSpecs(orderItem);

      // Fetch production plan stages for this order to compute exact next process
      const plan = await ProductionPlan.findOne({ orderId: order?._id })
        .select('stages')
        .lean();

      const remainingQuantity = Math.max(
        0,
        Number(job.targetQuantity || 0) - Number(job.producedQuantity || 0)
      );
      const progressPercentage =
        job.targetQuantity > 0
          ? Math.min(
              100,
              Math.round(((job.producedQuantity || 0) / job.targetQuantity) * 100)
            )
          : 0;

      return {
        ...job,
        version: job.__v,
        remainingQuantity,
        progressPercentage,
        fabricSpecs,
        nextProcess: getNextProcess(job.stage, plan?.stages),
        orderNumber: order?.orderNumber || 'ORD-UNASSIGNED',
        deliveryDate: order?.confirmedDeliveryDate,
      };
    })
  );

  const activeJobs = enrichedJobs.filter((j) => j.status === 'RUNNING' || j.status === 'PAUSED');
  const upcomingTasks = enrichedJobs.filter((j) => j.status === 'SCHEDULED');

  // Determine current active shift based on current local hour
  const now = new Date();
  const currentHour = now.getHours();
  let currentShift = shifts[0] || null;
  for (const s of shifts) {
    const startHour = parseInt(s.startTime?.split(':')[0] || '0', 10);
    const endHour = parseInt(s.endTime?.split(':')[0] || '0', 10);
    if (endHour > startHour) {
      if (currentHour >= startHour && currentHour < endHour) {
        currentShift = s;
        break;
      }
    } else {
      // Overnight shift
      if (currentHour >= startHour || currentHour < endHour) {
        currentShift = s;
        break;
      }
    }
  }

  return {
    operator: {
      userId: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      employeeCode: profile?.employeeCode || 'EMP-OPR-001',
      department: profile?.department || 'WEAVING',
      skillLevel: profile?.skillLevel || 'LEVEL_1',
      hourlyWageRate: profile?.hourlyWageRate || 150,
      emergencyContact: profile?.emergencyContact,
    },
    assignedMachines: machines,
    activeJobs,
    upcomingTasks,
    shifts,
    currentShift,
    todayAttendance,
    recentLogs,
    recentHandovers,
    openBreakdowns,
    availableOperators: allOperators,
  };
}

/**
 * Validate and execute a task state transition with optimistic concurrency (version checking).
 * Valid state transitions:
 * - SCHEDULED -> START -> RUNNING
 * - RUNNING   -> PAUSE -> PAUSED
 * - PAUSED    -> RESUME -> RUNNING
 * - RUNNING   -> COMPLETE -> COMPLETED
 * - PAUSED    -> COMPLETE -> COMPLETED
 */
export async function transitionTaskState({
  jobId,
  action,
  expectedVersion,
  actorUser,
  notes,
}) {
  const allowedActions = ['START', 'PAUSE', 'RESUME', 'COMPLETE'];
  if (!allowedActions.includes(action)) {
    throw new Error(`Invalid action: "${action}". Permitted actions: [${allowedActions.join(', ')}]`);
  }

  const job = await ProductionJob.findById(jobId);
  if (!job) {
    throw new Error('Production task not found');
  }

  // Operator Authorization Check: cannot operate on unauthorized jobs
  if (actorUser.role === 'OPERATOR') {
    const profile = await OperatorProfile.findOne({ userId: actorUser._id }).lean();
    const isAssignedJob = (job.assignedOperatorIds || []).some(
      (id) => id.toString() === actorUser._id.toString()
    );
    const isAssignedMachine = (profile?.assignedMachines || []).some(
      (mId) => mId.toString() === job.machineId.toString()
    );

    if (!isAssignedJob && !isAssignedMachine) {
      throw new Error('Unauthorized task: You are not assigned to this job or machine');
    }
  }

  // Machine Availability Rule: A machine cannot be marked available while running, under maintenance, or in a fault state
  const machine = await Machine.findById(job.machineId);
  if (!machine) {
    throw new Error('Associated machine not found');
  }

  if (action === 'START' || action === 'RESUME') {
    if (machine.status === 'BREAKDOWN') {
      throw new Error(`Cannot start/resume job: Machine ${machine.machineCode} is in BREAKDOWN state. Resolve breakdown before operating.`);
    }
    if (machine.status === 'MAINTENANCE') {
      throw new Error(`Cannot start/resume job: Machine ${machine.machineCode} is under MAINTENANCE. Cannot operate until maintenance completes.`);
    }
    if (
      machine.status === 'RUNNING' &&
      machine.currentProductionJobId &&
      machine.currentProductionJobId.toString() !== job._id.toString()
    ) {
      throw new Error(`Cannot start/resume job: Machine ${machine.machineCode} is actively running another job`);
    }
  }

  // Valid State Machine Rule
  const currentStatus = job.status;
  let nextStatus;

  if (action === 'START') {
    if (currentStatus !== 'SCHEDULED') {
      throw new Error(`Cannot START task: Current status is "${currentStatus}". Must be "SCHEDULED".`);
    }
    nextStatus = 'RUNNING';
  } else if (action === 'PAUSE') {
    if (currentStatus !== 'RUNNING') {
      throw new Error(`Cannot PAUSE task: Current status is "${currentStatus}". Must be "RUNNING".`);
    }
    nextStatus = 'PAUSED';
  } else if (action === 'RESUME') {
    if (currentStatus !== 'PAUSED') {
      throw new Error(`Cannot RESUME task: Current status is "${currentStatus}". Must be "PAUSED".`);
    }
    nextStatus = 'RUNNING';
  } else if (action === 'COMPLETE') {
    if (currentStatus !== 'RUNNING' && currentStatus !== 'PAUSED') {
      throw new Error(`Cannot COMPLETE task: Current status is "${currentStatus}". Must be "RUNNING" or "PAUSED".`);
    }
    nextStatus = 'COMPLETED';
  }

  // Conditional Update with optimistic lock / version check
  const updateQuery = {
    _id: jobId,
    status: currentStatus,
  };

  if (expectedVersion !== undefined && expectedVersion !== null) {
    updateQuery.__v = Number(expectedVersion);
  }

  const updateDoc = {
    $set: {
      status: nextStatus,
      ...(nextStatus === 'RUNNING' && !job.actualStartDate ? { actualStartDate: new Date() } : {}),
      ...(nextStatus === 'COMPLETED' ? { actualEndDate: new Date() } : {}),
    },
    $inc: { __v: 1 },
  };

  const updatedJob = await ProductionJob.findOneAndUpdate(updateQuery, updateDoc, {
    new: true,
  });

  if (!updatedJob) {
    // Determine whether version mismatch or concurrent status change occurred
    const checkJob = await ProductionJob.findById(jobId).lean();
    if (!checkJob) {
      throw new Error('Task was removed by another process');
    }
    throw new Error(
      `Conflicting task transition: Task was modified concurrently by another operator or process. Current status: "${checkJob.status}", version: ${checkJob.__v}. Please refresh.`
    );
  }

  // Synchronize Machine Status
  let targetMachineStatus = machine.status;
  if (nextStatus === 'RUNNING') {
    targetMachineStatus = 'RUNNING';
    machine.status = 'RUNNING';
    machine.currentProductionJobId = updatedJob._id;
    machine.currentOperatorId = actorUser._id;
  } else if (nextStatus === 'PAUSED') {
    // Only set to IDLE if not in fault or maintenance
    if (machine.status !== 'BREAKDOWN' && machine.status !== 'MAINTENANCE') {
      targetMachineStatus = 'IDLE';
      machine.status = 'IDLE';
    }
  } else if (nextStatus === 'COMPLETED') {
    if (machine.status !== 'BREAKDOWN' && machine.status !== 'MAINTENANCE') {
      targetMachineStatus = 'IDLE';
      machine.status = 'IDLE';
    }
    machine.currentProductionJobId = null;
  }
  await machine.save();

  // Audit log
  await AuditLog.create({
    actorId: actorUser._id,
    actorRole: actorUser.role,
    action: `TASK_STATE_TRANSITION_${action}`,
    entityType: 'ProductionJob',
    entityId: updatedJob._id,
    previousState: { status: currentStatus },
    newState: { status: nextStatus },
    notes: notes || `Operator ${actorUser.name} executed ${action} transition on job ${updatedJob.jobNumber}`,
  }).catch((err) => logger.error(`Audit log failed: ${err.message}`));

  // Publish validated real-time updates through Socket.IO
  broadcastEvent(null, 'production:job_updated', {
    jobId: updatedJob._id,
    jobNumber: updatedJob.jobNumber,
    status: nextStatus,
    machineId: machine._id,
    machineCode: machine.machineCode,
    action,
    updatedBy: actorUser.name,
    timestamp: new Date(),
  });

  broadcastEvent(null, 'machine:status_changed', {
    machineId: machine._id,
    machineCode: machine.machineCode,
    status: targetMachineStatus,
    currentJobId: machine.currentProductionJobId,
    currentOperatorId: machine.currentOperatorId,
    timestamp: new Date(),
  });

  return { job: updatedJob, machine };
}

/**
 * Record a shift production log with cumulative output validation,
 * overrun authorization exception checks, and idempotency protection.
 */
export async function recordProductionLog({
  jobId,
  machineId,
  metersProduced,
  wasteMeters = 0,
  durationMinutes,
  downtimeMinutes = 0,
  remarks,
  shift,
  shiftId,
  source = 'OPERATOR',
  idempotencyKey,
  overrunAuthorized = false,
  overrunReason,
  actorUser,
}) {
  // 1. Idempotency Key Validation: Prevent duplicate submissions
  if (idempotencyKey) {
    const existingLog = await ProductionLog.findOne({ idempotencyKey })
      .populate('jobId', 'jobNumber stage')
      .populate('machineId', 'machineCode name')
      .lean();

    if (existingLog) {
      logger.info(`Duplicate production log intercepted with key: "${idempotencyKey}"`);
      return {
        isDuplicate: true,
        log: existingLog,
        message: 'Duplicate submission intercepted: Returning previously recorded production log',
      };
    }
  }

  const job = await ProductionJob.findById(jobId);
  if (!job) {
    throw new Error('Production task not found');
  }

  const machine = await Machine.findById(machineId || job.machineId);
  if (!machine) {
    throw new Error('Machine not found');
  }

  // Operator Authorization Check
  if (actorUser.role === 'OPERATOR') {
    const profile = await OperatorProfile.findOne({ userId: actorUser._id }).lean();
    const isAssignedJob = (job.assignedOperatorIds || []).some(
      (id) => id.toString() === actorUser._id.toString()
    );
    const isAssignedMachine = (profile?.assignedMachines || []).some(
      (mId) => mId.toString() === machine._id.toString()
    );

    if (!isAssignedJob && !isAssignedMachine) {
      throw new Error('Unauthorized task: You are not assigned to record production for this job');
    }
  }

  const qtyProduced = Number(metersProduced);
  if (isNaN(qtyProduced) || qtyProduced < 0) {
    throw new Error('Produced quantity must be a non-negative number');
  }

  const duration = Number(durationMinutes);
  if (isNaN(duration) || duration <= 0) {
    throw new Error('Duration minutes must be greater than zero');
  }

  // 2. Validate cumulative output against the plan and require an authorized exception for overruns
  const currentCumulative = Number(job.producedQuantity || 0);
  const projectedCumulative = currentCumulative + qtyProduced;
  const targetQuantity = Number(job.targetQuantity || 0);

  if (projectedCumulative > targetQuantity) {
    const isApprovedOverrun = overrunAuthorized === true || overrunAuthorized === 'true';
    if (!isApprovedOverrun || !overrunReason?.trim()) {
      throw new Error(
        `Overrun violation: Projected cumulative output (${projectedCumulative.toLocaleString()} ${job.unit}) exceeds planned target (${targetQuantity.toLocaleString()} ${job.unit}). An authorized supervisor exception and reason are required to log overruns.`
      );
    }
  }

  // Resolve shift & shiftId
  let resolvedShiftName = shift;
  let resolvedShiftId = shiftId;
  if (!resolvedShiftName || !resolvedShiftId) {
    const activeShift = await Shift.findOne({ isActive: true }).lean();
    resolvedShiftName = resolvedShiftName || activeShift?.name || 'MORNING';
    resolvedShiftId = resolvedShiftId || activeShift?._id;
  }

  // Generate unique operation identifier if none provided
  const finalIdempotencyKey =
    idempotencyKey || `PLOG-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  // Create Production Log in dedicated collection
  let log;
  try {
    log = await ProductionLog.create({
      jobId: job._id,
      orderId: job.orderId,
      machineId: machine._id,
      operatorId: actorUser._id,
      shiftId: resolvedShiftId,
      shift: resolvedShiftName,
      metersProduced: qtyProduced,
      wasteMeters: Number(wasteMeters || 0),
      durationMinutes: duration,
      downtimeMinutes: Number(downtimeMinutes || 0),
      source: source === 'IOT_SENSOR' ? 'IOT_SENSOR' : 'OPERATOR',
      idempotencyKey: finalIdempotencyKey,
      overrunAuthorized: Boolean(overrunAuthorized),
      overrunReason: overrunReason?.trim() || undefined,
      remarks,
      logDate: new Date(),
    });
  } catch (err) {
    if (err.code === 11000 && err.keyPattern?.idempotencyKey) {
      const existing = await ProductionLog.findOne({ idempotencyKey: finalIdempotencyKey }).lean();
      return {
        isDuplicate: true,
        log: existing,
        message: 'Duplicate submission intercepted: Returning previously recorded production log',
      };
    }
    throw err;
  }

  // Atomically increment job output and waste
  const updatedJob = await ProductionJob.findByIdAndUpdate(
    job._id,
    {
      $inc: {
        producedQuantity: qtyProduced,
        wasteQuantity: Number(wasteMeters || 0),
      },
    },
    { new: true }
  );

  // If overrun was authorized, record security/operational audit
  if (overrunAuthorized) {
    await AuditLog.create({
      actorId: actorUser._id,
      actorRole: actorUser.role,
      action: 'PRODUCTION_OVERRUN_RECORDED',
      entityType: 'ProductionLog',
      entityId: log._id,
      newState: {
        targetQuantity,
        cumulativeQuantity: projectedCumulative,
        overrunReason,
      },
      notes: `Overrun of ${projectedCumulative - targetQuantity} units authorized by ${actorUser.name}`,
    }).catch((err) => logger.error(`Audit log failed: ${err.message}`));
  }

  // Publish validated updates via Socket.IO
  broadcastEvent(null, 'production:log_recorded', {
    logId: log._id,
    jobId: job._id,
    machineId: machine._id,
    metersProduced: qtyProduced,
    cumulativeProduced: updatedJob.producedQuantity,
    source: log.source,
    operatorName: actorUser.name,
    timestamp: new Date(),
  });

  return { isDuplicate: false, log, updatedJob };
}

/**
 * Report machine breakdown, maintenance needs, or missing materials.
 * Automatically marks machine into BREAKDOWN or MAINTENANCE state.
 */
export async function reportMachineBreakdown({
  machineId,
  breakdownType,
  severity = 'MEDIUM',
  description,
  missingMaterialDetails,
  idempotencyKey,
  actorUser,
}) {
  if (idempotencyKey) {
    const existing = await BreakdownReport.findOne({ idempotencyKey }).lean();
    if (existing) {
      return {
        isDuplicate: true,
        report: existing,
        message: 'Duplicate breakdown report intercepted',
      };
    }
  }

  const machine = await Machine.findById(machineId);
  if (!machine) {
    throw new Error('Machine not found');
  }

  // Authorization check
  if (actorUser.role === 'OPERATOR') {
    const profile = await OperatorProfile.findOne({ userId: actorUser._id }).lean();
    const isAssigned = (profile?.assignedMachines || []).some(
      (mId) => mId.toString() === machine._id.toString()
    );
    if (!isAssigned) {
      throw new Error('Unauthorized: You are not assigned to this machine');
    }
  }

  const reportNumber = `BRK-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

  let report;
  try {
    report = await BreakdownReport.create({
      reportNumber,
      machineId: machine._id,
      reportedBy: actorUser._id,
      breakdownType,
      severity,
      description,
      missingMaterialDetails:
        breakdownType === 'MISSING_MATERIAL' ? missingMaterialDetails : undefined,
      idempotencyKey,
      reportedAt: new Date(),
      status: 'REPORTED',
    });
  } catch (err) {
    if (err.code === 11000 && err.keyPattern?.idempotencyKey) {
      const existing = await BreakdownReport.findOne({ idempotencyKey }).lean();
      return {
        isDuplicate: true,
        report: existing,
        message: 'Duplicate breakdown report intercepted',
      };
    }
    throw err;
  }

  // Update Machine state based on breakdown severity and type
  let nextMachineStatus = machine.status;
  if (breakdownType === 'MAINTENANCE_REQUIRED') {
    nextMachineStatus = 'MAINTENANCE';
    machine.status = 'MAINTENANCE';
  } else if (breakdownType !== 'MISSING_MATERIAL') {
    // Fault state
    nextMachineStatus = 'BREAKDOWN';
    machine.status = 'BREAKDOWN';
  }
  await machine.save();

  // Audit log
  await AuditLog.create({
    actorId: actorUser._id,
    actorRole: actorUser.role,
    action: 'MACHINE_BREAKDOWN_REPORTED',
    entityType: 'BreakdownReport',
    entityId: report._id,
    newState: { reportNumber, breakdownType, severity, nextMachineStatus },
    notes: `Reported breakdown on machine ${machine.machineCode}: ${description}`,
  }).catch((err) => logger.error(`Audit log failed: ${err.message}`));

  // Publish updates via Socket.IO
  broadcastEvent(null, 'machine:breakdown_reported', {
    reportId: report._id,
    reportNumber,
    machineId: machine._id,
    machineCode: machine.machineCode,
    breakdownType,
    severity,
    machineStatus: nextMachineStatus,
    reportedBy: actorUser.name,
    timestamp: new Date(),
  });

  broadcastEvent(null, 'machine:status_changed', {
    machineId: machine._id,
    machineCode: machine.machineCode,
    status: nextMachineStatus,
    timestamp: new Date(),
  });

  return { isDuplicate: false, report, machine };
}

/**
 * Record shift handover and unfinished tasks in dedicated collection.
 */
export async function recordShiftHandover({
  machineId,
  incomingOperatorId,
  shift,
  shiftId,
  metersRunningAtHandover,
  remainingWarpBeamPercentage,
  openIssues = [],
  unfinishedTasks = [],
  outgoingNotes,
  idempotencyKey,
  actorUser,
}) {
  if (idempotencyKey) {
    const existing = await ShiftHandover.findOne({ idempotencyKey }).lean();
    if (existing) {
      return {
        isDuplicate: true,
        handover: existing,
        message: 'Duplicate shift handover intercepted',
      };
    }
  }

  const machine = await Machine.findById(machineId);
  if (!machine) {
    throw new Error('Machine not found');
  }

  // Operator Authorization Check
  if (actorUser.role === 'OPERATOR') {
    const profile = await OperatorProfile.findOne({ userId: actorUser._id }).lean();
    const isAssigned = (profile?.assignedMachines || []).some(
      (mId) => mId.toString() === machine._id.toString()
    );
    if (!isAssigned) {
      throw new Error('Unauthorized: You are not assigned to this machine');
    }
  }

  const handoverNumber = `HND-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

  let handover;
  try {
    handover = await ShiftHandover.create({
      handoverNumber,
      machineId: machine._id,
      outgoingOperatorId: actorUser._id,
      incomingOperatorId,
      shift,
      shiftId: shiftId || undefined,
      metersRunningAtHandover: Number(metersRunningAtHandover),
      remainingWarpBeamPercentage:
        remainingWarpBeamPercentage !== undefined
          ? Number(remainingWarpBeamPercentage)
          : undefined,
      openIssues: Array.isArray(openIssues) ? openIssues : [openIssues],
      unfinishedTasks: Array.isArray(unfinishedTasks) ? unfinishedTasks : [],
      outgoingNotes,
      idempotencyKey,
    });
  } catch (err) {
    if (err.code === 11000 && err.keyPattern?.idempotencyKey) {
      const existing = await ShiftHandover.findOne({ idempotencyKey }).lean();
      return {
        isDuplicate: true,
        handover: existing,
        message: 'Duplicate shift handover intercepted',
      };
    }
    throw err;
  }

  // Publish via Socket.IO
  broadcastEvent(null, 'shift:handover_created', {
    handoverId: handover._id,
    handoverNumber,
    machineId: machine._id,
    machineCode: machine.machineCode,
    outgoingOperator: actorUser.name,
    timestamp: new Date(),
  });

  return { isDuplicate: false, handover };
}

/**
 * Fetch operator attendance and past recorded shifts.
 */
export async function getOperatorAttendance(operatorUserId) {
  const records = await Attendance.find({ operatorId: operatorUserId })
    .populate('shiftId', 'shiftCode name startTime endTime durationHours')
    .populate('verifiedBy', 'name')
    .sort({ date: -1 })
    .limit(30)
    .lean();

  const totalHoursWorked = records.reduce((acc, r) => acc + (r.hoursWorked || 0), 0);
  const totalOvertime = records.reduce((acc, r) => acc + (r.overtimeHours || 0), 0);

  return {
    records,
    summary: {
      totalRecords: records.length,
      totalHoursWorked,
      totalOvertime,
    },
  };
}

/**
 * Record check-in or check-out for the authenticated operator.
 */
export async function clockAttendance({ action, shiftId, remarks, actorUser }) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  let record = await Attendance.findOne({
    operatorId: actorUser._id,
    date: today,
  });

  if (action === 'CHECK_IN') {
    if (record && record.checkInTime) {
      throw new Error('Already checked in for today');
    }

    let targetShiftId = shiftId;
    if (!targetShiftId) {
      const defaultShift = await Shift.findOne({ isActive: true });
      targetShiftId = defaultShift?._id;
    }

    if (record) {
      record.checkInTime = new Date();
      record.shiftId = targetShiftId;
      record.status = 'PRESENT';
      if (remarks) record.remarks = remarks;
      await record.save();
    } else {
      record = await Attendance.create({
        operatorId: actorUser._id,
        date: today,
        shiftId: targetShiftId,
        checkInTime: new Date(),
        status: 'PRESENT',
        remarks,
      });
    }
  } else if (action === 'CHECK_OUT') {
    if (!record || !record.checkInTime) {
      throw new Error('No check-in record found for today. Please check in first.');
    }
    if (record.checkOutTime) {
      throw new Error('Already checked out for today');
    }

    const checkOut = new Date();
    const workedMs = checkOut.getTime() - new Date(record.checkInTime).getTime();
    const hoursWorked = Math.max(0.1, Number((workedMs / (1000 * 60 * 60)).toFixed(2)));

    record.checkOutTime = checkOut;
    record.hoursWorked = hoursWorked;
    record.overtimeHours = hoursWorked > 8 ? Number((hoursWorked - 8).toFixed(2)) : 0;
    if (remarks) record.remarks = remarks;
    await record.save();
  } else {
    throw new Error(`Invalid clock action: "${action}". Permitted: "CHECK_IN" or "CHECK_OUT"`);
  }

  broadcastEvent(null, 'attendance:updated', {
    operatorId: actorUser._id,
    operatorName: actorUser.name,
    action,
    timestamp: new Date(),
  });

  return record;
}

// ==========================================
// 8. FACTORY WORKER ATTENDANCE MANAGEMENT
// ==========================================

/**
 * Normalizes any input date string or Date object to UTC midnight (00:00:00.000Z).
 * Ensures consistency across timezones and prevents duplicate records.
 */
export function normalizeDateToUTC(dateInput) {
  if (!dateInput) {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  }
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    const [y, m, d] = dateInput.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
  }
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) {
    throw new Error('Invalid date provided');
  }
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

/**
 * Get comprehensive attendance dashboard summary for a specific date.
 * Returns total workers, present, absent, on leave, half-day, attendance rate, and working hours.
 */
export async function getAttendanceDashboardSummary(dateStr) {
  const targetDate = normalizeDateToUTC(dateStr);

  // Fetch all active operators
  const activeOperators = await User.find({ role: 'OPERATOR', status: 'ACTIVE' }).select('_id').lean();
  const totalWorkers = activeOperators.length;

  // Fetch all attendance records for targetDate
  const records = await Attendance.find({ date: targetDate }).lean();

  let presentCount = 0;
  let absentCount = 0;
  let onLeaveCount = 0;
  let halfDayCount = 0;
  let totalHoursWorked = 0;
  let totalOvertimeHours = 0;

  for (const r of records) {
    if (r.status === 'PRESENT') presentCount++;
    else if (r.status === 'ABSENT') absentCount++;
    else if (r.status === 'ON_LEAVE') onLeaveCount++;
    else if (r.status === 'HALF_DAY') halfDayCount++;
    totalHoursWorked += Number(r.hoursWorked || 0);
    totalOvertimeHours += Number(r.overtimeHours || 0);
  }

  const recordedOperatorIds = new Set(records.map((r) => r.operatorId.toString()));
  const unmarkedCount = activeOperators.filter((op) => !recordedOperatorIds.has(op._id.toString())).length;

  // Effective attendance rate calculation (PRESENT + 0.5 * HALF_DAY) / totalWorkers
  const attendancePercentage =
    totalWorkers > 0 ? Number((((presentCount + halfDayCount * 0.5) / totalWorkers) * 100).toFixed(1)) : 0;

  return {
    date: targetDate,
    totalWorkers,
    presentCount,
    absentCount,
    onLeaveCount,
    halfDayCount,
    unmarkedCount,
    attendancePercentage,
    totalHoursWorked: Number(totalHoursWorked.toFixed(2)),
    totalOvertimeHours: Number(totalOvertimeHours.toFixed(2)),
  };
}

/**
 * Fetch attendance records with filtering by date or range, department, search, and status.
 */
export async function getAttendanceRecords({
  date,
  startDate,
  endDate,
  department,
  search,
  status,
  page = 1,
  limit = 50,
}) {
  // Build operator profiles mapping
  const profileQuery = {};
  if (department && department !== 'ALL') {
    profileQuery.department = department;
  }
  const profiles = await OperatorProfile.find(profileQuery).lean();
  const profileMap = new Map();
  for (const p of profiles) {
    profileMap.set(p.userId.toString(), p);
  }

  // Operators matching profiles & search query
  const operatorUserQuery = {
    role: 'OPERATOR',
    status: 'ACTIVE',
  };
  if (department && department !== 'ALL') {
    operatorUserQuery._id = { $in: Array.from(profileMap.keys()) };
  }
  if (search && search.trim()) {
    const s = search.trim();
    const regex = new RegExp(s, 'i');
    const matchingCodesUserIds = profiles
      .filter((p) => regex.test(p.employeeCode))
      .map((p) => p.userId);

    operatorUserQuery.$or = [
      { name: regex },
      { email: regex },
      { _id: { $in: matchingCodesUserIds } },
    ];
  }

  const operators = await User.find(operatorUserQuery).select('name email phone status').lean();
  const operatorMap = new Map();
  for (const op of operators) {
    operatorMap.set(op._id.toString(), op);
  }
  const filteredOperatorIds = Array.from(operatorMap.keys());

  // Check if range/monthly view
  if (startDate && endDate) {
    const startUTC = normalizeDateToUTC(startDate);
    const endUTC = normalizeDateToUTC(endDate);
    endUTC.setUTCHours(23, 59, 59, 999);

    const attQuery = {
      operatorId: { $in: filteredOperatorIds },
      date: { $gte: startUTC, $lte: endUTC },
    };
    if (status && status !== 'ALL') {
      attQuery.status = status;
    }

    const total = await Attendance.countDocuments(attQuery);
    const records = await Attendance.find(attQuery)
      .populate('shiftId', 'shiftCode name startTime endTime')
      .populate('verifiedBy', 'name email')
      .sort({ date: -1, createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean();

    const formatted = records.map((r) => {
      const op = operatorMap.get(r.operatorId.toString()) || {};
      const prof = profileMap.get(r.operatorId.toString()) || {};
      return {
        _id: r._id,
        operatorId: r.operatorId,
        workerName: op.name || 'Unknown Worker',
        workerEmail: op.email || '',
        employeeCode: prof.employeeCode || 'N/A',
        department: prof.department || 'GENERAL',
        date: r.date,
        shift: r.shiftId?.name || 'MORNING',
        status: r.status,
        checkInTime: r.checkInTime,
        checkOutTime: r.checkOutTime,
        hoursWorked: r.hoursWorked || 0,
        overtimeHours: r.overtimeHours || 0,
        verifiedBy: r.verifiedBy?.name || 'System',
        remarks: r.remarks || '',
      };
    });

    return {
      records: formatted,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)) || 1,
      },
    };
  }

  // Daily View (single date)
  const targetDate = normalizeDateToUTC(date);
  const attendanceRecords = await Attendance.find({
    operatorId: { $in: filteredOperatorIds },
    date: targetDate,
  })
    .populate('shiftId', 'shiftCode name startTime endTime')
    .populate('verifiedBy', 'name email')
    .lean();

  const attMap = new Map();
  for (const att of attendanceRecords) {
    attMap.set(att.operatorId.toString(), att);
  }

  // Combine every active operator with their attendance (or UNMARKED if not yet logged)
  let items = filteredOperatorIds.map((opId) => {
    const op = operatorMap.get(opId);
    const prof = profileMap.get(opId) || {};
    const att = attMap.get(opId);
    return {
      _id: att?._id || null,
      operatorId: opId,
      workerName: op?.name || 'Unknown Worker',
      workerEmail: op?.email || '',
      employeeCode: prof.employeeCode || 'N/A',
      department: prof.department || 'GENERAL',
      skillLevel: prof.skillLevel || 'LEVEL_1',
      date: targetDate,
      shift: att?.shiftId?.name || 'MORNING',
      status: att ? att.status : 'UNMARKED',
      checkInTime: att?.checkInTime || null,
      checkOutTime: att?.checkOutTime || null,
      hoursWorked: att?.hoursWorked || 0,
      overtimeHours: att?.overtimeHours || 0,
      verifiedBy: att?.verifiedBy?.name || (att ? 'System' : 'Not Verified'),
      remarks: att?.remarks || '',
    };
  });

  if (status && status !== 'ALL') {
    items = items.filter((it) => it.status === status);
  }

  const total = items.length;
  const paginated = items.slice((Number(page) - 1) * Number(limit), Number(page) * Number(limit));

  return {
    records: paginated,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)) || 1,
    },
  };
}

/**
 * Mark or update worker attendance by authorized personnel (ADMIN/Supervisor).
 * Enforces validation, calculates work and overtime hours, prevents duplicate records,
 * writes audit trail to AuditLog, and emits real-time event.
 */
export async function markWorkerAttendance({
  operatorId,
  date,
  status,
  checkInTime,
  checkOutTime,
  shiftId,
  remarks,
  actorUser,
}) {
  if (!operatorId) {
    throw new Error('Worker/Operator ID is required');
  }
  const operator = await User.findOne({ _id: operatorId, role: 'OPERATOR' });
  if (!operator) {
    throw new Error('Worker not found or invalid operator role');
  }

  const validStatuses = ['PRESENT', 'ABSENT', 'HALF_DAY', 'ON_LEAVE'];
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status "${status}". Permitted: ${validStatuses.join(', ')}`);
  }

  // Shift resolution
  let resolvedShiftId = shiftId;
  if (!resolvedShiftId) {
    const activeShift = await Shift.findOne({ isActive: true });
    resolvedShiftId = activeShift?._id;
    if (!resolvedShiftId) {
      const anyShift = await Shift.findOne({});
      resolvedShiftId = anyShift?._id;
    }
  }

  // Normalize date to UTC midnight
  const targetDate = normalizeDateToUTC(date);

  // Time and hour calculations
  let parsedCheckIn = checkInTime ? new Date(checkInTime) : null;
  let parsedCheckOut = checkOutTime ? new Date(checkOutTime) : null;
  let hoursWorked = 0;
  let overtimeHours = 0;

  if (parsedCheckIn && parsedCheckOut) {
    if (parsedCheckOut.getTime() < parsedCheckIn.getTime()) {
      throw new Error('Check-out time cannot be before check-in time');
    }
    const diffMs = parsedCheckOut.getTime() - parsedCheckIn.getTime();
    hoursWorked = Math.max(0.1, Number((diffMs / (1000 * 60 * 60)).toFixed(2)));
    overtimeHours = hoursWorked > 8 ? Number((hoursWorked - 8).toFixed(2)) : 0;
  } else if (status === 'PRESENT') {
    hoursWorked = 8.0;
    overtimeHours = 0;
  } else if (status === 'HALF_DAY') {
    hoursWorked = 4.0;
    overtimeHours = 0;
  } else if (status === 'ABSENT' || status === 'ON_LEAVE') {
    hoursWorked = 0;
    overtimeHours = 0;
    parsedCheckIn = null;
    parsedCheckOut = null;
  }

  // Prevent duplicate records & perform upsert
  let record = await Attendance.findOne({
    operatorId,
    date: targetDate,
  });

  const isUpdate = !!record;
  const previousState = isUpdate ? record.toObject() : null;

  if (record) {
    record.status = status;
    record.shiftId = resolvedShiftId;
    record.checkInTime = parsedCheckIn;
    record.checkOutTime = parsedCheckOut;
    record.hoursWorked = hoursWorked;
    record.overtimeHours = overtimeHours;
    record.verifiedBy = actorUser._id;
    if (remarks !== undefined) record.remarks = remarks;
    await record.save();
  } else {
    record = await Attendance.create({
      operatorId,
      date: targetDate,
      shiftId: resolvedShiftId,
      checkInTime: parsedCheckIn,
      checkOutTime: parsedCheckOut,
      hoursWorked,
      overtimeHours,
      status,
      verifiedBy: actorUser._id,
      remarks: remarks || '',
    });
  }

  // Audit Log creation
  await AuditLog.create({
    actorId: actorUser._id,
    actorRole: actorUser.role || 'ADMIN',
    action: isUpdate ? 'ATTENDANCE_UPDATED' : 'ATTENDANCE_MARKED',
    entityType: 'ATTENDANCE',
    entityId: record._id,
    previousState,
    newState: record.toObject(),
    notes:
      remarks ||
      `Attendance ${isUpdate ? 'updated' : 'marked'} as ${status} for ${operator.name} on ${targetDate.toISOString().slice(0, 10)}`,
  });

  // Real-time broadcast
  broadcastEvent(null, 'attendance:updated', {
    attendanceId: record._id,
    operatorId: record.operatorId,
    operatorName: operator.name,
    date: targetDate,
    status: record.status,
    hoursWorked: record.hoursWorked,
    overtimeHours: record.overtimeHours,
    actor: actorUser.name,
    timestamp: new Date(),
  });

  return record;
}

/**
 * List all active operators with their department and code for quick selection.
 */
export async function getAttendanceWorkers() {
  const operators = await User.find({ role: 'OPERATOR', status: 'ACTIVE' })
    .select('name email phone status')
    .sort({ name: 1 })
    .lean();

  const profiles = await OperatorProfile.find({
    userId: { $in: operators.map((o) => o._id) },
  }).lean();

  const profMap = new Map();
  for (const p of profiles) {
    profMap.set(p.userId.toString(), p);
  }

  return operators.map((op) => ({
    _id: op._id,
    name: op.name,
    email: op.email,
    phone: op.phone,
    employeeCode: profMap.get(op._id.toString())?.employeeCode || 'N/A',
    department: profMap.get(op._id.toString())?.department || 'GENERAL',
    hourlyWageRate: profMap.get(op._id.toString())?.hourlyWageRate || 0,
    skillLevel: profMap.get(op._id.toString())?.skillLevel || 'LEVEL_1',
  }));
}

/**
 * Fetch complete audit trail for a specific attendance record.
 */
export async function getAttendanceAuditHistory(recordId) {
  if (!mongoose.Types.ObjectId.isValid(recordId)) {
    throw new Error('Invalid attendance record ID');
  }

  const logs = await AuditLog.find({
    entityType: 'ATTENDANCE',
    entityId: recordId,
  })
    .populate('actorId', 'name email role')
    .sort({ createdAt: -1 })
    .lean();

  return logs;
}

/**
 * Generate CSV formatted string from filtered attendance records.
 */
export async function generateAttendanceCsv(filters) {
  const data = await getAttendanceRecords({
    ...filters,
    page: 1,
    limit: 2000,
  });

  const headers = [
    'Date',
    'Employee Code',
    'Worker Name',
    'Department',
    'Status',
    'Check-In Time',
    'Check-Out Time',
    'Hours Worked',
    'Overtime Hours',
    'Shift',
    'Verified By',
    'Remarks',
  ];

  const escapeCsv = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = data.records.map((r) => [
    escapeCsv(r.date ? new Date(r.date).toISOString().slice(0, 10) : ''),
    escapeCsv(r.employeeCode),
    escapeCsv(r.workerName),
    escapeCsv(r.department),
    escapeCsv(r.status),
    escapeCsv(r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString('en-IN') : 'N/A'),
    escapeCsv(r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString('en-IN') : 'N/A'),
    escapeCsv(r.hoursWorked),
    escapeCsv(r.overtimeHours),
    escapeCsv(r.shift),
    escapeCsv(r.verifiedBy),
    escapeCsv(r.remarks),
  ]);

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
}
