import mongoose from 'mongoose';

const productionRunSchema = new mongoose.Schema(
  {
    runNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    productionJobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductionJob',
      required: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    machineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Machine',
      required: true,
      index: true,
    },
    stage: {
      type: String,
      required: true,
      enum: ['SPINNING', 'WARPING', 'SIZING', 'WEAVING', 'DYEING', 'FINISHING', 'INSPECTION', 'PACKING'],
      default: 'WEAVING',
    },
    yarnBatchNumbers: [
      {
        type: String,
        trim: true,
      },
    ],
    assignedOperatorIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    plannedMeters: {
      type: Number,
      required: true,
      min: 1,
    },
    actualProducedMeters: {
      type: Number,
      default: 0,
      min: 0,
    },
    rollIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FabricRoll',
      },
    ],
    status: {
      type: String,
      enum: ['SCHEDULED', 'RUNNING', 'PAUSED', 'COMPLETED', 'ABORTED'],
      default: 'RUNNING',
    },
    startTime: {
      type: Date,
      default: Date.now,
    },
    endTime: Date,
    telemetryAverages: {
      rpm: { type: Number, default: 0 },
      efficiencyPercentage: { type: Number, default: 0 },
      picksPerMinute: { type: Number, default: 0 },
    },
    notes: String,
  },
  {
    timestamps: true,
  }
);

productionRunSchema.index({ orderId: 1, stage: 1 });
productionRunSchema.index({ machineId: 1, status: 1 });

export const ProductionRun = mongoose.model('ProductionRun', productionRunSchema);

