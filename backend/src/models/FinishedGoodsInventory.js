import mongoose from 'mongoose';

const finishedGoodsInventorySchema = new mongoose.Schema(
  {
    fabricRollId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FabricRoll',
      required: true,
      unique: true, // One-to-one with inspected roll
    },
    rollNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    productName: {
      type: String,
      required: true,
    },
    fabricType: {
      type: String,
      default: 'Cotton Poplin',
    },
    color: {
      type: String,
      default: 'Standard Natural',
    },
    gsm: {
      type: Number,
      default: 120,
    },
    widthInches: {
      type: Number,
      default: 58,
    },
    grade: {
      type: String,
      enum: ['GRADE_A', 'GRADE_B'],
      required: true,
      index: true,
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
    warehouseLocation: {
      type: String,
      required: true,
      default: 'FG-BAY-A1-RACK-01',
      index: true,
    },
    status: {
      type: String,
      enum: ['AVAILABLE', 'RESERVED_FOR_DISPATCH', 'DISPATCHED'],
      default: 'AVAILABLE',
      index: true,
    },
    packingStatus: {
      type: String,
      enum: ['UNPACKED', 'POLY_WRAPPED', 'BOXED_CARTON', 'PALLETIZED'],
      default: 'POLY_WRAPPED',
    },
    packingCheckedAt: Date,
    packedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reservedForDispatchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Dispatch',
    },
    reservedAt: Date,
    isAllocatedToDispatch: {
      type: Boolean,
      default: false,
      index: true,
    },
    notes: String,
  },
  {
    timestamps: true,
  }
);

finishedGoodsInventorySchema.index({ orderId: 1, status: 1 });
finishedGoodsInventorySchema.index({ warehouseLocation: 1, status: 1 });

export const FinishedGoodsInventory = mongoose.model('FinishedGoodsInventory', finishedGoodsInventorySchema);
