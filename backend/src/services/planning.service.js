import mongoose from 'mongoose';
import { logger } from '../config/logger.js';
import {
  ProductionPlan,
  ProductionJob,
  Order,
  Machine,
  InventoryItem,
  AuditLog,
} from '../models/index.js';

export const STAGE_MACHINE_MAP = {
  SPINNING: ['SPINNING_FRAME'],
  WARPING: ['WARPING_FRAME'],
  SIZING: ['SIZING_MACHINE'],
  WEAVING: ['AIR_JET_LOOM', 'RAPIER_LOOM', 'CIRCULAR_KNITTING'],
  DYEING: ['DYEING_JET'],
  FINISHING: ['STENTER_FINISHING'],
  INSPECTION: ['INSPECTION_TABLE'],
  PACKING: ['PACKING_STATION'],
};

/**
 * Evaluate material readiness, machine compatibility, and bottleneck risks for an order.
 */
export async function evaluateProductionReadiness(orderId) {
  const order = await Order.findById(orderId).lean();
  if (!order) {
    throw new Error('Order not found');
  }

  // 1. Calculate required yarn for order
  let totalRequiredKg = 0;
  for (const item of order.items) {
    const gsm = item.fabricSpecSnapshot?.gsm || 120;
    const widthInches = item.fabricSpecSnapshot?.widthInches || 58;
    const qtyMeters = Number(item.quantity || 0);
    const kg = Math.round(qtyMeters * (widthInches * 0.0254) * (gsm / 1000) * 1.05);
    totalRequiredKg += kg;
  }

  // Find available yarn items
  const yarnItems = await InventoryItem.find({ category: 'RAW_YARN' }).lean();
  const totalOnHand = yarnItems.reduce((acc, y) => acc + (y.quantityOnHand || 0), 0);
  const totalReserved = yarnItems.reduce((acc, y) => acc + (y.quantityReserved || 0), 0);
  const totalAvailable = Math.max(0, totalOnHand - totalReserved);

  const hasMaterialShortage = totalAvailable < totalRequiredKg;
  const shortageKg = hasMaterialShortage ? totalRequiredKg - totalAvailable : 0;

  // 2. Machine fleet breakdown and compatibility
  const machines = await Machine.find().lean();
  const machinesByStage = {};

  for (const [stage, machineTypes] of Object.entries(STAGE_MACHINE_MAP)) {
    const compatible = machines.filter((m) => machineTypes.includes(m.type));
    machinesByStage[stage] = {
      stage,
      compatibleCount: compatible.length,
      idleCount: compatible.filter((m) => m.status === 'IDLE').length,
      runningCount: compatible.filter((m) => m.status === 'RUNNING').length,
      maintenanceCount: compatible.filter((m) => m.status === 'MAINTENANCE' || m.status === 'BREAKDOWN').length,
      machines: compatible.map((m) => ({
        _id: m._id,
        machineCode: m.machineCode,
        name: m.name,
        type: m.type,
        status: m.status,
        telemetrySnapshot: m.telemetrySnapshot,
      })),
    };
  }

  // 3. Bottleneck detection (stage with least idle/available machines)
  let bottleneckStage = null;
  let minAvailableCapacity = Infinity;

  for (const [stage, data] of Object.entries(machinesByStage)) {
    const avail = data.idleCount;
    if (avail < minAvailableCapacity) {
      minAvailableCapacity = avail;
      bottleneckStage = stage;
    }
  }

  // 4. Delay Risk check against confirmedDeliveryDate
  const now = new Date();
  const deliveryDate = new Date(order.confirmedDeliveryDate);
  const daysUntilDelivery = Math.ceil((deliveryDate - now) / (1000 * 60 * 60 * 24));
  const estimatedLeadDays = hasMaterialShortage ? 25 : 12;
  const isAtRiskOfDelay = daysUntilDelivery < estimatedLeadDays;

  return {
    orderId: order._id,
    orderNumber: order.orderNumber,
    confirmedDeliveryDate: order.confirmedDeliveryDate,
    materialReadiness: {
      isReady: !hasMaterialShortage,
      status: hasMaterialShortage ? 'SHORTAGE' : 'READY',
      requiredKg: totalRequiredKg,
      availableKg: totalAvailable,
      shortageKg,
      message: hasMaterialShortage
        ? `Material shortage of ${shortageKg} kg yarn. Procure material before approving normal production schedule.`
        : 'All required yarn is available and ready for allocation.',
    },
    machinesByStage,
    bottleneckStage,
    estimatedLeadDays,
    daysUntilDelivery,
    isAtRiskOfDelay,
    riskReason: isAtRiskOfDelay
      ? `Delivery window of ${daysUntilDelivery} days is insufficient for ${estimatedLeadDays} days required lead time${
          hasMaterialShortage ? ' (delayed by raw yarn shortage)' : ''
        }`
      : null,
  };
}

/**
 * Create a new Production Plan with material readiness barriers and machine conflict detection.
 */
export async function createProductionPlan({
  orderId,
  plannedStartDate,
  plannedCompletionDate,
  stages,
  status = 'DRAFT',
  notes = '',
  actorUser,
}) {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new Error('Order not found');
  }

  // 1. Material readiness evaluation
  const readiness = await evaluateProductionReadiness(orderId);
  const materialReadinessStatus = readiness.materialReadiness.isReady ? 'READY' : 'SHORTAGE';

  // MATERIAL READINESS BARRIER: Prevent normal scheduling (APPROVED or IN_EXECUTION) if materials are lacking
  if (!readiness.materialReadiness.isReady && (status === 'APPROVED' || status === 'IN_EXECUTION')) {
    throw new Error(
      `Cannot schedule production plan: Material readiness check failed due to raw yarn shortage of ${readiness.materialReadiness.shortageKg} kg. Plan must remain in DRAFT until materials are received.`
    );
  }

  // 2. Machine conflict detection
  const start = new Date(plannedStartDate);
  const completion = new Date(plannedCompletionDate);

  if (completion <= start) {
    throw new Error('Planned completion date must be after planned start date');
  }

  // Fetch active plans with overlapping dates
  const overlappingPlans = await ProductionPlan.find({
    status: { $in: ['APPROVED', 'IN_EXECUTION'] },
    plannedStartDate: { $lte: completion },
    plannedCompletionDate: { $gte: start },
  })
    .populate('stages.assignedMachineIds', 'machineCode name')
    .lean();

  const processedStages = [];

  for (let idx = 0; idx < stages.length; idx++) {
    const s = stages[idx];
    const stageStart = s.startDate ? new Date(s.startDate) : start;
    const stageComp = s.completionDate ? new Date(s.completionDate) : completion;

    let machineConflict = { hasConflict: false, conflictingPlanNumber: null, message: null };

    if (s.assignedMachineIds && s.assignedMachineIds.length > 0) {
      const assignedIds = s.assignedMachineIds.map((id) => id.toString());

      for (const op of overlappingPlans) {
        for (const opStage of op.stages) {
          const conflicting = (opStage.assignedMachineIds || []).find((m) =>
            assignedIds.includes((m._id || m).toString())
          );
          if (conflicting) {
            const mCode = conflicting.machineCode || 'Machine';
            machineConflict = {
              hasConflict: true,
              conflictingPlanNumber: op.planNumber,
              message: `${mCode} is already scheduled on Plan ${op.planNumber} in stage ${opStage.stageName}`,
            };
            break;
          }
        }
        if (machineConflict.hasConflict) break;
      }
    }

    processedStages.push({
      stageName: s.stageName,
      sequence: s.sequence || idx + 1,
      targetQuantity: Number(s.targetQuantity || 1000),
      unit: s.unit || 'METER',
      estimatedHours: Number(s.estimatedHours || 24),
      assignedMachineIds: s.assignedMachineIds || [],
      startDate: stageStart,
      completionDate: stageComp,
      machineConflict,
      materialReady: readiness.materialReadiness.isReady,
      status: 'PLANNED',
    });
  }

  // 3. Delay risk assessment
  const isAtRisk = completion > new Date(order.confirmedDeliveryDate);
  const riskReason = isAtRisk
    ? `Planned completion (${completion.toLocaleDateString()}) extends beyond customer confirmed delivery date (${new Date(
        order.confirmedDeliveryDate
      ).toLocaleDateString()})`
    : null;

  const planNumber = `PLN-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

  const plan = await ProductionPlan.create({
    planNumber,
    orderId: order._id,
    plannedStartDate: start,
    plannedCompletionDate: completion,
    stages: processedStages,
    materialReadinessStatus,
    materialShortageDetails: !readiness.materialReadiness.isReady
      ? {
          shortageKg: readiness.materialReadiness.shortageKg,
          message: readiness.materialReadiness.message,
        }
      : undefined,
    isAtRiskOfDelay: isAtRisk,
    riskReason,
    status,
    approvedBy: status === 'APPROVED' ? actorUser._id : undefined,
    notes,
  });

  await AuditLog.create({
    actorId: actorUser._id,
    actorRole: actorUser.role,
    action: 'CREATE_PRODUCTION_PLAN',
    entityType: 'ProductionPlan',
    entityId: plan._id,
    newState: { planNumber, status, materialReadinessStatus, isAtRiskOfDelay: isAtRisk },
    notes: `Created production plan ${planNumber} for order ${order.orderNumber}`,
  });

  return plan;
}

/**
 * Reschedule Production Plan with authorized reason and audit history.
 */
export async function rescheduleProductionPlan({ planId, newStartDate, newCompletionDate, reason, actorUser }) {
  if (!reason || !reason.trim()) {
    throw new Error('Authorized reason is required to reschedule production plan');
  }

  const plan = await ProductionPlan.findById(planId);
  if (!plan) {
    throw new Error('Production plan not found');
  }

  const order = await Order.findById(plan.orderId);
  const start = new Date(newStartDate);
  const completion = new Date(newCompletionDate);

  if (completion <= start) {
    throw new Error('New completion date must be after new start date');
  }

  // Record rescheduling history entry
  plan.rescheduledHistory.push({
    rescheduledBy: actorUser._id,
    previousStartDate: plan.plannedStartDate,
    previousCompletionDate: plan.plannedCompletionDate,
    newStartDate: start,
    newCompletionDate: completion,
    reason: reason.trim(),
    rescheduledAt: new Date(),
  });

  plan.plannedStartDate = start;
  plan.plannedCompletionDate = completion;

  // Re-evaluate risk of delay against order delivery commitment
  if (order && completion > new Date(order.confirmedDeliveryDate)) {
    plan.isAtRiskOfDelay = true;
    plan.riskReason = `Rescheduled completion date exceeds customer agreed delivery date (${new Date(
      order.confirmedDeliveryDate
    ).toLocaleDateString()})`;
  } else {
    plan.isAtRiskOfDelay = false;
    plan.riskReason = null;
  }

  await plan.save();

  await AuditLog.create({
    actorId: actorUser._id,
    actorRole: actorUser.role,
    action: 'RESCHEDULE_PRODUCTION_PLAN',
    entityType: 'ProductionPlan',
    entityId: plan._id,
    newState: {
      newStartDate: start,
      newCompletionDate: completion,
      reason,
      isAtRiskOfDelay: plan.isAtRiskOfDelay,
    },
    notes: `Production plan ${plan.planNumber} rescheduled: ${reason}`,
  });

  return plan;
}

/**
 * Approve or advance production plan status.
 */
export async function updateProductionPlanStatus({ planId, status, actorUser }) {
  const plan = await ProductionPlan.findById(planId);
  if (!plan) {
    throw new Error('Production plan not found');
  }

  // Material readiness barrier
  if ((status === 'APPROVED' || status === 'IN_EXECUTION') && plan.materialReadinessStatus === 'SHORTAGE') {
    // Re-check if material shortage was resolved
    const readiness = await evaluateProductionReadiness(plan.orderId);
    if (!readiness.materialReadiness.isReady) {
      throw new Error(
        `Cannot approve plan ${plan.planNumber}: Material shortage of ${readiness.materialReadiness.shortageKg} kg remains unresolved`
      );
    }
    plan.materialReadinessStatus = 'READY';
  }

  plan.status = status;
  if (status === 'APPROVED') {
    plan.approvedBy = actorUser._id;
  }
  await plan.save();

  await AuditLog.create({
    actorId: actorUser._id,
    actorRole: actorUser.role,
    action: 'UPDATE_PRODUCTION_PLAN_STATUS',
    entityType: 'ProductionPlan',
    entityId: plan._id,
    newState: { status },
    notes: `Plan ${plan.planNumber} status updated to ${status}`,
  });

  return plan;
}

/**
 * Get all production plans with filters.
 */
export async function getProductionPlans({ orderId, status } = {}) {
  const query = {};
  if (orderId) query.orderId = orderId;
  if (status && status !== 'ALL') query.status = status;

  return ProductionPlan.find(query)
    .populate('orderId', 'orderNumber status confirmedDeliveryDate items customerId')
    .populate('stages.assignedMachineIds', 'machineCode name type status')
    .populate('approvedBy', 'name email')
    .populate('rescheduledHistory.rescheduledBy', 'name email')
    .sort({ createdAt: -1 })
    .lean();
}

/**
 * Get single production plan by ID.
 */
export async function getProductionPlanById(planId) {
  const plan = await ProductionPlan.findById(planId)
    .populate('orderId')
    .populate('stages.assignedMachineIds', 'machineCode name type status telemetrySnapshot location')
    .populate('approvedBy', 'name email')
    .populate('rescheduledHistory.rescheduledBy', 'name email')
    .lean();

  if (!plan) {
    throw new Error('Production plan not found');
  }

  return plan;
}

/**
 * Get planning analytics overview:
 * bottlenecks, conflicts, idle machines, orders at risk of delay.
 */
export async function getPlanningOverview() {
  const [plans, machines] = await Promise.all([
    ProductionPlan.find({ status: { $in: ['DRAFT', 'APPROVED', 'IN_EXECUTION'] } })
      .populate('orderId', 'orderNumber customerId confirmedDeliveryDate')
      .populate('stages.assignedMachineIds', 'machineCode name type status')
      .lean(),
    Machine.find().lean(),
  ]);

  const idleMachines = machines.filter((m) => m.status === 'IDLE');
  const runningMachines = machines.filter((m) => m.status === 'RUNNING');
  const maintenanceMachines = machines.filter((m) => m.status === 'MAINTENANCE' || m.status === 'BREAKDOWN');

  const ordersAtRisk = plans.filter((p) => p.isAtRiskOfDelay);

  // Machine conflicts across plans
  const conflicts = [];
  for (const plan of plans) {
    for (const stage of plan.stages) {
      if (stage.machineConflict?.hasConflict) {
        conflicts.push({
          planNumber: plan.planNumber,
          stageName: stage.stageName,
          conflictingPlanNumber: stage.machineConflict.conflictingPlanNumber,
          message: stage.machineConflict.message,
        });
      }
    }
  }

  // Bottleneck detection by stage count
  const stageLoad = {};
  for (const plan of plans) {
    for (const stage of plan.stages) {
      stageLoad[stage.stageName] = (stageLoad[stage.stageName] || 0) + 1;
    }
  }

  return {
    activePlansCount: plans.length,
    idleMachinesCount: idleMachines.length,
    runningMachinesCount: runningMachines.length,
    maintenanceMachinesCount: maintenanceMachines.length,
    ordersAtRiskCount: ordersAtRisk.length,
    conflictsCount: conflicts.length,
    conflicts,
    ordersAtRisk: ordersAtRisk.map((p) => ({
      planNumber: p.planNumber,
      orderNumber: p.orderId?.orderNumber,
      plannedCompletionDate: p.plannedCompletionDate,
      confirmedDeliveryDate: p.orderId?.confirmedDeliveryDate,
      riskReason: p.riskReason,
    })),
    idleMachinesList: idleMachines.map((m) => ({
      _id: m._id,
      machineCode: m.machineCode,
      name: m.name,
      type: m.type,
      location: m.location,
    })),
    stageLoad,
  };
}

