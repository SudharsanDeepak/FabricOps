import mongoose from 'mongoose';

const breakdownReportSchema = new mongoose.Schema(
  {
    reportNumber: {
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
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    breakdownType: {
      type: String,
      required: true,
      enum: [
        'MECHANICAL',
        'ELECTRICAL',
        'YARN_BREAKAGE',
        'POWER_OUTAGE',
        'PNEUMATIC',
        'ELECTRONIC_SENSOR',
        'MAINTENANCE_REQUIRED',
        'MISSING_MATERIAL',
      ],
    },
    severity: {
      type: String,
      required: true,
      enum: ['LOW', 'MEDIUM', 'CRITICAL'],
      default: 'MEDIUM',
    },
    description: {
      type: String,
      required: true,
    },
    missingMaterialDetails: {
      materialName: String,
      requiredQuantity: Number,
      unit: String,
    },
    idempotencyKey: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      index: true,
    },
    reportedAt: {
      type: Date,
      default: Date.now,
    },
    resolvedAt: Date,
    downtimeMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },
    technicianId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    resolutionNotes: String,
    status: {
      type: String,
      enum: ['REPORTED', 'UNDER_REPAIR', 'RESOLVED'],
      default: 'REPORTED',
    },
  },
  {
    timestamps: true,
  }
);

breakdownReportSchema.index({ machineId: 1, status: 1 });
breakdownReportSchema.index({ reportedAt: -1 });

export const BreakdownReport = mongoose.model('BreakdownReport', breakdownReportSchema);

