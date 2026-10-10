import mongoose from 'mongoose';

const goodsReceiptItemSchema = new mongoose.Schema(
  {
    inventoryItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InventoryItem',
      required: true,
    },
    yarnBatchNumber: { type: String, trim: true },
    receivedQuantity: { type: Number, required: true, min: [0.01, 'Received quantity must be positive'] },
    rejectedQuantity: { type: Number, default: 0, min: 0 },
    acceptedQuantity: { type: Number, required: true, min: 0 },
    rejectionReason: String,
    unit: { type: String, required: true, enum: ['KILOGRAM', 'METER', 'CONE', 'LITER', 'ROLL'] },
    warehouseLocation: String,
  },
  { _id: true }
);

const goodsReceiptSchema = new mongoose.Schema(
  {
    grnNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    purchaseOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseOrder',
      required: true,
      index: true,
    },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
    },
    receivedItems: {
      type: [goodsReceiptItemSchema],
      validate: [(val) => val.length > 0, 'GRN must contain at least one received item'],
    },
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receivedDate: {
      type: Date,
      default: Date.now,
    },
    deliveryChallanNumber: {
      type: String,
      required: true,
      trim: true,
    },
    isOverReceipt: {
      type: Boolean,
      default: false,
    },
    overReceiptReason: String,
    overReceiptAuthorizedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    supplierDelayDays: {
      type: Number,
      default: 0,
    },
    remarks: String,
  },
  {
    timestamps: true,
  }
);

goodsReceiptSchema.index({ supplierId: 1, deliveryChallanNumber: 1 }, { unique: true });
goodsReceiptSchema.index({ purchaseOrderId: 1, receivedDate: -1 });

export const GoodsReceipt = mongoose.model('GoodsReceipt', goodsReceiptSchema);
