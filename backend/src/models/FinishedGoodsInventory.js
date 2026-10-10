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
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    productName: {
      type: String,
      required: true,
    },
    grade: {
      type: String,
      enum: ['GRADE_A', 'GRADE_B'],
      required: true,
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
      default: 'FG-Warehouse-Rack-1',
    },
    isAllocatedToDispatch: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

finishedGoodsInventorySchema.index({ orderId: 1, isAllocatedToDispatch: 1 });

export const FinishedGoodsInventory = mongoose.model('FinishedGoodsInventory', finishedGoodsInventorySchema);

