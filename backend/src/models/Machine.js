import mongoose from 'mongoose';

const machineSchema = new mongoose.Schema(
  {
    machineCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        'WARPING_FRAME',
        'SIZING_MACHINE',
        'AIR_JET_LOOM',
        'RAPIER_LOOM',
        'CIRCULAR_KNITTING',
        'DYEING_JET',
        'STENTER_FINISHING',
      ],
    },
    location: {
      shed: { type: String, required: true },
      bay: { type: String, required: true },
    },
    status: {
      type: String,
      enum: ['IDLE', 'RUNNING', 'MAINTENANCE', 'BREAKDOWN'],
      default: 'IDLE',
    },
    currentProductionJobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductionJob',
    },
    currentOperatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    telemetrySnapshot: {
      rpm: { type: Number, default: 0 },
      picksPerMinute: { type: Number, default: 0 },
      efficiencyPercentage: { type: Number, default: 0 },
      lastPingAt: { type: Date, default: Date.now },
    },
    specifications: {
      reedSpaceInches: Number,
      maxRpm: Number,
      yearOfManufacture: Number,
      manufacturer: String,
    },
    totalRunHours: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

machineSchema.index({ status: 1, type: 1 });

export const Machine = mongoose.model('Machine', machineSchema);

