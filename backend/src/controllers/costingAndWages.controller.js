import {
  getAttendanceRecords,
  recordAttendance,
  approveOvertime,
  correctAttendance,
  calculateWageStatement,
  adjustWageStatement,
  approveWageStatement,
  disburseWagePayment,
  getWageStatements,
  getWageStatementById,
  recordCostEntry,
  allocateManufacturingOverhead,
  getOrderCostAnalysis,
  recordSupplierInvoice,
  recordSupplierPayment,
  getSupplierInvoices,
  getExecutiveFinancialReport,
  getThreeWayReconciliation,
  getMachineUtilizationAndCostReport,
} from '../services/costingAndWages.service.js';

// =============================================================================
// ATTENDANCE & SHIFTS
// =============================================================================

export async function getAttendanceHandler(req, res, next) {
  try {
    const { startDate, endDate, operatorId, status } = req.query;
    const records = await getAttendanceRecords({
      startDate,
      endDate,
      operatorId,
      status,
      reqUser: req.user,
    });
    res.json({ success: true, count: records.length, data: records });
  } catch (error) {
    next(error);
  }
}

export async function recordAttendanceHandler(req, res, next) {
  try {
    const record = await recordAttendance({
      ...req.body,
      actorUser: req.user,
    });
    res.status(201).json({
      success: true,
      message: 'Attendance recorded successfully',
      data: record,
    });
  } catch (error) {
    next(error);
  }
}

export async function approveOvertimeHandler(req, res, next) {
  try {
    const { attendanceId } = req.params;
    const { approvedOvertimeHours, notes } = req.body;
    const record = await approveOvertime({
      attendanceId,
      approvedOvertimeHours,
      actorUser: req.user,
      notes,
    });
    res.json({
      success: true,
      message: 'Overtime hours successfully approved',
      data: record,
    });
  } catch (error) {
    next(error);
  }
}

export async function correctAttendanceHandler(req, res, next) {
  try {
    const { attendanceId } = req.params;
    const { correctedHoursWorked, correctedOvertimeHours, reason } = req.body;
    const record = await correctAttendance({
      attendanceId,
      correctedHoursWorked,
      correctedOvertimeHours,
      reason,
      actorUser: req.user,
    });
    res.json({
      success: true,
      message: 'Attendance corrected with audit trail',
      data: record,
    });
  } catch (error) {
    next(error);
  }
}

// =============================================================================
// WAGES & PAYROLL
// =============================================================================

export async function calculateWageStatementHandler(req, res, next) {
  try {
    const statement = await calculateWageStatement({
      ...req.body,
      actorUser: req.user,
    });
    res.status(201).json({
      success: true,
      message: 'Wage statement calculated successfully',
      data: statement,
    });
  } catch (error) {
    next(error);
  }
}

export async function adjustWageStatementHandler(req, res, next) {
  try {
    const { id } = req.params;
    const { adjustmentAmount, reason } = req.body;
    const statement = await adjustWageStatement({
      statementId: id,
      adjustmentAmount,
      reason,
      actorUser: req.user,
    });
    res.json({
      success: true,
      message: 'Wage statement adjusted successfully',
      data: statement,
    });
  } catch (error) {
    next(error);
  }
}

export async function approveWageStatementHandler(req, res, next) {
  try {
    const { id } = req.params;
    const { approvalNotes } = req.body;
    const statement = await approveWageStatement({
      statementId: id,
      actorUser: req.user,
      approvalNotes,
    });
    res.json({
      success: true,
      message: 'Wage statement approved for payment',
      data: statement,
    });
  } catch (error) {
    next(error);
  }
}

export async function disburseWagePaymentHandler(req, res, next) {
  try {
    const { id } = req.params;
    const result = await disburseWagePayment({
      statementId: id,
      ...req.body,
      actorUser: req.user,
    });
    res.status(201).json({
      success: true,
      message: 'Wage disbursement payment recorded successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getWageStatementsHandler(req, res, next) {
  try {
    const { operatorId, status } = req.query;
    const statements = await getWageStatements({
      operatorId,
      status,
      reqUser: req.user,
    });
    res.json({ success: true, count: statements.length, data: statements });
  } catch (error) {
    next(error);
  }
}

export async function getWageStatementByIdHandler(req, res, next) {
  try {
    const { id } = req.params;
    const statement = await getWageStatementById(id, req.user);
    res.json({ success: true, data: statement });
  } catch (error) {
    next(error);
  }
}

// =============================================================================
// MANUFACTURING COSTS
// =============================================================================

export async function recordCostEntryHandler(req, res, next) {
  try {
    const costEntry = await recordCostEntry({
      ...req.body,
      actorUser: req.user,
    });
    res.status(201).json({
      success: true,
      message: 'Manufacturing cost entry recorded successfully',
      data: costEntry,
    });
  } catch (error) {
    next(error);
  }
}

export async function allocateOverheadHandler(req, res, next) {
  try {
    const { orderId } = req.params;
    const { overheadRatePerMeter, method } = req.body;
    const entry = await allocateManufacturingOverhead({
      orderId,
      overheadRatePerMeter,
      method,
      actorUser: req.user,
    });
    res.json({
      success: true,
      message: 'Factory overhead allocated successfully',
      data: entry,
    });
  } catch (error) {
    next(error);
  }
}

export async function getOrderCostAnalysisHandler(req, res, next) {
  try {
    const { orderId } = req.params;
    const analysis = await getOrderCostAnalysis(orderId);
    res.json({ success: true, data: analysis });
  } catch (error) {
    next(error);
  }
}

// =============================================================================
// SUPPLIER INVOICES & PAYMENTS
// =============================================================================

export async function recordSupplierInvoiceHandler(req, res, next) {
  try {
    const invoice = await recordSupplierInvoice({
      ...req.body,
      actorUser: req.user,
    });
    res.status(201).json({
      success: true,
      message: 'Supplier invoice recorded successfully',
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
}

export async function recordSupplierPaymentHandler(req, res, next) {
  try {
    const { id } = req.params;
    const invoice = await recordSupplierPayment({
      supplierInvoiceId: id,
      ...req.body,
      actorUser: req.user,
    });
    res.json({
      success: true,
      message: 'Supplier payment recorded successfully',
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
}

export async function getSupplierInvoicesHandler(req, res, next) {
  try {
    const { supplierId, paymentStatus } = req.query;
    const invoices = await getSupplierInvoices({ supplierId, paymentStatus });
    res.json({ success: true, count: invoices.length, data: invoices });
  } catch (error) {
    next(error);
  }
}

// =============================================================================
// FINANCIAL REPORTING & RECONCILIATION
// =============================================================================

export async function getExecutiveFinancialReportHandler(req, res, next) {
  try {
    const report = await getExecutiveFinancialReport();
    res.json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
}

export async function getThreeWayReconciliationHandler(req, res, next) {
  try {
    const matrix = await getThreeWayReconciliation();
    res.json({ success: true, data: matrix });
  } catch (error) {
    next(error);
  }
}

export async function getMachineUtilizationAndCostReportHandler(req, res, next) {
  try {
    const report = await getMachineUtilizationAndCostReport();
    res.json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
}

