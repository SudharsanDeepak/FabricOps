import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRoles } from '../middleware/rbac.middleware.js';
import {
  // Operator Floor
  getOperatorDashboardHandler,
  transitionTaskStateHandler,
  recordProductionLogHandler,
  reportMachineBreakdownHandler,
  recordShiftHandoverHandler,
  getOperatorAttendanceHandler,
  clockAttendanceHandler,
  getOperatorTaskBoardHandler,
  getAttendanceDashboardSummaryHandler,
  getAttendanceRecordsHandler,
  markWorkerAttendanceHandler,
  getAttendanceWorkersHandler,
  getAttendanceAuditHistoryHandler,
  exportAttendanceCsvHandler,
  // Production Planning
  evaluateReadinessHandler,
  createPlanHandler,
  reschedulePlanHandler,
  updatePlanStatusHandler,
  getPlansHandler,
  getPlanByIdHandler,
  getPlanningOverviewHandler,
  getAdminControlTowerHandler,
} from '../controllers/operator.controller.js';

// ==========================================
// 1. OPERATOR FLOOR ROUTER
// ==========================================
const operatorRouter = Router();

// Authentication required for all floor operations
operatorRouter.use(requireAuth);

// Accessible strictly by OPERATOR and factory ADMIN roles (Customers blocked)
operatorRouter.use(requireRoles('OPERATOR', 'ADMIN'));

// Floor Dashboard overview (assigned machines, active jobs, telemetry, shifts)
operatorRouter.get('/dashboard', getOperatorDashboardHandler);

// Task State Transitions (Start, Pause, Resume, Complete with version validation)
operatorRouter.patch('/tasks/:jobId/transition', transitionTaskStateHandler);

// Production Output Recording (cumulative plan check, overruns, idempotency)
operatorRouter.post('/production-logs', recordProductionLogHandler);

// Machine Breakdown, Maintenance, Missing Materials Reporting
operatorRouter.post('/breakdowns', reportMachineBreakdownHandler);

// Shift Handover recording (dedicated collection, unfinished tasks)
operatorRouter.post('/shift-handover', recordShiftHandoverHandler);

// Factory Worker Attendance Management (Admin & Floor Supervisors)
operatorRouter.get('/attendance/dashboard-summary', requireRoles('ADMIN'), getAttendanceDashboardSummaryHandler);
operatorRouter.get('/attendance/records', requireRoles('ADMIN'), getAttendanceRecordsHandler);
operatorRouter.get('/attendance/workers', requireRoles('ADMIN'), getAttendanceWorkersHandler);
operatorRouter.get('/attendance/export', requireRoles('ADMIN'), exportAttendanceCsvHandler);
operatorRouter.get('/attendance/audit-history/:recordId', requireRoles('ADMIN'), getAttendanceAuditHistoryHandler);
operatorRouter.post('/attendance/mark', requireRoles('ADMIN'), markWorkerAttendanceHandler);

// Operator Attendance and Recorded Shifts (Self Timesheet)
operatorRouter.get('/attendance', getOperatorAttendanceHandler);
operatorRouter.post('/attendance/clock', clockAttendanceHandler);

// Operator Task Board (assignments, current work, upcoming jobs, loom alerts)
operatorRouter.get('/task-board', getOperatorTaskBoardHandler);

// ==========================================
// 2. PRODUCTION PLANNING ROUTER
// ==========================================
export const productionPlanningRouter = Router();
productionPlanningRouter.use(requireAuth);

// Admin Production Control Tower (Active orders, progress, machine status, bottlenecks, delay risks)
productionPlanningRouter.get('/control-tower', requireRoles('ADMIN'), getAdminControlTowerHandler);

// Planning analytics (bottlenecks, conflicts, idle machines, delay risks)
productionPlanningRouter.get('/overview', requireRoles('ADMIN', 'OPERATOR'), getPlanningOverviewHandler);

// Order readiness evaluation (material availability, machine fleet compatibility)
productionPlanningRouter.get('/readiness', requireRoles('ADMIN'), evaluateReadinessHandler);

// Production plans
productionPlanningRouter.get('/plans', requireRoles('ADMIN', 'OPERATOR'), getPlansHandler);
productionPlanningRouter.post('/plans', requireRoles('ADMIN'), createPlanHandler);
productionPlanningRouter.get('/plans/:id', requireRoles('ADMIN', 'OPERATOR'), getPlanByIdHandler);
productionPlanningRouter.patch('/plans/:id/reschedule', requireRoles('ADMIN'), reschedulePlanHandler);
productionPlanningRouter.patch('/plans/:id/status', requireRoles('ADMIN'), updatePlanStatusHandler);

export default operatorRouter;
