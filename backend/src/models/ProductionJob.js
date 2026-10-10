import mongoose from 'mongoose';

const productionJobSchema = new mongoose.Schema(
  {
    jobNumber: {
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
    machineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Machine',
      required: true,
    },
    stage: {
      type: String,
      required: true,
      enum: ['SPINNING', 'WARPING', 'SIZING', 'WEAVING', 'DYEING', 'FINISHING', 'INSPECTION', 'PACKING'],
    },
    targetQuantity: {
      type: Number,
      required: true,
      min: [1, 'Target quantity must be greater than zero'],
    },
    producedQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    wasteQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    unit: {
      type: String,
      required: true,
      enum: ['METER', 'KILOGRAM'],
      default: 'METER',
    },
    status: {
      type: String,
      enum: ['SCHEDULED', 'RUNNING', 'PAUSED', 'COMPLETED', 'CANCELLED'],
      default: 'SCHEDULED',
    },
    assignedOperatorIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    actualStartDate: Date,
    actualEndDate: Date,
  },
  {
    timestamps: true,
  }
);

productionJobSchema.index({ orderId: 1, stage: 1 });
productionJobSchema.index({ machineId: 1, status: 1 });

export const ProductionJob = mongoose.model('ProductionJob', productionJobSchema);

