const express = require("express");
const router = express.Router();
const TaskComment = require("../models/TaskComment");
const TTask = require("../models/TTask");
const Team = require("../models/team");
const { protect } = require("../middleware/auth");

// socket
const io = global._io;

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

    const populated = await comment.populate("author", "name photo");

    io.to(`team_${task.team._id}`).emit("commentCreated", {
      taskId: task._id,
      comment: populated,
    });

    res.status(201).json(populated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ---------------- DELETE COMMENT (MODERATOR) ---------------- */
router.delete("/:commentId", protect, async (req, res) => {
  try {
    const comment = await TaskComment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    const team = await Team.findById(comment.team);
    const member = findMember(team, req.user._id);

    if (!member || !["admin", "manager"].includes(member.role))
      return res.status(403).json({ message: "Not authorized" });

    await comment.deleteOne();

    io.to(`team_${team._id}`).emit("commentDeleted", {
      commentId: comment._id,
      taskId: comment.task,
    });

    res.json({ message: "Comment deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
