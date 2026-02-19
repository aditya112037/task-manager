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
  "conference_ended",
  "personal_task_created",
  "personal_task_updated",
  "personal_task_deleted",
  "team_task_created",
  "team_task_updated",
  "team_task_deleted",
  "task_commented",
  "team_joined",
  "team_left",
  "team_role_updated"
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
