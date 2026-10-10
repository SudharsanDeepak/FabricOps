import mongoose from 'mongoose';

const wageCalculationSchema = new mongoose.Schema(
  {
    calculationNumber: {
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
    },
    periodStartDate: { type: Date, required: true },
    periodEndDate: { type: Date, required: true },
    regularHoursWorked: { type: Number, required: true, min: 0 },
    overtimeHoursWorked: { type: Number, default: 0, min: 0 },
    baseHourlyRate: { type: Number, required: true, min: 0 },
    regularWage: { type: Number, required: true, min: 0 },
    overtimeWage: { type: Number, default: 0, min: 0 },
    productionIncentiveBonus: { type: Number, default: 0, min: 0 },
    deductions: { type: Number, default: 0, min: 0 },
    netPayableWage: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['DRAFT', 'APPROVED', 'PAID'],
      default: 'DRAFT',
    },
    paymentDate: Date,
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

wageCalculationSchema.index({ operatorId: 1, periodStartDate: 1, periodEndDate: 1 });

export const WageCalculation = mongoose.model('WageCalculation', wageCalculationSchema);

