import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    recipientRole: {
      type: String,
      enum: ['ADMIN', 'CUSTOMER', 'OPERATOR'],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        'QUOTATION_PROPOSED',
        'QUOTATION_ACCEPTED',
        'ORDER_CONFIRMED',
        'PRODUCTION_STARTED',
        'QC_PASSED',
        'QC_REJECTED',
        'DISPATCH_SHIPPED',
        'INVOICE_GENERATED',
        'PAYMENT_RECEIVED',
        'BREAKDOWN_ALERT',
        'LOW_STOCK_WARNING',
      ],
      index: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    actionUrl: String,
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });

export const Notification = mongoose.model('Notification', notificationSchema);

