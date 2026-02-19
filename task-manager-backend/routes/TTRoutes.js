const express = require("express");
const router = express.Router();
const TTask = require("../models/TTask");
const Team = require("../models/team");
const Notification = require("../models/Notification");
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

const invalidateExtensions = (teamId) => {
  if (!io) return;
  io.to(`team_${teamId}`).emit("invalidate:extensions", { teamId });
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

const populateTaskForClient = async (taskDoc) => {
  if (!taskDoc) return taskDoc;
  return taskDoc.populate([
    { path: "assignedTo", select: "name photo" },
    { path: "createdBy", select: "name photo" },
    { path: "extensionRequest.requestedBy", select: "name photo" },
    { path: "extensionRequest.reviewedBy", select: "name photo" },
  ]);
};

const notifyTeamMembers = async ({
  teamId,
  type,
  title,
  message,
  relatedTask = null,
  excludeUserId = null,
  metadata = {},
}) => {
  const team = await Team.findById(teamId).select("members");
  if (!team) return;
  const recipients = (team.members || [])
    .map((m) => m.user)
    .filter((uid) => String(uid) !== String(excludeUserId || ""));
  if (!recipients.length) return;

  await Notification.insertMany(
    recipients.map((uid) => ({
      user: uid,
      type,
      title,
      message,
      relatedTask,
      relatedTeam: teamId,
      metadata,
    })),
    { ordered: false }
  );
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

    const populatedTask = await populateTaskForClient(task);

    await notifyTeamMembers({
      teamId: team._id,
      type: "team_task_created",
      title: "Team Task Created",
      message: `${req.user.name} created "${task.title}".`,
      relatedTask: task._id,
      metadata: { title: task.title },
    });

    invalidateTasks(team._id);
    invalidateComments(team._id, task._id);

    res.status(201).json(populatedTask);
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
    const oldDueDate = task.dueDate ? new Date(task.dueDate).toISOString() : null;

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
      const populatedAssigned = await task.populate("assignedTo", "name photo");
      await TaskComment.create({
        task: task._id,
        team: task.team._id,
        type: "system",
        action: updates.assignedTo ? "assigned" : "unassigned",
        meta: {
          to: updates.assignedTo || null,
          toName: populatedAssigned.assignedTo?.name || null,
        },
      });

      // assignment affects visibility → invalidate team too
      invalidateTeam(task.team._id);
    }

    const newDueDate = task.dueDate ? new Date(task.dueDate).toISOString() : null;
    if (
      Object.prototype.hasOwnProperty.call(updates, "dueDate") &&
      oldDueDate !== newDueDate
    ) {
      await TaskComment.create({
        task: task._id,
        team: task.team._id,
        type: "system",
        action: "due_date_changed",
        meta: { from: oldDueDate, to: newDueDate },
      });
    }

    const populatedTask = await populateTaskForClient(task);

    await notifyTeamMembers({
      teamId: task.team._id,
      type: "team_task_updated",
      title: "Team Task Updated",
      message: `${req.user.name} updated "${task.title}".`,
      relatedTask: task._id,
      excludeUserId: req.user._id,
      metadata: { title: task.title, updates: Object.keys(updates) },
    });

    if (
      Object.prototype.hasOwnProperty.call(updates, "assignedTo") &&
      updates.assignedTo &&
      String(updates.assignedTo) !== String(req.user._id)
    ) {
      await Notification.create({
        user: updates.assignedTo,
        type: "task_assigned",
        title: "Task Assigned",
        message: `${req.user.name} assigned you "${task.title}".`,
        relatedTask: task._id,
        relatedTeam: task.team._id,
        metadata: { title: task.title },
      });
    }

    invalidateTasks(task.team._id);
    invalidateComments(task.team._id, task._id);

    res.json(populatedTask);
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

    const removedTitle = task.title;
    await task.deleteOne();

    await notifyTeamMembers({
      teamId: task.team._id,
      type: "team_task_deleted",
      title: "Team Task Deleted",
      message: `${req.user.name} deleted "${removedTitle}".`,
      relatedTask: task._id,
      metadata: { title: removedTitle },
    });

    invalidateTasks(task.team._id);
    invalidateExtensions(task.team._id);

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

    const populatedTask = await populateTaskForClient(task);

    await notifyTeamMembers({
      teamId: task.team._id,
      type: "extension_requested",
      title: "Extension Requested",
      message: `${req.user.name} requested an extension for "${task.title}".`,
      relatedTask: task._id,
      excludeUserId: req.user._id,
      metadata: { requestedDueDate },
    });

    invalidateTasks(task.team._id);
    invalidateExtensions(task.team._id);
    invalidateComments(task.team._id, task._id);

    res.json(populatedTask);
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

    const populatedTask = await populateTaskForClient(task);

    if (task.assignedTo) {
      await Notification.create({
        user: task.assignedTo,
        type: "extension_approved",
        title: "Extension Approved",
        message: `${req.user.name} approved extension for "${task.title}".`,
        relatedTask: task._id,
        relatedTeam: task.team._id,
      });
    }

    invalidateTasks(task.team._id);
    invalidateExtensions(task.team._id);
    invalidateComments(task.team._id, task._id);

    res.json(populatedTask);
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

    const populatedTask = await populateTaskForClient(task);

    if (task.assignedTo) {
      await Notification.create({
        user: task.assignedTo,
        type: "extension_rejected",
        title: "Extension Rejected",
        message: `${req.user.name} rejected extension for "${task.title}".`,
        relatedTask: task._id,
        relatedTeam: task.team._id,
      });
    }

    invalidateTasks(task.team._id);
    invalidateExtensions(task.team._id);
    invalidateComments(task.team._id, task._id);

    res.json(populatedTask);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
