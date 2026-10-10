import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { authenticateToken, requireAuth } from '../middleware/auth.middleware.js';
import { requireRoles } from '../middleware/rbac.middleware.js';
import { validateRequest } from '../middleware/validate.middleware.js';
import { authRateLimiter } from '../middleware/rateLimiter.middleware.js';
import {
  loginSchema,
  customerRegisterSchema,
  createStaffUserSchema,
  updateCustomerProfileSchema,
} from '../validators/auth.validator.js';

const router = Router();

// Public Authentication endpoints
router.post('/login', authRateLimiter, validateRequest(loginSchema), authController.login);
router.post(
  '/register-customer',
  authRateLimiter,
  validateRequest(customerRegisterSchema),
  authController.registerCustomer
);
router.post('/logout', authenticateToken, authController.logout);

// Authenticated session validation
router.get('/me', authenticateToken, requireAuth, authController.getMe);

// Customer Profile updates (Customer or Admin)
router.patch(
  '/customer-profile',
  authenticateToken,
  requireAuth,
  requireRoles('CUSTOMER', 'ADMIN'),
  validateRequest(updateCustomerProfileSchema),
  authController.updateCustomerProfile
);

// Admin-Only Staff & User Management
router.post(
  '/staff',
  authenticateToken,
  requireAuth,
  requireRoles('ADMIN'),
  validateRequest(createStaffUserSchema),
  authController.createStaffUser
);

router.get(
  '/users',
  authenticateToken,
  requireAuth,
  requireRoles('ADMIN'),
  authController.listUsers
);

router.patch(
  '/operators/:operatorUserId/assignments',
  authenticateToken,
  requireAuth,
  requireRoles('ADMIN'),
  authController.updateOperatorAssignments
);

export default router;
