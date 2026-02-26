const mongoose = require("mongoose");
const { teamSubtaskSchema } = require("./subtask");

const clampPercentage = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.min(100, Math.max(0, Math.round(numeric)));
};

const percentageFromStatus = (status) => {
  if (status === "completed") return 100;
  if (status === "in-progress") return 50;
  return 0;
};

const statusFromPercentage = (percentage) => {
  if (percentage >= 100) return "completed";
  if (percentage > 0) return "in-progress";
  return "todo";
};

const TTaskSchema = new mongoose.Schema(
  {
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },

    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },

    status: {
      type: String,
      enum: ["todo", "in-progress", "completed"],
      default: "todo",
    },

    dueDate: {
      type: Date,
    },

    // 🔥 Extension Request System
    extensionRequest: {
      requested: { type: Boolean, default: false },
      requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      reason: { type: String, trim: true },
      requestedDueDate: { type: Date },
      requestedAt: { type: Date },
      status: {
        type: String,
        enum: ["pending", "approved", "rejected", null],
        default: null,
      },
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      reviewedAt: { type: Date },
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    color: {
      type: String,
      default: "#4CAF50",
    },

    icon: {
      type: String,
      default: "📋",
    },

    lastNotified: { type: Date },
    notificationCount: { type: Number, default: 0 },

    completedAt: { type: Date },
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    isPinned: { type: Boolean, default: false },

    subtasks: {
      type: [teamSubtaskSchema],
      default: [],
    },

    progress: {
      totalSubtasks: { type: Number, default: 0 },
      completedSubtasks: { type: Number, default: 0 },
      percentage: { type: Number, default: 0 },
      lastCalculatedAt: { type: Date, default: Date.now },
    },
  },
  { timestamps: true }
);

TTaskSchema.pre("save", function syncProgressAndStatus(next) {
  const subtasks = Array.isArray(this.subtasks) ? this.subtasks : [];
  const totalSubtasks = subtasks.length;
  let subtaskPercentageSum = 0;
  let completedSubtasks = 0;
  for (const subtask of subtasks) {
    let subtaskPercentage = clampPercentage(
      subtask?.progressPercentage ?? (subtask?.completed ? 100 : 0)
    );
    if (Boolean(subtask?.completed) && subtaskPercentage < 100) {
      subtaskPercentage = 100;
    }
    if (subtaskPercentage >= 100) {
      completedSubtasks += 1;
    }
    subtaskPercentageSum += subtaskPercentage;
    if (subtask) {
      subtask.progressPercentage = subtaskPercentage;
      subtask.completed = subtaskPercentage >= 100;
      subtask.completedAt = subtask.completed ? subtask.completedAt || new Date() : null;
    }
  }
  const derivedPercentage =
    totalSubtasks > 0
      ? Math.round(subtaskPercentageSum / totalSubtasks)
      : clampPercentage(
          this.progress?.percentage ?? percentageFromStatus(this.status)
        );

  this.progress = {
    totalSubtasks,
    completedSubtasks,
    percentage: derivedPercentage,
    lastCalculatedAt: new Date(),
  };

  this.status = statusFromPercentage(derivedPercentage);

  next();
});

// INDEXES
TTaskSchema.index({ team: 1, assignedTo: 1 });
TTaskSchema.index({ team: 1, status: 1 });
TTaskSchema.index({ team: 1, dueDate: 1 });
TTaskSchema.index({ assignedTo: 1, dueDate: 1 });

// 🔥 Required for extension requests
TTaskSchema.index({ "extensionRequest.status": 1 });
TTaskSchema.index({ team: 1, "extensionRequest.status": 1 });

module.exports = mongoose.model("TTask", TTaskSchema);
