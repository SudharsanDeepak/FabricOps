import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema(
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
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    lineTotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: true }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    quotationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quotation',
      required: true,
      unique: true, // Guarantees 1-to-1 conversion & prevents duplicate order creation
    },
    idempotencyKey: {
      type: String,
      sparse: true,
      unique: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    items: {
      type: [orderItemSchema],
      validate: [(val) => val.length > 0, 'Confirmed order must have at least one line item'],
    },
    subtotal: { type: Number, required: true, min: 0 },
    taxAmount: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    confirmedDeliveryDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: [
        'CONFIRMED',
        'YARN_ALLOCATED',
        'IN_PRODUCTION',
        'QUALITY_APPROVED',
        'PARTIALLY_DISPATCHED',
        'COMPLETED',
        'CANCELLED',
      ],
      default: 'CONFIRMED',
    },
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'PARTIAL', 'PAID'],
      default: 'PENDING',
    },
    totalMetersOrdered: {
      type: Number,
      default: 0,
    },
    producedMeters: {
      type: Number,
      default: 0,
    },
    dispatchedMeters: {
      type: Number,
      default: 0,
    },
    productionJobIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ProductionJob',
      },
    ],
    customerNotes: String,
    internalNotes: String,
    specificationsValidated: {
      type: Boolean,
      default: true,
    },
    capacityValidated: {
      type: Boolean,
      default: true,
    },
    auditVersion: {
      type: Number,
      default: 1,
    },
    estimatedDeliveryDate: {
      type: Date,
      index: true,
    },
    isAtRiskOfDelay: {
      type: Boolean,
      default: false,
      index: true,
    },
    delayRiskReason: String,
    lastEstimatedRecalculationAt: Date,
  },
  {
    timestamps: true,
    optimisticConcurrency: true,
  }
);

orderSchema.index({ customerId: 1, status: 1 });
orderSchema.index({ confirmedDeliveryDate: 1 });

export const Order = mongoose.model('Order', orderSchema);
