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
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    shiftId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shift',
      index: true,
    },
    shift: {
      type: String,
      required: true,
      enum: ['MORNING', 'EVENING', 'NIGHT'],
      index: true,
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
    downtimeMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },
    source: {
      type: String,
      enum: ['OPERATOR', 'IOT_SENSOR'],
      default: 'OPERATOR',
      index: true,
    },
    idempotencyKey: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      index: true,
    },
    overrunAuthorized: {
      type: Boolean,
      default: false,
    },
    overrunReason: {
      type: String,
      trim: true,
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
productionLogSchema.index({ orderId: 1, logDate: -1 });
productionLogSchema.index({ operatorId: 1, logDate: -1 });
productionLogSchema.index({ shift: 1, logDate: -1 });
productionLogSchema.index({ shiftId: 1, logDate: -1 });

export const ProductionLog = mongoose.model('ProductionLog', productionLogSchema);

