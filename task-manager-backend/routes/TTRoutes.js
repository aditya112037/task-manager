const express = require("express");
const router = express.Router();
const Team = require("../models/team");
const TTask = require("../models/TTask");
const { protect } = require("../middleware/auth");

// GET all tasks for team - FIXED
router.get("/:teamId", protect, async (req, res) => {
  try {
    // Check if user is a member of the team
    const team = await Team.findById(req.params.teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    const isMember = team.members.some(
      m => String(m.user) === String(req.user._id)
    );

    if (!isMember) {
      return res.status(403).json({ message: "Not authorized to view tasks" });
    }

    const tasks = await TTask.find({ team: req.params.teamId })
      .sort({ createdAt: -1 })
      .populate("createdBy", "name email");

    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// CREATE TASK (Admin or Manager) - FIXED
router.post("/:teamId", protect, async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId);

    if (!team) return res.status(404).json({ message: "Team not found" });

    // Check if user is admin or manager
    const member = team.members.find(
      m => String(m.user) === String(req.user._id)
    );

    if (!member) {
      return res.status(403).json({ message: "Not a member of this team" });
    }

    // Only admin or manager can create tasks
    if (!["admin", "manager"].includes(member.role)) {
      return res.status(403).json({ 
        message: "Only admin or manager can create tasks" 
      });
    }

    const task = await TTask.create({
      team: req.params.teamId,
      title: req.body.title,
      description: req.body.description,
      priority: req.body.priority,
      status: req.body.status || "todo",
      dueDate: req.body.dueDate,
      createdBy: req.user._id
    });

    const populatedTask = await TTask.findById(task._id)
      .populate("createdBy", "name email")
      .populate("team", "name color icon");

    res.json(populatedTask);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// UPDATE TASK (Admin or Manager) - FIXED
router.put("/:taskId", protect, async (req, res) => {
  try {
    const task = await TTask.findById(req.params.taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const team = await Team.findById(task.team);

    // Check if user is a member
    const member = team.members.find(
      m => String(m.user) === String(req.user._id)
    );

    if (!member) {
      return res.status(403).json({ message: "Not a member of this team" });
    }

    // Only admin or manager can modify tasks
    if (!["admin", "manager"].includes(member.role)) {
      return res.status(403).json({
        message: "Only admin or manager can modify tasks."
      });
    }

    const updated = await TTask.findByIdAndUpdate(
      task._id, 
      req.body, 
      { new: true }
    )
    .populate("createdBy", "name email")
    .populate("team", "name color icon");

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE TASK (Admin or Manager) - FIXED
router.delete("/:taskId", protect, async (req, res) => {
  try {
    const task = await TTask.findById(req.params.taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const team = await Team.findById(task.team);

    // Check if user is a member
    const member = team.members.find(
      m => String(m.user) === String(req.user._id)
    );

    if (!member) {
      return res.status(403).json({ message: "Not a member of this team" });
    }

    // Only admin or manager can delete tasks
    if (!["admin", "manager"].includes(member.role)) {
      return res.status(403).json({
        message: "Only admin or manager can delete tasks."
      });
    }

    await task.deleteOne();

    res.json({ message: "Task deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// NEW: GET ALL MY TEAM TASKS (across all teams)
router.get("/my/all", protect, async (req, res) => {
  try {
    // Find all teams user is a member of
    const teams = await Team.find({
      "members.user": req.user._id
    });

    const teamIds = teams.map(team => team._id);

    // Get all tasks from those teams
    const tasks = await TTask.find({
      team: { $in: teamIds }
    })
    .populate("team", "name color icon")
    .populate("createdBy", "name email")
    .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;