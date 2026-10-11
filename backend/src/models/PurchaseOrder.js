import mongoose from 'mongoose';

// ==========================================
// 1. SUPPLIER MASTER
// ==========================================

const supplierSchema = new mongoose.Schema(
  {
    supplierCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Supplier name is required'],
      trim: true,
    },
    contactPerson: {
      name: String,
      phone: String,
      email: String,
    },
    taxId: {
      type: String,
      trim: true,
    },
    address: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: { type: String, default: 'India' },
    },
    suppliedCategories: [
      {
        type: String,
        enum: ['RAW_COTTON', 'SPUN_YARN', 'FILAMENT_YARN', 'DYES_CHEMICALS', 'PACKAGING', 'SPARE_PARTS'],
      },
    ],
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: 4.5,
    },
    paymentTermsDays: {
      type: Number,
      default: 30,
      min: 0,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'BLACKLISTED'],
      default: 'ACTIVE',
    },
  },
  {
    timestamps: true,
  }
);

supplierSchema.index({ name: 'text' });

export const Supplier = mongoose.models.Supplier || mongoose.model('Supplier', supplierSchema);

// ==========================================
// 2. PURCHASE REQUEST
// ==========================================

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

export const PurchaseRequest = mongoose.models.PurchaseRequest || mongoose.model('PurchaseRequest', purchaseRequestSchema);

// ==========================================
// 3. PURCHASE ORDER
// ==========================================

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

export const PurchaseOrder = mongoose.models.PurchaseOrder || mongoose.model('PurchaseOrder', purchaseOrderSchema);
