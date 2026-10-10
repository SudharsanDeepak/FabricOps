import { Router } from 'express';
import { requireRoles } from '../middleware/rbac.middleware.js';
import {
  createRollHandler,
  getRollsHandler,
  getRollTraceabilityHandler,
  recordInspectionHandler,
  authorizeReworkHandler,
  completeReworkHandler,
  recordDefectObservationHandler,
  verifyDefectObservationHandler,
  getQualityDashboardHandler,
  getReworkQueueHandler,
  getAiDefectsHandler,
} from '../controllers/quality.controller.js';

const router = Router();

// Quality KPIs & Defect Dashboard
router.get('/dashboard', requireRoles('ADMIN', 'OPERATOR'), getQualityDashboardHandler);

// Fabric Rolls registry & doffing
router.get('/rolls', requireRoles('ADMIN', 'OPERATOR'), getRollsHandler);
router.post('/rolls', requireRoles('ADMIN', 'OPERATOR'), createRollHandler);

// Roll Traceability Deep Explorer (Accessible by Admin, Operator, and Customer for their rolls)
router.get('/rolls/:idOrNumber/traceability', requireRoles('ADMIN', 'OPERATOR', 'CUSTOMER'), getRollTraceabilityHandler);

// 4-Point Standard Inspections (Initial & Reinspections)
router.post('/inspections', requireRoles('ADMIN', 'OPERATOR'), recordInspectionHandler);

// Rework events queue & lifecycle
router.get('/rework', requireRoles('ADMIN', 'OPERATOR'), getReworkQueueHandler);
router.patch('/rework/:id/authorize', requireRoles('ADMIN'), authorizeReworkHandler);
router.patch('/rework/:id/complete', requireRoles('ADMIN', 'OPERATOR'), completeReworkHandler);

// Defect Observations & AI Vision Stream
router.get('/defects/ai', requireRoles('ADMIN', 'OPERATOR'), getAiDefectsHandler);
router.post('/defects', requireRoles('ADMIN', 'OPERATOR'), recordDefectObservationHandler);
router.patch('/defects/:id/verify', requireRoles('ADMIN', 'OPERATOR'), verifyDefectObservationHandler);

export default router;

