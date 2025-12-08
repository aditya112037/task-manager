const express = require("express");
const router = express.Router();

const Team = require("../models/team");
const TTask = require("../models/TTask");
const Notification = require("../models/Notification");
const { protect } = require("../middleware/auth");

/* ----------------------------------------------------
   ⚠ ROUTE ORDER IS CRITICAL
   Global routes must be BEFORE /:teamId routes
---------------------------------------------------- */

/* ----------------------------------------------------
   0️⃣ GET ALL TEAM TASKS ACROSS ALL TEAMS (Dashboard)
---------------------------------------------------- */
router.get("/my/all", protect, async (req, res) => {
  try {
    // get teams user belongs to
    const teams = await Team.find({ "members.user": req.user._id });
    const teamIds = teams.map((t) => t._id);

    const tasks = await TTask.find({
      team: { $in: teamIds },
    })
      .populate("team", "name color icon")
      .populate("createdBy", "name email photo")
      .populate("assignedTo", "name email photo")
      .populate("extensionRequest.requestedBy", "name email photo")
      .populate("extensionRequest.reviewedBy", "name email photo")
      .sort({ dueDate: 1 });

    res.json(tasks);
  } catch (err) {
    console.error("MY_ALL_TASKS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ----------------------------------------------------
   1️⃣ GET PENDING EXTENSION REQUESTS (Admin/Manager)
---------------------------------------------------- */
router.get("/:teamId/extensions/pending", protect, async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    const member = team.members.find(
      (m) => String(m.user) === String(req.user._id)
    );
    if (!member || !["admin", "manager"].includes(member.role)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const pending = await TTask.find({
      team: req.params.teamId,
      "extensionRequest.status": "pending",
    })
      .populate("createdBy", "name email photo")
      .populate("assignedTo", "name email photo")
      .populate("extensionRequest.requestedBy", "name email photo")
      .sort({ "extensionRequest.requestedAt": -1 });

    res.json(pending);
  } catch (err) {
    console.error("PENDING EXT ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ----------------------------------------------------
   2️⃣ REQUEST EXTENSION (Assigned Member Only)
---------------------------------------------------- */
router.post("/:taskId/request-extension", protect, async (req, res) => {
  try {
    const { reason, requestedDueDate } = req.body;

    const task = await TTask.findById(req.params.taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    if (!task.assignedTo || String(task.assignedTo) !== String(req.user._id)) {
      return res
        .status(403)
        .json({ message: "Only assigned user can request extension" });
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

    const team = await Team.findById(task.team).populate("members.user");
    const approvers = team.members.filter((m) =>
      ["admin", "manager"].includes(m.role)
    );

    // notify admins
    for (const m of approvers) {
      await Notification.create({
        user: m.user._id,
        type: "extension_requested",
        title: "Extension Requested",
        message: `${req.user.name} requested an extension for "${task.title}".`,
        relatedTask: task._id,
        relatedTeam: team._id,
        metadata: { reason, requestedDueDate },
      });
    }

    res.json({ message: "Extension request submitted", task });
  } catch (err) {
    console.error("REQUEST EXT ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ----------------------------------------------------
   3️⃣ APPROVE EXTENSION (Admin/Manager)
---------------------------------------------------- */
router.post("/:taskId/extension/approve", protect, async (req, res) => {
  try {
    const task = await TTask.findById(req.params.taskId).populate("team");
    if (!task) return res.status(404).json({ message: "Task not found" });

    if (
      !task.extensionRequest ||
      task.extensionRequest.status !== "pending" ||
      !task.extensionRequest.requested
    ) {
      return res.status(400).json({ message: "No pending extension request" });
    }

    const team = await Team.findById(task.team._id).populate("members.user");
    const member = team.members.find(
      (m) => String(m.user._id) === String(req.user._id)
    );

    if (!member || !["admin", "manager"].includes(member.role)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    task.dueDate = task.extensionRequest.requestedDueDate;
    task.extensionRequest.status = "approved";
    task.extensionRequest.reviewedBy = req.user._id;
    task.extensionRequest.reviewedAt = new Date();

    await task.save();

    await Notification.create({
      user: task.extensionRequest.requestedBy,
      type: "extension_approved",
      title: "Extension Approved",
      message: `Your extension request for "${task.title}" was approved.`,
      relatedTask: task._id,
      relatedTeam: task.team._id,
      metadata: { newDueDate: task.dueDate },
    });

    res.json({ message: "Extension approved", task });
  } catch (err) {
    console.error("APPROVE EXT ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ----------------------------------------------------
   4️⃣ REJECT EXTENSION (Admin/Manager)
---------------------------------------------------- */
router.post("/:taskId/extension/reject", protect, async (req, res) => {
  try {
    const task = await TTask.findById(req.params.taskId).populate("team");
    if (!task) return res.status(404).json({ message: "Task not found" });

    if (
      !task.extensionRequest ||
      task.extensionRequest.status !== "pending" ||
      !task.extensionRequest.requested
    ) {
      return res.status(400).json({ message: "No pending extension request" });
    }

    const team = await Team.findById(task.team._id).populate("members.user");
    const member = team.members.find(
      (m) => String(m.user._id) === String(req.user._id)
    );

    if (!member || !["admin", "manager"].includes(member.role)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    task.extensionRequest.status = "rejected";
    task.extensionRequest.reviewedBy = req.user._id;
    task.extensionRequest.reviewedAt = new Date();

    await task.save();

    await Notification.create({
      user: task.extensionRequest.requestedBy,
      type: "extension_rejected",
      title: "Extension Rejected",
      message: `Your extension request for "${task.title}" was rejected.`,
      relatedTask: task._id,
      relatedTeam: task.team._id,
    });

    res.json({ message: "Extension rejected", task });
  } catch (err) {
    console.error("REJECT EXT ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ----------------------------------------------------
   5️⃣ GET TASKS ASSIGNED TO A USER (Admin/Manager)
---------------------------------------------------- */
router.get("/:teamId/user/:userId", protect, async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    const member = team.members.find(
      (m) => String(m.user) === String(req.user._id)
    );
    if (!member || !["admin", "manager"].includes(member.role)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const isMember = team.members.some(
      (m) => String(m.user) === req.params.userId
    );
    if (!isMember)
      return res
        .status(400)
        .json({ message: "User not a member of this team" });

    const tasks = await TTask.find({
      team: req.params.teamId,
      assignedTo: req.params.userId,
    })
      .populate("assignedTo", "name photo")
      .populate("team", "name color icon")
      .sort({ dueDate: 1 });

    res.json(tasks);
  } catch (err) {
    console.error("TASK BY USER ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ----------------------------------------------------
   6️⃣ GET MY TASKS IN A TEAM
---------------------------------------------------- */
router.get("/:teamId/my", protect, async (req, res) => {
  try {
    const tasks = await TTask.find({
      team: req.params.teamId,
      assignedTo: req.user._id,
    })
      .populate("team", "name color icon")
      .populate("assignedTo", "name email photo")
      .sort({ dueDate: 1 });

    res.json(tasks);
  } catch (err) {
    console.error("MY TASKS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ----------------------------------------------------
   7️⃣ GET ALL TASKS FOR TEAM (Generic route – MUST BE LAST)
---------------------------------------------------- */
router.get("/:teamId", protect, async (req, res) => {
  try {
    const tasks = await TTask.find({ team: req.params.teamId })
      .populate("assignedTo", "name email photo")
      .populate("createdBy", "name email photo")
      .populate("team", "name color icon")
      .sort({ dueDate: 1 });

    res.json(tasks);
  } catch (err) {
    console.error("TEAM TASKS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
