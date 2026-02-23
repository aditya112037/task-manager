const mongoose = require("mongoose");

const teamSubtaskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    completed: { type: Boolean, default: false },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    completedAt: { type: Date, default: null },
  },
  { _id: true }
);

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
  const completedSubtasks = subtasks.filter((item) => Boolean(item.completed)).length;
  const percentage =
    totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  this.progress = {
    totalSubtasks,
    completedSubtasks,
    percentage,
    lastCalculatedAt: new Date(),
  };

  // Derive parent status from checkpoints when subtasks exist.
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

// INDEXES
TTaskSchema.index({ team: 1, assignedTo: 1 });
TTaskSchema.index({ team: 1, status: 1 });
TTaskSchema.index({ team: 1, dueDate: 1 });
TTaskSchema.index({ assignedTo: 1, dueDate: 1 });

// 🔥 Required for extension requests
TTaskSchema.index({ "extensionRequest.status": 1 });
TTaskSchema.index({ team: 1, "extensionRequest.status": 1 });

module.exports = mongoose.model("TTask", TTaskSchema);
