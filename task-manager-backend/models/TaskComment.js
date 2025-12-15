const mongoose = require("mongoose");

const TaskCommentSchema = new mongoose.Schema(
  {
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TTask",
      required: true,
      index: true,
    },
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
      index: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    type: {
      type: String,
      enum: ["comment", "system"],
      default: "comment",
    },
    action: {
      type: String,
      enum: [
        "task_created",
        "status_changed",
        "assigned",
        "due_date_changed",
        "extension_requested",
        "extension_approved",
        "extension_rejected",
      ],
    },
    content: {
      type: String,
      trim: true,
    },
    meta: {
      type: Object,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("TaskComment", TaskCommentSchema);
