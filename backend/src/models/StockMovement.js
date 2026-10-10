import mongoose from 'mongoose';

const stockMovementSchema = new mongoose.Schema(
  {
    movementNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    inventoryItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InventoryItem',
      required: true,
      index: true,
    },
    yarnBatchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'YarnBatch',
    },
    movementType: {
      type: String,
      required: true,
      enum: [
        'PURCHASE_RECEIPT',
        'PRODUCTION_ISSUE',
        'PRODUCTION_RETURN',
        'FINISHED_GOODS_RECEIPT',
        'DISPATCH_ISSUE',
        'PHYSICAL_AUDIT_ADJUSTMENT',
        'SCRAP_WRITE_OFF',
        'STOCK_RESERVATION',
        'STOCK_UNRESERVATION',
      ],
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    previousQuantityOnHand: {
      type: Number,
      required: true,
      min: 0,
    },
    newQuantityOnHand: {
      type: Number,
      required: true,
      min: 0,
    },
    unit: {
      type: String,
      required: true,
      enum: ['KILOGRAM', 'METER', 'CONE', 'LITER', 'ROLL'],
    },
    referenceModel: {
      type: String,
      required: true,
      enum: ['GoodsReceipt', 'ProductionJob', 'Dispatch', 'ManualAdjustment', 'Order', 'PurchaseOrder'],
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reason: String,
  },
  {
    timestamps: true,
  }
);

stockMovementSchema.index({ inventoryItemId: 1, createdAt: -1 });
stockMovementSchema.index({ movementType: 1, createdAt: -1 });
stockMovementSchema.index({ referenceModel: 1, referenceId: 1 });

export const StockMovement = mongoose.model('StockMovement', stockMovementSchema);
