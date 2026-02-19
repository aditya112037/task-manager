// models/Notification.js
const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
     enum: [
  "task_assigned",
  "task_due_soon",
  "task_overdue",
  "task_completed",

  "extension_requested",
  "extension_approved",
  "extension_rejected",

  "new_team_task",
  "conference_started",
  "conference_ended"
],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    relatedTask: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TTask",
    },
    relatedTeam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
    },
    read: {
      type: Boolean,
      default: false,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
