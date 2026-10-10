import mongoose from 'mongoose';

const customerProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    customerCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
    },
    taxId: {
      type: String,
      trim: true,
    },
    billingAddress: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: { type: String, default: 'India' },
    },
    shippingAddress: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: { type: String, default: 'India' },
    },
    creditLimit: {
      type: Number,
      default: 500000,
      min: [0, 'Credit limit cannot be negative'],
    },
    paymentTermsDays: {
      type: Number,
      default: 30,
      min: 0,
    },
    contactPerson: {
      name: String,
      designation: String,
      phone: String,
      email: String,
    },
  },
  {
    timestamps: true,
  }
);

customerProfileSchema.index({ companyName: 'text' });

export const CustomerProfile = mongoose.model('CustomerProfile', customerProfileSchema);

