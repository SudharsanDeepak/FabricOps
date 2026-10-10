import { Router } from 'express';
import { requireRoles } from '../middleware/rbac.middleware.js';
import {
  getInventoryHandler,
  getInventoryItemByIdHandler,
  createInventoryItemHandler,
  updateInventoryItemHandler,
  recordGoodsReceiptHandler,
  issueMaterialHandler,
  adjustStockHandler,
  getStockMovementsHandler,
  getShortageSummaryHandler,
} from '../controllers/inventory.controller.js';

const router = Router();

// Shortage summaries & alerts
router.get('/shortages', requireRoles('ADMIN'), getShortageSummaryHandler);

// Immutable stock movements ledger
router.get('/movements', requireRoles('ADMIN'), getStockMovementsHandler);

// List inventory items with stock arithmetic
router.get('/', requireRoles('ADMIN', 'OPERATOR'), getInventoryHandler);

// Single inventory item detail
router.get('/:id', requireRoles('ADMIN', 'OPERATOR'), getInventoryItemByIdHandler);

// Create new inventory item
router.post('/', requireRoles('ADMIN'), createInventoryItemHandler);

// Update inventory item metadata
router.patch('/:id', requireRoles('ADMIN'), updateInventoryItemHandler);

// Record Goods Receipt against PO (atomic transaction)
router.post('/goods-receipt', requireRoles('ADMIN'), recordGoodsReceiptHandler);

// Issue material to production order or job
router.post('/issue-material', requireRoles('ADMIN', 'OPERATOR'), issueMaterialHandler);

// Physical audit stock adjustment
router.post('/adjust-stock', requireRoles('ADMIN'), adjustStockHandler);

export default router;

