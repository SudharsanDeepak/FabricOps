import mongoose from 'mongoose';

const genealogySchema = new mongoose.Schema(
  {
    yarnBatchNumbers: [{ type: String, trim: true }],
    warpBeamId: String,
    loomCode: String,
    operatorIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { _id: false }
);

const fabricRollSchema = new mongoose.Schema(
  {
    rollNumber: {
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
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    loomMachineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Machine',
      required: true,
    },
    genealogy: {
      type: genealogySchema,
      required: true,
    },
    grossMeters: {
      type: Number,
      required: true,
      min: [1, 'Gross meters must be greater than zero'],
    },
    netMeters: {
      type: Number,
      required: true,
      min: [0, 'Net meters cannot be negative'],
    },
    weightKg: {
      type: Number,
      required: true,
      min: 0,
    },
    gsmActual: Number,
    widthInchesActual: Number,
    grade: {
      type: String,
      enum: ['UNGRADED', 'GRADE_A', 'GRADE_B', 'REJECT'],
      default: 'UNGRADED',
    },
    inspectionStatus: {
      type: String,
      enum: ['PENDING', 'IN_INSPECTION', 'PASSED', 'FAILED', 'REWORK_REQUIRED', 'REJECTED'],
      default: 'PENDING',
    },
    productionStage: {
      type: String,
      enum: ['SPINNING', 'WARPING', 'SIZING', 'WEAVING', 'DYEING', 'FINISHING', 'INSPECTION', 'PACKING'],
      default: 'WEAVING',
    },
    rollType: {
      type: String,
      enum: ['FINAL_ROLL', 'INTERMEDIATE_DOFF_ROLL'],
      default: 'FINAL_ROLL',
    },
    currentVerdict: {
      type: String,
      default: 'PENDING',
    },
    reworkCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    inspectionCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    latestInspectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'QualityInspection',
    },
    productionRunId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductionRun',
    },
    doffTimestamp: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: [
        'GREY_OFF_LOOM',
        'IN_INSPECTION',
        'GRADE_A',
        'GRADE_B',
        'REWORK_REQUIRED',
        'REJECTED_SCRAP',
        'PACKED_FOR_DISPATCH',
        'DISPATCHED',
      ],
      default: 'GREY_OFF_LOOM',
    },
    notes: String,
  },
  {
    timestamps: true,
  }
);

fabricRollSchema.index({ orderId: 1, status: 1 });
fabricRollSchema.index({ orderId: 1, inspectionStatus: 1 });
fabricRollSchema.index({ 'genealogy.yarnBatchNumbers': 1 });
fabricRollSchema.index({ loomMachineId: 1 });

export const FabricRoll = mongoose.model('FabricRoll', fabricRollSchema);

