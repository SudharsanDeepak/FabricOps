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
  },
  {
    timestamps: true,
  }
);

fabricRollSchema.index({ orderId: 1, status: 1 });
fabricRollSchema.index({ 'genealogy.yarnBatchNumbers': 1 });

export const FabricRoll = mongoose.model('FabricRoll', fabricRollSchema);

