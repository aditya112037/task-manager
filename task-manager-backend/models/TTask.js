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

    subtasks: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubTask",
      default: [],
    }],

    category: {
      type: String,
      enum: ["general", "bug", "feature", "improvement", "meeting", "other"],
      default: "general",
    },

    estimate: {
      type: Number,
      min: 0,
      max: 100,
      default: 1,
    },

    tags: [{
      type: String,
      trim: true,
    }],

    // EXTENSION REQUEST - FIXED STRUCTURE
    extensionRequest: {
      requested: { 
        type: Boolean, 
        default: false 
      },
      reason: { 
        type: String 
      },
      requestedBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User" 
      },
      requestedAt: { 
        type: Date 
      },
      status: { 
        type: String, 
        enum: ["pending", "approved", "rejected"], 
        default: "pending" 
      },
      requestedDueDate: { 
        type: Date 
      },
      approvedBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User" 
      },
      approvedAt: { 
        type: Date 
      },
      rejectedBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User" 
      },
      rejectedAt: { 
        type: Date 
      },
      rejectionReason: { 
        type: String 
      }
    },

    lastNotified: { 
      type: Date 
    },
    notificationCount: { 
      type: Number, 
      default: 0 
    },

    completedAt: { 
      type: Date 
    },
    completedBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User" 
    },

    isPinned: { 
      type: Boolean, 
      default: false 
    },
  },
  { timestamps: true }
);

// Index for faster queries
TTaskSchema.index({ team: 1, assignedTo: 1 });
TTaskSchema.index({ team: 1, status: 1 });
TTaskSchema.index({ team: 1, dueDate: 1 });
TTaskSchema.index({ assignedTo: 1, dueDate: 1 });
TTaskSchema.index({ "extensionRequest.status": 1 });
TTaskSchema.index({ team: 1, "extensionRequest.status": 1 });

module.exports = mongoose.model("TTask", TTaskSchema);