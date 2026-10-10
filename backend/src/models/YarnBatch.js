import mongoose from 'mongoose';

const yarnBatchSchema = new mongoose.Schema(
  {
    batchNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
    },
    inventoryItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InventoryItem',
      required: true,
    },
    yarnSpecification: {
      count: { type: String, required: true },
      blend: { type: String, required: true },
      origin: String,
      lotNumber: String,
    },
    receivedQuantity: {
      type: Number,
      required: true,
      min: [0, 'Received quantity cannot be negative'],
    },
    remainingQuantity: {
      type: Number,
      required: true,
      min: [0, 'Remaining quantity cannot be negative'],
    },
    unit: {
      type: String,
      required: true,
      enum: ['KILOGRAM', 'CONE'],
      default: 'KILOGRAM',
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    qualityCertification: String,
    testReport: {
      moisturePercentage: Number,
      csp: Number,
      twistPerInch: Number,
      strengthPassed: { type: Boolean, default: true },
    },
    receivedDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

yarnBatchSchema.index({ supplierId: 1, receivedDate: -1 });
yarnBatchSchema.index({ inventoryItemId: 1, remainingQuantity: 1 });

export const YarnBatch = mongoose.model('YarnBatch', yarnBatchSchema);

