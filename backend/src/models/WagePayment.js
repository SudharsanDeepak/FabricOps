import mongoose from 'mongoose';

const wagePaymentSchema = new mongoose.Schema(
  {
    paymentNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    wageStatementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WageStatement',
      required: true,
      index: true,
    },
    operatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amountPaid: {
      type: Number,
      required: true,
      min: [0.01, 'Payment amount must be greater than zero'],
    },
    paymentMethod: {
      type: String,
      enum: ['BANK_TRANSFER', 'CHEQUE', 'CASH', 'UPI'],
      default: 'BANK_TRANSFER',
    },
    paymentReference: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    disbursementDate: {
      type: Date,
      default: Date.now,
    },
    disbursedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    bankAccountNumber: {
      type: String,
      trim: true,
    },
    bankIfsc: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['COMPLETED', 'FAILED', 'REVERSED'],
      default: 'COMPLETED',
    },
    notes: String,
  },
  {
    timestamps: true,
  }
);

wagePaymentSchema.index({ operatorId: 1, disbursementDate: -1 });

export const WagePayment = mongoose.model('WagePayment', wagePaymentSchema);

