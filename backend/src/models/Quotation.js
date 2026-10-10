import mongoose from 'mongoose';

const materialAvailabilitySchema = new mongoose.Schema(
  {
    yarnInStock: { type: Boolean, default: true },
    onHandKg: { type: Number, default: 0 },
    reservedKg: { type: Number, default: 0 },
    availableKg: { type: Number, default: 0 },
    expectedIncomingKg: { type: Number, default: 0 },
    incomingDeliveryDate: Date,
    supplierGuaranteed: { type: Boolean, default: false }, // Shortage must not imply guaranteed supplier delivery
    shortageKg: { type: Number, default: 0 },
    notes: String,
  },
  { _id: false }
);

const quotationItemSchema = new mongoose.Schema(
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
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
    },
    unit: {
      type: String,
      required: true,
      enum: ['METER', 'KILOGRAM', 'YARD', 'ROLL'],
      default: 'METER',
    },
    unitPrice: {
      type: Number,
      required: true,
      min: [0, 'Unit price cannot be negative'],
    },
    lineTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    estimatedProductionDays: {
      type: Number,
      default: 14,
    },
    yarnAvailableInStock: {
      type: Boolean,
      default: true,
    },
  },
  { _id: true }
);

const quotationRevisionSchema = new mongoose.Schema(
  {
    revisionNumber: { type: Number, required: true },
    items: [quotationItemSchema],
    subtotal: { type: Number },
    taxPercent: { type: Number, default: 5 },
    taxAmount: { type: Number },
    totalAmount: { type: Number, required: true },
    proposedDeliveryDate: { type: Date, required: true },
    productionLeadTimeDays: { type: Number, default: 14 },
    materialAvailability: materialAvailabilitySchema,
    assumptions: [String],
    riskFactors: [String],
    notes: String,
    revisedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const customerDecisionSchema = new mongoose.Schema(
  {
    decision: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'COUNTER_OFFER'],
      default: 'PENDING',
    },
    decidedAt: Date,
    customerNotes: String,
    agreedDeliveryDate: Date,
    agreedPrice: Number,
    counterOffer: {
      targetPrice: Number,
      targetDeliveryDate: Date,
      notes: String,
    },
    decidedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { _id: false }
);

const quotationSchema = new mongoose.Schema(
  {
    quotationNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    orderRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OrderRequest',
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    items: {
      type: [quotationItemSchema],
      validate: [(val) => val.length > 0, 'Quotation must have at least one line item'],
    },
    subtotal: { type: Number, required: true, min: 0 },
    taxPercent: { type: Number, default: 5 },
    taxAmount: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    proposedDeliveryDate: { type: Date, required: true },
    productionLeadTimeDays: { type: Number, default: 14 },
    materialAvailability: materialAvailabilitySchema,
    assumptions: {
      type: [String],
      default: ['Assumes standard loom allocation and quality inspection schedule'],
    },
    riskFactors: {
      type: [String],
      default: ['Estimated dates pending final material confirmation upon order placement'],
    },
    validUntil: { type: Date, required: true },
    currentRevisionNumber: { type: Number, default: 1 },
    revisions: [quotationRevisionSchema],
    customerDecision: {
      type: customerDecisionSchema,
      default: () => ({ decision: 'PENDING' }),
    },
    status: {
      type: String,
      enum: ['DRAFT', 'ISSUED', 'CUSTOMER_ACCEPTED', 'CUSTOMER_REJECTED', 'REVISED', 'EXPIRED', 'CONVERTED_TO_ORDER'],
      default: 'DRAFT',
    },
    adminNotes: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

quotationSchema.index({ customerId: 1, status: 1 });
quotationSchema.index({ orderRequestId: 1 });
quotationSchema.index({ validUntil: 1 });

export const Quotation = mongoose.model('Quotation', quotationSchema);
