import mongoose from 'mongoose';

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      required: true,
      enum: ['PENDING', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'DELAYED', 'FAILED', 'REWORK'],
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    notes: String,
  },
  { _id: true }
);

const orderTimelineEventSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    stage: {
      type: String,
      required: true,
      enum: [
        'ORDER_CONFIRMATION',
        'MATERIAL_PROCUREMENT',
        'MATERIAL_ISSUANCE',
        'SPINNING',
        'WARPING',
        'SIZING',
        'WEAVING',
        'DYEING',
        'FINISHING',
        'QUALITY_INSPECTION',
        'REWORK',
        'FINISHED_GOODS',
        'PACKING',
        'DISPATCH',
        'DELIVERY',
      ],
      index: true,
    },
    sequence: {
      type: Number,
      required: true,
      default: 1,
    },
    title: {
      type: String,
      required: true,
    },
    description: String,
    status: {
      type: String,
      enum: ['PENDING', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'DELAYED', 'FAILED', 'REWORK'],
      default: 'PENDING',
      index: true,
    },
    plannedStartDate: Date,
    plannedCompletionDate: Date,
    actualStartDate: Date,
    actualCompletionDate: Date,
    estimatedCompletionDate: Date, // Dynamically recalculated
    targetQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    completedQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    unit: {
      type: String,
      default: 'METER',
    },
    responsibleMachineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Machine',
    },
    responsibleMachineCode: String,
    responsibleTeam: {
      type: String,
      default: 'Production Operations',
    },
    isDelayed: {
      type: Boolean,
      default: false,
      index: true,
    },
    delayReason: String,
    reworkDetails: {
      reworkRollCount: Number,
      reworkMeters: Number,
      reworkReason: String,
    },
    statusHistory: [statusHistorySchema],
    idempotencyKey: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

orderTimelineEventSchema.index({ orderId: 1, sequence: 1 });
orderTimelineEventSchema.index({ orderId: 1, stage: 1 }, { unique: true });
orderTimelineEventSchema.index({ status: 1, isDelayed: 1 });

export const OrderTimelineEvent = mongoose.model('OrderTimelineEvent', orderTimelineEventSchema);
