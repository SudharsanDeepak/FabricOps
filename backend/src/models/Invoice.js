import mongoose from 'mongoose';

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

export const Invoice = mongoose.model('Invoice', invoiceSchema);

