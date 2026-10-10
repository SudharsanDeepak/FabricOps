import { Router } from 'express';
import { requireRoles } from '../middleware/rbac.middleware.js';
import {
  addToFinishedGoodsHandler,
  getFinishedGoodsHandler,
  reserveRollsHandler,
  releaseRollsHandler,
  createDispatchHandler,
  getDispatchesHandler,
  getDispatchByIdHandler,
  updateDeliveryStatusHandler,
  getInvoicesHandler,
  getInvoiceByIdHandler,
  recordCustomerPaymentHandler,
  getDispatchDashboardMetricsHandler,
} from '../controllers/dispatch.controller.js';

const router = Router();

// Executive Dashboard Metrics
router.get('/metrics', requireRoles('ADMIN'), getDispatchDashboardMetricsHandler);

// Finished Goods Inventory Management
router.get('/finished-goods', requireRoles('ADMIN', 'OPERATOR'), getFinishedGoodsHandler);
router.post('/finished-goods', requireRoles('ADMIN', 'OPERATOR'), addToFinishedGoodsHandler);
router.post('/reserve-rolls', requireRoles('ADMIN'), reserveRollsHandler);
router.post('/release-rolls', requireRoles('ADMIN'), releaseRollsHandler);

// Invoicing & Payment endpoints (Must be declared before /:id parameterized routes)
router.get('/invoices', requireRoles('ADMIN', 'CUSTOMER'), getInvoicesHandler);
router.get('/invoices/:id', requireRoles('ADMIN', 'CUSTOMER'), getInvoiceByIdHandler);
router.post('/invoices/:id/payments', requireRoles('ADMIN', 'CUSTOMER'), recordCustomerPaymentHandler);

// Dispatch Management & Tracking
router.get('/', requireRoles('ADMIN', 'CUSTOMER'), getDispatchesHandler);
router.post('/', requireRoles('ADMIN'), createDispatchHandler);
router.get('/:id', requireRoles('ADMIN', 'CUSTOMER'), getDispatchByIdHandler);
router.patch('/:id/status', requireRoles('ADMIN', 'OPERATOR'), updateDeliveryStatusHandler);

export default router;

