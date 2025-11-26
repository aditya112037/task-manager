const express = require("express");
const router = express.Router();
const Team = require("../models/team")
const TeamTask = require("../models/teamTask")
const { protect } = require("../middleware/auth");

// GET TEAM TASKS
router.get("/:teamId", protect, async (req, res) => {
  const tasks = await TeamTask.find({ team: req.params.teamId }).sort({ createdAt: -1 });
  res.json(tasks);
});

// CREATE TEAM TASK (Admin only)
router.post("/:teamId", protect, async (req, res) => {
  const team = await Team.findById(req.params.teamId);

  if (!team) return res.status(404).json({ message: "Team not found" });

  if (String(team.createdBy) !== String(req.user._id))
    return res.status(403).json({ message: "Only the team admin can create tasks." });

  const task = await TeamTask.create({
    team: req.params.teamId,
    title: req.body.title,
    description: req.body.description,
    priority: req.body.priority,
    dueDate: req.body.dueDate,
    createdBy: req.user._id,
  });

  res.json(task);
});

// UPDATE TEAM TASK (Admin only)
router.put("/task/:taskId", protect, async (req, res) => {
  const task = await TeamTask.findById(req.params.taskId);
  if (!task) return res.status(404).json({ message: "Task not found" });

  const team = await Team.findById(task.team);

  if (String(team.createdBy) !== String(req.user._id))
    return res.status(403).json({ message: "Only admin can update tasks." });

  const updated = await TeamTask.findByIdAndUpdate(
    task._id,
    req.body,
    { new: true }
  );

  res.json(updated);
});

// DELETE TEAM TASK (Admin only)
router.delete("/task/:taskId", protect, async (req, res) => {
  const task = await TeamTask.findById(req.params.taskId);
  if (!task) return res.status(404).json({ message: "Task not found" });

  const team = await Team.findById(task.team);

  if (String(team.createdBy) !== String(req.user._id))
    return res.status(403).json({ message: "Only admin can delete tasks." });

  await task.deleteOne();
  res.json({ message: "Task deleted" });
});

module.exports = router;
