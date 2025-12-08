const mongoose = require("mongoose");

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
  },
  { timestamps: true }
);

// INDEXES
TTaskSchema.index({ team: 1, assignedTo: 1 });
TTaskSchema.index({ team: 1, status: 1 });
TTaskSchema.index({ team: 1, dueDate: 1 });
TTaskSchema.index({ assignedTo: 1, dueDate: 1 });

// 🔥 Required for extension requests
TTaskSchema.index({ "extensionRequest.status": 1 });
TTaskSchema.index({ team: 1, "extensionRequest.status": 1 });

module.exports = mongoose.model("TTask", TTaskSchema);
