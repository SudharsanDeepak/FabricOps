import mongoose from 'mongoose';

const defectObservationSchema = new mongoose.Schema(
  {
    defectCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    fabricRollId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FabricRoll',
      index: true,
    },
    inspectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'QualityInspection',
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      index: true,
    },
    machineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Machine',
      required: true,
      index: true,
    },
    productionRunId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductionRun',
      index: true,
    },
    productionJobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductionJob',
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    /**
     * Clear provenance distinction:
     * HUMAN_INSPECTION: Verified manual inspection by quality officer.
     * SIMULATED_DEMO_DATA: Synthetic test patterns for validation.
     * SENSOR_READING: Loom optical/piezo stop-motion sensor reading.
     * AI_VISION_PREDICTION: Unverified deep-learning inference prediction.
     */
    source: {
      type: String,
      required: true,
      enum: ['HUMAN_INSPECTION', 'SIMULATED_DEMO_DATA', 'SENSOR_READING', 'AI_VISION_PREDICTION'],
      index: true,
    },
    defectCategory: {
      type: String,
      required: true,
      enum: [
        'HOLE',
        'COLOUR_MISMATCH',
        'UNEVEN_WEAVING',
        'SLUB',
        'BROKEN_PICK',
        'DROP_STITCH',
        'OIL_STAIN',
        'STAIN',
        'WARP_FLOAT',
        'WEFT_BAR',
        'MISPICK',
        'COARSE_YARN',
        'SNAG',
        'KNOT',
        'CONTAMINATION',
        'OTHER',
      ],
      index: true,
    },
    location: {
      meterPosition: { type: Number, required: true, min: 0 },
      widthInchesFromSelvedge: Number,
      warpOrWeft: {
        type: String,
        enum: ['WARP', 'WEFT', 'BOTH', 'UNKNOWN'],
        default: 'UNKNOWN',
      },
      zone: {
        type: String,
        enum: ['LEFT_SELVEDGE', 'CENTER_BODY', 'RIGHT_SELVEDGE', 'FULL_WIDTH'],
        default: 'CENTER_BODY',
      },
    },
    severity: {
      type: String,
      enum: ['MINOR', 'MAJOR', 'CRITICAL'],
      default: 'MINOR',
    },
    penaltyPoints: {
      type: Number,
      required: true,
      enum: [1, 2, 3, 4],
      default: 1,
    },
    affectedLengthMeters: {
      type: Number,
      default: 0.1,
      min: 0,
    },
    /**
     * Confidence score: 0.00 to 1.00.
     * 1.0 for verified human inspection; decimal for machine learning predictions.
     */
    confidenceScore: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
      default: 1.0,
    },
    /**
     * Protection guard: Unverified AI predictions must NOT be treated as confirmed defects.
     */
    isVerifiedByInspector: {
      type: Boolean,
      default: function () {
        return this.source === 'HUMAN_INSPECTION';
      },
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    verifiedAt: Date,
    evidenceReference: {
      imageUri: String,
      spectralWavelengthNm: Number,
      rawTelemetryPayload: mongoose.Schema.Types.Mixed,
      notes: String,
    },
    reworkEventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ReworkEvent',
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'REPAIRED_REWORK', 'WASTE_CUT', 'DISMISSED_FALSE_POSITIVE'],
      default: 'ACTIVE',
    },
  },
  {
    timestamps: true,
  }
);

defectObservationSchema.index({ machineId: 1, defectCategory: 1 });
defectObservationSchema.index({ orderId: 1, timestamp: -1 });
defectObservationSchema.index({ source: 1, isVerifiedByInspector: 1 });

export const DefectObservation = mongoose.model('DefectObservation', defectObservationSchema);

