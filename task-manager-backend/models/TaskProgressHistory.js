const mongoose = require("mongoose");

const taskProgressHistorySchema = new mongoose.Schema(
  {
    taskType: {
      type: String,
      enum: ["personal", "team"],
      required: true,
    },
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      default: null,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    before: {
      totalSubtasks: { type: Number, default: 0 },
      completedSubtasks: { type: Number, default: 0 },
      percentage: { type: Number, default: 0 },
    },
    after: {
      totalSubtasks: { type: Number, default: 0 },
      completedSubtasks: { type: Number, default: 0 },
      percentage: { type: Number, default: 0 },
    },
    delta: {
      totalSubtasks: { type: Number, default: 0 },
      completedSubtasks: { type: Number, default: 0 },
      percentage: { type: Number, default: 0 },
    },
    triggerSource: {
      type: String,
      default: "unknown",
      trim: true,
      maxlength: 80,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

taskProgressHistorySchema.index({ taskType: 1, taskId: 1, createdAt: -1 });
taskProgressHistorySchema.index({ userId: 1, createdAt: -1 });
taskProgressHistorySchema.index({ actorId: 1, createdAt: -1 });

module.exports = mongoose.model("TaskProgressHistory", taskProgressHistorySchema);
