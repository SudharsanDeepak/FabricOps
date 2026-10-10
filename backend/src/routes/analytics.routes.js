import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRoles } from '../middleware/rbac.middleware.js';
import {
  getAdminDashboard,
  getCustomerDashboard,
  getOperatorDashboard,
  getCurrentUserDashboard,
} from '../controllers/analytics.controller.js';

const router = Router();

// All analytics routes require authentication
router.use(requireAuth);

/**
 * GET /api/v1/analytics/me
 * Unified endpoint: automatically resolves the appropriate dashboard based on user role
 */
router.get('/me', getCurrentUserDashboard);

/**
 * GET /api/v1/analytics/admin
 * Admin-only comprehensive operational telemetry & metrics
 */
router.get('/admin', requireRoles('ADMIN'), getAdminDashboard);

/**
 * GET /api/v1/analytics/customer
 * Scoped customer dashboard metrics
 */
router.get('/customer', requireRoles('CUSTOMER', 'ADMIN'), getCustomerDashboard);

/**
 * GET /api/v1/analytics/operator
 * Factory floor operator dashboard metrics
 */
router.get('/operator', requireRoles('OPERATOR', 'ADMIN'), getOperatorDashboard);

export default router;

