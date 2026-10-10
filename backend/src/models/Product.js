import mongoose from 'mongoose';

const colourSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    pantoneCode: { type: String, trim: true },
    hexCode: { type: String, trim: true },
  },
  { _id: false }
);

const fabricSpecificationSchema = new mongoose.Schema(
  {
    gsm: { type: Number, min: 20, max: 1000 },
    weaveType: {
      type: String,
      enum: ['PLAIN', 'TWILL', 'SATIN', 'DOBBY', 'JACQUARD', 'OXFORD', 'RIPSTOP', 'KNIT_SINGLE_JERSEY', 'KNIT_INTERLOCK'],
      default: 'PLAIN',
    },
    composition: { type: String, required: true },
    yarnCountWarp: { type: String },
    yarnCountWeft: { type: String },
    construction: { type: String },
    widthInches: { type: Number, min: 10, max: 140 },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    productCode: {
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
      enum: ['RAW_YARN', 'GREY_FABRIC', 'FINISHED_FABRIC', 'DYED_YARN'],
    },
    description: {
      type: String,
      trim: true,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    pricing: {
      basePricePerUnit: { type: Number, required: true, min: 0 },
      currency: { type: String, default: 'INR' },
      minimumOrderQuantity: { type: Number, default: 500, min: 1 },
    },
    fabricSpecification: fabricSpecificationSchema,
    colours: [colourSchema],
    measurementUnit: {
      type: String,
      required: true,
      enum: ['METER', 'KILOGRAM', 'YARD', 'CONE', 'ROLL'],
      default: 'METER',
    },
  },
  {
    timestamps: true,
  }
);

productSchema.index({ category: 1, isPublished: 1 });
productSchema.index({ name: 'text', description: 'text' });

export const Product = mongoose.model('Product', productSchema);

