import mongoose from 'mongoose';

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
      unique: true, // Bank UTR or cheque reference uniqueness prevents double entry
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

export const CustomerPayment = mongoose.model('CustomerPayment', customerPaymentSchema);

