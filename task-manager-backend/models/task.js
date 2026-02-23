const mongoose = require("mongoose");

const taskSubtaskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
  },
  { _id: true }
);

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
      type: [taskSubtaskSchema],
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
  const completedSubtasks = subtasks.filter((item) => Boolean(item.completed)).length;
  const percentage =
    totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  this.progress = {
    totalSubtasks,
    completedSubtasks,
    percentage,
    lastCalculatedAt: new Date(),
  };

  // When checkpoints exist, parent status is derived from checkpoints.
  if (totalSubtasks > 0) {
    if (completedSubtasks === totalSubtasks) {
      this.status = "completed";
    } else if (completedSubtasks > 0) {
      this.status = "in-progress";
    } else {
      this.status = "todo";
    }
  }

  next();
});

module.exports = mongoose.model("Task", taskSchema);
