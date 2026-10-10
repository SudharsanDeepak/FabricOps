import mongoose from 'mongoose';

const rolePermissionSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      required: true,
      unique: true,
      enum: ['ADMIN', 'CUSTOMER', 'OPERATOR'],
    },
    permissions: [
      {
        type: String,
        required: true,
        trim: true,
      },
    ],
    description: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

export const RolePermission = mongoose.model('RolePermission', rolePermissionSchema);
