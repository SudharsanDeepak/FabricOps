import mongoose from 'mongoose';

const wageAdjustmentSchema = new mongoose.Schema(
  {
    adjustmentAmount: { type: Number, required: true },
    reason: { type: String, required: true, trim: true },
    authorizedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    adjustedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const wageStatementSchema = new mongoose.Schema(
  {
    statementNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    operatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    periodStartDate: {
      type: Date,
      required: true,
    },
    periodEndDate: {
      type: Date,
      required: true,
    },
    attendanceRecordIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Attendance',
      },
    ],
    verifiedDaysWorked: {
      type: Number,
      default: 0,
      min: 0,
    },
    regularHoursWorked: {
      type: Number,
      required: true,
      min: 0,
    },
    approvedOvertimeHours: {
      type: Number,
      default: 0,
      min: 0,
    },
    baseHourlyRate: {
      type: Number,
      required: true,
      min: 0,
    },
    overtimeMultiplier: {
      type: Number,
      default: 1.5,
      min: 1.0,
    },
    regularWage: {
      type: Number,
      required: true,
      min: 0,
    },
    overtimeWage: {
      type: Number,
      default: 0,
      min: 0,
    },
    shiftAllowance: {
      type: Number,
      default: 0,
      min: 0,
    },
    productionIncentiveBonus: {
      type: Number,
      default: 0,
      min: 0,
    },
    grossWage: {
      type: Number,
      required: true,
      min: 0,
    },
    deductions: {
      type: Number,
      default: 0,
      min: 0,
    },
    adjustments: [wageAdjustmentSchema],
    totalAdjustmentAmount: {
      type: Number,
      default: 0,
    },
    netPayableWage: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PAID'],
      default: 'DRAFT',
      index: true,
    },
    calculationInputsSnapshot: {
      hourlyRate: Number,
      overtimeMultiplier: Number,
      regularHours: Number,
      overtimeHours: Number,
      shiftAllowance: Number,
      incentiveBonus: Number,
      deductions: Number,
      rulesApplied: String,
      capturedAt: { type: Date, default: Date.now },
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: Date,
    approvalNotes: String,
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WagePayment',
    },
    paymentDate: Date,
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate wage calculation statements for the same operator and period
wageStatementSchema.index(
  { operatorId: 1, periodStartDate: 1, periodEndDate: 1 },
  { unique: true }
);

export const WageStatement = mongoose.model('WageStatement', wageStatementSchema);

