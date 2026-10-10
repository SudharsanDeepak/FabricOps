import mongoose from 'mongoose';
import {
  Attendance,
  WageStatement,
  WagePayment,
  CostEntry,
  ManufacturingCost,
  SupplierInvoice,
  Order,
  Machine,
  OperatorProfile,
  User,
  BreakdownReport,
  Invoice,
  CustomerPayment,
  PurchaseOrder,
  GoodsReceipt,
  AuditLog,
} from '../models/index.js';
import { logger } from '../config/logger.js';

// =============================================================================
// 1. ATTENDANCE & SHIFT MANAGEMENT
// =============================================================================

/**
 * List attendance records with optional filtering.
 */
export async function getAttendanceRecords({
  startDate,
  endDate,
  operatorId,
  status,
  reqUser,
}) {
  const query = {};

  // Operator RBAC: operators can only view their own records
  if (reqUser && reqUser.role === 'OPERATOR') {
    query.operatorId = reqUser._id;
  } else if (operatorId) {
    query.operatorId = operatorId;
  }

  if (startDate || endDate) {
    query.date = {};
    if (startDate) {
      const s = new Date(startDate);
      s.setUTCHours(0, 0, 0, 0);
      query.date.$gte = s;
    }
    if (endDate) {
      const e = new Date(endDate);
      e.setUTCHours(23, 59, 59, 999);
      query.date.$lte = e;
    }
  }

  if (status && status !== 'ALL') {
    query.status = status;
  }

  return Attendance.find(query)
    .populate('operatorId', 'name email employeeCode phone')
    .populate('shiftId', 'shiftCode name startTime endTime durationHours')
    .populate('verifiedBy', 'name')
    .populate('overtimeApprovedBy', 'name')
    .populate('corrections.correctedBy', 'name')
    .sort({ date: -1 })
    .lean();
}

/**
 * Record or update attendance for an operator.
 */
export async function recordAttendance({
  operatorId,
  date,
  shiftId,
  checkInTime,
  checkOutTime,
  hoursWorked,
  overtimeHours,
  status = 'PRESENT',
  remarks,
  actorUser,
}) {
  const normDate = new Date(date || Date.now());
  normDate.setUTCHours(0, 0, 0, 0);

  let calculatedHours = Number(hoursWorked) || 0;
  let calculatedOT = Number(overtimeHours) || 0;

  if (checkInTime && checkOutTime && (!hoursWorked || hoursWorked === 0)) {
    const diffMs = new Date(checkOutTime).getTime() - new Date(checkInTime).getTime();
    calculatedHours = Math.max(0.1, Number((diffMs / (1000 * 60 * 60)).toFixed(2)));
    calculatedOT = calculatedHours > 8 ? Number((calculatedHours - 8).toFixed(2)) : 0;
  }

  const existing = await Attendance.findOne({ operatorId, date: normDate });
  if (existing) {
    existing.shiftId = shiftId || existing.shiftId;
    if (checkInTime) existing.checkInTime = new Date(checkInTime);
    if (checkOutTime) existing.checkOutTime = new Date(checkOutTime);
    existing.hoursWorked = calculatedHours || existing.hoursWorked;
    existing.overtimeHours = calculatedOT !== undefined ? calculatedOT : existing.overtimeHours;
    existing.status = status;
    if (remarks) existing.remarks = remarks;
    existing.verifiedBy = actorUser._id;
    await existing.save();
    return existing;
  }

  return Attendance.create({
    operatorId,
    date: normDate,
    shiftId,
    checkInTime: checkInTime ? new Date(checkInTime) : undefined,
    checkOutTime: checkOutTime ? new Date(checkOutTime) : undefined,
    hoursWorked: calculatedHours,
    overtimeHours: calculatedOT,
    status,
    remarks,
    verifiedBy: actorUser._id,
  });
}

/**
 * Approve overtime hours on an attendance record.
 */
export async function approveOvertime({
  attendanceId,
  approvedOvertimeHours,
  actorUser,
  notes,
}) {
  const record = await Attendance.findById(attendanceId);
  if (!record) {
    const err = new Error('Attendance record not found');
    err.statusCode = 404;
    throw err;
  }

  const hoursToApprove = Number(approvedOvertimeHours);
  if (isNaN(hoursToApprove) || hoursToApprove < 0) {
    const err = new Error('Approved overtime hours must be a non-negative number');
    err.statusCode = 400;
    throw err;
  }

  record.approvedOvertimeHours = hoursToApprove;
  record.overtimeApprovedBy = actorUser._id;
  record.overtimeStatus = hoursToApprove > 0 ? 'APPROVED' : 'NONE';
  if (notes) {
    record.remarks = record.remarks ? `${record.remarks} | OT Approved: ${notes}` : `OT Approved: ${notes}`;
  }

  await record.save();

  await AuditLog.create({
    actorId: actorUser._id,
    actorRole: actorUser.role || 'ADMIN',
    action: 'ATTENDANCE_OVERTIME_APPROVED',
    entityType: 'Attendance',
    entityId: record._id,
    notes: notes || `Approved ${hoursToApprove} overtime hours`,
  });

  return record;
}

/**
 * Authorized attendance correction with audit history preservation.
 */
export async function correctAttendance({
  attendanceId,
  correctedHoursWorked,
  correctedOvertimeHours,
  reason,
  actorUser,
}) {
  if (!reason || !reason.trim()) {
    const err = new Error('Reason for attendance correction is required');
    err.statusCode = 400;
    throw err;
  }

  const record = await Attendance.findById(attendanceId);
  if (!record) {
    const err = new Error('Attendance record not found');
    err.statusCode = 404;
    throw err;
  }

  const origHours = record.hoursWorked;
  const origOT = record.overtimeHours;
  const newHours = Number(correctedHoursWorked);
  const newOT = correctedOvertimeHours !== undefined ? Number(correctedOvertimeHours) : (newHours > 8 ? Number((newHours - 8).toFixed(2)) : 0);

  if (isNaN(newHours) || newHours < 0) {
    const err = new Error('Corrected hours worked must be a non-negative number');
    err.statusCode = 400;
    throw err;
  }

  // Preserve correction history snapshot
  record.corrections.push({
    originalHoursWorked: origHours,
    correctedHoursWorked: newHours,
    originalOvertimeHours: origOT,
    correctedOvertimeHours: newOT,
    reason: reason.trim(),
    correctedBy: actorUser._id,
    correctedAt: new Date(),
  });

  record.hoursWorked = newHours;
  record.overtimeHours = newOT;
  // If previously approved overtime exceeded new OT, cap it
  if (record.approvedOvertimeHours > newOT) {
    record.approvedOvertimeHours = newOT;
  }

  await record.save();

  await AuditLog.create({
    actorId: actorUser._id,
    actorRole: actorUser.role || 'ADMIN',
    action: 'ATTENDANCE_CORRECTED',
    entityType: 'Attendance',
    entityId: record._id,
    notes: reason.trim(),
  });

  return record;
}

// =============================================================================
// 2. WAGE CALCULATIONS & STATEMENTS
// =============================================================================

/**
 * Calculate wages using configurable wage rules, verified attendance, and hours.
 * Formula:
 * - Regular Wage = regularHoursWorked * baseHourlyRate
 * - Overtime Wage = approvedOvertimeHours * (baseHourlyRate * overtimeMultiplier)
 * - Gross Wage = Regular Wage + Overtime Wage + Shift Allowance + Production Incentive
 * - Net Payable Wage = Math.max(0, Gross Wage - Deductions)
 */
export async function calculateWageStatement({
  operatorId,
  periodStartDate,
  periodEndDate,
  overtimeMultiplier = 1.5,
  shiftAllowance = 0,
  productionIncentiveBonus = 0,
  deductions = 0,
  hourlyRateOverride,
  actorUser,
}) {
  const operator = await User.findById(operatorId);
  if (!operator || operator.role !== 'OPERATOR') {
    const err = new Error('Operator user not found or invalid role');
    err.statusCode = 404;
    throw err;
  }

  const profile = await OperatorProfile.findOne({ userId: operatorId }).lean();
  const baseHourlyRate = hourlyRateOverride !== undefined && hourlyRateOverride > 0
    ? Number(hourlyRateOverride)
    : (profile?.hourlyWageRate || 150.0);

  const start = new Date(periodStartDate);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(periodEndDate);
  end.setUTCHours(23, 59, 59, 999);

  if (start > end) {
    const err = new Error('Period start date must be before or equal to period end date');
    err.statusCode = 400;
    throw err;
  }

  // Prevent duplicate calculation statements for same operator and period
  const existing = await WageStatement.findOne({
    operatorId,
    periodStartDate: start,
    periodEndDate: end,
  });

  if (existing && existing.status !== 'DRAFT') {
    const err = new Error(
      `Wage statement for this period already exists (${existing.statementNumber}) with status ${existing.status}`
    );
    err.statusCode = 400;
    throw err;
  }

  // Query verified attendance records in period
  const attendanceRecords = await Attendance.find({
    operatorId,
    date: { $gte: start, $lte: end },
    status: { $in: ['PRESENT', 'HALF_DAY'] },
  });

  let totalRegularHours = 0;
  let totalApprovedOTHours = 0;
  const attendanceIds = [];

  for (const att of attendanceRecords) {
    attendanceIds.push(att._id);
    const ot = att.approvedOvertimeHours || 0;
    const reg = Math.max(0, (att.hoursWorked || 0) - (att.overtimeHours || 0));
    totalRegularHours += reg;
    totalApprovedOTHours += ot;
  }

  totalRegularHours = Number(totalRegularHours.toFixed(2));
  totalApprovedOTHours = Number(totalApprovedOTHours.toFixed(2));

  // Compute wage components
  const regularWage = Number((totalRegularHours * baseHourlyRate).toFixed(2));
  const otMultiplier = Number(overtimeMultiplier) || 1.5;
  const overtimeWage = Number((totalApprovedOTHours * (baseHourlyRate * otMultiplier)).toFixed(2));
  const shiftAllow = Number(shiftAllowance) || 0;
  const incentive = Number(productionIncentiveBonus) || 0;
  const grossWage = Number((regularWage + overtimeWage + shiftAllow + incentive).toFixed(2));
  const totalDeductions = Number(deductions) || 0;
  const netPayableWage = Math.max(0, Number((grossWage - totalDeductions).toFixed(2)));

  const statementNumber = `WST-${start.getUTCFullYear()}-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

  const calculationSnapshot = {
    hourlyRate: baseHourlyRate,
    overtimeMultiplier: otMultiplier,
    regularHours: totalRegularHours,
    overtimeHours: totalApprovedOTHours,
    shiftAllowance: shiftAllow,
    incentiveBonus: incentive,
    deductions: totalDeductions,
    rulesApplied: `Configured Mill Wage Policy: Base Rate $${baseHourlyRate}/hr, Overtime Multiplier ${otMultiplier}x, Standard Floor $0`,
    capturedAt: new Date(),
  };

  let statement;
  if (existing && existing.status === 'DRAFT') {
    existing.attendanceRecordIds = attendanceIds;
    existing.verifiedDaysWorked = attendanceRecords.length;
    existing.regularHoursWorked = totalRegularHours;
    existing.approvedOvertimeHours = totalApprovedOTHours;
    existing.baseHourlyRate = baseHourlyRate;
    existing.overtimeMultiplier = otMultiplier;
    existing.regularWage = regularWage;
    existing.overtimeWage = overtimeWage;
    existing.shiftAllowance = shiftAllow;
    existing.productionIncentiveBonus = incentive;
    existing.grossWage = grossWage;
    existing.deductions = totalDeductions;
    existing.netPayableWage = netPayableWage;
    existing.calculationInputsSnapshot = calculationSnapshot;
    statement = await existing.save();
  } else {
    statement = await WageStatement.create({
      statementNumber,
      operatorId,
      periodStartDate: start,
      periodEndDate: end,
      attendanceRecordIds: attendanceIds,
      verifiedDaysWorked: attendanceRecords.length,
      regularHoursWorked: totalRegularHours,
      approvedOvertimeHours: totalApprovedOTHours,
      baseHourlyRate,
      overtimeMultiplier: otMultiplier,
      regularWage,
      overtimeWage,
      shiftAllowance: shiftAllow,
      productionIncentiveBonus: incentive,
      grossWage,
      deductions: totalDeductions,
      netPayableWage,
      status: 'DRAFT',
      calculationInputsSnapshot: calculationSnapshot,
    });
  }

  // Link attendance records to this wage statement
  await Attendance.updateMany(
    { _id: { $in: attendanceIds } },
    { $set: { wageStatementId: statement._id } }
  );

  return statement;
}

/**
 * Add authorized adjustment to a wage statement.
 */
export async function adjustWageStatement({
  statementId,
  adjustmentAmount,
  reason,
  actorUser,
}) {
  if (!reason || !reason.trim()) {
    const err = new Error('Reason for wage adjustment is required');
    err.statusCode = 400;
    throw err;
  }

  const statement = await WageStatement.findById(statementId);
  if (!statement) {
    const err = new Error('Wage statement not found');
    err.statusCode = 404;
    throw err;
  }

  if (statement.status === 'PAID') {
    const err = new Error('Cannot adjust a wage statement that has already been paid');
    err.statusCode = 400;
    throw err;
  }

  const adj = Number(adjustmentAmount);
  if (isNaN(adj) || adj === 0) {
    const err = new Error('Adjustment amount must be a non-zero number');
    err.statusCode = 400;
    throw err;
  }

  statement.adjustments.push({
    adjustmentAmount: adj,
    reason: reason.trim(),
    authorizedBy: actorUser._id,
    adjustedAt: new Date(),
  });

  const totalAdj = statement.adjustments.reduce((acc, a) => acc + (a.adjustmentAmount || 0), 0);
  statement.totalAdjustmentAmount = Number(totalAdj.toFixed(2));
  statement.netPayableWage = Math.max(
    0,
    Number((statement.grossWage + statement.totalAdjustmentAmount - statement.deductions).toFixed(2))
  );

  await statement.save();

  await AuditLog.create({
    actorId: actorUser._id,
    actorRole: actorUser.role || 'ADMIN',
    action: 'WAGE_STATEMENT_ADJUSTED',
    entityType: 'WageStatement',
    entityId: statement._id,
    notes: reason.trim(),
  });

  return statement;
}

/**
 * Approve a wage statement for disbursement.
 */
export async function approveWageStatement({ statementId, actorUser, approvalNotes }) {
  const statement = await WageStatement.findById(statementId);
  if (!statement) {
    const err = new Error('Wage statement not found');
    err.statusCode = 404;
    throw err;
  }

  if (statement.status === 'PAID') {
    const err = new Error('Wage statement has already been paid');
    err.statusCode = 400;
    throw err;
  }

  statement.status = 'APPROVED';
  statement.approvedBy = actorUser._id;
  statement.approvedAt = new Date();
  if (approvalNotes) statement.approvalNotes = approvalNotes;

  await statement.save();

  await AuditLog.create({
    actorId: actorUser._id,
    actorRole: actorUser.role || 'ADMIN',
    action: 'WAGE_STATEMENT_APPROVED',
    entityType: 'WageStatement',
    entityId: statement._id,
    notes: approvalNotes || 'Wage statement approved for payment',
  });

  return statement;
}

/**
 * Disburse and record wage payment against an approved wage statement.
 */
export async function disburseWagePayment({
  statementId,
  paymentAmount,
  paymentMethod = 'BANK_TRANSFER',
  paymentReference,
  bankAccountNumber,
  bankIfsc,
  notes,
  actorUser,
}) {
  const statement = await WageStatement.findById(statementId);
  if (!statement) {
    const err = new Error('Wage statement not found');
    err.statusCode = 404;
    throw err;
  }

  if (statement.status !== 'APPROVED') {
    const err = new Error(
      `Cannot disburse payment: Wage statement must be APPROVED before payment. Current status: ${statement.status}`
    );
    err.statusCode = 400;
    throw err;
  }

  if (!paymentReference || !paymentReference.trim()) {
    const err = new Error('Payment reference (UTR / Cheque No) is required');
    err.statusCode = 400;
    throw err;
  }

  const existingPayment = await WagePayment.findOne({ paymentReference: paymentReference.trim() });
  if (existingPayment) {
    const err = new Error(`Payment reference ${paymentReference} has already been recorded`);
    err.statusCode = 400;
    throw err;
  }

  const amount = Number(paymentAmount) || statement.netPayableWage;
  if (amount <= 0) {
    const err = new Error('Disbursement amount must be greater than zero');
    err.statusCode = 400;
    throw err;
  }

  const paymentNumber = `WPY-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

  const payment = await WagePayment.create({
    paymentNumber,
    wageStatementId: statement._id,
    operatorId: statement.operatorId,
    amountPaid: amount,
    paymentMethod,
    paymentReference: paymentReference.trim(),
    disbursementDate: new Date(),
    disbursedBy: actorUser._id,
    bankAccountNumber,
    bankIfsc,
    status: 'COMPLETED',
    notes,
  });

  statement.status = 'PAID';
  statement.paymentId = payment._id;
  statement.paymentDate = payment.disbursementDate;
  await statement.save();

  await AuditLog.create({
    actorId: actorUser._id,
    actorRole: actorUser.role || 'ADMIN',
    action: 'WAGE_PAYMENT_DISBURSED',
    entityType: 'WagePayment',
    entityId: payment._id,
    notes: `Disbursed $${amount} via ${paymentMethod} ref ${paymentReference.trim()}`,
  });

  return { payment, statement };
}

/**
 * Get wage statements with strict RBAC:
 * - ADMIN: can view all
 * - OPERATOR: can only view their own
 * - CUSTOMER: 403 Forbidden
 */
export async function getWageStatements({ operatorId, status, reqUser }) {
  if (reqUser.role === 'CUSTOMER') {
    const err = new Error('Forbidden: Customer role cannot access operator wage records');
    err.statusCode = 403;
    throw err;
  }

  const query = {};
  if (reqUser.role === 'OPERATOR') {
    query.operatorId = reqUser._id;
  } else if (operatorId) {
    query.operatorId = operatorId;
  }

  if (status && status !== 'ALL') {
    query.status = status;
  }

  return WageStatement.find(query)
    .populate('operatorId', 'name email employeeCode phone')
    .populate('approvedBy', 'name')
    .populate('paymentId')
    .sort({ periodEndDate: -1 })
    .lean();
}

/**
 * Get single wage statement by ID with RBAC.
 */
export async function getWageStatementById(statementId, reqUser) {
  if (reqUser.role === 'CUSTOMER') {
    const err = new Error('Forbidden: Customer role cannot access wage records');
    err.statusCode = 403;
    throw err;
  }

  const statement = await WageStatement.findById(statementId)
    .populate('operatorId', 'name email employeeCode phone')
    .populate('approvedBy', 'name')
    .populate('paymentId')
    .populate({
      path: 'attendanceRecordIds',
      populate: { path: 'shiftId', select: 'shiftCode name startTime endTime' },
    })
    .lean();

  if (!statement) {
    const err = new Error('Wage statement not found');
    err.statusCode = 404;
    throw err;
  }

  if (reqUser.role === 'OPERATOR' && statement.operatorId._id.toString() !== reqUser._id.toString()) {
    const err = new Error('Forbidden: You can only access your own wage statements');
    err.statusCode = 403;
    throw err;
  }

  return statement;
}

// =============================================================================
// 3. MANUFACTURING COST TRACKING & ALLOCATION
// =============================================================================

/**
 * Record a dedicated manufacturing cost entry.
 * Prevents double counting via unique { orderId, sourceReference } index.
 */
export async function recordCostEntry({
  orderId,
  productionJobId,
  productionRunId,
  machineId,
  costCategory,
  costType = 'ACTUAL',
  amount,
  unitQuantity = 0,
  unitOfMeasure,
  ratePerUnit = 0,
  sourceReference,
  description,
  allocationMethod = 'DIRECT_INCURRED',
  actorUser,
}) {
  const order = await Order.findById(orderId);
  if (!order) {
    const err = new Error('Order not found');
    err.statusCode = 404;
    throw err;
  }

  if (!sourceReference || !sourceReference.trim()) {
    const err = new Error('Source reference is required to prevent double-counting');
    err.statusCode = 400;
    throw err;
  }

  const existing = await CostEntry.findOne({
    orderId,
    sourceReference: sourceReference.trim(),
  });

  if (existing) {
    const err = new Error(
      `Duplicate cost entry: Source reference "${sourceReference}" has already been recorded for this order`
    );
    err.statusCode = 400;
    throw err;
  }

  const entryNumber = `CST-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

  const costEntry = await CostEntry.create({
    entryNumber,
    orderId,
    productionJobId,
    productionRunId,
    machineId,
    costCategory,
    costType,
    amount: Number(amount) || 0,
    unitQuantity: Number(unitQuantity) || 0,
    unitOfMeasure,
    ratePerUnit: Number(ratePerUnit) || 0,
    sourceReference: sourceReference.trim(),
    allocationMethod,
    description,
    recordedBy: actorUser?._id,
    timestamp: new Date(),
  });

  // Sync / roll up to ManufacturingCost summary
  await syncOrderManufacturingCosts(orderId);

  return costEntry;
}

/**
 * Allocate manufacturing overhead to an order using documented method.
 * Method: METERS_PRODUCED_ALLOCATION (Meters Produced * Overhead Rate per Meter)
 * Rate default: $0.35 / meter produced.
 */
export async function allocateManufacturingOverhead({
  orderId,
  overheadRatePerMeter = 0.35,
  method = 'METERS_PRODUCED_ALLOCATION',
  actorUser,
}) {
  const order = await Order.findById(orderId);
  if (!order) {
    const err = new Error('Order not found');
    err.statusCode = 404;
    throw err;
  }

  const meters = order.producedMeters > 0 ? order.producedMeters : (order.totalMetersOrdered || 1000);
  const rate = Number(overheadRatePerMeter) || 0.35;
  const overheadAmount = Number((meters * rate).toFixed(2));
  const sourceRef = `OVERHEAD-ALLOC-${orderId}`;

  // Check if already allocated
  const existing = await CostEntry.findOne({ orderId, sourceReference: sourceRef });
  let entry;
  if (existing) {
    existing.amount = overheadAmount;
    existing.unitQuantity = meters;
    existing.ratePerUnit = rate;
    existing.description = `Documented Factory Overhead Absorption: ${meters} meters @ $${rate}/m`;
    entry = await existing.save();
  } else {
    entry = await CostEntry.create({
      entryNumber: `CST-OVH-${Date.now().toString().slice(-6)}`,
      orderId,
      costCategory: 'ALLOCATED_OVERHEAD',
      costType: 'ACTUAL',
      amount: overheadAmount,
      unitQuantity: meters,
      unitOfMeasure: 'METERS',
      ratePerUnit: rate,
      sourceReference: sourceRef,
      allocationMethod: method,
      description: `Documented Factory Overhead Absorption: ${meters} meters @ $${rate}/m`,
      recordedBy: actorUser?._id,
    });
  }

  await syncOrderManufacturingCosts(orderId);
  return entry;
}

/**
 * Synchronize and roll up all CostEntry records for an order into ManufacturingCost.
 */
export async function syncOrderManufacturingCosts(orderId) {
  const entries = await CostEntry.find({ orderId, costType: 'ACTUAL' }).lean();

  let actualRawMaterial = 0;
  let actualLabor = 0;
  let actualMachine = 0;
  let actualFinishing = 0;
  let actualSubcontracting = 0;
  let actualScrapRework = 0;
  let actualOverhead = 0;

  for (const c of entries) {
    const amt = c.amount || 0;
    switch (c.costCategory) {
      case 'DIRECT_MATERIAL':
        actualRawMaterial += amt;
        break;
      case 'DIRECT_LABOUR':
        actualLabor += amt;
        break;
      case 'MACHINE_OPERATING':
        actualMachine += amt;
        break;
      case 'DYEING_FINISHING':
        actualFinishing += amt;
        break;
      case 'SUBCONTRACTING':
        actualSubcontracting += amt;
        break;
      case 'SCRAP_AND_WASTE':
      case 'REWORK':
        actualScrapRework += amt;
        break;
      case 'ALLOCATED_OVERHEAD':
        actualOverhead += amt;
        break;
      default:
        actualOverhead += amt;
    }
  }

  // Get commercial totals: Billed Revenue from Invoices, Received Revenue from CustomerPayments
  const invoices = await Invoice.find({ orderId }).lean();
  const billedRevenue = invoices.reduce((acc, inv) => acc + (inv.totalInvoiceAmount || 0), 0);

  const payments = await CustomerPayment.find({ orderId }).lean();
  const receivedRevenue = payments.reduce((acc, p) => acc + (p.amountPaid || p.amount || 0), 0);

  const order = await Order.findById(orderId).lean();
  const orderTotalValue = order?.totalPrice || billedRevenue;

  let mCost = await ManufacturingCost.findOne({ orderId });
  if (!mCost) {
    mCost = new ManufacturingCost({
      orderId,
      estimatedRawMaterialCost: Number((orderTotalValue * 0.45).toFixed(2)),
      estimatedLaborCost: Number((orderTotalValue * 0.20).toFixed(2)),
      estimatedMachineCost: Number((orderTotalValue * 0.15).toFixed(2)),
      estimatedFinishingCost: Number((orderTotalValue * 0.05).toFixed(2)),
      estimatedOverheadCost: Number((orderTotalValue * 0.05).toFixed(2)),
      orderTotalValue,
    });
  }

  mCost.actualRawMaterialCost = Number(actualRawMaterial.toFixed(2));
  mCost.actualLaborCost = Number(actualLabor.toFixed(2));
  mCost.actualMachineCost = Number(actualMachine.toFixed(2));
  mCost.actualFinishingCost = Number(actualFinishing.toFixed(2));
  mCost.actualSubcontractingCost = Number(actualSubcontracting.toFixed(2));
  mCost.actualScrapAndReworkCost = Number(actualScrapRework.toFixed(2));
  mCost.actualOverheadCost = Number(actualOverhead.toFixed(2));
  mCost.billedRevenue = Number(billedRevenue.toFixed(2));
  mCost.receivedRevenue = Number(receivedRevenue.toFixed(2));
  mCost.orderTotalValue = orderTotalValue;

  mCost.recalculateTotals();
  await mCost.save();

  return mCost;
}

/**
 * Get complete order cost analysis with estimated vs actual breakdown.
 */
export async function getOrderCostAnalysis(orderId) {
  const order = await Order.findById(orderId)
    .populate('customerId', 'name companyName email')
    .lean();

  if (!order) {
    const err = new Error('Order not found');
    err.statusCode = 404;
    throw err;
  }

  let mCost = await ManufacturingCost.findOne({ orderId }).lean();
  if (!mCost) {
    mCost = await syncOrderManufacturingCosts(orderId);
  }

  const entries = await CostEntry.find({ orderId })
    .populate('machineId', 'machineCode name type')
    .populate('recordedBy', 'name')
    .sort({ timestamp: -1 })
    .lean();

  return {
    order,
    manufacturingCost: mCost,
    costEntries: entries,
  };
}

// =============================================================================
// 4. SUPPLIER INVOICES & 3-WAY RECONCILIATION
// =============================================================================

/**
 * Record a supplier invoice against a purchase order.
 */
export async function recordSupplierInvoice({
  invoiceNumber,
  supplierId,
  purchaseOrderId,
  goodsReceiptId,
  invoicedQuantity,
  unit = 'KG',
  unitPrice,
  subtotal,
  taxAmount = 0,
  totalAmount,
  dueDate,
  notes,
  actorUser,
}) {
  if (!invoiceNumber || !invoiceNumber.trim()) {
    const err = new Error('Supplier invoice number is required');
    err.statusCode = 400;
    throw err;
  }

  const existing = await SupplierInvoice.findOne({
    supplierId,
    invoiceNumber: invoiceNumber.trim().toUpperCase(),
  });

  if (existing) {
    const err = new Error(
      `Duplicate invoice: Invoice ${invoiceNumber} from this supplier has already been recorded`
    );
    err.statusCode = 400;
    throw err;
  }

  const calcSubtotal = Number(subtotal) || Number((invoicedQuantity * unitPrice).toFixed(2));
  const calcTax = Number(taxAmount) || 0;
  const calcTotal = Number(totalAmount) || Number((calcSubtotal + calcTax).toFixed(2));

  const supInvoice = await SupplierInvoice.create({
    invoiceNumber: invoiceNumber.trim().toUpperCase(),
    supplierId,
    purchaseOrderId,
    goodsReceiptId,
    invoicedQuantity: Number(invoicedQuantity),
    unit,
    unitPrice: Number(unitPrice),
    subtotal: calcSubtotal,
    taxAmount: calcTax,
    totalAmount: calcTotal,
    paidAmount: 0,
    balanceDue: calcTotal,
    paymentStatus: 'UNPAID',
    invoiceDate: new Date(),
    dueDate: new Date(dueDate || Date.now() + 30 * 24 * 60 * 60 * 1000),
    notes,
  });

  return supInvoice;
}

/**
 * Record a payment made against a supplier invoice.
 */
export async function recordSupplierPayment({
  supplierInvoiceId,
  paymentReference,
  amount,
  paymentMethod = 'BANK_TRANSFER',
  notes,
  actorUser,
}) {
  const supInvoice = await SupplierInvoice.findById(supplierInvoiceId);
  if (!supInvoice) {
    const err = new Error('Supplier invoice not found');
    err.statusCode = 404;
    throw err;
  }

  const paymentAmt = Number(amount);
  if (isNaN(paymentAmt) || paymentAmt <= 0) {
    const err = new Error('Payment amount must be greater than zero');
    err.statusCode = 400;
    throw err;
  }

  if (paymentAmt > supInvoice.balanceDue) {
    const err = new Error(
      `Payment amount cannot exceed outstanding supplier balance of $${supInvoice.balanceDue.toFixed(2)}`
    );
    err.statusCode = 400;
    throw err;
  }

  supInvoice.paymentRecords.push({
    paymentReference: paymentReference.trim(),
    amount: paymentAmt,
    paymentDate: new Date(),
    paymentMethod,
    recordedBy: actorUser?._id,
    notes,
  });

  supInvoice.paidAmount = Number((supInvoice.paidAmount + paymentAmt).toFixed(2));
  supInvoice.balanceDue = Math.max(0, Number((supInvoice.totalAmount - supInvoice.paidAmount).toFixed(2)));
  supInvoice.paymentStatus = supInvoice.balanceDue === 0 ? 'PAID' : 'PARTIALLY_PAID';

  await supInvoice.save();
  return supInvoice;
}

/**
 * List supplier invoices.
 */
export async function getSupplierInvoices({ supplierId, paymentStatus }) {
  const query = {};
  if (supplierId) query.supplierId = supplierId;
  if (paymentStatus && paymentStatus !== 'ALL') query.paymentStatus = paymentStatus;

  return SupplierInvoice.find(query)
    .populate('supplierId', 'name contactPerson email phone')
    .populate('purchaseOrderId', 'poNumber status totalAmount')
    .sort({ createdAt: -1 })
    .lean();
}

// =============================================================================
// 5. FINANCIAL REPORTING & 3-WAY RECONCILIATION
// =============================================================================

/**
 * Executive Financial Report across revenue, costs, margins, and outstanding balances.
 */
export async function getExecutiveFinancialReport() {
  const [
    costSummaries,
    allInvoices,
    customerPayments,
    wageStatements,
    wagePayments,
    supplierInvoices,
  ] = await Promise.all([
    ManufacturingCost.find().lean(),
    Invoice.find().lean(),
    CustomerPayment.find().lean(),
    WageStatement.find().lean(),
    WagePayment.find().lean(),
    SupplierInvoice.find().lean(),
  ]);

  // Commercial Metrics
  const totalInvoicedRevenue = allInvoices.reduce((acc, inv) => acc + (inv.totalInvoiceAmount || 0), 0);
  const totalCustomerCashReceived = customerPayments.reduce((acc, p) => acc + (p.amountPaid || p.amount || 0), 0);
  const totalCustomerReceivables = Math.max(0, totalInvoicedRevenue - totalCustomerCashReceived);

  // Manufacturing Costs
  let totalMaterialCost = 0;
  let totalLaborCost = 0;
  let totalMachineCost = 0;
  let totalFinishingCost = 0;
  let totalScrapReworkCost = 0;
  let totalAllocatedOverhead = 0;

  for (const m of costSummaries) {
    totalMaterialCost += m.actualRawMaterialCost || 0;
    totalLaborCost += m.actualLaborCost || 0;
    totalMachineCost += m.actualMachineCost || 0;
    totalFinishingCost += m.actualFinishingCost || 0;
    totalScrapReworkCost += m.actualScrapAndReworkCost || 0;
    totalAllocatedOverhead += m.actualOverheadCost || 0;
  }

  const totalDirectCosts = totalMaterialCost + totalLaborCost + totalMachineCost + totalFinishingCost + totalScrapReworkCost;
  const totalManufacturingCost = totalDirectCosts + totalAllocatedOverhead;

  const grossMargin = totalInvoicedRevenue - totalManufacturingCost;
  const grossMarginPercentage = totalInvoicedRevenue > 0
    ? Number(((grossMargin / totalInvoicedRevenue) * 100).toFixed(2))
    : 0;

  // Wage Liabilities
  const totalAccruedWages = wageStatements.reduce((acc, w) => acc + (w.grossWage || 0), 0);
  const totalDisbursedWages = wagePayments.reduce((acc, p) => acc + (p.amountPaid || 0), 0);
  const totalUnpaidWageLiability = Math.max(0, totalAccruedWages - totalDisbursedWages);

  // Supplier Payables
  const totalSupplierInvoiced = supplierInvoices.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
  const totalSupplierPaid = supplierInvoices.reduce((acc, s) => acc + (s.paidAmount || 0), 0);
  const totalSupplierPayables = Math.max(0, totalSupplierInvoiced - totalSupplierPaid);

  return {
    commercial: {
      totalInvoicedRevenue: Number(totalInvoicedRevenue.toFixed(2)),
      totalCustomerCashReceived: Number(totalCustomerCashReceived.toFixed(2)),
      totalCustomerReceivables: Number(totalCustomerReceivables.toFixed(2)),
      distinctionNote: 'Issued customer invoice creates an account receivable; cash is recognized only upon customer payment clearance.',
    },
    manufacturingCosts: {
      totalMaterialCost: Number(totalMaterialCost.toFixed(2)),
      totalLaborCost: Number(totalLaborCost.toFixed(2)),
      totalMachineCost: Number(totalMachineCost.toFixed(2)),
      totalFinishingCost: Number(totalFinishingCost.toFixed(2)),
      totalScrapReworkCost: Number(totalScrapReworkCost.toFixed(2)),
      totalAllocatedOverhead: Number(totalAllocatedOverhead.toFixed(2)),
      totalDirectCosts: Number(totalDirectCosts.toFixed(2)),
      totalManufacturingCost: Number(totalManufacturingCost.toFixed(2)),
    },
    profitability: {
      grossMargin: Number(grossMargin.toFixed(2)),
      grossMarginPercentage,
    },
    laborLiability: {
      totalAccruedWages: Number(totalAccruedWages.toFixed(2)),
      totalDisbursedWages: Number(totalDisbursedWages.toFixed(2)),
      totalUnpaidWageLiability: Number(totalUnpaidWageLiability.toFixed(2)),
    },
    supplierPayables: {
      totalSupplierInvoiced: Number(totalSupplierInvoiced.toFixed(2)),
      totalSupplierPaid: Number(totalSupplierPaid.toFixed(2)),
      totalSupplierPayables: Number(totalSupplierPayables.toFixed(2)),
    },
  };
}

/**
 * 3-Way Reconciliation Matrix reconciling:
 * 1. Supplier POs vs Material Receipts vs Supplier Invoices vs Supplier Payments
 * 2. Verified Attendance Hours vs Accrued Wages vs Disbursed Payments
 * 3. Sales Orders vs Dispatched Value vs Customer Invoices vs Customer Payments
 */
export async function getThreeWayReconciliation() {
  const [
    purchaseOrders,
    goodsReceipts,
    supplierInvoices,
    attendanceRecords,
    wageStatements,
    wagePayments,
    orders,
    customerInvoices,
    customerPayments,
  ] = await Promise.all([
    PurchaseOrder.find().lean(),
    GoodsReceipt.find().lean(),
    SupplierInvoice.find().lean(),
    Attendance.find().lean(),
    WageStatement.find().lean(),
    WagePayment.find().lean(),
    Order.find().lean(),
    Invoice.find().lean(),
    CustomerPayment.find().lean(),
  ]);

  // 1. Supplier Stream
  const poTotal = purchaseOrders.reduce((acc, po) => acc + (po.totalAmount || 0), 0);
  const grnTotalValue = goodsReceipts.reduce((acc, grn) => {
    const itemsAccepted = (grn.receivedItems || []).reduce((sum, item) => sum + (item.acceptedQuantity || 0), 0);
    const accepted = itemsAccepted > 0 ? itemsAccepted : (grn.acceptedQuantity || 0);
    return acc + (accepted * (grn.unitPrice || 5.5));
  }, 0);
  const supInvoicedTotal = supplierInvoices.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
  const supPaidTotal = supplierInvoices.reduce((acc, s) => acc + (s.paidAmount || 0), 0);

  // 2. Wage Stream
  const totalVerifiedHours = attendanceRecords.reduce((acc, a) => acc + (a.hoursWorked || 0), 0);
  const totalApprovedOTHours = attendanceRecords.reduce((acc, a) => acc + (a.approvedOvertimeHours || 0), 0);
  const grossWagesAccrued = wageStatements.reduce((acc, w) => acc + (w.grossWage || 0), 0);
  const netWagesApproved = wageStatements.reduce((acc, w) => acc + (w.netPayableWage || 0), 0);
  const wagesDisbursed = wagePayments.reduce((acc, p) => acc + (p.amountPaid || 0), 0);

  // 3. Customer Stream
  const totalOrdersValue = orders.reduce((acc, o) => acc + (o.totalPrice || 0), 0);
  const totalCustomerInvoiced = customerInvoices.reduce((acc, i) => acc + (i.totalInvoiceAmount || 0), 0);
  const totalCustomerPaid = customerPayments.reduce((acc, p) => acc + (p.amountPaid || p.amount || 0), 0);

  return {
    procurementStream: {
      authorizedPurchaseOrderValue: Number(poTotal.toFixed(2)),
      goodsReceiptsAcceptedValue: Number(grnTotalValue.toFixed(2)),
      supplierInvoicesReceived: Number(supInvoicedTotal.toFixed(2)),
      supplierPaymentsDisbursed: Number(supPaidTotal.toFixed(2)),
      outstandingSupplierPayables: Math.max(0, Number((supInvoicedTotal - supPaidTotal).toFixed(2))),
      reconciliationStatus: supInvoicedTotal <= poTotal ? 'WITHIN_PO_BUDGET' : 'PO_BUDGET_OVERRUN',
    },
    laborStream: {
      totalVerifiedHoursWorked: Number(totalVerifiedHours.toFixed(2)),
      totalApprovedOvertimeHours: Number(totalApprovedOTHours.toFixed(2)),
      grossWagesAccrued: Number(grossWagesAccrued.toFixed(2)),
      netWagesApproved: Number(netWagesApproved.toFixed(2)),
      wagesDisbursed: Number(wagesDisbursed.toFixed(2)),
      outstandingWageLiability: Math.max(0, Number((netWagesApproved - wagesDisbursed).toFixed(2))),
      reconciliationStatus: wagesDisbursed === netWagesApproved ? 'FULLY_SETTLED' : 'PENDING_DISBURSEMENT',
    },
    customerStream: {
      confirmedOrdersBookedValue: Number(totalOrdersValue.toFixed(2)),
      customerTaxInvoicesGenerated: Number(totalCustomerInvoiced.toFixed(2)),
      customerPaymentsCleared: Number(totalCustomerPaid.toFixed(2)),
      outstandingCustomerReceivables: Math.max(0, Number((totalCustomerInvoiced - totalCustomerPaid).toFixed(2))),
      reconciliationStatus: totalCustomerPaid >= totalCustomerInvoiced ? 'FULLY_PAID' : 'RECEIVABLES_OUTSTANDING',
    },
  };
}

/**
 * Machine Fleet Output, Utilization %, Downtime, and Operating Cost Report.
 */
export async function getMachineUtilizationAndCostReport() {
  const machines = await Machine.find().lean();
  const breakdowns = await BreakdownReport.find().lean();

  const STANDARD_AVAILABLE_HOURS_PER_MONTH = 720; // 30 days * 24 hours

  const machineStats = machines.map((m) => {
    const runHours = m.totalRunHours || 0;
    const operatingRate = m.hourlyOperatingRate || 25.0;
    const outputMeters = m.totalOutputMeters || 0;

    // Sum downtime hours for this machine from BreakdownReport and machine field
    const mBreakdowns = breakdowns.filter((b) => b.machineId && b.machineId.toString() === m._id.toString());
    const breakdownDowntimeHours = mBreakdowns.reduce((acc, b) => {
      if (b.downtimeMinutes) return acc + (b.downtimeMinutes / 60);
      if (b.actualDowntimeHours) return acc + b.actualDowntimeHours;
      return acc + (b.estimatedDowntimeHours || 0);
    }, 0);
    const downtimeHours = (m.downtimeHours || 0) + breakdownDowntimeHours;

    const availableHours = STANDARD_AVAILABLE_HOURS_PER_MONTH;
    const utilizationPercentage = availableHours > 0
      ? Number(Math.min(100, (runHours / availableHours) * 100).toFixed(2))
      : 0;

    const operatingCost = Number((runHours * operatingRate).toFixed(2));

    return {
      _id: m._id,
      machineCode: m.machineCode,
      name: m.name,
      type: m.type,
      location: m.location,
      status: m.status,
      totalRunHours: runHours,
      downtimeHours: Number(downtimeHours.toFixed(2)),
      utilizationPercentage,
      totalOutputMeters: outputMeters,
      hourlyOperatingRate: operatingRate,
      operatingCost,
    };
  });

  const fleetOutputMeters = machineStats.reduce((acc, m) => acc + m.totalOutputMeters, 0);
  const fleetRunHours = machineStats.reduce((acc, m) => acc + m.totalRunHours, 0);
  const fleetOperatingCost = machineStats.reduce((acc, m) => acc + m.operatingCost, 0);
  const averageUtilization = machineStats.length > 0
    ? Number((machineStats.reduce((acc, m) => acc + m.utilizationPercentage, 0) / machineStats.length).toFixed(2))
    : 0;

  return {
    fleetSummary: {
      totalMachines: machines.length,
      fleetOutputMeters,
      fleetRunHours,
      fleetOperatingCost: Number(fleetOperatingCost.toFixed(2)),
      averageUtilization,
    },
    machines: machineStats,
  };
}
