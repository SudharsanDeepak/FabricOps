import mongoose from 'mongoose';

const shiftHandoverSchema = new mongoose.Schema(
  {
    handoverNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    machineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Machine',
      required: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      index: true,
    },
    outgoingOperatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    incomingOperatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
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
    metersRunningAtHandover: {
      type: Number,
      required: true,
      min: 0,
    },
    remainingWarpBeamPercentage: {
      type: Number,
      min: 0,
      max: 100,
    },
    openIssues: [
      {
        type: String,
        trim: true,
      },
    ],
    unfinishedTasks: [
      {
        jobId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'ProductionJob',
        },
        jobNumber: String,
        stage: String,
        remainingQuantity: Number,
        notes: String,
      },
    ],
    idempotencyKey: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      index: true,
    },
    outgoingNotes: String,
    incomingAcknowledgedAt: Date,
  },
  {
    timestamps: true,
  }
);

shiftHandoverSchema.index({ machineId: 1, createdAt: -1 });
shiftHandoverSchema.index({ orderId: 1, createdAt: -1 });
shiftHandoverSchema.index({ outgoingOperatorId: 1, createdAt: -1 });
shiftHandoverSchema.index({ incomingOperatorId: 1, createdAt: -1 });
shiftHandoverSchema.index({ shift: 1, createdAt: -1 });

export const ShiftHandover = mongoose.model('ShiftHandover', shiftHandoverSchema);

