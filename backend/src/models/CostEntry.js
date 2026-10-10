import mongoose from 'mongoose';

const costEntrySchema = new mongoose.Schema(
  {
    entryNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    productionJobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductionJob',
      index: true,
    },
    productionRunId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductionRun',
      index: true,
    },
    machineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Machine',
      index: true,
    },
    costCategory: {
      type: String,
      required: true,
      enum: [
        'DIRECT_MATERIAL',
        'DIRECT_LABOUR',
        'MACHINE_OPERATING',
        'DYEING_FINISHING',
        'SUBCONTRACTING',
        'SCRAP_AND_WASTE',
        'REWORK',
        'ALLOCATED_OVERHEAD',
      ],
      index: true,
    },
    costType: {
      type: String,
      required: true,
      enum: ['ESTIMATED', 'ACCRUED', 'ACTUAL'],
      default: 'ACTUAL',
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [0, 'Cost amount must be non-negative'],
    },
    unitQuantity: {
      type: Number,
      default: 0,
    },
    unitOfMeasure: {
      type: String,
      trim: true,
    },
    ratePerUnit: {
      type: Number,
      default: 0,
    },
    sourceReference: {
      type: String,
      required: true,
      trim: true,
    },
    allocationMethod: {
      type: String,
      default: 'DIRECT_INCURRED',
      trim: true,
    },
    description: String,
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index prevents double-counting the same cost event on an order
costEntrySchema.index({ orderId: 1, sourceReference: 1 }, { unique: true });
costEntrySchema.index({ orderId: 1, costCategory: 1, costType: 1 });

export const CostEntry = mongoose.model('CostEntry', costEntrySchema);

