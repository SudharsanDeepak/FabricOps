import mongoose from 'mongoose';

// ==========================================
// 1. QUOTATION & FEASIBILITY REVISIONS
// ==========================================

const materialAvailabilitySchema = new mongoose.Schema(
  {
    yarnInStock: { type: Boolean, default: true },
    onHandKg: { type: Number, default: 0 },
    reservedKg: { type: Number, default: 0 },
    availableKg: { type: Number, default: 0 },
    expectedIncomingKg: { type: Number, default: 0 },
    incomingDeliveryDate: Date,
    supplierGuaranteed: { type: Boolean, default: false },
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

export const Quotation = mongoose.models.Quotation || mongoose.model('Quotation', quotationSchema);

// ==========================================
// 2. MANUFACTURING COST BREAKDOWN
// ==========================================

const manufacturingCostSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    productionJobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductionJob',
      index: true,
    },
    estimatedRawMaterialCost: { type: Number, required: true, min: 0 },
    actualRawMaterialCost: { type: Number, default: 0, min: 0 },

    estimatedLaborCost: { type: Number, required: true, min: 0 },
    actualLaborCost: { type: Number, default: 0, min: 0 },

    estimatedPowerCost: { type: Number, required: true, min: 0 },
    actualPowerCost: { type: Number, default: 0, min: 0 },

    overheadAllocation: { type: Number, default: 0, min: 0 },

    totalEstimatedCost: { type: Number, required: true, min: 0 },
    totalActualCost: { type: Number, default: 0, min: 0 },
    varianceAmount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

manufacturingCostSchema.pre('save', function (next) {
  this.totalEstimatedCost =
    this.estimatedRawMaterialCost + this.estimatedLaborCost + this.estimatedPowerCost + this.overheadAllocation;
  this.totalActualCost =
    this.actualRawMaterialCost + this.actualLaborCost + this.actualPowerCost + this.overheadAllocation;
  this.varianceAmount = this.totalActualCost - this.totalEstimatedCost;
  next();
});

export const ManufacturingCost = mongoose.models.ManufacturingCost || mongoose.model('ManufacturingCost', manufacturingCostSchema);

// ==========================================
// 3. INVOICE BILLING
// ==========================================

const invoiceLineItemSchema = new mongoose.Schema(
  {
    rollNumber: { type: String, required: true },
    meters: { type: Number, required: true, min: 0.1 },
    ratePerMeter: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: true }
);

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    dispatchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Dispatch',
      required: true,
      unique: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    lineItems: [invoiceLineItemSchema],
    subtotal: { type: Number, required: true, min: 0 },
    taxRatePercent: { type: Number, default: 5 },
    taxAmount: { type: Number, required: true, min: 0 },
    totalInvoiceAmount: { type: Number, required: true, min: 0 },
    amountPaid: { type: Number, default: 0, min: 0 },
    paymentTerms: { type: String, default: 'Net 30 Days' },
    dueDate: { type: Date, required: true },
    paymentStatus: {
      type: String,
      enum: ['UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE'],
      default: 'UNPAID',
    },
  },
  {
    timestamps: true,
  }
);

invoiceSchema.index({ customerId: 1, paymentStatus: 1 });
invoiceSchema.index({ dueDate: 1 });

export const Invoice = mongoose.models.Invoice || mongoose.model('Invoice', invoiceSchema);

// ==========================================
// 4. CUSTOMER PAYMENT RECORD
// ==========================================

const customerPaymentSchema = new mongoose.Schema(
  {
    paymentNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      required: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amountPaid: {
      type: Number,
      required: true,
      min: [0.01, 'Payment amount must be greater than zero'],
    },
    paymentMethod: {
      type: String,
      required: true,
      enum: ['BANK_TRANSFER', 'CHEQUE', 'CREDIT_CARD', 'UPI', 'LETTER_OF_CREDIT', 'CASH'],
    },
    referenceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    paidAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['RECORDED', 'CLEARED', 'BOUNCED', 'REFUNDED'],
      default: 'RECORDED',
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    notes: String,
  },
  {
    timestamps: true,
  }
);

customerPaymentSchema.index({ customerId: 1, paidAt: -1 });

export const CustomerPayment = mongoose.models.CustomerPayment || mongoose.model('CustomerPayment', customerPaymentSchema);
