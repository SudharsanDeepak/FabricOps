import mongoose from 'mongoose';

const invoiceLineItemSchema = new mongoose.Schema(
  {
    fabricRollId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FabricRoll',
    },
    rollNumber: { type: String, required: true },
    fabricType: { type: String, default: 'Cotton Poplin' },
    grade: { type: String, default: 'GRADE_A' },
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
      index: true,
    },
    dispatchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Dispatch',
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
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    invoiceDate: {
      type: Date,
      default: Date.now,
    },
    lineItems: [invoiceLineItemSchema],
    subtotal: { type: Number, required: true, min: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },
    taxRatePercent: { type: Number, default: 5 },
    taxAmount: { type: Number, required: true, min: 0 },
    totalInvoiceAmount: { type: Number, required: true, min: 0 },
    amountPaid: { type: Number, default: 0, min: 0 },
    balanceDue: { type: Number, default: 0, min: 0 },
    paymentTerms: { type: String, default: 'Net 30 Days' },
    dueDate: { type: Date, required: true, index: true },
    paymentStatus: {
      type: String,
      enum: ['UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE'],
      default: 'UNPAID',
      index: true,
    },
    currency: { type: String, default: 'INR' },
    notes: String,
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

invoiceSchema.index({ customerId: 1, paymentStatus: 1 });
invoiceSchema.index({ orderId: 1, createdAt: -1 });

export const Invoice = mongoose.model('Invoice', invoiceSchema);
