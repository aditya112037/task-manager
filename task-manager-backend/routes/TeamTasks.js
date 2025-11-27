const express = require("express");
const router = express.Router();
const Team = require("../models/team");
const { protect } = require("../middleware/auth");
const TeamTask = require("../models/teamTask");

/**
 * Helper: check if user is admin of the team
 */
async function isTeamAdmin(teamId, userId) {
  const team = await Team.findById(teamId);
  if (!team) return null;

  return {
    team,
    isAdmin: String(team.admin) === String(userId)
  };
}

/* ---------------------------------------------
   GET ALL TASKS FOR A TEAM (Admin + Members)
--------------------------------------------- */
router.get("/:teamId", protect, async (req, res) => {
  try {
    const tasks = await TeamTask.find({ team: req.params.teamId }) // ✅ Changed to TeamTask
      .sort({ createdAt: -1 });

    res.json(tasks);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});


/* ---------------------------------------------
   CREATE TEAM TASK (Admin only)
--------------------------------------------- */
router.post("/:teamId", protect, async (req, res) => {
  try {
    const teamData = await isTeamAdmin(req.params.teamId, req.user._id);
    if (!teamData) return res.status(404).json({ message: "Team not found" });
    if (!teamData.isAdmin) return res.status(403).json({ message: "Only admin can create tasks." });

    const task = await TeamTask.create({ // ✅ Changed to TeamTask
      team: req.params.teamId,
      title: req.body.title,
      description: req.body.description,
      priority: req.body.priority,
      status: req.body.status,
      dueDate: req.body.dueDate,
      createdBy: req.user._id,
    });

    res.status(201).json(task);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});


/* ---------------------------------------------
   UPDATE TEAM TASK (Admin only)
--------------------------------------------- */
router.put("/task/:taskId", protect, async (req, res) => {
  try {
    const task = await TeamTask.findById(req.params.taskId); // ✅ Changed to TeamTask
    if (!task) return res.status(404).json({ message: "Task not found" });

    const teamData = await isTeamAdmin(task.team, req.user._id);
    if (!teamData) return res.status(404).json({ message: "Team not found" });
    if (!teamData.isAdmin) return res.status(403).json({ message: "Only admin can update tasks." });

    const updated = await TeamTask.findByIdAndUpdate( // ✅ Changed to TeamTask
      task._id,
      req.body,
      { new: true }
    );

    res.json(updated);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});


/* ---------------------------------------------
   DELETE TEAM TASK (Admin only)
--------------------------------------------- */
router.delete("/task/:taskId", protect, async (req, res) => {
  try {
    const task = await TeamTask.findById(req.params.taskId); // ✅ Changed to TeamTask
    if (!task) return res.status(404).json({ message: "Task not found" });

    const teamData = await isTeamAdmin(task.team, req.user._id);
    if (!teamData) return res.status(404).json({ message: "Team not found" });
    if (!teamData.isAdmin) return res.status(403).json({ message: "Only admin can delete tasks." });

    await task.deleteOne();

    res.json({ message: "Task deleted" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;