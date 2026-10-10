import { Router } from 'express';
import {
  confirmOrderHandler,
  getOrdersHandler,
  getOrderByIdHandler,
  getAuthorizedOrderDocument,
  getOrderTimelineHandler,
  updateTimelineStageHandler,
  recalculateOrderEstimatesHandler,
} from '../controllers/order.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRoles, enforceCustomerScope } from '../middleware/rbac.middleware.js';

const router = Router();

router.use(requireAuth);

// Confirm order with multi-document ACID transaction and idempotency controls
router.post('/confirm', requireRoles('CUSTOMER', 'ADMIN'), confirmOrderHandler);

// List orders (Customer scoped or Admin factory-wide)
router.get('/', enforceCustomerScope, getOrdersHandler);

// Authorized document access for confirmed order
router.get('/:id/document', enforceCustomerScope, getAuthorizedOrderDocument);

// Get single order with live production status
router.get('/:id', enforceCustomerScope, getOrderByIdHandler);

// End-to-end production timeline with milestone progress and privacy scrubbing
router.get('/:id/timeline', enforceCustomerScope, getOrderTimelineHandler);

// Update milestone stage status (Admin and Floor Operators)
router.patch('/:id/timeline/stage', requireRoles('ADMIN', 'OPERATOR'), updateTimelineStageHandler);

// Dynamically recalculate estimated completion dates (Admin)
router.post('/:id/timeline/recalculate', requireRoles('ADMIN'), recalculateOrderEstimatesHandler);

export default router;

