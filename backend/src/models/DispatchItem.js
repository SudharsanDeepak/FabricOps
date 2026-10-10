import mongoose from 'mongoose';

const dispatchItemSchema = new mongoose.Schema(
  {
    dispatchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Dispatch',
      required: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    fabricRollId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FabricRoll',
      required: true,
      index: true,
    },
    rollNumber: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    productName: {
      type: String,
      default: 'Premium Woven Fabric',
    },
    fabricType: {
      type: String,
      default: 'Cotton Poplin',
    },
    color: {
      type: String,
      default: 'Natural White',
    },
    grade: {
      type: String,
      enum: ['GRADE_A', 'GRADE_B'],
      required: true,
    },
    metersDispatched: {
      type: Number,
      required: true,
      min: [0.1, 'Meters dispatched must be greater than zero'],
    },
    weightKg: {
      type: Number,
      default: 0,
    },
    warehouseLocation: {
      type: String,
      default: 'FG-Warehouse-Main',
    },
    ratePerMeter: {
      type: Number,
      required: true,
      min: 0,
    },
    lineTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    packingType: {
      type: String,
      enum: ['POLY_WRAPPED', 'BOXED_CARTON', 'PALLETIZED', 'EXPORT_BALE'],
      default: 'POLY_WRAPPED',
    },
    notes: String,
  },
  {
    timestamps: true,
  }
);

dispatchItemSchema.index({ dispatchId: 1, fabricRollId: 1 }, { unique: true });
dispatchItemSchema.index({ orderId: 1, grade: 1 });

export const DispatchItem = mongoose.model('DispatchItem', dispatchItemSchema);

