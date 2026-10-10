import mongoose from 'mongoose';

const manufacturingCostSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      unique: true,
      index: true,
    },
    // Estimated Cost Breakdown
    estimatedRawMaterialCost: { type: Number, default: 0, min: 0 },
    estimatedLaborCost: { type: Number, default: 0, min: 0 },
    estimatedMachineCost: { type: Number, default: 0, min: 0 },
    estimatedFinishingCost: { type: Number, default: 0, min: 0 },
    estimatedOverheadCost: { type: Number, default: 0, min: 0 },
    totalEstimatedCost: { type: Number, default: 0, min: 0 },

    // Actual Incurred Cost Breakdown (Rolled up from CostEntry collection)
    actualRawMaterialCost: { type: Number, default: 0, min: 0 },
    actualLaborCost: { type: Number, default: 0, min: 0 },
    actualMachineCost: { type: Number, default: 0, min: 0 },
    actualFinishingCost: { type: Number, default: 0, min: 0 },
    actualSubcontractingCost: { type: Number, default: 0, min: 0 },
    actualScrapAndReworkCost: { type: Number, default: 0, min: 0 },
    actualOverheadCost: { type: Number, default: 0, min: 0 },
    totalActualCost: { type: Number, default: 0, min: 0 },

    // Financial Variances
    varianceAmount: { type: Number, default: 0 }, // Actual - Estimated
    variancePercentage: { type: Number, default: 0 },

    // Commercial & Margin Tracking
    orderTotalValue: { type: Number, default: 0, min: 0 },
    billedRevenue: { type: Number, default: 0, min: 0 }, // From generated Invoices
    receivedRevenue: { type: Number, default: 0, min: 0 }, // From cleared CustomerPayments
    outstandingCustomerBalance: { type: Number, default: 0 },
    grossMarginAmount: { type: Number, default: 0 }, // Billed Revenue - Total Actual Cost
    grossMarginPercentage: { type: Number, default: 0 },

    // Overhead Allocation Documentation
    overheadAllocationMethod: {
      type: String,
      default: 'METERS_PRODUCED_ALLOCATION',
      trim: true,
    },
    overheadRateApplied: {
      type: Number,
      default: 0.35, // Mill default $0.35 / meter produced
    },
    lastAggregatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

manufacturingCostSchema.methods.recalculateTotals = function () {
  this.totalEstimatedCost =
    (this.estimatedRawMaterialCost || 0) +
    (this.estimatedLaborCost || 0) +
    (this.estimatedMachineCost || 0) +
    (this.estimatedFinishingCost || 0) +
    (this.estimatedOverheadCost || 0);

  this.totalActualCost =
    (this.actualRawMaterialCost || 0) +
    (this.actualLaborCost || 0) +
    (this.actualMachineCost || 0) +
    (this.actualFinishingCost || 0) +
    (this.actualSubcontractingCost || 0) +
    (this.actualScrapAndReworkCost || 0) +
    (this.actualOverheadCost || 0);

  this.varianceAmount = this.totalActualCost - this.totalEstimatedCost;
  this.variancePercentage =
    this.totalEstimatedCost > 0
      ? Number(((this.varianceAmount / this.totalEstimatedCost) * 100).toFixed(2))
      : 0;

  this.outstandingCustomerBalance = Math.max(
    0,
    (this.billedRevenue || 0) - (this.receivedRevenue || 0)
  );

  const revenueBasis = this.billedRevenue > 0 ? this.billedRevenue : this.orderTotalValue;
  this.grossMarginAmount = (revenueBasis || 0) - this.totalActualCost;
  this.grossMarginPercentage =
    revenueBasis > 0
      ? Number(((this.grossMarginAmount / revenueBasis) * 100).toFixed(2))
      : 0;

  this.lastAggregatedAt = new Date();
};

manufacturingCostSchema.pre('save', function (next) {
  this.recalculateTotals();
  next();
});

export const ManufacturingCost = mongoose.model('ManufacturingCost', manufacturingCostSchema);
