import mongoose from 'mongoose';

const productionLogSchema = new mongoose.Schema(
  {
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductionJob',
      required: true,
      index: true,
    },
    machineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Machine',
      required: true,
      index: true,
    },
    operatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    shift: {
      type: String,
      required: true,
      enum: ['MORNING', 'EVENING', 'NIGHT'],
    },
    metersProduced: {
      type: Number,
      required: true,
      min: [0, 'Produced quantity cannot be negative'],
    },
    wasteMeters: {
      type: Number,
      default: 0,
      min: 0,
    },
    averageRpm: {
      type: Number,
      min: 0,
    },
    durationMinutes: {
      type: Number,
      required: true,
      min: 1,
    },
    remarks: String,
    logDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

productionLogSchema.index({ jobId: 1, logDate: -1 });
productionLogSchema.index({ machineId: 1, logDate: -1 });
productionLogSchema.index({ operatorId: 1, logDate: -1 });

export const ProductionLog = mongoose.model('ProductionLog', productionLogSchema);

