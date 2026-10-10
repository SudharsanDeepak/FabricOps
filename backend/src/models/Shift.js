import mongoose from 'mongoose';

const shiftSchema = new mongoose.Schema(
  {
    shiftCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      enum: ['MORNING', 'EVENING', 'NIGHT'],
    },
    startTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },
    durationHours: {
      type: Number,
      required: true,
      default: 8,
      min: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Shift = mongoose.model('Shift', shiftSchema);

