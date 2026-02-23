const mongoose = require("mongoose");

const executionScoreSnapshotSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    snapshotDate: {
      type: Date,
      required: true,
      index: true,
    },
    windowStart: {
      type: Date,
      required: true,
    },
    windowEnd: {
      type: Date,
      required: true,
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    formulaVersion: {
      type: String,
      default: "v1",
    },
    breakdown: {
      onTimeCompletionRate: { type: Number, default: 0 }, // 0-100
      subtasksConsistencyRate: { type: Number, default: 0 }, // 0-100
      progressUpdateConsistencyRate: { type: Number, default: 0 }, // 0-100
      overduePenaltyRate: { type: Number, default: 0 }, // 0-100
      weightedOnTime: { type: Number, default: 0 },
      weightedSubtasksConsistency: { type: Number, default: 0 },
      weightedProgressConsistency: { type: Number, default: 0 },
      weightedOverduePenaltyDeduction: { type: Number, default: 0 },
    },
    counters: {
      completedSubtasksInWindow: { type: Number, default: 0 },
      completedSubtasksOnTimeInWindow: { type: Number, default: 0 },
      completionActiveDays: { type: Number, default: 0 },
      progressUpdateActiveDays: { type: Number, default: 0 },
      overdueOpenSubtasks: { type: Number, default: 0 },
      openSubtasksWithDueDate: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

executionScoreSnapshotSchema.index({ userId: 1, snapshotDate: 1 }, { unique: true });
executionScoreSnapshotSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("ExecutionScoreSnapshot", executionScoreSnapshotSchema);
