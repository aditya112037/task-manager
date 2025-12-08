const express = require("express");
const router = express.Router();

const Team = require("../models/team");
const TTask = require("../models/TTask");
const Notification = require("../models/Notification");
const { protect } = require("../middleware/auth");

/* ----------------------------------------------------
   GLOBAL ROUTES (MUST COME FIRST)
---------------------------------------------------- */

/* GET ALL MY TEAM TASKS (Dashboard - Team Tasks tab) */
router.get("/my/all", protect, async (req, res) => {
  try {
    const teams = await Team.find({ "members.user": req.user._id });

    const teamIds = teams.map(t => t._id);

    let query = {
      team: { $in: teamIds }
    };

    if (req.query.priority) query.priority = req.query.priority;
    if (req.query.status) query.status = req.query.status;

    const tasks = await TTask.find(query)
      .populate("team", "name icon color")
      .populate("assignedTo", "name photo")
      .populate("createdBy", "name photo")
      .sort({ dueDate: 1 });

    res.json(tasks);
  } catch (err) {
    console.error("MY ALL TEAM TASKS ERR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ----------------------------------------------------
   EXTENSION ROUTES (BEFORE teamId routes!)
---------------------------------------------------- */

router.post("/:taskId/request-extension", protect, async (req, res) => {
  try {
    const { reason, requestedDueDate } = req.body;
    const task = await TTask.findById(req.params.taskId);

    if (!task) return res.status(404).json({ message: "Task not found" });

    if (!task.assignedTo || String(task.assignedTo) !== String(req.user._id)) {
      return res.status(403).json({ message: "Only assigned member can request extension" });
    }

    task.extensionRequest = {
      requested: true,
      requestedBy: req.user._id,
      reason,
      requestedDueDate,
      requestedAt: new Date(),
      status: "pending",
    };

    await task.save();

    res.json({ message: "Extension request submitted", task });
  } catch (err) {
    console.error("REQUEST EXT ERR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/:taskId/extension/approve", protect, async (req, res) => {
  try {
    const task = await TTask.findById(req.params.taskId).populate("team");

    if (!task) return res.status(404).json({ message: "Task not found" });
    if (task.extensionRequest.status !== "pending") {
      return res.status(400).json({ message: "No pending request" });
    }

    const team = await Team.findById(task.team._id);
    const member = team.members.find(m => String(m.user) === String(req.user._id));

    if (!member || !["admin", "manager"].includes(member.role)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    task.dueDate = task.extensionRequest.requestedDueDate;
    task.extensionRequest.status = "approved";
    task.extensionRequest.reviewedBy = req.user._id;
    task.extensionRequest.reviewedAt = new Date();
    await task.save();

    res.json({ message: "Extension approved", task });
  } catch (err) {
    console.error("APPROVE EXT ERR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/:taskId/extension/reject", protect, async (req, res) => {
  try {
    const task = await TTask.findById(req.params.taskId).populate("team");

    if (!task) return res.status(404).json({ message: "Task not found" });
    if (task.extensionRequest.status !== "pending") {
      return res.status(400).json({ message: "No pending request" });
    }

    const team = await Team.findById(task.team._id);
    const member = team.members.find(m => String(m.user) === String(req.user._id));

    if (!member || !["admin", "manager"].includes(member.role)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    task.extensionRequest.status = "rejected";
    task.extensionRequest.reviewedBy = req.user._id;
    task.extensionRequest.reviewedAt = new Date();
    await task.save();

    res.json({ message: "Extension rejected", task });
  } catch (err) {
    console.error("REJECT EXT ERR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ----------------------------------------------------
   CRUD ROUTES (Create / Update / Delete)
---------------------------------------------------- */

/* CREATE TASK */
router.post("/:teamId", protect, async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId);

    const member = team.members.find(m => String(m.user) === String(req.user._id));
    if (!member || !["admin", "manager"].includes(member.role)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const task = await TTask.create({
      team: req.params.teamId,
      createdBy: req.user._id,
      ...req.body,
    });

    const populated = await TTask.findById(task._id)
      .populate("assignedTo", "name")
      .populate("createdBy", "name")
      .populate("team", "name");

    res.json(populated);
  } catch (err) {
    console.error("CREATE ERR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* UPDATE TASK */
router.put("/:taskId", protect, async (req, res) => {
  try {
    const task = await TTask.findById(req.params.taskId);

    if (!task) return res.status(404).json({ message: "Task not found" });

    const team = await Team.findById(task.team);
    const member = team.members.find(m => String(m.user) === String(req.user._id));

    const canEdit =
      ["admin", "manager"].includes(member.role) ||
      String(task.assignedTo) === String(req.user._id);

    if (!canEdit) return res.status(403).json({ message: "Not authorized" });

    Object.assign(task, req.body);
    await task.save();

    const populated = await TTask.findById(task._id)
      .populate("assignedTo", "name")
      .populate("createdBy", "name")
      .populate("team", "name");

    res.json(populated);
  } catch (err) {
    console.error("UPDATE ERR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* DELETE TASK */
router.delete("/:taskId", protect, async (req, res) => {
  try {
    const task = await TTask.findById(req.params.taskId);

    const team = await Team.findById(task.team);
    const member = team.members.find(m => String(m.user) === String(req.user._id));

    if (!["admin", "manager"].includes(member.role)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await task.deleteOne();
    res.json({ message: "Task deleted" });
  } catch (err) {
    console.error("DELETE ERR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* QUICK COMPLETE */
router.post("/:taskId/quick-complete", protect, async (req, res) => {
  try {
    const task = await TTask.findById(req.params.taskId);
    task.status = "completed";
    task.completedBy = req.user._id;
    task.completedAt = new Date();
    await task.save();
    res.json({ message: "Completed", task });
  } catch (err) {
    console.error("QUICK COMPLETE ERR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ----------------------------------------------------
   TEAM TASK ROUTES (LAST)
---------------------------------------------------- */

/* ----------------------------------------------------
   GET ALL TASKS FOR TEAM — with correct permissions
---------------------------------------------------- */
router.get("/:teamId", protect, async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    const member = team.members.find(
      (m) => String(m.user) === String(req.user._id)
    );

    if (!member) {
      return res.status(403).json({ message: "You are not a member of this team" });
    }

    let tasks;

    // Admin / Manager → see ALL tasks
    if (["admin", "manager"].includes(member.role)) {
      tasks = await TTask.find({ team: req.params.teamId })
        .populate("assignedTo", "name photo")
        .populate("createdBy", "name photo")
        .populate("team", "name color icon")
        .sort({ dueDate: 1 });
    } 
    // Members → only tasks assigned TO THEM
    else {
      tasks = await TTask.find({
        team: req.params.teamId,
        assignedTo: req.user._id,
      })
        .populate("assignedTo", "name photo")
        .populate("createdBy", "name photo")
        .populate("team", "name color icon")
        .sort({ dueDate: 1 });
    }

    res.json(tasks);
  } catch (err) {
    console.error("TEAM TASKS PERMISSION ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});


module.exports = router;
