import mongoose from 'mongoose';
import {
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
  ShiftHandover,
  User,
} from '../models/index.js';

/**
 * Normalizes start and end of current day in UTC
 */
function getTodayDateRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/**
 * -----------------------------------------------------------------------------
 * 1. ADMIN DASHBOARD ANALYTICS
 * -----------------------------------------------------------------------------
 * Returns complete operational telemetry, delay risks, inventory shortages,
 * loom fleet utilization, daily output, quality metrics, and financial summaries.
 */
export async function getAdminDashboardAnalytics() {
  const { start: todayStart, end: todayEnd } = getTodayDateRange();

  // 1. Orders Awaiting Decisions
  const [pendingRequestsCount, pendingQuotationsCount, unplannedOrdersCount] = await Promise.all([
    OrderRequest.countDocuments({ status: 'PENDING_REVIEW' }),
    Quotation.countDocuments({ status: { $in: ['DRAFT', 'REVISED'] } }),
    Order.countDocuments({ status: 'CONFIRMED' }),
  ]);

  const recentPendingRequests = await OrderRequest.find({ status: 'PENDING_REVIEW' })
    .populate('customerId', 'name email companyName')
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  const totalOrdersAwaitingDecision = pendingRequestsCount + pendingQuotationsCount + unplannedOrdersCount;

  // 2. Orders At Risk of Delay
  const delayedOrders = await Order.find({
    status: { $in: ['CONFIRMED', 'YARN_ALLOCATED', 'IN_PRODUCTION', 'QUALITY_APPROVED', 'PARTIALLY_DISPATCHED'] },
    $or: [{ isAtRiskOfDelay: true }, { confirmedDeliveryDate: { $lt: new Date() } }],
  })
    .populate('customerId', 'name email companyName')
    .sort({ confirmedDeliveryDate: 1 })
    .limit(10)
    .lean();

  const delayedOrdersCount = await Order.countDocuments({
    status: { $in: ['CONFIRMED', 'YARN_ALLOCATED', 'IN_PRODUCTION', 'QUALITY_APPROVED', 'PARTIALLY_DISPATCHED'] },
    $or: [{ isAtRiskOfDelay: true }, { confirmedDeliveryDate: { $lt: new Date() } }],
  });

  // 3. Material Shortages & Critical Yarn Alerts
  const inventoryAggregation = await InventoryItem.aggregate([
    {
      $project: {
        sku: 1,
        name: 1,
        category: 1,
        yarnType: 1,
        yarnColor: 1,
        unit: 1,
        quantityOnHand: 1,
        quantityReserved: 1,
        minimumReorderLevel: 1,
        availableStock: { $subtract: ['$quantityOnHand', '$quantityReserved'] },
      },
    },
    {
      $match: {
        $expr: { $lte: ['$availableStock', '$minimumReorderLevel'] },
      },
    },
    {
      $addFields: {
        shortageQuantity: {
          $max: [0, { $subtract: ['$minimumReorderLevel', '$availableStock'] }],
        },
      },
    },
    { $sort: { shortageQuantity: -1 } },
  ]);

  const totalShortagesCount = inventoryAggregation.length;
  const criticalShortages = inventoryAggregation.slice(0, 10);
  const totalShortageQuantity = inventoryAggregation.reduce((acc, item) => acc + (item.shortageQuantity || 0), 0);

  // 4. Machine Utilization and Fleet Downtime
  const [totalMachines, machinesByStatus, openBreakdownsCount, breakdownDowntimeSum] = await Promise.all([
    Machine.countDocuments(),
    Machine.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]),
    BreakdownReport.countDocuments({ status: { $ne: 'RESOLVED' } }),
    BreakdownReport.aggregate([
      {
        $group: {
          _id: null,
          totalMinutes: { $sum: '$downtimeMinutes' },
        },
      },
    ]),
  ]);

  const statusMap = { RUNNING: 0, IDLE: 0, MAINTENANCE: 0, BREAKDOWN: 0 };
  machinesByStatus.forEach((item) => {
    if (item._id && statusMap[item._id] !== undefined) {
      statusMap[item._id] = item.count;
    }
  });

  const fleetUtilizationRate =
    totalMachines > 0 ? Number(((statusMap.RUNNING / totalMachines) * 100).toFixed(1)) : 0;

  const totalDowntimeMinutes = breakdownDowntimeSum[0]?.totalMinutes || 0;
  const totalDowntimeHours = Number((totalDowntimeMinutes / 60).toFixed(1));

  // 5. Daily Production Output
  const [todayRuns, stageBreakdownAggregation] = await Promise.all([
    ProductionRun.aggregate([
      {
        $match: {
          $or: [
            { createdAt: { $gte: todayStart, $lte: todayEnd } },
            { updatedAt: { $gte: todayStart, $lte: todayEnd } },
          ],
        },
      },
      {
        $group: {
          _id: null,
          totalMeters: { $sum: '$actualProducedMeters' },
          plannedMeters: { $sum: '$plannedMeters' },
        },
      },
    ]),
    ProductionJob.aggregate([
      { $match: { status: { $in: ['RUNNING', 'SCHEDULED', 'PAUSED'] } } },
      {
        $group: {
          _id: '$stage',
          activeJobsCount: { $sum: 1 },
          targetQuantity: { $sum: '$targetQuantity' },
          producedQuantity: { $sum: '$producedQuantity' },
        },
      },
    ]),
  ]);

  // Also check rolls produced today as fallback/addition
  const todayRolls = await FabricRoll.aggregate([
    {
      $match: {
        createdAt: { $gte: todayStart, $lte: todayEnd },
      },
    },
    {
      $group: {
        _id: null,
        totalRollMeters: { $sum: '$netMeters' },
        rollsCount: { $sum: 1 },
      },
    },
  ]);

  const todayProducedMeters = Math.max(
    todayRuns[0]?.totalMeters || 0,
    todayRolls[0]?.totalRollMeters || 0
  );
  const targetDailyOutputMeters = todayRuns[0]?.plannedMeters || 5000;
  const dailyAttainmentPercentage =
    targetDailyOutputMeters > 0
      ? Number(((todayProducedMeters / targetDailyOutputMeters) * 100).toFixed(1))
      : 0;

  // 6. Defect & Rework Rates
  const [totalInspections, inspectionStatusGroups, topDefectTypes] = await Promise.all([
    QualityInspection.countDocuments(),
    QualityInspection.aggregate([
      {
        $group: {
          _id: '$inspectionStatus',
          count: { $sum: 1 },
        },
      },
    ]),
    QualityInspection.aggregate([
      { $unwind: '$defects' },
      {
        $group: {
          _id: '$defects.defectType',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]),
  ]);

  const inspectionMap = { PASSED: 0, FAILED: 0, REWORK_REQUIRED: 0, REJECTED: 0, PENDING: 0 };
  inspectionStatusGroups.forEach((group) => {
    if (group._id && inspectionMap[group._id] !== undefined) {
      inspectionMap[group._id] = group.count;
    }
  });

  const defectiveCount = inspectionMap.FAILED + inspectionMap.REJECTED;
  const reworkCount = inspectionMap.REWORK_REQUIRED;
  const defectRate =
    totalInspections > 0
      ? Number((((defectiveCount + reworkCount) / totalInspections) * 100).toFixed(1))
      : 0;
  const reworkRate =
    totalInspections > 0 ? Number(((reworkCount / totalInspections) * 100).toFixed(1)) : 0;

  // 7. Dispatch Status & Financial Summaries
  const [dispatchStatusGroups, totalDispatchedMetersSum, financialSummary, overdueInvoicesCount] =
    await Promise.all([
      Dispatch.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
      Dispatch.aggregate([
        {
          $group: {
            _id: null,
            totalMeters: { $sum: '$totalMetersDispatched' },
          },
        },
      ]),
      Invoice.aggregate([
        {
          $group: {
            _id: null,
            totalInvoiced: { $sum: '$totalInvoiceAmount' },
            totalCollected: { $sum: '$amountPaid' },
            totalReceivables: { $sum: '$balanceDue' },
          },
        },
      ]),
      Invoice.countDocuments({
        paymentStatus: { $ne: 'PAID' },
        dueDate: { $lt: new Date() },
      }),
    ]);

  const dispatchStatusMap = { PREPARED: 0, GATE_CLEARED: 0, IN_TRANSIT: 0, DELIVERED: 0 };
  dispatchStatusGroups.forEach((g) => {
    if (g._id && dispatchStatusMap[g._id] !== undefined) {
      dispatchStatusMap[g._id] = g.count;
    }
  });

  return {
    ordersAwaitingDecisions: {
      total: totalOrdersAwaitingDecision,
      pendingRequestsCount,
      pendingQuotationsCount,
      unplannedOrdersCount,
      recentPendingRequests: recentPendingRequests.map((r) => ({
        _id: r._id,
        requestNumber: r.requestNumber,
        customerName: r.customerId?.companyName || r.customerId?.name || 'Customer',
        fabricType: r.items?.[0]?.fabricSpecSnapshot?.weaveType || 'Fabric Spec',
        targetQuantity: r.items?.[0]?.targetQuantity || 0,
        createdAt: r.createdAt,
      })),
    },
    ordersAtRiskOfDelay: {
      count: delayedOrdersCount,
      orders: delayedOrders.map((o) => ({
        _id: o._id,
        orderNumber: o.orderNumber,
        customerName: o.customerId?.companyName || o.customerId?.name || 'Customer',
        confirmedDeliveryDate: o.confirmedDeliveryDate,
        status: o.status,
        delayRiskReason: o.delayRiskReason || (new Date(o.confirmedDeliveryDate) < new Date() ? 'Delivery date breached' : 'At risk'),
        producedMeters: o.producedMeters || 0,
        totalMetersOrdered: o.totalMetersOrdered || 0,
      })),
    },
    materialShortages: {
      count: totalShortagesCount,
      totalShortageQuantity,
      criticalItems: criticalShortages,
    },
    machineFleet: {
      totalMachines,
      runningCount: statusMap.RUNNING,
      idleCount: statusMap.IDLE,
      maintenanceCount: statusMap.MAINTENANCE,
      breakdownCount: statusMap.BREAKDOWN,
      fleetUtilizationRate,
      activeBreakdownsCount: openBreakdownsCount,
      totalDowntimeHours,
    },
    dailyProduction: {
      todayProducedMeters,
      targetDailyOutputMeters,
      dailyAttainmentPercentage,
      stageBreakdown: stageBreakdownAggregation.map((s) => ({
        stage: s._id,
        activeJobsCount: s.activeJobsCount,
        targetQuantity: s.targetQuantity,
        producedQuantity: s.producedQuantity,
      })),
    },
    defectAndRework: {
      totalInspections,
      passedCount: inspectionMap.PASSED,
      defectiveCount,
      reworkCount,
      defectRate,
      reworkRate,
      topDefectTypes: topDefectTypes.map((t) => ({ type: t._id || 'Other', count: t.count })),
    },
    dispatchesAndFinancials: {
      dispatchesByStatus: dispatchStatusMap,
      totalDispatchedMeters: totalDispatchedMetersSum[0]?.totalMeters || 0,
      totalInvoiced: financialSummary[0]?.totalInvoiced || 0,
      totalCollected: financialSummary[0]?.totalCollected || 0,
      totalReceivables: financialSummary[0]?.totalReceivables || 0,
      overdueInvoicesCount,
    },
  };
}

/**
 * -----------------------------------------------------------------------------
 * 2. CUSTOMER DASHBOARD ANALYTICS
 * -----------------------------------------------------------------------------
 * Strict multi-tenant isolation by customerId: active orders, pending quotes,
 * delivery dates, dispatches in transit, and invoice payment statuses.
 */
export async function getCustomerDashboardAnalytics(customerId) {
  if (!mongoose.Types.ObjectId.isValid(customerId)) {
    throw new Error('Invalid customer ID provided');
  }

  const custObjectId = new mongoose.Types.ObjectId(customerId);

  // 1. Active & Completed Orders
  const [activeOrders, completedOrdersCount] = await Promise.all([
    Order.find({
      customerId: custObjectId,
      status: { $nin: ['COMPLETED', 'CANCELLED'] },
    })
      .sort({ confirmedDeliveryDate: 1 })
      .lean(),
    Order.countDocuments({
      customerId: custObjectId,
      status: 'COMPLETED',
    }),
  ]);

  const now = new Date();
  const formattedActiveOrders = activeOrders.map((o) => {
    const totalMeters = o.totalMetersOrdered || 1;
    const produced = o.producedMeters || 0;
    const progressPercentage = Math.min(100, Math.round((produced / totalMeters) * 100));
    const daysRemaining = o.confirmedDeliveryDate
      ? Math.ceil((new Date(o.confirmedDeliveryDate) - now) / (1000 * 60 * 60 * 24))
      : null;

    return {
      _id: o._id,
      orderNumber: o.orderNumber,
      status: o.status,
      confirmedDeliveryDate: o.confirmedDeliveryDate,
      daysRemaining,
      totalMetersOrdered: o.totalMetersOrdered,
      producedMeters: o.producedMeters,
      dispatchedMeters: o.dispatchedMeters || 0,
      progressPercentage,
      isAtRiskOfDelay: o.isAtRiskOfDelay,
      delayRiskReason: o.delayRiskReason,
      paymentStatus: o.paymentStatus,
    };
  });

  // 2. Pending Quotation Decisions
  const pendingQuotations = await Quotation.find({
    customerId: custObjectId,
    status: { $in: ['ISSUED', 'REVISED'] },
    'customerDecision.decision': 'PENDING',
  })
    .sort({ createdAt: -1 })
    .lean();

  const formattedQuotations = pendingQuotations.map((q) => ({
    _id: q._id,
    quotationNumber: q.quotationNumber,
    status: q.status,
    totalAmount: q.totalAmount,
    proposedDeliveryDate: q.proposedDeliveryDate,
    validUntil: q.validUntil,
    currentRevisionNumber: q.currentRevisionNumber || 1,
  }));

  // 3. Estimated Deliveries & Milestones
  const upcomingDeliveries = formattedActiveOrders
    .filter((o) => o.confirmedDeliveryDate)
    .slice(0, 5);

  // 4. Quality and Dispatches
  const customerOrderIds = activeOrders.map((o) => o._id);
  const [customerDispatches, passedRollsCount] = await Promise.all([
    Dispatch.find({ customerId: custObjectId })
      .sort({ dispatchedAt: -1 })
      .limit(5)
      .lean(),
    FabricRoll.countDocuments({
      orderId: { $in: customerOrderIds },
      grade: { $in: ['GRADE_A', 'GRADE_B'] },
    }),
  ]);

  const formattedDispatches = customerDispatches.map((d) => ({
    _id: d._id,
    dispatchNumber: d.dispatchNumber,
    carrierName: d.carrierName,
    waybillNumber: d.waybillNumber,
    vehicleNumber: d.vehicleNumber,
    status: d.status,
    totalMetersDispatched: d.totalMetersDispatched,
    dispatchedAt: d.dispatchedAt,
  }));

  // 5. Invoices and Payment Status
  const [customerInvoices, customerFinancialAgg] = await Promise.all([
    Invoice.find({ customerId: custObjectId })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
    Invoice.aggregate([
      { $match: { customerId: custObjectId } },
      {
        $group: {
          _id: null,
          totalInvoiced: { $sum: '$totalInvoiceAmount' },
          totalPaid: { $sum: '$amountPaid' },
          totalBalanceDue: { $sum: '$balanceDue' },
        },
      },
    ]),
  ]);

  const totalInvoiced = customerFinancialAgg[0]?.totalInvoiced || 0;
  const totalPaid = customerFinancialAgg[0]?.totalPaid || 0;
  const outstandingBalance = customerFinancialAgg[0]?.totalBalanceDue || 0;

  return {
    activeOrders: {
      count: formattedActiveOrders.length,
      completedOrdersCount,
      orders: formattedActiveOrders,
    },
    quotationDecisions: {
      pendingCount: formattedQuotations.length,
      quotations: formattedQuotations,
    },
    upcomingDeliveries,
    qualityAndDispatches: {
      passedRollsCount,
      recentDispatches: formattedDispatches,
    },
    invoicesAndPayments: {
      totalInvoiced,
      totalPaid,
      outstandingBalance,
      recentInvoices: customerInvoices.map((inv) => ({
        _id: inv._id,
        invoiceNumber: inv.invoiceNumber,
        totalInvoiceAmount: inv.totalInvoiceAmount,
        amountPaid: inv.amountPaid,
        balanceDue: inv.balanceDue,
        paymentStatus: inv.paymentStatus,
        dueDate: inv.dueDate,
      })),
    },
  };
}

/**
 * -----------------------------------------------------------------------------
 * 3. OPERATOR DASHBOARD ANALYTICS
 * -----------------------------------------------------------------------------
 * Factory floor telemetry for an operator: assigned tasks, machines, shift
 * progress, targets vs output, and machine breakdown halts.
 */
export async function getOperatorDashboardAnalytics(operatorId) {
  if (!mongoose.Types.ObjectId.isValid(operatorId)) {
    throw new Error('Invalid operator ID provided');
  }

  const opObjectId = new mongoose.Types.ObjectId(operatorId);
  const { start: todayStart, end: todayEnd } = getTodayDateRange();

  // 1. Assigned Tasks and Machines
  const assignedJobs = await ProductionJob.find({
    assignedOperatorIds: opObjectId,
    status: { $in: ['SCHEDULED', 'RUNNING', 'PAUSED'] },
  })
    .populate('machineId', 'machineCode name type status location telemetrySnapshot')
    .populate('orderId', 'orderNumber status')
    .sort({ createdAt: -1 })
    .lean();

  const assignedMachinesMap = new Map();
  assignedJobs.forEach((job) => {
    if (job.machineId && !assignedMachinesMap.has(job.machineId._id.toString())) {
      assignedMachinesMap.set(job.machineId._id.toString(), job.machineId);
    }
  });
  const assignedMachines = Array.from(assignedMachinesMap.values());
  const assignedMachineIds = assignedMachines.map((m) => m._id);

  // 2. Shift Progress & Attendance
  const [todayAttendance, pendingHandovers] = await Promise.all([
    Attendance.findOne({
      operatorId: opObjectId,
      date: { $gte: todayStart, $lte: todayEnd },
    })
      .populate('shiftId', 'name shiftCode startTime endTime')
      .lean(),
    ShiftHandover.find({
      incomingOperatorId: opObjectId,
      incomingAcknowledgedAt: { $exists: false },
    })
      .populate('machineId', 'machineCode name')
      .populate('outgoingOperatorId', 'name')
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  // 3. Targets and Recorded Output
  let totalTargetMeters = 0;
  let totalProducedMeters = 0;
  assignedJobs.forEach((job) => {
    totalTargetMeters += job.targetQuantity || 0;
    totalProducedMeters += job.producedQuantity || 0;
  });

  const targetAttainmentPercentage =
    totalTargetMeters > 0
      ? Number(((totalProducedMeters / totalTargetMeters) * 100).toFixed(1))
      : 0;

  // 4. Breakdown & Maintenance Alerts for Assigned Machines
  const activeBreakdowns = await BreakdownReport.find({
    machineId: { $in: assignedMachineIds },
    status: { $ne: 'RESOLVED' },
  })
    .populate('machineId', 'machineCode name location')
    .sort({ reportedAt: -1 })
    .lean();

  return {
    assignedTasks: {
      activeJobsCount: assignedJobs.length,
      jobs: assignedJobs.map((j) => ({
        _id: j._id,
        jobNumber: j.jobNumber,
        orderNumber: j.orderId?.orderNumber || 'N/A',
        machineCode: j.machineId?.machineCode || 'N/A',
        stage: j.stage,
        targetQuantity: j.targetQuantity,
        producedQuantity: j.producedQuantity,
        unit: j.unit,
        status: j.status,
      })),
      machines: assignedMachines.map((m) => ({
        _id: m._id,
        machineCode: m.machineCode,
        name: m.name,
        type: m.type,
        status: m.status,
        location: m.location,
        telemetry: m.telemetrySnapshot,
      })),
    },
    shiftAndAttendance: {
      attendanceStatus: todayAttendance?.status || 'NOT_CHECKED_IN',
      checkInTime: todayAttendance?.checkInTime,
      checkOutTime: todayAttendance?.checkOutTime,
      hoursWorked: todayAttendance?.hoursWorked || 0,
      overtimeHours: todayAttendance?.overtimeHours || 0,
      approvedOvertimeHours: todayAttendance?.approvedOvertimeHours || 0,
      shiftInfo: todayAttendance?.shiftId || null,
      pendingHandovers: pendingHandovers.map((h) => ({
        _id: h._id,
        handoverNumber: h.handoverNumber,
        machineCode: h.machineId?.machineCode || 'Loom',
        outgoingOperatorName: h.outgoingOperatorId?.name || 'Previous Operator',
        metersRunningAtHandover: h.metersRunningAtHandover,
        createdAt: h.createdAt,
      })),
    },
    productionProgress: {
      totalTargetMeters,
      totalProducedMeters,
      targetAttainmentPercentage,
    },
    breakdownsAndAlerts: {
      activeBreakdownsCount: activeBreakdowns.length,
      breakdowns: activeBreakdowns.map((b) => ({
        _id: b._id,
        reportNumber: b.reportNumber,
        machineCode: b.machineId?.machineCode || 'Machine',
        breakdownType: b.breakdownType,
        severity: b.severity,
        description: b.description,
        status: b.status,
        reportedAt: b.reportedAt,
      })),
    },
  };
}
