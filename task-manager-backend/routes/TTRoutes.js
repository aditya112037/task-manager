const express = require("express");
const router = express.Router();
const TTask = require("../models/TTask");
const Team = require("../models/team");
const mongoose = require("mongoose");
const TaskComment = require("../models/TaskComment");
const { protect } = require("../middleware/auth");

// ----------------------------------------------------
// SOCKET HELPERS (INVALIDATION ONLY)
// ----------------------------------------------------
const io = global._io;

const invalidateTasks = (teamId) => {
  if (!io) return;
  io.to(`team_${teamId}`).emit("invalidate:tasks", { teamId });
};

const invalidateTeam = (teamId) => {
  if (!io) return;
  io.to(`team_${teamId}`).emit("invalidate:teams", { teamId });
};

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

const ALLOWED_TASK_UPDATE_FIELDS = [
  "title",
  "description",
  "priority",
  "status",
  "dueDate",
  "assignedTo",
  "color",
  "icon",
  "isPinned",
];

const isValidDate = (value) => {
  if (!value) return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime());
};

/* ---------------- GET ALL TEAM TASKS ---------------- */
router.get("/:teamId", protect, async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    const member = findMember(team, req.user._id);
    if (!member) return res.status(403).json({ message: "Not authorized" });

    const tasks = await TTask.find({ team: team._id })
      .populate("assignedTo", "name photo")
      .populate("createdBy", "name photo")
      .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ---------------- GET PENDING EXTENSIONS ---------------- */
router.get("/:teamId/extensions/pending", protect, async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    const member = findMember(team, req.user._id);
    if (!member || !["admin", "manager"].includes(member.role))
      return res.status(403).json({ message: "Not authorized" });

    const tasks = await TTask.find({
      team: team._id,
      "extensionRequest.status": "pending",
    })
      .populate("assignedTo", "name photo")
      .populate("extensionRequest.requestedBy", "name photo");

    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ---------------- CREATE TASK ---------------- */
router.post("/:teamId", protect, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.teamId))
      return res.status(404).json({ message: "Team not found" });

    const team = await Team.findById(req.params.teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    const member = findMember(team, req.user._id);

    if (!member || !["admin", "manager"].includes(member.role))
      return res.status(403).json({ message: "Not allowed" });

    const task = await TTask.create({
      ...req.body,
      team: team._id,
      createdBy: req.user._id,
    });

    await TaskComment.create({
      task: task._id,
      team: team._id,
      type: "system",
      action: "task_created",
      meta: { title: task.title },
    });

    invalidateTasks(team._id);
    invalidateComments(team._id, task._id);

    res.status(201).json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ---------------- UPDATE TASK ---------------- */
router.put("/:taskId", protect, async (req, res) => {
  try {
    const task = await TTask.findById(req.params.taskId).populate("team");
    if (!task) return res.status(404).json({ message: "Task not found" });

    const member = findMember(task.team, req.user._id);
    if (!member) return res.status(403).json({ message: "Not authorized" });

    const isAdminOrManager = ["admin", "manager"].includes(member.role);

    const updates = {};
    for (const field of ALLOWED_TASK_UPDATE_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    }

    if (!isAdminOrManager) {
      const memberAllowedKeys = ["status"];
      const updateKeys = Object.keys(updates);

      if (String(task.assignedTo) !== String(req.user._id)) {
        return res.status(403).json({ message: "Only assignee can update task status" });
      }

      const hasForbiddenMemberUpdate = updateKeys.some(
        (key) => !memberAllowedKeys.includes(key)
      );
      if (hasForbiddenMemberUpdate) {
        return res.status(403).json({
          message: "Members can only update task status",
        });
      }
    }

    if (
      Object.prototype.hasOwnProperty.call(updates, "dueDate") &&
      updates.dueDate &&
      !isValidDate(updates.dueDate)
    ) {
      return res.status(400).json({ message: "Invalid due date" });
    }

    if (Object.prototype.hasOwnProperty.call(updates, "assignedTo") && updates.assignedTo) {
      const assignedMember = findMember(task.team, updates.assignedTo);
      if (!assignedMember) {
        return res.status(400).json({ message: "Assigned user must be a team member" });
      }
    }

    const oldStatus = task.status;
    const oldAssigned = task.assignedTo?.toString() || null;

    Object.assign(task, updates);
    await task.save();

    if (updates.status && oldStatus !== updates.status) {
      await TaskComment.create({
        task: task._id,
        team: task.team._id,
        type: "system",
        action: "status_changed",
        meta: { from: oldStatus, to: updates.status },
      });
    }

    if (
      Object.prototype.hasOwnProperty.call(updates, "assignedTo") &&
      oldAssigned !== String(updates.assignedTo || null)
    ) {
      await TaskComment.create({
        task: task._id,
        team: task.team._id,
        type: "system",
        action: updates.assignedTo ? "assigned" : "unassigned",
        meta: { to: updates.assignedTo || null },
      });

      // assignment affects visibility → invalidate team too
      invalidateTeam(task.team._id);
    }

    invalidateTasks(task.team._id);
    invalidateComments(task.team._id, task._id);

    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ---------------- DELETE TASK ---------------- */
router.delete("/:taskId", protect, async (req, res) => {
  try {
    const task = await TTask.findById(req.params.taskId).populate("team");
    if (!task) return res.status(404).json({ message: "Task not found" });

    const member = findMember(task.team, req.user._id);
    if (!member || !["admin", "manager"].includes(member.role))
      return res.status(403).json({ message: "Not authorized" });

    await task.deleteOne();

    invalidateTasks(task.team._id);

    res.json({ message: "Task deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ---------------- REQUEST EXTENSION ---------------- */
router.post("/:taskId/request-extension", protect, async (req, res) => {
  try {
    const task = await TTask.findById(req.params.taskId).populate("team");
    if (!task) return res.status(404).json({ message: "Task not found" });

    if (String(task.assignedTo) !== String(req.user._id))
      return res.status(403).json({ message: "Not allowed" });

    const reason = String(req.body.reason || "").trim();
    if (!reason) {
      return res.status(400).json({ message: "Extension reason is required" });
    }

    if (!isValidDate(req.body.requestedDueDate)) {
      return res.status(400).json({ message: "Valid requested due date is required" });
    }

    const requestedDueDate = new Date(req.body.requestedDueDate);
    if (task.dueDate && requestedDueDate <= new Date(task.dueDate)) {
      return res
        .status(400)
        .json({ message: "Requested due date must be after current due date" });
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

    await TaskComment.create({
      task: task._id,
      team: task.team._id,
      type: "system",
      action: "extension_requested",
      meta: req.body,
    });

    invalidateTasks(task.team._id);
    invalidateComments(task.team._id, task._id);

    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ---------------- APPROVE EXTENSION ---------------- */
router.post("/:taskId/extension/approve", protect, async (req, res) => {
  try {
    const task = await TTask.findById(req.params.taskId).populate("team");
    if (!task) return res.status(404).json({ message: "Task not found" });

    const member = findMember(task.team, req.user._id);
    if (!member || !["admin", "manager"].includes(member.role))
      return res.status(403).json({ message: "Not authorized" });

    if (task.extensionRequest?.status !== "pending")
      return res.status(400).json({ message: "No pending request" });

    task.dueDate = task.extensionRequest.requestedDueDate;
    task.extensionRequest.requested = false;
    task.extensionRequest.status = "approved";
    task.extensionRequest.reviewedBy = req.user._id;
    task.extensionRequest.reviewedAt = new Date();

    await task.save();

    await TaskComment.create({
      task: task._id,
      team: task.team._id,
      type: "system",
      action: "extension_approved",
    });

    invalidateTasks(task.team._id);
    invalidateComments(task.team._id, task._id);

    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ---------------- REJECT EXTENSION ---------------- */
router.post("/:taskId/extension/reject", protect, async (req, res) => {
  try {
    const task = await TTask.findById(req.params.taskId).populate("team");
    if (!task) return res.status(404).json({ message: "Task not found" });

    const member = findMember(task.team, req.user._id);
    if (!member || !["admin", "manager"].includes(member.role))
      return res.status(403).json({ message: "Not authorized" });

    if (task.extensionRequest?.status !== "pending")
      return res.status(400).json({ message: "No pending request" });

    task.extensionRequest.requested = false;
    task.extensionRequest.status = "rejected";
    task.extensionRequest.reviewedBy = req.user._id;
    task.extensionRequest.reviewedAt = new Date();

    await task.save();

    await TaskComment.create({
      task: task._id,
      team: task.team._id,
      type: "system",
      action: "extension_rejected",
    });

    invalidateTasks(task.team._id);
    invalidateComments(task.team._id, task._id);

    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
