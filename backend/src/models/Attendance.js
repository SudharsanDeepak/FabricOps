import mongoose from 'mongoose';

const attendanceCorrectionSchema = new mongoose.Schema(
  {
    originalHoursWorked: { type: Number, required: true },
    correctedHoursWorked: { type: Number, required: true },
    originalOvertimeHours: { type: Number, default: 0 },
    correctedOvertimeHours: { type: Number, default: 0 },
    reason: { type: String, required: true, trim: true },
    correctedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    correctedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

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
      index: true, // Normalized to UTC midnight
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
    approvedOvertimeHours: {
      type: Number,
      default: 0,
      min: 0,
    },
    overtimeApprovedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    overtimeStatus: {
      type: String,
      enum: ['NONE', 'PENDING', 'APPROVED', 'REJECTED'],
      default: 'NONE',
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
    corrections: [attendanceCorrectionSchema],
    wageStatementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WageStatement',
      index: true,
    },
    remarks: String,
  },
  {
    timestamps: true,
  }
);

// One attendance record per operator per day
attendanceSchema.index({ operatorId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: 1, status: 1 });

export const Attendance = mongoose.model('Attendance', attendanceSchema);
