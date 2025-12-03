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

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // NEW: Assigned to specific team member
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // NEW: UI enhancements
    color: {
      type: String,
      default: "#4CAF50", // Green
    },

    icon: {
      type: String,
      default: "📋", // Clipboard emoji
    },

    // NEW: Subtasks reference (for Goal 2)
    subtasks: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubTask",
      default: [],
    }],

    // NEW: Task type/category
    category: {
      type: String,
      enum: ["general", "bug", "feature", "improvement", "meeting", "other"],
      default: "general",
    },

    // NEW: Points/estimate (like story points)
    estimate: {
      type: Number,
      min: 0,
      max: 100,
      default: 1,
    },

    // NEW: Tags for better organization
    tags: [{
      type: String,
      trim: true,
    }],
  },
  { timestamps: true }
);

// Index for faster queries
TTaskSchema.index({ team: 1, assignedTo: 1 });
TTaskSchema.index({ team: 1, status: 1 });
TTaskSchema.index({ team: 1, dueDate: 1 });

module.exports = mongoose.model("TTask", TTaskSchema);