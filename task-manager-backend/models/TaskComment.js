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

    // ✅ REQUIRED for normal comments, OPTIONAL for system comments
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // comment = user message
    // system  = auto-generated audit trail
    type: {
      type: String,
      enum: ["comment", "system"],
      default: "comment",
      index: true,
    },

    // ✅ Only used when type === "system"
    action: {
      type: String,
      enum: [
        "task_created",
        "status_changed",
        "assigned",
        "unassigned",
        "due_date_changed",
        "extension_requested",
        "extension_approved",
        "extension_rejected",
      ],
      default: null,
    },

    // ✅ REQUIRED for type === "comment"
    content: {
      type: String,
      trim: true,
      default: "",
    },

    // ✅ structured metadata (safe for system logs)
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

/* ---------------------------------------------------
   SAFETY INDEXES (PERFORMANCE + NO DUPES)
--------------------------------------------------- */

// Fetch comments by task (most common query)
TaskCommentSchema.index({ task: 1, createdAt: 1 });

// Fetch comments by team (audit logs, exports)
TaskCommentSchema.index({ team: 1, createdAt: 1 });

// Prevent invalid "system + author" combos
TaskCommentSchema.pre("save", function (next) {
  if (this.type === "system") {
    this.author = null;
    this.content = this.content || "";
  }
  next();
});

module.exports = mongoose.model("TaskComment", TaskCommentSchema);
