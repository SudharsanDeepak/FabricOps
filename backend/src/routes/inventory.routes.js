import { Router } from 'express';
import { requireRoles } from '../middleware/rbac.middleware.js';
import {
  // Inventory
  getInventoryHandler,
  getInventoryItemByIdHandler,
  createInventoryItemHandler,
  updateInventoryItemHandler,
  recordGoodsReceiptHandler,
  issueMaterialHandler,
  adjustStockHandler,
  getStockMovementsHandler,
  getShortageSummaryHandler,
  // Procurement
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
} from '../controllers/inventory.controller.js';

// ==========================================
// 1. INVENTORY ROUTER
// ==========================================
const inventoryRouter = Router();

// Shortage summaries & alerts
inventoryRouter.get('/shortages', requireRoles('ADMIN'), getShortageSummaryHandler);

// Immutable stock movements ledger
inventoryRouter.get('/movements', requireRoles('ADMIN'), getStockMovementsHandler);

// List inventory items with stock arithmetic
inventoryRouter.get('/', requireRoles('ADMIN', 'OPERATOR'), getInventoryHandler);

// Single inventory item detail
inventoryRouter.get('/:id', requireRoles('ADMIN', 'OPERATOR'), getInventoryItemByIdHandler);

// Create new inventory item
inventoryRouter.post('/', requireRoles('ADMIN'), createInventoryItemHandler);

// Update inventory item metadata
inventoryRouter.patch('/:id', requireRoles('ADMIN'), updateInventoryItemHandler);

// Record Goods Receipt against PO (atomic transaction)
inventoryRouter.post('/goods-receipt', requireRoles('ADMIN'), recordGoodsReceiptHandler);

// Issue material to production order or job
inventoryRouter.post('/issue-material', requireRoles('ADMIN', 'OPERATOR'), issueMaterialHandler);

// Physical audit stock adjustment
inventoryRouter.post('/adjust-stock', requireRoles('ADMIN'), adjustStockHandler);

// ==========================================
// 2. PROCUREMENT ROUTER
// ==========================================
export const procurementRouter = Router();

// Overview metrics & supplier delay statistics
procurementRouter.get('/overview', requireRoles('ADMIN'), getProcurementOverviewHandler);

// Suppliers
procurementRouter.get('/suppliers', requireRoles('ADMIN'), getSuppliersHandler);
procurementRouter.post('/suppliers', requireRoles('ADMIN'), createSupplierHandler);

// Purchase Requests for shortages
procurementRouter.get('/requests', requireRoles('ADMIN'), getPurchaseRequestsHandler);
procurementRouter.post('/requests', requireRoles('ADMIN'), createPurchaseRequestHandler);
procurementRouter.patch('/requests/:id/approve', requireRoles('ADMIN'), approvePurchaseRequestHandler);
procurementRouter.patch('/requests/:id/reject', requireRoles('ADMIN'), rejectPurchaseRequestHandler);

// Purchase Orders
procurementRouter.get('/orders', requireRoles('ADMIN'), getPurchaseOrdersHandler);
procurementRouter.post('/orders', requireRoles('ADMIN'), createPurchaseOrderHandler);
procurementRouter.get('/orders/:id', requireRoles('ADMIN'), getPurchaseOrderByIdHandler);
procurementRouter.patch('/orders/:id/cancel', requireRoles('ADMIN'), cancelPurchaseOrderHandler);

export default inventoryRouter;
