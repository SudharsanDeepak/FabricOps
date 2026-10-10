import { Router } from 'express';
import { requireRoles } from '../middleware/rbac.middleware.js';
import {
  createPurchaseRequestHandler,
  getPurchaseRequestsHandler,
  approvePurchaseRequestHandler,
  rejectPurchaseRequestHandler,
  createPurchaseOrderHandler,
  getPurchaseOrdersHandler,
  getPurchaseOrderByIdHandler,
  cancelPurchaseOrderHandler,
  getSuppliersHandler,
  createSupplierHandler,
  getProcurementOverviewHandler,
} from '../controllers/procurement.controller.js';

const router = Router();

// Overview metrics & supplier delay statistics
router.get('/overview', requireRoles('ADMIN'), getProcurementOverviewHandler);

// Suppliers
router.get('/suppliers', requireRoles('ADMIN'), getSuppliersHandler);
router.post('/suppliers', requireRoles('ADMIN'), createSupplierHandler);

// Purchase Requests for shortages
router.get('/requests', requireRoles('ADMIN'), getPurchaseRequestsHandler);
router.post('/requests', requireRoles('ADMIN'), createPurchaseRequestHandler);
router.patch('/requests/:id/approve', requireRoles('ADMIN'), approvePurchaseRequestHandler);
router.patch('/requests/:id/reject', requireRoles('ADMIN'), rejectPurchaseRequestHandler);

// Purchase Orders
router.get('/orders', requireRoles('ADMIN'), getPurchaseOrdersHandler);
router.post('/orders', requireRoles('ADMIN'), createPurchaseOrderHandler);
router.get('/orders/:id', requireRoles('ADMIN'), getPurchaseOrderByIdHandler);
router.patch('/orders/:id/cancel', requireRoles('ADMIN'), cancelPurchaseOrderHandler);

export default router;

