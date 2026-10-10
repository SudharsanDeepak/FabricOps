import { Router } from 'express';
import { requireRoles } from '../middleware/rbac.middleware.js';
import {
  evaluateReadinessHandler,
  createPlanHandler,
  reschedulePlanHandler,
  updatePlanStatusHandler,
  getPlansHandler,
  getPlanByIdHandler,
  getPlanningOverviewHandler,
} from '../controllers/productionPlanning.controller.js';

const router = Router();

// Planning analytics (bottlenecks, conflicts, idle machines, delay risks)
router.get('/overview', requireRoles('ADMIN', 'OPERATOR'), getPlanningOverviewHandler);

// Order readiness evaluation (material availability, machine fleet compatibility)
router.get('/readiness', requireRoles('ADMIN'), evaluateReadinessHandler);

// Production plans
router.get('/plans', requireRoles('ADMIN', 'OPERATOR'), getPlansHandler);
router.post('/plans', requireRoles('ADMIN'), createPlanHandler);
router.get('/plans/:id', requireRoles('ADMIN', 'OPERATOR'), getPlanByIdHandler);
router.patch('/plans/:id/reschedule', requireRoles('ADMIN'), reschedulePlanHandler);
router.patch('/plans/:id/status', requireRoles('ADMIN'), updatePlanStatusHandler);

export default router;

