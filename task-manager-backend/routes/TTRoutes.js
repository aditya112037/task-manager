const express = require("express");
const router = express.Router();
const Team = require("../models/team");
const TTask = require("../models/TTask");
const { protect } = require("../middleware/auth");

// GET all tasks for team
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

// CREATE TASK (Admin Only)
router.post("/:teamId", protect, async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId);

    if (!team) return res.status(404).json({ message: "Team not found" });

    // *** FIX HERE ***
    if (String(team.admin) !== String(req.user._id)) {
      return res.status(403).json({ message: "Only team admin can create tasks." });
    }

    const task = await TTask.create({
      team: req.params.teamId,
      title: req.body.title,
      description: req.body.description,
      priority: req.body.priority,
      status: req.body.status,
      dueDate: req.body.dueDate,
      createdBy: req.user._id
    });

    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// UPDATE TASK (Admin Only)
router.put("/:taskId", protect, async (req, res) => {
  try {
    const task = await TTask.findById(req.params.taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const team = await Team.findById(task.team);

    if (String(team.admin) !== String(req.user._id)) {
      return res.status(403).json({ message: "Only admin can update tasks." });
    }

    const updated = await TTask.findByIdAndUpdate(task._id, req.body, {
      new: true,
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE TASK (Admin Only)
router.delete("/:taskId", protect, async (req, res) => {
  try {
    const task = await TTask.findById(req.params.taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const team = await Team.findById(task.team);

    if (String(team.admin) !== String(req.user._id)) {
      return res.status(403).json({ message: "Only admin can delete tasks." });
    }

    await task.deleteOne();

    res.json({ message: "Task deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
