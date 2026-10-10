import mongoose from 'mongoose';

const orderMessageAttachmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    fileUrl: { type: String, required: true },
    fileType: { type: String, default: 'application/pdf' },
    fileSize: { type: Number, default: 0 },
  },
  { _id: true }
);

const orderMessageSchema = new mongoose.Schema(
  {
    threadType: {
      type: String,
      required: true,
      enum: ['ORDER_REQUEST', 'QUOTATION', 'ORDER'],
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    senderRole: {
      type: String,
      required: true,
      enum: ['ADMIN', 'CUSTOMER', 'OPERATOR'],
    },
    senderName: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    attachments: [orderMessageAttachmentSchema],
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

orderMessageSchema.index({ referenceId: 1, createdAt: 1 });
orderMessageSchema.index({ threadType: 1, referenceId: 1 });

export const OrderMessage = mongoose.model('OrderMessage', orderMessageSchema);

