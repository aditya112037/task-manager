const express = require("express");
const router = express.Router();
const TaskComment = require("../models/TaskComment");
const TTask = require("../models/TTask");
const Team = require("../models/team");
const { protect } = require("../middleware/auth");

// ----------------------------------------------------
// SOCKET HELPERS (INVALIDATION ONLY)
// ----------------------------------------------------
const io = global._io;

const invalidateComments = (teamId, taskId) => {
  if (!io) return;
  io.to(`team_${teamId}`).emit("invalidate:comments", { taskId });
};

/* ---------------- Helper ---------------- */
function findMember(team, userId) {
  return team.members.find((m) => {
    const id = m.user?._id || m.user;
    return String(id) === String(userId);
  });
}

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
    const task = await TTask.findById(req.params.taskId).populate("team");
    if (!task) return res.status(404).json({ message: "Task not found" });

    const member = findMember(task.team, req.user._id);
    if (!member) return res.status(403).json({ message: "Not authorized" });

    const comment = await TaskComment.create({
      task: task._id,
      team: task.team._id,
      author: req.user._id,
      content: req.body.content,
      type: "comment",
    });

    // IMPORTANT:
    // We return the created comment (as before),
    // but DO NOT push it to other clients via socket.
    const populated = await comment.populate("author", "name photo");

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
    await comment.deleteOne();

    invalidateComments(team._id, taskId);

    res.json({ message: "Comment deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
