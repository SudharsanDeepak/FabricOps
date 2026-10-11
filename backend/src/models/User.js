import mongoose from 'mongoose';

// ==========================================
// 1. CORE USER IDENTITY
// ==========================================

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'User name is required'],
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email address'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false, // Never return in default queries
    },
    role: {
      type: String,
      required: true,
      enum: {
        values: ['ADMIN', 'CUSTOMER', 'OPERATOR'],
        message: '{VALUE} is not a valid user role',
      },
    },
    phone: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'],
      default: 'ACTIVE',
    },
    lastLoginAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index({ role: 1, status: 1 });

export const User = mongoose.models.User || mongoose.model('User', userSchema);

// ==========================================
// 2. CUSTOMER PROFILE
// ==========================================

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

export const CustomerProfile = mongoose.models.CustomerProfile || mongoose.model('CustomerProfile', customerProfileSchema);

// ==========================================
// 3. OPERATOR PROFILE
// ==========================================

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

export const OperatorProfile = mongoose.models.OperatorProfile || mongoose.model('OperatorProfile', operatorProfileSchema);

// ==========================================
// 4. ROLE PERMISSIONS
// ==========================================

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

export const RolePermission = mongoose.models.RolePermission || mongoose.model('RolePermission', rolePermissionSchema);

// ==========================================
// 5. ATTENDANCE RECORD
// ==========================================

const attendanceSchema = new mongoose.Schema(
  {
    operatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    shiftId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shift',
      required: true,
    },
    checkInTime: {
      type: Date,
    },
    checkOutTime: {
      type: Date,
    },
    hoursWorked: {
      type: Number,
      default: 0,
      min: 0,
    },
    overtimeHours: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['PRESENT', 'ABSENT', 'HALF_DAY', 'ON_LEAVE'],
      default: 'PRESENT',
      index: true,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    remarks: String,
  },
  {
    timestamps: true,
  }
);

attendanceSchema.index({ operatorId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: 1, status: 1 });

export const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);

// ==========================================
// 6. WAGE CALCULATION
// ==========================================

const wageCalculationSchema = new mongoose.Schema(
  {
    calculationNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    operatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    periodStartDate: { type: Date, required: true },
    periodEndDate: { type: Date, required: true },
    regularHoursWorked: { type: Number, required: true, min: 0 },
    overtimeHoursWorked: { type: Number, default: 0, min: 0 },
    baseHourlyRate: { type: Number, required: true, min: 0 },
    regularWage: { type: Number, required: true, min: 0 },
    overtimeWage: { type: Number, default: 0, min: 0 },
    productionIncentiveBonus: { type: Number, default: 0, min: 0 },
    deductions: { type: Number, default: 0, min: 0 },
    netPayableWage: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['DRAFT', 'APPROVED', 'PAID'],
      default: 'DRAFT',
    },
    paymentDate: Date,
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

wageCalculationSchema.index({ operatorId: 1, periodStartDate: 1, periodEndDate: 1 });

export const WageCalculation = mongoose.models.WageCalculation || mongoose.model('WageCalculation', wageCalculationSchema);

// ==========================================
// 7. AUDIT LOG (APPEND-ONLY)
// ==========================================

const auditLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    actorRole: {
      type: String,
      enum: ['ADMIN', 'CUSTOMER', 'OPERATOR', 'SYSTEM'],
      required: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    entityType: {
      type: String,
      required: true,
      index: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    previousState: {
      type: mongoose.Schema.Types.Mixed,
    },
    newState: {
      type: mongoose.Schema.Types.Mixed,
    },
    ipAddress: String,
    idempotencyKey: {
      type: String,
      index: true,
    },
    notes: String,
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
auditLogSchema.index({ actorId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

export const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);
