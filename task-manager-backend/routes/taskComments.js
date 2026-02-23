const express = require("express");
const router = express.Router();
const TaskComment = require("../models/TaskComment");
const TTask = require("../models/TTask");
const Team = require("../models/team");
const Notification = require("../models/Notification");
const { emitNotificationsChanged } = require("../utils/notificationEvents");
const { sendPushToUsers } = require("../utils/pushNotifications");
const { protect } = require("../middleware/auth");

// ----------------------------------------------------
// SOCKET HELPERS (INVALIDATION ONLY)
// ----------------------------------------------------
const io = global._io;

const invalidateComments = (teamId, taskId) => {
  if (!io) return;
  io.to(`team_${teamId}`).emit("invalidate:comments", { taskId });
};

const emitCommentCreated = (teamId, taskId, comment) => {
  if (!io) return;
  io.to(`team_${teamId}`).emit("comment:created", { taskId, comment });
};

const emitCommentDeleted = (teamId, taskId, commentId) => {
  if (!io) return;
  io.to(`team_${teamId}`).emit("comment:deleted", { taskId, commentId });
};

/* ---------------- Helper ---------------- */
function findMember(team, userId) {
  return team.members.find((m) => {
    const id = m.user?._id || m.user;
    return String(id) === String(userId);
  });
}

const buildMentionHandle = (value = "") =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_.-]/g, "");

const extractMentionHandles = (content = "") => {
  const matches = String(content).match(/@([a-z0-9_.-]{2,40})/gi) || [];
  return [
    ...new Set(
      matches
        .map((m) => m.slice(1).toLowerCase())
        .filter(Boolean)
    ),
  ];
};

const normalizeRecipientIds = (ids = []) =>
  [...new Set(ids.map((id) => String(id)).filter(Boolean))];

/* ---------------- GET COMMENTS ---------------- */
router.get("/:taskId", protect, async (req, res) => {
  try {
    const task = await TTask.findById(req.params.taskId).populate("team");
    if (!task) return res.status(404).json({ message: "Task not found" });

    const member = findMember(task.team, req.user._id);
    if (!member) return res.status(403).json({ message: "Not authorized" });

    const comments = await TaskComment.find({ task: task._id })
      .populate("author", "name photo")
      .sort({ createdAt: 1 });

    res.json(comments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ---------------- CREATE COMMENT ---------------- */
router.post("/:taskId", protect, async (req, res) => {
  try {
    const task = await TTask.findById(req.params.taskId).populate({
      path: "team",
      populate: { path: "members.user", select: "name photo" },
    });
    if (!task) return res.status(404).json({ message: "Task not found" });

    const member = findMember(task.team, req.user._id);
    if (!member) return res.status(403).json({ message: "Not authorized" });

    const content = String(req.body.content || "").trim();
    const clientRequestId = String(req.body.clientRequestId || "").trim();
    if (!content) {
      return res.status(400).json({ message: "Comment content is required" });
    }

    const mentionHandles = extractMentionHandles(content);
    const mentionUserIds = (task.team.members || [])
      .map((member) => member.user)
      .filter((u) => u && typeof u === "object")
      .filter((u) => mentionHandles.includes(buildMentionHandle(u.name)))
      .map((u) => u._id)
      .filter((uid) => String(uid) !== String(req.user._id));

    const comment = await TaskComment.create({
      task: task._id,
      team: task.team._id,
      author: req.user._id,
      content,
      type: "comment",
      meta: {
        mentionUserIds: normalizeRecipientIds(mentionUserIds),
        clientRequestId: clientRequestId || null,
      },
    });

    // IMPORTANT:
    // We return the created comment (as before),
    // but DO NOT push it to other clients via socket.
    const populated = await comment.populate("author", "name photo");

    const recipientIds = (task.team.members || [])
      .map((m) => m.user)
      .filter(Boolean)
      .map((u) => (typeof u === "object" ? u._id : u))
      .filter((uid) => String(uid) !== String(req.user._id));

    const mentionedIds = normalizeRecipientIds(mentionUserIds);
    const recipientIdStrings = normalizeRecipientIds(recipientIds);
    const nonMentionedRecipientIds = recipientIdStrings.filter(
      (id) => !mentionedIds.includes(id)
    );

    if (nonMentionedRecipientIds.length) {
      await Notification.insertMany(
        nonMentionedRecipientIds.map((uid) => ({
          user: uid,
          type: "task_commented",
          title: "New Comment",
          message: `${req.user.name} commented on "${task.title}".`,
          relatedTask: task._id,
          relatedTeam: task.team._id,
          metadata: { commentId: comment._id },
        })),
        { ordered: false }
      );
      emitNotificationsChanged(nonMentionedRecipientIds);
      await sendPushToUsers(nonMentionedRecipientIds, {
        title: "New Comment",
        body: `${req.user.name} commented on "${task.title}".`,
        url: `/teams/${task.team._id}`,
        tag: `task-comment-${task._id}`,
        data: { taskId: task._id, teamId: task.team._id },
      });
    }

    if (mentionedIds.length) {
      await Notification.insertMany(
        mentionedIds.map((uid) => ({
          user: uid,
          type: "task_commented",
          title: "You were mentioned",
          message: `${req.user.name} mentioned you on "${task.title}".`,
          relatedTask: task._id,
          relatedTeam: task.team._id,
          metadata: { commentId: comment._id, mention: true },
        })),
        { ordered: false }
      );
      emitNotificationsChanged(mentionedIds);
      await sendPushToUsers(mentionedIds, {
        title: "You were mentioned",
        body: `${req.user.name} mentioned you on "${task.title}".`,
        url: `/teams/${task.team._id}`,
        tag: `task-mention-${task._id}`,
        data: { taskId: task._id, teamId: task.team._id, mention: true },
      });
    }

    emitCommentCreated(task.team._id, task._id, populated);
    invalidateComments(task.team._id, task._id);

    res.status(201).json(populated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ---------------- DELETE COMMENT (ADMIN / MANAGER) ---------------- */
router.delete("/:commentId", protect, async (req, res) => {
  try {
    const comment = await TaskComment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    const team = await Team.findById(comment.team);
    if (!team) return res.status(404).json({ message: "Team not found" });

    const member = findMember(team, req.user._id);
    if (!member || !["admin", "manager"].includes(member.role))
      return res.status(403).json({ message: "Not authorized" });

    const taskId = comment.task;
    const commentId = comment._id;
    await comment.deleteOne();

    emitCommentDeleted(team._id, taskId, commentId);
    invalidateComments(team._id, taskId);

    res.json({ message: "Comment deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
