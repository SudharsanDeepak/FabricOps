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
      index: true,
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
        'ORDER_REQUEST_SUBMITTED',
        'QUOTATION_PROPOSED',
        'QUOTATION_REVISED',
        'QUOTATION_ACCEPTED',
        'QUOTATION_REJECTED',
        'QUOTATION_COUNTER_OFFER',
        'ORDER_CONFIRMED',
        'MESSAGE_RECEIVED',
        'MATERIAL_SHORTAGE',
        'LOW_STOCK_WARNING',
        'SUPPLIER_DELIVERY_DELAYED',
        'PRODUCTION_STARTED',
        'PRODUCTION_STAGE_CHANGED',
        'PRODUCTION_MILESTONE_MISSED',
        'BREAKDOWN_ALERT',
        'TASK_REASSIGNED',
        'QC_PASSED',
        'QC_REJECTED',
        'QUALITY_FAILURE',
        'REWORK_REQUIRED',
        'INSPECTION_COMPLETED',
        'FINISHED_GOODS_AVAILABLE',
        'DISPATCH_SHIPPED',
        'INVOICE_GENERATED',
        'PAYMENT_RECEIVED',
        'DELIVERY_COMPLETED',
      ],
      index: true,
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM',
    },
    eventReference: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      index: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
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
