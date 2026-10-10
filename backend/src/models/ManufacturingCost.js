import mongoose from 'mongoose';

const manufacturingCostSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    productionJobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductionJob',
      index: true,
    },
    estimatedRawMaterialCost: { type: Number, required: true, min: 0 },
    actualRawMaterialCost: { type: Number, default: 0, min: 0 },

    estimatedLaborCost: { type: Number, required: true, min: 0 },
    actualLaborCost: { type: Number, default: 0, min: 0 },

    estimatedPowerCost: { type: Number, required: true, min: 0 },
    actualPowerCost: { type: Number, default: 0, min: 0 },

    overheadAllocation: { type: Number, default: 0, min: 0 },

    totalEstimatedCost: { type: Number, required: true, min: 0 },
    totalActualCost: { type: Number, default: 0, min: 0 },
    varianceAmount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

manufacturingCostSchema.pre('save', function (next) {
  this.totalEstimatedCost =
    this.estimatedRawMaterialCost + this.estimatedLaborCost + this.estimatedPowerCost + this.overheadAllocation;
  this.totalActualCost =
    this.actualRawMaterialCost + this.actualLaborCost + this.actualPowerCost + this.overheadAllocation;
  this.varianceAmount = this.totalActualCost - this.totalEstimatedCost;
  next();
});

export const ManufacturingCost = mongoose.model('ManufacturingCost', manufacturingCostSchema);

