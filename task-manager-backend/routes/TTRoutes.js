const express = require("express");
const router = express.Router();

const Team = require("../models/team");
const TTask = require("../models/TTask");  // ← your renamed model
const { protect } = require("../middleware/auth");

// --------------------------------------------------
// GET ALL TASKS FOR A TEAM
// --------------------------------------------------
router.get("/:teamId", protect, async (req, res) => {
  try {
    const tasks = await TTask.find({ team: req.params.teamId })
      .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET ALL TEAM TASKS FOR LOGGED-IN USER
router.get("/my/all", protect, async (req, res) => {
  try {
    const tasks = await TTask.find({})
      .populate("team")
      .populate("createdBy", "name email")
      .lean();

    // Filter tasks by teams where user is a member
    const filtered = tasks.filter(t =>
      t.team.members.some(m => String(m.user) === String(req.user._id))
    );

    res.json(filtered);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error loading team tasks" });
  }
});


// --------------------------------------------------
// CREATE TASK — ADMIN ONLY
// --------------------------------------------------
router.post("/:teamId", protect, async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    // ⭐ THE CORRECT ADMIN CHECK
    if (team.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only admin can create tasks." });
    }

    const task = await TTask.create({
      team: req.params.teamId,
      title: req.body.title,
      description: req.body.description,
      priority: req.body.priority,
      status: req.body.status,
      dueDate: req.body.dueDate,
      createdBy: req.user._id,
    });

    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// --------------------------------------------------
// UPDATE TASK — ADMIN ONLY
// --------------------------------------------------
router.put("/task/:taskId", protect, async (req, res) => {
  try {
    const task = await TTask.findById(req.params.taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const team = await Team.findById(task.team);
    if (!team) return res.status(404).json({ message: "Team not found" });

    // ⭐ ONLY ADMIN CAN EDIT
    if (team.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only admin can update tasks." });
    }

    const updated = await TTask.findByIdAndUpdate(
      req.params.taskId,
      req.body,
      { new: true }
    );

    res.json(updated);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// --------------------------------------------------
// DELETE TASK — ADMIN ONLY
// --------------------------------------------------
router.delete("/task/:taskId", protect, async (req, res) => {
  try {
    const task = await TTask.findById(req.params.taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const team = await Team.findById(task.team);
    if (!team) return res.status(404).json({ message: "Team not found" });

    // ⭐ ONLY ADMIN CAN DELETE
    if (team.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only admin can delete tasks." });
    }

    await task.deleteOne();
    res.json({ message: "Task deleted" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
