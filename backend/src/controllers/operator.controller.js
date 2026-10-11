import { logger } from '../config/logger.js';
import {
  getOperatorDashboardData,
  transitionTaskState,
  recordProductionLog,
  reportMachineBreakdown,
  recordShiftHandover,
  getOperatorAttendance,
  clockAttendance,
  getAttendanceDashboardSummary,
  getAttendanceRecords,
  markWorkerAttendance,
  getAttendanceWorkers,
  getAttendanceAuditHistory,
  generateAttendanceCsv,
} from '../services/operator.service.js';
import {
  evaluateProductionReadiness,
  createProductionPlan,
  rescheduleProductionPlan,
  updateProductionPlanStatus,
  getProductionPlans,
  getProductionPlanById,
  getPlanningOverview,
} from '../services/planning.service.js';
import { getAdminControlTowerOverview, getOperatorTaskBoard } from '../services/timeline.service.js';

// ==========================================
// 1. PRODUCTION PLANNING & SCHEDULING (ADMIN)
// ==========================================

export const evaluateReadinessHandler = async (req, res, next) => {
  try {
    const { orderId } = req.query;
    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Order ID is required to evaluate readiness' },
      });
    }

    const readiness = await evaluateProductionReadiness(orderId);
    res.json({
      success: true,
      data: readiness,
    });
  } catch (error) {
    next(error);
  }
};

export const createPlanHandler = async (req, res, next) => {
  try {
    const { orderId, plannedStartDate, plannedCompletionDate, stages, status, notes } = req.body;
    const plan = await createProductionPlan({
      orderId,
      plannedStartDate,
      plannedCompletionDate,
      stages,
      status,
      notes,
      actorUser: req.user,
    });

    res.status(201).json({
      success: true,
      message: `Production plan ${plan.planNumber} created successfully`,
      data: plan,
    });
  } catch (error) {
    next(error);
  }
};

export const reschedulePlanHandler = async (req, res, next) => {
  try {
    const { newStartDate, newCompletionDate, reason } = req.body;
    const plan = await rescheduleProductionPlan({
      planId: req.params.id,
      newStartDate,
      newCompletionDate,
      reason,
      actorUser: req.user,
    });

    res.json({
      success: true,
      message: `Production plan ${plan.planNumber} rescheduled successfully`,
      data: plan,
    });
  } catch (error) {
    next(error);
  }
};

export const updatePlanStatusHandler = async (req, res, next) => {
  try {
    const { status } = req.body;
    const plan = await updateProductionPlanStatus({
      planId: req.params.id,
      status,
      actorUser: req.user,
    });

    res.json({
      success: true,
      message: `Production plan ${plan.planNumber} status updated to ${status}`,
      data: plan,
    });
  } catch (error) {
    next(error);
  }
};

export const getPlansHandler = async (req, res, next) => {
  try {
    const { orderId, status } = req.query;
    const plans = await getProductionPlans({ orderId, status });
    res.json({
      success: true,
      data: plans,
      count: plans.length,
    });
  } catch (error) {
    next(error);
  }
};

export const getPlanByIdHandler = async (req, res, next) => {
  try {
    const plan = await getProductionPlanById(req.params.id);
    res.json({
      success: true,
      data: plan,
    });
  } catch (error) {
    next(error);
  }
};

export const getPlanningOverviewHandler = async (req, res, next) => {
  try {
    const overview = await getPlanningOverview();
    res.json({
      success: true,
      data: overview,
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminControlTowerHandler = async (req, res, next) => {
  try {
    const data = await getAdminControlTowerOverview();
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 2. OPERATOR FLOOR TERMINALS & ACTIONS
// ==========================================

export async function getOperatorDashboardHandler(req, res, next) {
  try {
    const data = await getOperatorDashboardData(req.user._id);
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function transitionTaskStateHandler(req, res, next) {
  try {
    const { action, expectedVersion, notes } = req.body;
    const { jobId } = req.params;

    const result = await transitionTaskState({
      jobId,
      action,
      expectedVersion,
      actorUser: req.user,
      notes,
    });

    res.json({
      success: true,
      message: `Task successfully transitioned to ${result.job.status}`,
      data: result,
    });
  } catch (error) {
    if (error.message.includes('Conflicting task transition')) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'CONFLICT',
          message: error.message,
        },
      });
    }
    if (error.message.includes('Unauthorized task')) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: error.message,
        },
      });
    }
    if (
      error.message.includes('Cannot') ||
      error.message.includes('Invalid action') ||
      error.message.includes('BREAKDOWN') ||
      error.message.includes('MAINTENANCE') ||
      error.message.includes('actively running another job')
    ) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: error.message,
        },
      });
    }
    next(error);
  }
}

export async function recordProductionLogHandler(req, res, next) {
  try {
    const result = await recordProductionLog({
      ...req.body,
      actorUser: req.user,
    });

    res.status(result.isDuplicate ? 200 : 201).json({
      success: true,
      message: result.message || 'Production log recorded successfully',
      data: result,
    });
  } catch (error) {
    if (error.message.includes('Overrun violation')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'OVERRUN_AUTHORIZATION_REQUIRED',
          message: error.message,
        },
      });
    }
    if (error.message.includes('Unauthorized task')) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: error.message,
        },
      });
    }
    if (error.message.includes('must be a non-negative') || error.message.includes('must be greater than zero')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message,
        },
      });
    }
    next(error);
  }
}

export async function reportMachineBreakdownHandler(req, res, next) {
  try {
    const result = await reportMachineBreakdown({
      ...req.body,
      actorUser: req.user,
    });

    res.status(result.isDuplicate ? 200 : 201).json({
      success: true,
      message: result.message || 'Machine breakdown report submitted successfully',
      data: result,
    });
  } catch (error) {
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: error.message,
        },
      });
    }
    next(error);
  }
}

export async function recordShiftHandoverHandler(req, res, next) {
  try {
    const result = await recordShiftHandover({
      ...req.body,
      actorUser: req.user,
    });

    res.status(result.isDuplicate ? 200 : 201).json({
      success: true,
      message: result.message || 'Shift handover recorded successfully',
      data: result,
    });
  } catch (error) {
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: error.message,
        },
      });
    }
    next(error);
  }
}

export async function getOperatorAttendanceHandler(req, res, next) {
  try {
    const data = await getOperatorAttendance(req.user._id);
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function clockAttendanceHandler(req, res, next) {
  try {
    const record = await clockAttendance({
      ...req.body,
      actorUser: req.user,
    });

    res.json({
      success: true,
      message: `Attendance ${req.body.action === 'CHECK_IN' ? 'Check-in' : 'Check-out'} recorded`,
      data: record,
    });
  } catch (error) {
    if (error.message.includes('Already') || error.message.includes('No check-in record') || error.message.includes('Invalid clock')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: error.message,
        },
      });
    }
    next(error);
  }
}

export async function getOperatorTaskBoardHandler(req, res, next) {
  try {
    const data = await getOperatorTaskBoard(req.user._id);
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// 4. FACTORY WORKER ATTENDANCE (ADMIN & SUPERVISOR)
// ==========================================

export async function getAttendanceDashboardSummaryHandler(req, res, next) {
  try {
    const { date } = req.query;
    const summary = await getAttendanceDashboardSummary(date);
    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
}

export async function getAttendanceRecordsHandler(req, res, next) {
  try {
    const { date, startDate, endDate, department, search, status, page, limit } = req.query;
    const result = await getAttendanceRecords({
      date,
      startDate,
      endDate,
      department,
      search,
      status,
      page,
      limit,
    });
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function markWorkerAttendanceHandler(req, res, next) {
  try {
    const record = await markWorkerAttendance({
      ...req.body,
      actorUser: req.user,
    });
    res.status(200).json({
      success: true,
      message: 'Worker attendance saved successfully',
      data: record,
    });
  } catch (error) {
    if (
      error.message.includes('Invalid status') ||
      error.message.includes('Worker not found') ||
      error.message.includes('Check-out time') ||
      error.message.includes('required')
    ) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message,
        },
      });
    }
    next(error);
  }
}

export async function getAttendanceWorkersHandler(req, res, next) {
  try {
    const workers = await getAttendanceWorkers();
    res.json({
      success: true,
      data: workers,
    });
  } catch (error) {
    next(error);
  }
}

export async function getAttendanceAuditHistoryHandler(req, res, next) {
  try {
    const { recordId } = req.params;
    const history = await getAttendanceAuditHistory(recordId);
    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    next(error);
  }
}

export async function exportAttendanceCsvHandler(req, res, next) {
  try {
    const { date, startDate, endDate, department, search, status } = req.query;
    const csv = await generateAttendanceCsv({
      date,
      startDate,
      endDate,
      department,
      search,
      status,
    });
    const dateName = date || (startDate ? `${startDate}_to_${endDate}` : 'export');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="attendance_${dateName}.csv"`);
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
}

