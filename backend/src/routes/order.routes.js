import { Router } from 'express';
import {
  // Orders
  confirmOrderHandler,
  getOrdersHandler,
  getOrderByIdHandler,
  getAuthorizedOrderDocument,
  getOrderTimelineHandler,
  updateTimelineStageHandler,
  recalculateOrderEstimatesHandler,
  // Order Requests / Inquiries
  createOrderRequest,
  getOrderRequests,
  getOrderRequestById,
  updateOrderRequestStatus,
  // Messages
  getThreadMessages,
  postThreadMessage,
} from '../controllers/order.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRoles, enforceCustomerScope } from '../middleware/rbac.middleware.js';

// ==========================================
// 1. ORDERS ROUTER
// ==========================================
const ordersRouter = Router();
ordersRouter.use(requireAuth);

// Confirm order with multi-document ACID transaction and idempotency controls
ordersRouter.post('/confirm', requireRoles('CUSTOMER', 'ADMIN'), confirmOrderHandler);

// List orders (Customer scoped or Admin factory-wide)
ordersRouter.get('/', enforceCustomerScope, getOrdersHandler);

// Authorized document access for confirmed order
ordersRouter.get('/:id/document', enforceCustomerScope, getAuthorizedOrderDocument);

// Get single order with live production status
ordersRouter.get('/:id', enforceCustomerScope, getOrderByIdHandler);

// End-to-end production timeline with milestone progress and privacy scrubbing
ordersRouter.get('/:id/timeline', enforceCustomerScope, getOrderTimelineHandler);

// Update milestone stage status (Admin and Floor Operators)
ordersRouter.patch('/:id/timeline/stage', requireRoles('ADMIN', 'OPERATOR'), updateTimelineStageHandler);

// Dynamically recalculate estimated completion dates (Admin)
ordersRouter.post('/:id/timeline/recalculate', requireRoles('ADMIN'), recalculateOrderEstimatesHandler);

// ==========================================
// 2. ORDER REQUESTS ROUTER
// ==========================================
export const orderRequestsRouter = Router();
orderRequestsRouter.use(requireAuth);

// Customers can create inquiries
orderRequestsRouter.post('/', requireRoles('CUSTOMER'), createOrderRequest);

// List inquiries (Customers see own, Admins see all)
orderRequestsRouter.get('/', enforceCustomerScope, getOrderRequests);

// Get single inquiry
orderRequestsRouter.get('/:id', enforceCustomerScope, getOrderRequestById);

// Admin can update inquiry status
orderRequestsRouter.patch('/:id/status', requireRoles('ADMIN'), updateOrderRequestStatus);

// ==========================================
// 3. MESSAGES ROUTER
// ==========================================
export const messagesRouter = Router();
messagesRouter.use(requireAuth);

messagesRouter.get('/:threadType/:referenceId', getThreadMessages);
messagesRouter.post('/:threadType/:referenceId', postThreadMessage);

export default ordersRouter;
