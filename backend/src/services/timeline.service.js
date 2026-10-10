import mongoose from 'mongoose';
import { logger } from '../config/logger.js';
import {
  Order,
  OrderTimelineEvent,
  ProductionJob,
  FabricRoll,
  QualityInspection,
  FinishedGoodsInventory,
  Dispatch,
  Machine,
  OperatorProfile,
  AuditLog,
  User,
} from '../models/index.js';
import { broadcastEvent } from '../sockets/socketManager.js';

// Standardized end-to-end milestone definitions
export const TIMELINE_MILESTONES = [
  { stage: 'ORDER_CONFIRMATION', sequence: 1, title: 'Order Confirmation', defaultTeam: 'Sales & Commercial Desk' },
  { stage: 'MATERIAL_PROCUREMENT', sequence: 2, title: 'Yarn Stock & Procurement', defaultTeam: 'Raw Material Procurement' },
  { stage: 'MATERIAL_ISSUANCE', sequence: 3, title: 'Yarn Warping & Sizing Preparation', defaultTeam: 'Preparatory Weaving Shed' },
  { stage: 'WEAVING', sequence: 4, title: 'Loom Weaving Manufacturing', defaultTeam: 'Loom Fleet Operations' },
  { stage: 'QUALITY_INSPECTION', sequence: 5, title: '4-Point ASTM Quality Inspection', defaultTeam: 'Quality Assurance Lab' },
  { stage: 'FINISHED_GOODS', sequence: 6, title: 'Finished Goods Inventory Allocation', defaultTeam: 'FG Warehouse Hub' },
  { stage: 'PACKING', sequence: 7, title: 'Bale Wrapping & Dispatch Packing', defaultTeam: 'Packing & Staging' },
  { stage: 'DISPATCH', sequence: 8, title: 'Logistics Gate Pass & Dispatch', defaultTeam: 'Logistics & Dispatch Fleet' },
  { stage: 'DELIVERY', sequence: 9, title: 'Buyer Receipt & Delivery', defaultTeam: 'Carrier Logistics' },
];

/**
 * Initialize all timeline milestones for an order.
 * Ensures MongoDB is the source of truth for business milestone state.
 */
export async function initializeOrderTimeline(orderId, session = null) {
  const order = await Order.findById(orderId).session(session);
  if (!order) {
    throw new Error('Order not found');
  }

  const existingCount = await OrderTimelineEvent.countDocuments({ orderId }).session(session);
  if (existingCount > 0) {
    return OrderTimelineEvent.find({ orderId }).sort({ sequence: 1 }).session(session);
  }

  const confirmedDate = order.createdAt || new Date();
  const deliveryDate = new Date(order.confirmedDeliveryDate);
  const totalDays = Math.max(7, Math.ceil((deliveryDate - confirmedDate) / (1000 * 60 * 60 * 24)));

  const totalTargetQuantity = order.items.reduce((acc, item) => acc + (item.quantity || 0), 0);
  const unit = order.items[0]?.unit || 'METER';

  // Calculate day offsets across 9 stages
  const events = TIMELINE_MILESTONES.map((m, idx) => {
    const plannedStartDays = Math.floor((idx / TIMELINE_MILESTONES.length) * totalDays);
    const plannedCompDays = Math.floor(((idx + 1) / TIMELINE_MILESTONES.length) * totalDays);

    const plannedStartDate = new Date(confirmedDate.getTime() + plannedStartDays * 24 * 60 * 60 * 1000);
    const plannedCompletionDate = new Date(confirmedDate.getTime() + plannedCompDays * 24 * 60 * 60 * 1000);

    const isFirst = m.stage === 'ORDER_CONFIRMATION';

    return {
      orderId: order._id,
      stage: m.stage,
      sequence: m.sequence,
      title: m.title,
      description: `Stage: ${m.title} for sales order ${order.orderNumber}`,
      status: isFirst ? 'COMPLETED' : 'PENDING',
      plannedStartDate,
      plannedCompletionDate,
      estimatedCompletionDate: plannedCompletionDate,
      actualStartDate: isFirst ? confirmedDate : undefined,
      actualCompletionDate: isFirst ? confirmedDate : undefined,
      targetQuantity: totalTargetQuantity,
      completedQuantity: isFirst ? totalTargetQuantity : 0,
      unit,
      responsibleTeam: m.defaultTeam,
      statusHistory: [
        {
          status: isFirst ? 'COMPLETED' : 'PENDING',
          changedAt: new Date(),
          notes: isFirst ? 'Order verified and locked into factory schedule' : 'Initialized into production timeline',
        },
      ],
      idempotencyKey: `INIT-${order._id}-${m.stage}`,
    };
  });

  const created = await OrderTimelineEvent.insertMany(events, { session });

  // Update order initial estimated delivery date
  order.estimatedDeliveryDate = deliveryDate;
  order.isAtRiskOfDelay = false;
  order.lastEstimatedRecalculationAt = new Date();
  await order.save({ session });

  return created;
}

/**
 * Fetch end-to-end timeline with privacy sanitization.
 * Never exposes internal wage data, operator rates, supplier pricing, or other customer records.
 * Never fabricates completion percentages.
 */
export async function getOrderTimeline(orderId, requestingUser) {
  const order = await Order.findById(orderId)
    .populate('customerId', 'name email phone')
    .populate('items.productId', 'productCode name')
    .lean();

  if (!order) {
    throw new Error('Order not found');
  }

  // Cross-customer data isolation guard
  if (requestingUser.role === 'CUSTOMER') {
    if (order.customerId._id.toString() !== requestingUser._id.toString()) {
      throw new Error('Cross-customer access prohibited: You can only view your own order timeline');
    }
  }

  // Ensure milestones exist
  let milestones = await OrderTimelineEvent.find({ orderId })
    .populate('responsibleMachineId', 'machineCode name type location status')
    .sort({ sequence: 1 })
    .lean();

  if (!milestones || milestones.length === 0) {
    await initializeOrderTimeline(orderId);
    milestones = await OrderTimelineEvent.find({ orderId })
      .populate('responsibleMachineId', 'machineCode name type location status')
      .sort({ sequence: 1 })
      .lean();
  }

  // Gather verified actual production, quality, FG, and dispatch data from source of truth
  const [productionJobs, fabricRolls, qualityInspections, fgItems, dispatches] = await Promise.all([
    ProductionJob.find({ orderId })
      .populate('machineId', 'machineCode name')
      .lean(),
    FabricRoll.find({ orderId }).lean(),
    QualityInspection.find({ orderId }).lean(),
    FinishedGoodsInventory.find({ orderId }).lean(),
    Dispatch.find({ orderId }).lean(),
  ]);

  // Compute genuine quantities strictly from verified production records (NEVER FABRICATED)
  const targetQuantity = order.items.reduce((acc, item) => acc + (item.quantity || 0), 0);
  const totalMetersProduced = fabricRolls.reduce((acc, r) => acc + (r.netMeters || r.grossMeters || 0), 0);
  const totalMetersInspected = qualityInspections.reduce((acc, q) => acc + (q.inspectedLengthMeters || 0), 0);
  const totalMetersDispatched = dispatches.reduce((acc, d) => acc + (d.totalMetersDispatched || 0), 0);

  // Compute actual completed quantity for overall progress
  let completedQuantity = totalMetersProduced;
  if (productionJobs.length > 0 && totalMetersProduced === 0) {
    completedQuantity = productionJobs.reduce((acc, j) => acc + (j.producedQuantity || 0), 0);
  }

  const progressPercentage =
    targetQuantity > 0 ? Math.min(100, Math.round((completedQuantity / targetQuantity) * 100)) : 0;

  // Compile Quality 4-Point ASTM Scoring Report
  const qualityPassedRolls = fabricRolls.filter((r) => r.grade === 'GRADE_A' || r.grade === 'GRADE_B');
  const qualityReworkRolls = qualityInspections.filter((q) => q.verdict === 'REWORK');
  const totalDefects = qualityInspections.reduce((acc, q) => acc + (q.defects?.length || 0), 0);

  const qualitySummary = {
    standard: 'ASTM D5430 standard 4-Point inspection',
    totalRollsInspected: qualityInspections.length,
    passedRollsCount: qualityPassedRolls.length,
    reworkRollCount: qualityReworkRolls.length,
    averagePointsPer100SqM:
      qualityInspections.length > 0
        ? parseFloat(
            (
              qualityInspections.reduce((acc, q) => acc + (q.pointsPer100SqMeters || 0), 0) /
              qualityInspections.length
            ).toFixed(2)
          )
        : 0,
    overallGrade:
      qualityInspections.some((q) => q.grade === 'REJECT')
        ? 'REJECT'
        : qualityInspections.some((q) => q.grade === 'GRADE_B')
        ? 'GRADE_B'
        : qualityInspections.length > 0
        ? 'GRADE_A'
        : 'PENDING_INSPECTION',
    defectsCount: totalDefects,
  };

  // Compile Dispatch & Carrier Tracking Details
  const dispatchDetails = dispatches.map((d) => ({
    dispatchNumber: d.dispatchNumber,
    carrierName: d.carrierName,
    vehicleNumber: d.vehicleNumber,
    driverPhone: d.driverPhone,
    waybillNumber: d.waybillNumber,
    gatePassNumber: d.gatePassNumber,
    status: d.status,
    dispatchedAt: d.dispatchedAt,
    deliveryTimestamp: d.deliveryTimestamp,
    totalRolls: d.totalRolls,
    totalMetersDispatched: d.totalMetersDispatched,
  }));

  // Sanitize data for customer privacy
  const isCustomer = requestingUser.role === 'CUSTOMER';
  const sanitizedMilestones = milestones.map((m) => {
    return {
      _id: m._id,
      stage: m.stage,
      sequence: m.sequence,
      title: m.title,
      description: m.description,
      status: m.status,
      plannedStartDate: m.plannedStartDate,
      plannedCompletionDate: m.plannedCompletionDate,
      actualStartDate: m.actualStartDate,
      actualCompletionDate: m.actualCompletionDate,
      estimatedCompletionDate: m.estimatedCompletionDate,
      targetQuantity: m.targetQuantity,
      completedQuantity: m.completedQuantity,
      unit: m.unit,
      responsibleTeam: m.responsibleTeam,
      isDelayed: m.isDelayed,
      delayReason: m.delayReason,
      reworkDetails: m.reworkDetails,
      // Only expose machine code if relevant; hide internal machine cost / maintenance telemetry from customers
      responsibleMachineCode: m.responsibleMachineCode || m.responsibleMachineId?.machineCode,
      statusHistory: isCustomer
        ? (m.statusHistory || []).map((h) => ({
            status: h.status,
            changedAt: h.changedAt,
            notes: h.notes,
          }))
        : m.statusHistory,
    };
  });

  return {
    order: {
      _id: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      confirmedDeliveryDate: order.confirmedDeliveryDate, // Committed date
      estimatedDeliveryDate: order.estimatedDeliveryDate || order.confirmedDeliveryDate, // Estimated date
      isAtRiskOfDelay: order.isAtRiskOfDelay || false,
      delayRiskReason: order.delayRiskReason,
      lastEstimatedRecalculationAt: order.lastEstimatedRecalculationAt,
      customer: isCustomer
        ? { name: order.customerId.name }
        : { name: order.customerId.name, email: order.customerId.email, phone: order.customerId.phone },
      itemsCount: order.items.length,
      createdAt: order.createdAt,
    },
    genuineProgress: {
      targetQuantity,
      completedQuantity,
      progressPercentage,
      unit: order.items[0]?.unit || 'METER',
      totalMetersProduced,
      totalMetersInspected,
      totalMetersDispatched,
    },
    milestones: sanitizedMilestones,
    qualitySummary,
    dispatchDetails,
  };
}

/**
 * Dynamically recalculate estimated completion dates when machine breakdown,
 * procurement delays, or quality rework occur.
 * Distinguishes estimated dates from committed delivery dates.
 */
export async function recalculateOrderEstimates(orderId, { reason, delayDays = 0, triggerType = 'MANUAL' }) {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new Error('Order not found');
  }

  const milestones = await OrderTimelineEvent.find({ orderId }).sort({ sequence: 1 });
  if (!milestones || milestones.length === 0) {
    return { order, milestones: [] };
  }

  // Calculate dynamic delay days based on trigger if not explicitly passed
  let calculatedDelayDays = Number(delayDays || 0);

  if (triggerType === 'BREAKDOWN') {
    calculatedDelayDays = Math.max(1, calculatedDelayDays || 2);
  } else if (triggerType === 'REWORK') {
    calculatedDelayDays = Math.max(2, calculatedDelayDays || 3);
  } else if (triggerType === 'MATERIAL_SHORTAGE') {
    calculatedDelayDays = Math.max(3, calculatedDelayDays || 5);
  }

  let delayAccumulatorDays = calculatedDelayDays;
  const now = new Date();

  for (const m of milestones) {
    if (m.status !== 'COMPLETED') {
      const baseDate = m.plannedCompletionDate ? new Date(m.plannedCompletionDate) : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const newEstimatedDate = new Date(baseDate.getTime() + delayAccumulatorDays * 24 * 60 * 60 * 1000);

      m.estimatedCompletionDate = newEstimatedDate;
      if (delayAccumulatorDays > 0) {
        m.isDelayed = true;
        m.delayReason = reason || `Schedule adjusted due to ${triggerType.toLowerCase()}`;
      }
      await m.save();
    }
  }

  // The last milestone (DELIVERY) determines the dynamic estimated delivery date
  const deliveryMilestone = milestones[milestones.length - 1];
  const newEstimatedDeliveryDate = deliveryMilestone?.estimatedCompletionDate || new Date(order.confirmedDeliveryDate);

  const isAtRisk = newEstimatedDeliveryDate > new Date(order.confirmedDeliveryDate);

  order.estimatedDeliveryDate = newEstimatedDeliveryDate;
  order.isAtRiskOfDelay = isAtRisk;
  order.delayRiskReason = isAtRisk
    ? reason || `Estimated completion (${newEstimatedDeliveryDate.toISOString().split('T')[0]}) exceeds committed date (${new Date(order.confirmedDeliveryDate).toISOString().split('T')[0]})`
    : null;
  order.lastEstimatedRecalculationAt = new Date();
  await order.save();

  // Audit recalculation
  await AuditLog.create({
    actorId: order.customerId,
    actorRole: 'SYSTEM',
    action: 'ORDER_ESTIMATE_RECALCULATED',
    entityType: 'Order',
    entityId: order._id,
    newState: {
      estimatedDeliveryDate: newEstimatedDeliveryDate,
      isAtRiskOfDelay: isAtRisk,
      delayRiskReason: order.delayRiskReason,
      triggerType,
    },
    notes: `Dynamic estimate recalculation triggered by ${triggerType}: ${reason || 'Schedule update'}`,
  }).catch((err) => logger.error(`Audit log error: ${err.message}`));

  // Publish real-time events via Socket.IO
  broadcastEvent(`order:${order._id}`, 'order:timeline_updated', {
    orderId: order._id,
    orderNumber: order.orderNumber,
    estimatedDeliveryDate: newEstimatedDeliveryDate,
    confirmedDeliveryDate: order.confirmedDeliveryDate,
    isAtRiskOfDelay: isAtRisk,
    delayRiskReason: order.delayRiskReason,
    timestamp: new Date(),
  });

  broadcastEvent('admin_control_tower', 'order:control_tower_updated', {
    orderId: order._id,
    orderNumber: order.orderNumber,
    estimatedDeliveryDate: newEstimatedDeliveryDate,
    isAtRiskOfDelay: isAtRisk,
    timestamp: new Date(),
  });

  return { order, milestones };
}

/**
 * Advance or update milestone stage state.
 */
export async function updateTimelineStage({
  orderId,
  stage,
  status,
  actualStartDate,
  actualCompletionDate,
  completedQuantity,
  delayReason,
  reworkDetails,
  responsibleMachineId,
  responsibleTeam,
  notes,
  actorUser,
  idempotencyKey,
}) {
  if (idempotencyKey) {
    const existing = await OrderTimelineEvent.findOne({ idempotencyKey });
    if (existing) {
      return { isDuplicate: true, milestone: existing };
    }
  }

  const milestone = await OrderTimelineEvent.findOne({ orderId, stage });
  if (!milestone) {
    throw new Error(`Milestone stage "${stage}" not found for order`);
  }

  const previousStatus = milestone.status;
  milestone.status = status;

  if (actualStartDate) milestone.actualStartDate = new Date(actualStartDate);
  if (actualCompletionDate) milestone.actualCompletionDate = new Date(actualCompletionDate);
  if (completedQuantity !== undefined) milestone.completedQuantity = Number(completedQuantity);
  if (responsibleMachineId) milestone.responsibleMachineId = responsibleMachineId;
  if (responsibleTeam) milestone.responsibleTeam = responsibleTeam;

  if (status === 'COMPLETED' && !milestone.actualCompletionDate) {
    milestone.actualCompletionDate = new Date();
  }

  if (status === 'IN_PROGRESS' && !milestone.actualStartDate) {
    milestone.actualStartDate = new Date();
  }

  if (delayReason) {
    milestone.isDelayed = true;
    milestone.delayReason = delayReason;
  }

  if (reworkDetails) {
    milestone.reworkDetails = reworkDetails;
  }

  milestone.statusHistory.push({
    status,
    changedAt: new Date(),
    changedBy: actorUser?._id,
    notes: notes || `Stage status changed to ${status}`,
  });

  if (idempotencyKey) {
    milestone.idempotencyKey = idempotencyKey;
  }

  await milestone.save();

  // If rework or delay was reported, trigger automatic estimate recalculation
  if (status === 'REWORK' || milestone.isDelayed) {
    await recalculateOrderEstimates(orderId, {
      reason: delayReason || 'Quality inspection detected defects requiring rework',
      triggerType: status === 'REWORK' ? 'REWORK' : 'DELAY',
    });
  }

  // Publish validated real-time updates
  broadcastEvent(`order:${orderId}`, 'order:timeline_updated', {
    orderId,
    stage,
    status,
    completedQuantity: milestone.completedQuantity,
    timestamp: new Date(),
  });

  broadcastEvent('admin_control_tower', 'order:control_tower_updated', {
    orderId,
    stage,
    status,
    timestamp: new Date(),
  });

  return { isDuplicate: false, milestone };
}

/**
 * Admin Production Control Tower Overview
 * Shows active orders, stage progress, machine fleet statuses, bottlenecks, and delivery risks.
 */
export async function getAdminControlTowerOverview() {
  const [orders, machines, timelineEvents] = await Promise.all([
    Order.find({ status: { $nin: ['COMPLETED', 'CANCELLED'] } })
      .populate('customerId', 'name email phone')
      .populate('items.productId', 'productCode name')
      .populate('productionJobIds')
      .sort({ confirmedDeliveryDate: 1 })
      .lean(),
    Machine.find()
      .populate('currentProductionJobId', 'jobNumber stage targetQuantity producedQuantity')
      .populate('currentOperatorId', 'name')
      .lean(),
    OrderTimelineEvent.find().sort({ sequence: 1 }).lean(),
  ]);

  // Aggregate Machine fleet statuses
  const machineFleet = {
    total: machines.length,
    running: machines.filter((m) => m.status === 'RUNNING'),
    idle: machines.filter((m) => m.status === 'IDLE'),
    breakdown: machines.filter((m) => m.status === 'BREAKDOWN'),
    maintenance: machines.filter((m) => m.status === 'MAINTENANCE'),
  };

  // Compile Active Orders Control Tower Data
  const now = new Date();
  const activeOrdersControl = orders.map((order) => {
    const orderEvents = timelineEvents.filter((e) => e.orderId.toString() === order._id.toString());
    const targetQty = order.items.reduce((acc, i) => acc + (i.quantity || 0), 0);
    const completedQty = (order.productionJobIds || []).reduce((acc, j) => acc + (j.producedQuantity || 0), 0);
    const progressPct = targetQty > 0 ? Math.min(100, Math.round((completedQty / targetQty) * 100)) : 0;

    const confirmedDate = new Date(order.confirmedDeliveryDate);
    const estimatedDate = order.estimatedDeliveryDate ? new Date(order.estimatedDeliveryDate) : confirmedDate;
    const isAtRisk = order.isAtRiskOfDelay || estimatedDate > confirmedDate;

    const delayDays = Math.max(0, Math.ceil((estimatedDate - confirmedDate) / (1000 * 60 * 60 * 24)));

    // Current active milestone
    const inProgressEvent = orderEvents.find((e) => e.status === 'IN_PROGRESS') ||
      orderEvents.find((e) => e.status === 'SCHEDULED') ||
      orderEvents[0];

    return {
      orderId: order._id,
      orderNumber: order.orderNumber,
      customerName: order.customerId?.name || 'B2B Client',
      status: order.status,
      currentStage: inProgressEvent?.stage || 'ORDER_CONFIRMATION',
      currentStageTitle: inProgressEvent?.title || 'Order Confirmation',
      targetQuantity: targetQty,
      completedQuantity: completedQty,
      progressPercentage: progressPct,
      unit: order.items[0]?.unit || 'METER',
      confirmedDeliveryDate: order.confirmedDeliveryDate,
      estimatedDeliveryDate: estimatedDate,
      isAtRiskOfDelay: isAtRisk,
      delayDays,
      delayRiskReason: order.delayRiskReason,
      stages: orderEvents.map((e) => ({
        stage: e.stage,
        sequence: e.sequence,
        title: e.title,
        status: e.status,
        isDelayed: e.isDelayed,
      })),
    };
  });

  // Bottleneck detection across stages
  const stageLoadCounts = {};
  const stageDelayCounts = {};

  for (const e of timelineEvents) {
    if (e.status === 'IN_PROGRESS' || e.status === 'SCHEDULED') {
      stageLoadCounts[e.stage] = (stageLoadCounts[e.stage] || 0) + 1;
    }
    if (e.isDelayed) {
      stageDelayCounts[e.stage] = (stageDelayCounts[e.stage] || 0) + 1;
    }
  }

  // Delivery risks list
  const ordersAtRisk = activeOrdersControl.filter((o) => o.isAtRiskOfDelay);

  return {
    overview: {
      activeOrdersCount: orders.length,
      ordersAtRiskCount: ordersAtRisk.length,
      runningMachinesCount: machineFleet.running.length,
      faultMachinesCount: machineFleet.breakdown.length + machineFleet.maintenance.length,
    },
    ordersAtRisk,
    activeOrders: activeOrdersControl,
    machineFleet: {
      total: machineFleet.total,
      runningCount: machineFleet.running.length,
      idleCount: machineFleet.idle.length,
      breakdownCount: machineFleet.breakdown.length,
      maintenanceCount: machineFleet.maintenance.length,
      machines: machines.map((m) => ({
        _id: m._id,
        machineCode: m.machineCode,
        name: m.name,
        type: m.type,
        status: m.status,
        location: m.location,
        telemetrySnapshot: m.telemetrySnapshot,
        currentJob: m.currentProductionJobId,
        currentOperator: m.currentOperatorId,
      })),
    },
    bottlenecks: {
      stageLoadCounts,
      stageDelayCounts,
    },
  };
}

/**
 * Operator Task Board
 * Shows assignments, current work, upcoming tasks, and schedule delay notices.
 */
export async function getOperatorTaskBoard(operatorUserId) {
  const profile = await OperatorProfile.findOne({ userId: operatorUserId }).populate('assignedMachines').lean();
  const assignedMachineIds = (profile?.assignedMachines || []).map((m) => m._id);

  const [activeJobs, upcomingJobs, machines, relevantTimelineEvents] = await Promise.all([
    ProductionJob.find({
      $or: [{ assignedOperatorIds: operatorUserId }, { machineId: { $in: assignedMachineIds } }],
      status: { $in: ['RUNNING', 'PAUSED'] },
    })
      .populate('orderId', 'orderNumber confirmedDeliveryDate estimatedDeliveryDate isAtRiskOfDelay items')
      .populate('machineId', 'machineCode name type status telemetrySnapshot')
      .lean(),
    ProductionJob.find({
      $or: [{ assignedOperatorIds: operatorUserId }, { machineId: { $in: assignedMachineIds } }],
      status: 'SCHEDULED',
    })
      .populate('orderId', 'orderNumber confirmedDeliveryDate items')
      .populate('machineId', 'machineCode name status')
      .lean(),
    Machine.find({ _id: { $in: assignedMachineIds } }).lean(),
    OrderTimelineEvent.find({
      responsibleMachineId: { $in: assignedMachineIds },
      status: { $in: ['IN_PROGRESS', 'SCHEDULED', 'DELAYED'] },
    }).lean(),
  ]);

  return {
    operator: {
      userId: operatorUserId,
      employeeCode: profile?.employeeCode,
      department: profile?.department,
    },
    assignedMachines: machines,
    activeJobs: activeJobs.map((j) => ({
      ...j,
      remainingQuantity: Math.max(0, (j.targetQuantity || 0) - (j.producedQuantity || 0)),
      progressPercentage:
        j.targetQuantity > 0 ? Math.min(100, Math.round(((j.producedQuantity || 0) / j.targetQuantity) * 100)) : 0,
      orderNumber: j.orderId?.orderNumber,
      deliveryRisk: j.orderId?.isAtRiskOfDelay,
    })),
    upcomingJobs,
    timelineAlerts: relevantTimelineEvents,
  };
}
