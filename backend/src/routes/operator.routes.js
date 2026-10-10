import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRoles } from '../middleware/rbac.middleware.js';
import {
  getOperatorDashboardHandler,
  transitionTaskStateHandler,
  recordProductionLogHandler,
  reportMachineBreakdownHandler,
  recordShiftHandoverHandler,
  getOperatorAttendanceHandler,
  clockAttendanceHandler,
  getOperatorTaskBoardHandler,
} from '../controllers/operator.controller.js';

const router = Router();

// Authentication required for all floor operations
router.use(requireAuth);

// Accessible strictly by OPERATOR and factory ADMIN roles (Customers blocked)
router.use(requireRoles('OPERATOR', 'ADMIN'));

// Floor Dashboard overview (assigned machines, active jobs, telemetry, shifts)
router.get('/dashboard', getOperatorDashboardHandler);

// Task State Transitions (Start, Pause, Resume, Complete with version validation)
router.patch('/tasks/:jobId/transition', transitionTaskStateHandler);

// Production Output Recording (cumulative plan check, overruns, idempotency)
router.post('/production-logs', recordProductionLogHandler);

// Machine Breakdown, Maintenance, Missing Materials Reporting
router.post('/breakdowns', reportMachineBreakdownHandler);

// Shift Handover recording (dedicated collection, unfinished tasks)
router.post('/shift-handover', recordShiftHandoverHandler);

// Operator Attendance and Recorded Shifts
router.get('/attendance', getOperatorAttendanceHandler);
router.post('/attendance/clock', clockAttendanceHandler);

// Operator Task Board (assignments, current work, upcoming jobs, loom alerts)
router.get('/task-board', getOperatorTaskBoardHandler);

export default router;
