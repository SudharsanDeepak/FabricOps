import mongoose from 'mongoose';

const specDocumentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    fileUrl: { type: String, required: true },
    fileType: { type: String, default: 'application/pdf' },
    fileSize: { type: Number, default: 0 },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const orderRequestItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    fabricSpecSnapshot: {
      gsm: Number,
      weaveType: String,
      composition: String,
      yarnCountWarp: String,
      yarnCountWeft: String,
      construction: String,
      widthInches: Number,
      colorName: String,
    },
    targetQuantity: {
      type: Number,
      required: true,
      min: [1, 'Target quantity must be at least 1'],
    },
    targetUnit: {
      type: String,
      required: true,
      enum: ['METER', 'KILOGRAM', 'YARD', 'ROLL'],
      default: 'METER',
    },
    targetDeliveryDate: Date,
    targetPricePerUnit: Number,
    notes: String,
  },
  { _id: true }
);

const orderRequestSchema = new mongoose.Schema(
  {
    requestNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    items: {
      type: [orderRequestItemSchema],
      validate: [(val) => val.length > 0, 'Inquiry must have at least one fabric item'],
    },
    specificationDocuments: [specDocumentSchema],
    preferredDeliveryDate: Date,
    customerNotes: String,
    status: {
      type: String,
      enum: ['PENDING_REVIEW', 'QUOTED', 'REJECTED', 'CANCELLED'],
      default: 'PENDING_REVIEW',
    },
    quotationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quotation',
    },
    adminNotes: String,
  },
  {
    timestamps: true,
  }
);

orderRequestSchema.index({ customerId: 1, createdAt: -1 });
orderRequestSchema.index({ status: 1, createdAt: -1 });

export const OrderRequest = mongoose.model('OrderRequest', orderRequestSchema);
