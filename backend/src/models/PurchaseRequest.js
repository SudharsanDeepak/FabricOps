import mongoose from 'mongoose';

const purchaseRequestSchema = new mongoose.Schema(
  {
    requestNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    inventoryItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InventoryItem',
      required: true,
    },
    requiredQuantity: {
      type: Number,
      required: true,
      min: [0.01, 'Required quantity must be positive'],
    },
    unit: {
      type: String,
      required: true,
      enum: ['KILOGRAM', 'METER', 'CONE', 'LITER', 'ROLL'],
    },
    reason: {
      type: String,
      required: true,
      default: 'SHORTAGE_FOR_ORDER',
    },
    relatedOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'PO_CREATED', 'REJECTED'],
      default: 'PENDING',
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    purchaseOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseOrder',
    },
    notes: String,
  },
  {
    timestamps: true,
  }
);

purchaseRequestSchema.index({ status: 1, createdAt: -1 });
purchaseRequestSchema.index({ inventoryItemId: 1, status: 1 });

export const PurchaseRequest = mongoose.model('PurchaseRequest', purchaseRequestSchema);

