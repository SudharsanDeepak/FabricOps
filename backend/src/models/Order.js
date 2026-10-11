import mongoose from 'mongoose';

// ==========================================
// 1. ORDER REQUEST & SPEC DOCUMENTS
// ==========================================

const specDocumentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    fileUrl: { type: String, required: true },
    fileType: { type: String, default: 'application/pdf' },
    fileSize: { type: Number, default: 0 },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const orderRequestItemSchema = new mongoose.Schema(
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
    targetQuantity: {
      type: Number,
      required: true,
      min: [1, 'Target quantity must be at least 1'],
    },
    targetUnit: {
      type: String,
      required: true,
      enum: ['METER', 'KILOGRAM', 'YARD', 'ROLL'],
      default: 'METER',
    },
    targetDeliveryDate: Date,
    targetPricePerUnit: Number,
    notes: String,
  },
  { _id: true }
);

const orderRequestSchema = new mongoose.Schema(
  {
    requestNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    items: {
      type: [orderRequestItemSchema],
      validate: [(val) => val.length > 0, 'Inquiry must have at least one fabric item'],
    },
    specificationDocuments: [specDocumentSchema],
    preferredDeliveryDate: Date,
    customerNotes: String,
    status: {
      type: String,
      enum: ['PENDING_REVIEW', 'QUOTED', 'REJECTED', 'CANCELLED'],
      default: 'PENDING_REVIEW',
    },
    quotationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quotation',
    },
    adminNotes: String,
  },
  {
    timestamps: true,
  }
);

orderRequestSchema.index({ customerId: 1, createdAt: -1 });
orderRequestSchema.index({ status: 1, createdAt: -1 });

export const OrderRequest = mongoose.models.OrderRequest || mongoose.model('OrderRequest', orderRequestSchema);

// ==========================================
// 2. CONFIRMED SALES ORDER
// ==========================================

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

export const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);

// ==========================================
// 3. ORDER MESSAGE THREAD
// ==========================================

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

export const OrderMessage = mongoose.models.OrderMessage || mongoose.model('OrderMessage', orderMessageSchema);

// ==========================================
// 4. ORDER TIMELINE EVENT
// ==========================================

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      required: true,
      enum: ['PENDING', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'DELAYED', 'FAILED', 'REWORK'],
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    notes: String,
  },
  { _id: true }
);

const orderTimelineEventSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    stage: {
      type: String,
      required: true,
      enum: [
        'ORDER_CONFIRMATION',
        'MATERIAL_PROCUREMENT',
        'MATERIAL_ISSUANCE',
        'SPINNING',
        'WARPING',
        'SIZING',
        'WEAVING',
        'DYEING',
        'FINISHING',
        'QUALITY_INSPECTION',
        'REWORK',
        'FINISHED_GOODS',
        'PACKING',
        'DISPATCH',
        'DELIVERY',
      ],
      index: true,
    },
    sequence: {
      type: Number,
      required: true,
      default: 1,
    },
    title: {
      type: String,
      required: true,
    },
    description: String,
    status: {
      type: String,
      enum: ['PENDING', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'DELAYED', 'FAILED', 'REWORK'],
      default: 'PENDING',
      index: true,
    },
    plannedStartDate: Date,
    plannedCompletionDate: Date,
    actualStartDate: Date,
    actualCompletionDate: Date,
    estimatedCompletionDate: Date,
    targetQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    completedQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    unit: {
      type: String,
      default: 'METER',
    },
    responsibleMachineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Machine',
    },
    responsibleMachineCode: String,
    responsibleTeam: {
      type: String,
      default: 'Production Operations',
    },
    isDelayed: {
      type: Boolean,
      default: false,
      index: true,
    },
    delayReason: String,
    reworkDetails: {
      reworkRollCount: Number,
      reworkMeters: Number,
      reworkReason: String,
    },
    statusHistory: [statusHistorySchema],
    idempotencyKey: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

orderTimelineEventSchema.index({ orderId: 1, sequence: 1 });
orderTimelineEventSchema.index({ orderId: 1, stage: 1 }, { unique: true });
orderTimelineEventSchema.index({ status: 1, isDelayed: 1 });

export const OrderTimelineEvent = mongoose.models.OrderTimelineEvent || mongoose.model('OrderTimelineEvent', orderTimelineEventSchema);
