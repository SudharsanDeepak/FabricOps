import mongoose from 'mongoose';

const operatorProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    employeeCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    department: {
      type: String,
      required: true,
      enum: ['SPINNING', 'WEAVING', 'DYEING', 'FINISHING', 'MAINTENANCE', 'QC'],
    },
    skillLevel: {
      type: String,
      enum: ['TRAINEE', 'LEVEL_1', 'LEVEL_2', 'MASTER_WEAVER'],
      default: 'LEVEL_1',
    },
    assignedMachines: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Machine',
      },
    ],
    hourlyWageRate: {
      type: Number,
      required: true,
      min: [0, 'Wage rate must be non-negative'],
    },
    emergencyContact: {
      name: String,
      relationship: String,
      phone: String,
    },
  },
  {
    timestamps: true,
  }
);

operatorProfileSchema.index({ department: 1, skillLevel: 1 });

export const OperatorProfile = mongoose.model('OperatorProfile', operatorProfileSchema);

