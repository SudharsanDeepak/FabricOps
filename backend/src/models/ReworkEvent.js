import mongoose from 'mongoose';

const reworkEventSchema = new mongoose.Schema(
  {
    reworkNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    fabricRollId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FabricRoll',
      required: true,
      index: true,
    },
    inspectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'QualityInspection',
      required: true,
      index: true,
    },
    reworkType: {
      type: String,
      required: true,
      enum: [
        'MENDING_DARNING',
        'RE_WASHING',
        'HEAT_SETTING_STENTER',
        'CROPPING_SHEARING',
        'SPOT_CLEANING',
        'RE_DYEING',
        'TRIMMING_SPLITTING',
      ],
    },
    reworkInstructions: {
      type: String,
      required: true,
      trim: true,
    },
    assignedOperatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    authorizedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['REQUESTED', 'IN_PROGRESS', 'COMPLETED', 'ABANDONED'],
      default: 'REQUESTED',
      index: true,
    },
    actionTaken: String,
    metersBeforeRework: Number,
    metersAfterRework: Number,
    startedAt: Date,
    completedAt: Date,
    reinspectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'QualityInspection',
    },
    resultingVerdict: {
      type: String,
      enum: ['PENDING_REINSPECTION', 'PASSED', 'REJECTED'],
      default: 'PENDING_REINSPECTION',
    },
    notes: String,
  },
  {
    timestamps: true,
  }
);

reworkEventSchema.index({ fabricRollId: 1, createdAt: -1 });
reworkEventSchema.index({ status: 1 });

export const ReworkEvent = mongoose.model('ReworkEvent', reworkEventSchema);

