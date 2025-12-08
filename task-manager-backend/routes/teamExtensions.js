const express = require("express");
const router = express.Router();
const Team = require("../models/team");
const TTask = require("../models/TTask");
const { protect } = require("../middleware/auth");

// REQUEST EXTENSION (member)
router.post("/:taskId/request-extension", protect, async (req, res) => {
  try {
    const { reason, newDueDate } = req.body;

    const task = await TTask.findById(req.params.taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    task.extensionRequest = {
      requestedBy: req.user._id,
      reason,
      newDueDate,
      status: "pending",
    };

    await task.save();
    res.json({ message: "Extension requested", task });

  } catch (err) {
    console.error("EXT REQUEST ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET PENDING EXTENSIONS (admin / manager)
router.get("/:teamId/extensions/pending", protect, async (req, res) => {
  try {
    const tasks = await TTask.find({
      team: req.params.teamId,
      "extensionRequest.status": "pending",
    }).populate("extensionRequest.requestedBy");

    res.json(tasks);
  } catch (err) {
    console.error("EXT FETCH ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// APPROVE EXTENSION
router.put("/:taskId/approve-extension", protect, async (req, res) => {
  try {
    const task = await TTask.findById(req.params.taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const team = await Team.findById(task.team);
    const member = team.members.find(m => String(m.user) === String(req.user._id));

    if (!member || !["admin", "manager"].includes(member.role))
      return res.status(403).json({ message: "Forbidden" });

    task.dueDate = task.extensionRequest.newDueDate;
    task.extensionRequest.status = "approved";

    await task.save();
    res.json({ message: "Extension approved", task });

  } catch (err) {
    console.error("EXT APPROVE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// REJECT EXTENSION
router.put("/:taskId/reject-extension", protect, async (req, res) => {
  try {
    const task = await TTask.findById(req.params.taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const team = await Team.findById(task.team);
    const member = team.members.find(m => String(m.user) === String(req.user._id));

    if (!member || !["admin", "manager"].includes(member.role))
      return res.status(403).json({ message: "Forbidden" });

    task.extensionRequest.status = "rejected";
    await task.save();

    res.json({ message: "Extension rejected", task });

  } catch (err) {
    console.error("EXT REJECT ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
