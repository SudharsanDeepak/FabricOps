import mongoose from 'mongoose';

const dispatchSchema = new mongoose.Schema(
  {
    dispatchNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
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
      min: [1, 'Total meters must be greater than zero'],
    },
    carrierName: {
      type: String,
      required: true,
    },
    vehicleNumber: {
      type: String,
      required: true,
    },
    driverPhone: String,
    waybillNumber: {
      type: String,
      required: true,
      unique: true,
    },
    gatePassNumber: {
      type: String,
      required: true,
      unique: true,
    },
    idempotencyKey: {
      type: String,
      required: true,
      unique: true, // Prevents duplicate dispatch
    },
    status: {
      type: String,
      enum: ['PREPARED', 'GATE_CLEARED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'],
      default: 'PREPARED',
    },
    dispatchedAt: {
      type: Date,
      default: Date.now,
    },
    deliveryTimestamp: Date,
    receiverSignatureAck: String,
    dispatchedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

dispatchSchema.index({ customerId: 1, status: 1 });
dispatchSchema.index({ orderId: 1 });

export const Dispatch = mongoose.model('Dispatch', dispatchSchema);

