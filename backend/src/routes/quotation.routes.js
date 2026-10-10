import { Router } from 'express';
import {
  getFeasibilityCheck,
  createQuotationHandler,
  getQuotationsHandler,
  getQuotationByIdHandler,
  reviseQuotationHandler,
  customerDecisionHandler,
} from '../controllers/quotation.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRoles, enforceCustomerScope } from '../middleware/rbac.middleware.js';

const router = Router();

router.use(requireAuth);

// Feasibility check endpoint for validating yarn stock, loom compatibility, and timelines
router.get('/feasibility', requireRoles('ADMIN'), getFeasibilityCheck);

// Admin issues initial quotation
router.post('/', requireRoles('ADMIN'), createQuotationHandler);

// List quotations (Customer scoped or Admin factory-wide)
router.get('/', enforceCustomerScope, getQuotationsHandler);

// Get single quotation by ID
router.get('/:id', enforceCustomerScope, getQuotationByIdHandler);

// Admin issues a revision
router.post('/:id/revise', requireRoles('ADMIN'), reviseQuotationHandler);

// Customer submits decision (accept / reject / counter-offer)
router.post('/:id/decision', requireRoles('CUSTOMER'), customerDecisionHandler);

export default router;

