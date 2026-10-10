import mongoose from 'mongoose';

const inventoryItemSchema = new mongoose.Schema(
  {
    sku: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: ['RAW_YARN', 'DYES_CHEMICALS', 'GREY_FABRIC', 'FINISHED_FABRIC', 'SPARE_PARTS'],
    },
    yarnType: {
      type: String,
      trim: true,
    },
    yarnColor: {
      type: String,
      trim: true,
    },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
    },
    batchNumbers: [
      {
        type: String,
        trim: true,
      },
    ],
    unit: {
      type: String,
      required: true,
      enum: ['KILOGRAM', 'METER', 'CONE', 'LITER', 'ROLL'],
    },
    quantityOnHand: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Quantity on hand cannot fall below zero'],
    },
    quantityReserved: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Quantity reserved cannot fall below zero'],
    },
    minimumReorderLevel: {
      type: Number,
      default: 100,
      min: 0,
    },
    unitCost: {
      type: Number,
      required: true,
      min: 0,
    },
    warehouseLocation: {
      type: String,
      trim: true,
    },
    lastAuditedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    optimisticConcurrency: true,
  }
);

inventoryItemSchema.index({ category: 1, quantityOnHand: 1 });
inventoryItemSchema.index({ quantityOnHand: 1, minimumReorderLevel: 1 });

/**
 * Atomic reservation helper: guarantees quantityOnHand - quantityReserved >= amount
 */
inventoryItemSchema.statics.reserveStock = async function (itemId, amount, session = null) {
  if (amount <= 0) throw new Error('Reservation amount must be positive');

  const query = {
    _id: itemId,
    $expr: {
      $gte: [{ $subtract: ['$quantityOnHand', '$quantityReserved'] }, amount],
    },
  };

  const update = {
    $inc: { quantityReserved: amount },
  };

  const options = { new: true, runValidators: true };
  if (session) options.session = session;

  const updated = await this.findOneAndUpdate(query, update, options);
  if (!updated) {
    throw new Error('Insufficient unreserved stock available for reservation');
  }
  return updated;
};

/**
 * Atomic stock deduction helper: safely deducts on-hand and reserved stock without going below 0
 */
inventoryItemSchema.statics.deductStock = async function (itemId, amount, deductFromReserved = true, session = null) {
  if (amount <= 0) throw new Error('Deduction amount must be positive');

  const query = {
    _id: itemId,
    quantityOnHand: { $gte: amount },
    ...(deductFromReserved ? { quantityReserved: { $gte: amount } } : {}),
  };

  const update = {
    $inc: {
      quantityOnHand: -amount,
      ...(deductFromReserved ? { quantityReserved: -amount } : {}),
    },
  };

  const options = { new: true, runValidators: true };
  if (session) options.session = session;

  const updated = await this.findOneAndUpdate(query, update, options);
  if (!updated) {
    throw new Error('Stock deduction failed: Insufficient quantity on hand or reserved');
  }
  return updated;
};

/**
 * Atomic stock receipt helper: safely increments on-hand quantity
 */
inventoryItemSchema.statics.receiveStock = async function (itemId, amount, session = null) {
  if (amount <= 0) throw new Error('Receipt amount must be positive');

  const query = { _id: itemId };
  const update = { $inc: { quantityOnHand: amount } };

  const options = { new: true, runValidators: true };
  if (session) options.session = session;

  const updated = await this.findOneAndUpdate(query, update, options);
  if (!updated) {
    throw new Error('Stock receipt failed: Item not found');
  }
  return updated;
};

/**
 * Atomic reservation release helper: decreases quantityReserved safely
 */
inventoryItemSchema.statics.releaseReservation = async function (itemId, amount, session = null) {
  if (amount <= 0) throw new Error('Release amount must be positive');

  const query = {
    _id: itemId,
    quantityReserved: { $gte: amount },
  };
  const update = { $inc: { quantityReserved: -amount } };

  const options = { new: true, runValidators: true };
  if (session) options.session = session;

  const updated = await this.findOneAndUpdate(query, update, options);
  if (!updated) {
    throw new Error('Reservation release failed: Reserved amount exceeds currently reserved stock');
  }
  return updated;
};

/**
 * Atomic manual stock adjustment helper (physical audit):
 * Prevents onHand falling below 0 or below quantityReserved.
 */
inventoryItemSchema.statics.adjustStock = async function (itemId, deltaAmount, session = null) {
  if (deltaAmount === 0) throw new Error('Adjustment delta cannot be zero');

  const query = {
    _id: itemId,
    ...(deltaAmount < 0
      ? {
          $expr: {
            $gte: [{ $add: ['$quantityOnHand', deltaAmount] }, '$quantityReserved'],
          },
        }
      : {}),
  };

  const update = {
    $inc: { quantityOnHand: deltaAmount },
    $set: { lastAuditedAt: new Date() },
  };

  const options = { new: true, runValidators: true };
  if (session) options.session = session;

  const updated = await this.findOneAndUpdate(query, update, options);
  if (!updated) {
    throw new Error('Adjustment failed: Cannot adjust below reserved stock or negative balance');
  }
  return updated;
};

export const InventoryItem = mongoose.model('InventoryItem', inventoryItemSchema);
