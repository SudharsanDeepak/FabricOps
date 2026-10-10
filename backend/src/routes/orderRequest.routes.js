import { Router } from 'express';
import {
  createOrderRequest,
  getOrderRequests,
  getOrderRequestById,
  updateOrderRequestStatus,
} from '../controllers/orderRequest.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRoles, enforceCustomerScope } from '../middleware/rbac.middleware.js';

const router = Router();

// Protect all inquiry routes
router.use(requireAuth);

// Customers can create inquiries
router.post('/', requireRoles('CUSTOMER'), createOrderRequest);

// List inquiries (Customers see own, Admins see all)
router.get('/', enforceCustomerScope, getOrderRequests);

// Get single inquiry
router.get('/:id', enforceCustomerScope, getOrderRequestById);

// Admin can update inquiry status
router.patch('/:id/status', requireRoles('ADMIN'), updateOrderRequestStatus);

export default router;

