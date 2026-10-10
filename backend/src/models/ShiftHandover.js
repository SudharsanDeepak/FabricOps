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
    },
    outgoingOperatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    incomingOperatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    shift: {
      type: String,
      required: true,
      enum: ['MORNING', 'EVENING', 'NIGHT'],
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
    outgoingNotes: String,
    incomingAcknowledgedAt: Date,
  },
  {
    timestamps: true,
  }
);

shiftHandoverSchema.index({ machineId: 1, createdAt: -1 });

export const ShiftHandover = mongoose.model('ShiftHandover', shiftHandoverSchema);

