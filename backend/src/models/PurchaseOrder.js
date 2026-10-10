import mongoose from 'mongoose';

const purchaseOrderItemSchema = new mongoose.Schema(
  {
    inventoryItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InventoryItem',
      required: true,
    },
    description: { type: String, required: true },
    quantity: { type: Number, required: true, min: [0.01, 'Quantity must be positive'] },
    receivedQuantity: { type: Number, default: 0, min: 0 },
    acceptedQuantity: { type: Number, default: 0, min: 0 },
    rejectedQuantity: { type: Number, default: 0, min: 0 },
    unit: { type: String, required: true, enum: ['KILOGRAM', 'METER', 'CONE', 'LITER', 'ROLL'] },
    unitPrice: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: true }
);

const purchaseOrderSchema = new mongoose.Schema(
  {
    poNumber: {
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
    purchaseRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseRequest',
    },
    items: {
      type: [purchaseOrderItemSchema],
      validate: [(val) => val.length > 0, 'Purchase order must have at least one line item'],
    },
    subtotal: { type: Number, required: true, min: 0 },
    taxAmount: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['DRAFT', 'ISSUED', 'PARTIALLY_RECEIVED', 'COMPLETED', 'CANCELLED'],
      default: 'DRAFT',
    },
    expectedDeliveryDate: Date,
    actualDeliveryDate: Date,
    supplierDelayDays: { type: Number, default: 0 },
    allowOverReceipt: { type: Boolean, default: false },
    overReceiptReason: String,
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    notes: String,
  },
  {
    timestamps: true,
  }
);

purchaseOrderSchema.index({ supplierId: 1, status: 1 });
purchaseOrderSchema.index({ expectedDeliveryDate: 1 });

export const PurchaseOrder = mongoose.model('PurchaseOrder', purchaseOrderSchema);
