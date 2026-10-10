import mongoose from 'mongoose';

const dispatchSchema = new mongoose.Schema(
  {
    dispatchNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
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
    dispatchedRollIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FabricRoll',
      },
    ],
    totalRolls: {
      type: Number,
      required: true,
      min: [1, 'Must dispatch at least one roll'],
    },
    totalMetersDispatched: {
      type: Number,
      required: true,
      min: [0.1, 'Total meters must be greater than zero'],
    },
    totalWeightKg: {
      type: Number,
      default: 0,
    },
    carrierName: {
      type: String,
      required: true,
      trim: true,
    },
    vehicleNumber: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    driverName: {
      type: String,
      trim: true,
    },
    driverPhone: {
      type: String,
      trim: true,
    },
    waybillNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    gatePassNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    deliveryReference: {
      type: String,
      trim: true,
    },
    packagingType: {
      type: String,
      enum: ['POLY_WRAPPED_BALES', 'PALLETIZED_EXPORT', 'BOXED_CARTONS'],
      default: 'POLY_WRAPPED_BALES',
    },
    dispatchType: {
      type: String,
      enum: ['FULL', 'PARTIAL'],
      default: 'FULL',
    },
    isPartialDispatch: {
      type: Boolean,
      default: false,
    },
    remainingOrderMeters: {
      type: Number,
      default: 0,
      min: 0,
    },
    idempotencyKey: {
      type: String,
      required: true,
      unique: true, // Prevents duplicate dispatch
      trim: true,
    },
    status: {
      type: String,
      enum: ['PREPARED', 'GATE_CLEARED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'],
      default: 'GATE_CLEARED',
      index: true,
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
    },
    dispatchedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    estimatedDeliveryDate: Date,
    actualDeliveryDate: Date,
    receiverSignatureAck: String,
    proofOfDeliveryNotes: String,
    dispatchedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    notes: String,
  },
  {
    timestamps: true,
  }
);

dispatchSchema.index({ customerId: 1, status: 1 });
dispatchSchema.index({ orderId: 1, createdAt: -1 });

export const Dispatch = mongoose.model('Dispatch', dispatchSchema);
