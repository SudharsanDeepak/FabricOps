import mongoose from 'mongoose';

const productionStagePlanSchema = new mongoose.Schema(
  {
    stageName: {
      type: String,
      required: true,
      enum: ['WARPING', 'SIZING', 'WEAVING', 'DYEING', 'FINISHING', 'INSPECTION'],
    },
    sequence: { type: Number, required: true },
    targetQuantity: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true, enum: ['METER', 'KILOGRAM'] },
    estimatedHours: { type: Number, required: true, min: 0 },
    assignedMachineIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Machine',
      },
    ],
    status: {
      type: String,
      enum: ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED'],
      default: 'PLANNED',
    },
  },
  { _id: true }
);

const productionPlanSchema = new mongoose.Schema(
  {
    planNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    plannedStartDate: { type: Date, required: true },
    plannedCompletionDate: { type: Date, required: true },
    stages: {
      type: [productionStagePlanSchema],
      validate: [(val) => val.length > 0, 'Plan must contain at least one production stage'],
    },
    status: {
      type: String,
      enum: ['DRAFT', 'APPROVED', 'IN_EXECUTION', 'COMPLETED', 'CANCELLED'],
      default: 'DRAFT',
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    notes: String,
  },
  {
    timestamps: true,
  }
);

productionPlanSchema.index({ orderId: 1, status: 1 });

export const ProductionPlan = mongoose.model('ProductionPlan', productionPlanSchema);

