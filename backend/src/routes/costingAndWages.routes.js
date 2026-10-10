import { Router } from 'express';
import { requireRoles } from '../middleware/rbac.middleware.js';
import {
  getAttendanceHandler,
  recordAttendanceHandler,
  approveOvertimeHandler,
  correctAttendanceHandler,
  calculateWageStatementHandler,
  adjustWageStatementHandler,
  approveWageStatementHandler,
  disburseWagePaymentHandler,
  getWageStatementsHandler,
  getWageStatementByIdHandler,
  recordCostEntryHandler,
  allocateOverheadHandler,
  getOrderCostAnalysisHandler,
  recordSupplierInvoiceHandler,
  recordSupplierPaymentHandler,
  getSupplierInvoicesHandler,
  getExecutiveFinancialReportHandler,
  getThreeWayReconciliationHandler,
  getMachineUtilizationAndCostReportHandler,
} from '../controllers/costingAndWages.controller.js';

const router = Router();

// =============================================================================
// ATTENDANCE & SHIFTS
// =============================================================================
export const attendanceRouter = Router();
attendanceRouter.get('/', requireRoles('ADMIN', 'OPERATOR'), getAttendanceHandler);
attendanceRouter.post('/', requireRoles('ADMIN'), recordAttendanceHandler);
attendanceRouter.patch('/:attendanceId/overtime', requireRoles('ADMIN'), approveOvertimeHandler);
attendanceRouter.patch('/:attendanceId/correct', requireRoles('ADMIN'), correctAttendanceHandler);

// =============================================================================
// WAGES & PAYROLL
// =============================================================================
export const wageRouter = Router();
wageRouter.get('/', requireRoles('ADMIN', 'OPERATOR'), getWageStatementsHandler);
wageRouter.post('/calculate', requireRoles('ADMIN'), calculateWageStatementHandler);
wageRouter.get('/:id', requireRoles('ADMIN', 'OPERATOR'), getWageStatementByIdHandler);
wageRouter.patch('/:id/adjust', requireRoles('ADMIN'), adjustWageStatementHandler);
wageRouter.patch('/:id/approve', requireRoles('ADMIN'), approveWageStatementHandler);
wageRouter.post('/:id/disburse', requireRoles('ADMIN'), disburseWagePaymentHandler);

// =============================================================================
// MANUFACTURING COSTS
// =============================================================================
export const costRouter = Router();
costRouter.post('/', requireRoles('ADMIN'), recordCostEntryHandler);
costRouter.post('/orders/:orderId/overhead', requireRoles('ADMIN'), allocateOverheadHandler);
costRouter.get('/orders/:orderId', requireRoles('ADMIN'), getOrderCostAnalysisHandler);

// =============================================================================
// SUPPLIER INVOICES
// =============================================================================
export const supplierInvoiceRouter = Router();
supplierInvoiceRouter.get('/', requireRoles('ADMIN'), getSupplierInvoicesHandler);
supplierInvoiceRouter.post('/', requireRoles('ADMIN'), recordSupplierInvoiceHandler);
supplierInvoiceRouter.post('/:id/payments', requireRoles('ADMIN'), recordSupplierPaymentHandler);

// =============================================================================
// FINANCIAL REPORTING & RECONCILIATION
// =============================================================================
export const financialReportsRouter = Router();
financialReportsRouter.get('/executive', requireRoles('ADMIN'), getExecutiveFinancialReportHandler);
financialReportsRouter.get('/reconciliation', requireRoles('ADMIN'), getThreeWayReconciliationHandler);
financialReportsRouter.get('/machines', requireRoles('ADMIN'), getMachineUtilizationAndCostReportHandler);

export default {
  attendanceRouter,
  wageRouter,
  costRouter,
  supplierInvoiceRouter,
  financialReportsRouter,
};

