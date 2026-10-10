import mongoose from 'mongoose';

const defectSchema = new mongoose.Schema(
  {
    defectType: {
      type: String,
      required: true,
      enum: [
        'Hole',
        'Colour Mismatch',
        'Uneven Weaving',
        'Slub',
        'Broken Pick',
        'Drop Stitch',
        'Stain',
        'Mispick',
        'Warp Float',
        'Weft Bar',
        'Coarse Yarn',
        'Snag',
        'Knot',
        'Contamination',
        'Other',
      ],
    },
    points: {
      type: Number,
      required: true,
      enum: [1, 2, 3, 4],
    },
    meterPosition: {
      type: Number,
      required: true,
      min: 0,
    },
    lengthInches: {
      type: Number,
      default: 1,
    },
    warpOrWeft: {
      type: String,
      enum: ['WARP', 'WEFT', 'BOTH', 'UNKNOWN'],
      default: 'UNKNOWN',
    },
    severity: {
      type: String,
      enum: ['MINOR', 'MAJOR', 'CRITICAL'],
      default: 'MINOR',
    },
    imageUri: String,
    notes: String,
  },
  { _id: true }
);

const qualityInspectionSchema = new mongoose.Schema(
  {
    inspectionNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    fabricRollId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FabricRoll',
      required: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    inspectorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    inspectionStandard: {
      type: String,
      enum: ['FOUR_POINT_SYSTEM', 'TEN_POINT_SYSTEM', 'AI_ASSISTED_VISION'],
      default: 'FOUR_POINT_SYSTEM',
    },
    inspectedLengthMeters: {
      type: Number,
      required: true,
      min: [1, 'Inspected length must be greater than zero'],
    },
    fabricWidthInches: {
      type: Number,
      required: true,
      default: 58,
    },
    defects: [defectSchema],
    totalPenaltyPoints: {
      type: Number,
      default: 0,
      min: 0,
    },
    pointsPer100SqMeters: {
      type: Number,
      default: 0,
      min: 0,
    },
    grade: {
      type: String,
      enum: ['GRADE_A', 'GRADE_B', 'REJECT'],
      required: true,
    },
    verdict: {
      type: String,
      enum: ['PASSED', 'REWORK', 'SCRAP'],
      required: true,
    },
    inspectionStatus: {
      type: String,
      enum: ['PENDING', 'PASSED', 'FAILED', 'REWORK_REQUIRED', 'REJECTED'],
      default: 'PASSED',
    },
    inspectionCycle: {
      type: Number,
      default: 1,
      min: 1,
    },
    isReinspection: {
      type: Boolean,
      default: false,
    },
    reworkEventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ReworkEvent',
    },
    reworkInstructions: String,
    aiConfidenceScore: Number,
    inspectionDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

qualityInspectionSchema.index({ fabricRollId: 1, inspectionDate: -1 });
qualityInspectionSchema.index({ orderId: 1, grade: 1 });
qualityInspectionSchema.index({ inspectionStatus: 1 });

/**
 * Pre-save hook: auto-computes 4-point penalty totals and standard fabric grading
 */
qualityInspectionSchema.pre('validate', function (next) {
  if (this.defects && this.defects.length >= 0) {
    this.totalPenaltyPoints = this.defects.reduce((acc, d) => acc + (d.points || 0), 0);

    if (this.inspectedLengthMeters > 0 && this.fabricWidthInches > 0) {
      const pointsPer100SqM = (this.totalPenaltyPoints * 100 * 39.37) / (this.inspectedLengthMeters * this.fabricWidthInches);
      this.pointsPer100SqMeters = parseFloat(pointsPer100SqM.toFixed(2));

      if (this.pointsPer100SqMeters <= 20) {
        this.grade = 'GRADE_A';
        this.verdict = 'PASSED';
        this.inspectionStatus = 'PASSED';
      } else if (this.pointsPer100SqMeters <= 28) {
        this.grade = 'GRADE_B';
        this.verdict = 'PASSED';
        this.inspectionStatus = 'PASSED';
      } else {
        this.grade = 'REJECT';
        // If rework instructions provided, flag as REWORK, otherwise SCRAP/REJECTED
        if (this.verdict === 'REWORK' || this.inspectionStatus === 'REWORK_REQUIRED' || Boolean(this.reworkInstructions)) {
          this.verdict = 'REWORK';
          this.inspectionStatus = 'REWORK_REQUIRED';
        } else {
          this.verdict = 'SCRAP';
          this.inspectionStatus = 'REJECTED';
        }
      }
    }
  }
  next();
});

export const QualityInspection = mongoose.model('QualityInspection', qualityInspectionSchema);

