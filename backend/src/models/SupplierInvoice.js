import mongoose from 'mongoose';

const supplierPaymentRecordSchema = new mongoose.Schema(
  {
    paymentReference: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0.01 },
    paymentDate: { type: Date, default: Date.now },
    paymentMethod: {
      type: String,
      enum: ['BANK_TRANSFER', 'CHEQUE', 'LETTER_OF_CREDIT', 'CASH'],
      default: 'BANK_TRANSFER',
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    notes: String,
  },
  { _id: true }
);

const supplierInvoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
      index: true,
    },
    purchaseOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseOrder',
      required: true,
      index: true,
    },
    goodsReceiptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GoodsReceipt',
      index: true,
    },
    invoicedQuantity: {
      type: Number,
      required: true,
      min: [0, 'Quantity cannot be negative'],
    },
    unit: {
      type: String,
      default: 'KG',
      trim: true,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: [0, 'Unit price cannot be negative'],
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    balanceDue: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentStatus: {
      type: String,
      enum: ['UNPAID', 'PARTIALLY_PAID', 'PAID', 'CANCELLED'],
      default: 'UNPAID',
      index: true,
    },
    invoiceDate: {
      type: Date,
      default: Date.now,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    paymentRecords: [supplierPaymentRecordSchema],
    notes: String,
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate supplier invoices from the same supplier
supplierInvoiceSchema.index({ supplierId: 1, invoiceNumber: 1 }, { unique: true });

export const SupplierInvoice = mongoose.model('SupplierInvoice', supplierInvoiceSchema);
