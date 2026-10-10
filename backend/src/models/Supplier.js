import mongoose from 'mongoose';

const supplierSchema = new mongoose.Schema(
  {
    supplierCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Supplier name is required'],
      trim: true,
    },
    contactPerson: {
      name: String,
      phone: String,
      email: String,
    },
    taxId: {
      type: String,
      trim: true,
    },
    address: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: { type: String, default: 'India' },
    },
    suppliedCategories: [
      {
        type: String,
        enum: ['RAW_COTTON', 'SPUN_YARN', 'FILAMENT_YARN', 'DYES_CHEMICALS', 'PACKAGING', 'SPARE_PARTS'],
      },
    ],
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: 4.5,
    },
    paymentTermsDays: {
      type: Number,
      default: 30,
      min: 0,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'BLACKLISTED'],
      default: 'ACTIVE',
    },
  },
  {
    timestamps: true,
  }
);

supplierSchema.index({ name: 'text' });

export const Supplier = mongoose.model('Supplier', supplierSchema);

