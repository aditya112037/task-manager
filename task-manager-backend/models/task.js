const mongoose = require("mongoose");
const { personalSubtaskSchema } = require("./subtask");

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

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    status: { type: String, enum: ["todo", "in-progress", "completed"], default: "todo" },
    dueDate: Date,

    // Personal task owner
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // Team task
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      default: null,
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    subtasks: {
      type: [personalSubtaskSchema],
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

taskSchema.pre("save", function syncProgressAndStatus(next) {
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

module.exports = mongoose.model("Task", taskSchema);
