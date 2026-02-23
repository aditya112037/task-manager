const express = require("express");
const router = express.Router();
const TTask = require("../models/TTask");
const Team = require("../models/team");
const Notification = require("../models/Notification");
const mongoose = require("mongoose");
const TaskComment = require("../models/TaskComment");
const { emitNotificationsChanged } = require("../utils/notificationEvents");
const { sendPushToUsers } = require("../utils/pushNotifications");
const { asProgress, logProgressChange } = require("../utils/progressHistory");
const { protect } = require("../middleware/auth");
const STALLED_DAYS = Number(process.env.STALLED_DAYS || 3);

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
const toId = (value) => String(value?._id || value || "");

const ALLOWED_TASK_UPDATE_FIELDS = [
  "title",
  "description",
  "priority",
  "status",
  "dueDate",
  "assignedTo",
  "subtasks",
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
    { path: "subtasks.assignedTo", select: "name photo" },
    { path: "subtasks.completedBy", select: "name photo" },
    { path: "extensionRequest.requestedBy", select: "name photo" },
    { path: "extensionRequest.reviewedBy", select: "name photo" },
  ]);
};

const decorateTaskForViewer = (taskDoc, viewerId) => {
  const plain = typeof taskDoc.toObject === "function" ? taskDoc.toObject() : taskDoc;
  const staleThreshold = Date.now() - STALLED_DAYS * 24 * 60 * 60 * 1000;
  const subtasks = Array.isArray(plain.subtasks) ? plain.subtasks : [];
  const needsAttention = subtasks.some((subtask) => {
    const assignedTo = toId(subtask.assignedTo);
    const myId = toId(viewerId);
    if (!assignedTo || assignedTo !== myId) return false;
    if (subtask.completed) return false;
    const stamp = new Date(subtask.lastProgressAt || subtask.createdAt || Date.now()).getTime();
    return stamp < staleThreshold;
  });
  return { ...plain, needsAttention };
};

const normalizeTeamSubtasks = (subtasks, actorId) => {
  if (!Array.isArray(subtasks)) return [];
  return subtasks
    .map((item) => {
      const title = String(item?.title || "").trim();
      if (!title) return null;
      const completed = Boolean(item?.completed);
      const assignedTo = item?.assignedTo?._id || item?.assignedTo || null;
      const completedBy = item?.completedBy?._id || item?.completedBy || actorId;
      return {
        _id: item?._id,
        title,
        completed,
        createdAt: item?.createdAt || new Date(),
        lastProgressAt: item?.lastProgressAt || new Date(),
        assignedTo,
        completedAt: completed ? item?.completedAt || new Date() : null,
        completedBy: completed ? completedBy : null,
      };
    })
    .filter(Boolean);
};

const getTriggerSource = (req, fallback) =>
  String(req.body?.triggerSource || fallback || "unknown");

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
  emitNotificationsChanged(recipients);
  await sendPushToUsers(recipients, {
    title,
    body: message,
    url: `/teams/${teamId}`,
    tag: `${type}-${teamId}`,
    data: { teamId, relatedTask, type },
  });
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
      .populate("subtasks.assignedTo", "name photo")
      .populate("subtasks.completedBy", "name photo")
      .sort({ createdAt: -1 });

    res.json(tasks.map((task) => decorateTaskForViewer(task, req.user._id)));
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
      .populate("subtasks.assignedTo", "name photo")
      .populate("subtasks.completedBy", "name photo")
      .populate("extensionRequest.requestedBy", "name photo");

    res.json(tasks.map((task) => decorateTaskForViewer(task, req.user._id)));
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

    const payload = { ...req.body };
    if (Object.prototype.hasOwnProperty.call(payload, "subtasks")) {
      payload.subtasks = normalizeTeamSubtasks(payload.subtasks, req.user._id);
      const invalidAssignee = payload.subtasks.find(
        (item) => item.assignedTo && !findMember(team, item.assignedTo)
      );
      if (invalidAssignee) {
        return res.status(400).json({ message: "Each subtask assignee must be a team member" });
      }
    }

    const task = await TTask.create({
      ...payload,
      team: team._id,
      createdBy: req.user._id,
    });

    await logProgressChange({
      taskType: "team",
      taskId: task._id,
      teamId: team._id,
      actorId: req.user._id,
      before: asProgress(),
      after: task.progress,
      triggerSource: getTriggerSource(req, "task_created"),
      metadata: { route: "POST /api/team-tasks/:teamId" },
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

    res.status(201).json(decorateTaskForViewer(populatedTask, req.user._id));
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
      const memberAllowedKeys = ["status", "subtasks"];
      const updateKeys = Object.keys(updates);

      const hasForbiddenMemberUpdate = updateKeys.some(
        (key) => !memberAllowedKeys.includes(key)
      );
      if (hasForbiddenMemberUpdate) {
        return res.status(403).json({
          message: "Members can only update task status and their assigned subtasks",
        });
      }

      if (
        Object.prototype.hasOwnProperty.call(updates, "status") &&
        toId(task.assignedTo) !== toId(req.user._id)
      ) {
        return res.status(403).json({ message: "Only assignee can update task status" });
      }

      if (Object.prototype.hasOwnProperty.call(updates, "subtasks")) {
        const existingSubtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
        const nextSubtasks = Array.isArray(updates.subtasks) ? updates.subtasks : [];

        if (nextSubtasks.length !== existingSubtasks.length) {
          return res.status(403).json({
            message: "Members cannot add/remove subtasks",
          });
        }

        const existingById = new Map(existingSubtasks.map((item) => [toId(item._id), item]));
        for (const nextItem of nextSubtasks) {
          const currentItem = existingById.get(toId(nextItem._id));
          if (!currentItem) {
            return res.status(403).json({
              message: "Members cannot add/remove subtasks",
            });
          }

          if (
            String(nextItem.title || "").trim() !== String(currentItem.title || "").trim() ||
            toId(nextItem.assignedTo) !== toId(currentItem.assignedTo)
          ) {
            return res.status(403).json({
              message: "Members cannot edit subtask title/assignee",
            });
          }

          const ownershipChangedState =
            toId(currentItem.assignedTo) !== toId(req.user._id) &&
            Boolean(nextItem.completed) !== Boolean(currentItem.completed);
          if (ownershipChangedState) {
            return res.status(403).json({
              message: "Members can only update subtasks assigned to them",
            });
          }
        }
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

    if (Object.prototype.hasOwnProperty.call(updates, "subtasks")) {
      updates.subtasks = normalizeTeamSubtasks(updates.subtasks, req.user._id);
      const invalidAssignee = updates.subtasks.find(
        (item) => item.assignedTo && !findMember(task.team, item.assignedTo)
      );
      if (invalidAssignee) {
        return res.status(400).json({ message: "Each subtask assignee must be a team member" });
      }
    }

    const oldStatus = task.status;
    const oldAssigned = task.assignedTo?.toString() || null;
    const oldDueDate = task.dueDate ? new Date(task.dueDate).toISOString() : null;
    const progressBefore = asProgress(task.progress);

    Object.assign(task, updates);
    await task.save();

    await logProgressChange({
      taskType: "team",
      taskId: task._id,
      teamId: task.team._id,
      actorId: req.user._id,
      before: progressBefore,
      after: task.progress,
      triggerSource: getTriggerSource(req, "task_updated"),
      metadata: { route: "PUT /api/team-tasks/:taskId", updatedFields: Object.keys(updates) },
    });

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
      emitNotificationsChanged([updates.assignedTo]);
      await sendPushToUsers([updates.assignedTo], {
        title: "Task Assigned",
        body: `${req.user.name} assigned you "${task.title}".`,
        url: `/teams/${task.team._id}`,
        tag: `task-assigned-${task._id}`,
      });
    }

    invalidateTasks(task.team._id);
    invalidateComments(task.team._id, task._id);

    res.json(decorateTaskForViewer(populatedTask, req.user._id));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ---------------- CREATE SUBTASK ---------------- */
router.post("/:taskId/subtasks", protect, async (req, res) => {
  try {
    const task = await TTask.findById(req.params.taskId).populate("team");
    if (!task) return res.status(404).json({ message: "Task not found" });

    const member = findMember(task.team, req.user._id);
    if (!member || !["admin", "manager"].includes(member.role)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const title = String(req.body?.title || "").trim();
    if (!title) return res.status(400).json({ message: "Subtask title is required" });

    const assignedTo = req.body?.assignedTo?._id || req.body?.assignedTo || null;
    if (assignedTo && !findMember(task.team, assignedTo)) {
      return res.status(400).json({ message: "Subtask assignee must be a team member" });
    }

    const progressBefore = asProgress(task.progress);
    task.subtasks.push({
      title,
      assignedTo,
      completed: false,
      createdAt: new Date(),
      lastProgressAt: new Date(),
      completedAt: null,
      completedBy: null,
    });
    await task.save();

    await logProgressChange({
      taskType: "team",
      taskId: task._id,
      teamId: task.team._id,
      actorId: req.user._id,
      before: progressBefore,
      after: task.progress,
      triggerSource: getTriggerSource(req, "subtask_created"),
      metadata: { route: "POST /api/team-tasks/:taskId/subtasks" },
    });

    await TaskComment.create({
      task: task._id,
      team: task.team._id,
      type: "system",
      action: "subtask_created",
      meta: { title, assignedTo },
    });

    const populatedTask = await populateTaskForClient(task);
    invalidateTasks(task.team._id);
    invalidateComments(task.team._id, task._id);
    res.status(201).json(decorateTaskForViewer(populatedTask, req.user._id));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ---------------- UPDATE SUBTASK ---------------- */
router.put("/:taskId/subtasks/:subtaskId", protect, async (req, res) => {
  try {
    const task = await TTask.findById(req.params.taskId).populate("team");
    if (!task) return res.status(404).json({ message: "Task not found" });

    const member = findMember(task.team, req.user._id);
    if (!member) return res.status(403).json({ message: "Not authorized" });
    const isAdminOrManager = ["admin", "manager"].includes(member.role);

    const subtask = task.subtasks.id(req.params.subtaskId);
    if (!subtask) return res.status(404).json({ message: "Subtask not found" });

    if (!isAdminOrManager) {
      return res.status(403).json({ message: "Only admins/managers can edit subtask details" });
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "title")) {
      const title = String(req.body.title || "").trim();
      if (!title) return res.status(400).json({ message: "Subtask title is required" });
      subtask.title = title;
      subtask.lastProgressAt = new Date();
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "assignedTo")) {
      const assignedTo = req.body.assignedTo?._id || req.body.assignedTo || null;
      if (assignedTo && !findMember(task.team, assignedTo)) {
        return res.status(400).json({ message: "Subtask assignee must be a team member" });
      }
      subtask.assignedTo = assignedTo;
      subtask.lastProgressAt = new Date();
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "completed")) {
      const completed = Boolean(req.body.completed);
      subtask.completed = completed;
      subtask.completedAt = completed ? new Date() : null;
      subtask.completedBy = completed ? req.user._id : null;
      subtask.lastProgressAt = new Date();
    }

    const progressBefore = asProgress(task.progress);
    await task.save();

    await logProgressChange({
      taskType: "team",
      taskId: task._id,
      teamId: task.team._id,
      actorId: req.user._id,
      before: progressBefore,
      after: task.progress,
      triggerSource: getTriggerSource(req, "subtask_updated"),
      metadata: { route: "PUT /api/team-tasks/:taskId/subtasks/:subtaskId" },
    });

    await TaskComment.create({
      task: task._id,
      team: task.team._id,
      type: "system",
      action: "subtask_updated",
      meta: { subtaskId: req.params.subtaskId },
    });

    const populatedTask = await populateTaskForClient(task);
    invalidateTasks(task.team._id);
    invalidateComments(task.team._id, task._id);
    res.json(decorateTaskForViewer(populatedTask, req.user._id));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ---------------- ASSIGN SUBTASK ---------------- */
router.patch("/:taskId/subtasks/:subtaskId/assign", protect, async (req, res) => {
  try {
    const task = await TTask.findById(req.params.taskId).populate("team");
    if (!task) return res.status(404).json({ message: "Task not found" });

    const member = findMember(task.team, req.user._id);
    if (!member || !["admin", "manager"].includes(member.role)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const subtask = task.subtasks.id(req.params.subtaskId);
    if (!subtask) return res.status(404).json({ message: "Subtask not found" });

    const assignedTo = req.body?.assignedTo?._id || req.body?.assignedTo || null;
    if (assignedTo && !findMember(task.team, assignedTo)) {
      return res.status(400).json({ message: "Subtask assignee must be a team member" });
    }

    subtask.assignedTo = assignedTo;
    subtask.lastProgressAt = new Date();
    const progressBefore = asProgress(task.progress);
    await task.save();

    await logProgressChange({
      taskType: "team",
      taskId: task._id,
      teamId: task.team._id,
      actorId: req.user._id,
      before: progressBefore,
      after: task.progress,
      triggerSource: getTriggerSource(req, "subtask_assigned"),
      metadata: { route: "PATCH /api/team-tasks/:taskId/subtasks/:subtaskId/assign", assignedTo },
    });

    await TaskComment.create({
      task: task._id,
      team: task.team._id,
      type: "system",
      action: assignedTo ? "subtask_assigned" : "subtask_unassigned",
      meta: { subtaskId: req.params.subtaskId, assignedTo },
    });

    const populatedTask = await populateTaskForClient(task);
    invalidateTasks(task.team._id);
    invalidateComments(task.team._id, task._id);
    res.json(decorateTaskForViewer(populatedTask, req.user._id));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ---------------- TOGGLE SUBTASK COMPLETION ---------------- */
router.patch("/:taskId/subtasks/:subtaskId/toggle", protect, async (req, res) => {
  try {
    const task = await TTask.findById(req.params.taskId).populate("team");
    if (!task) return res.status(404).json({ message: "Task not found" });

    const member = findMember(task.team, req.user._id);
    if (!member) return res.status(403).json({ message: "Not authorized" });
    const isAdminOrManager = ["admin", "manager"].includes(member.role);

    const subtask = task.subtasks.id(req.params.subtaskId);
    if (!subtask) return res.status(404).json({ message: "Subtask not found" });

    if (!isAdminOrManager && toId(subtask.assignedTo) !== toId(req.user._id)) {
      return res.status(403).json({ message: "You can toggle only your assigned subtasks" });
    }

    const completed =
      Object.prototype.hasOwnProperty.call(req.body, "completed")
        ? Boolean(req.body.completed)
        : !Boolean(subtask.completed);

    subtask.completed = completed;
    subtask.completedAt = completed ? new Date() : null;
    subtask.completedBy = completed ? req.user._id : null;
    subtask.lastProgressAt = new Date();

    const progressBefore = asProgress(task.progress);
    await task.save();

    await logProgressChange({
      taskType: "team",
      taskId: task._id,
      teamId: task.team._id,
      actorId: req.user._id,
      before: progressBefore,
      after: task.progress,
      triggerSource: getTriggerSource(req, "subtask_toggled"),
      metadata: { route: "PATCH /api/team-tasks/:taskId/subtasks/:subtaskId/toggle", completed },
    });

    await TaskComment.create({
      task: task._id,
      team: task.team._id,
      type: "system",
      action: completed ? "subtask_completed" : "subtask_reopened",
      meta: { subtaskId: req.params.subtaskId },
    });

    const populatedTask = await populateTaskForClient(task);
    invalidateTasks(task.team._id);
    invalidateComments(task.team._id, task._id);
    res.json(decorateTaskForViewer(populatedTask, req.user._id));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ---------------- DELETE SUBTASK ---------------- */
router.delete("/:taskId/subtasks/:subtaskId", protect, async (req, res) => {
  try {
    const task = await TTask.findById(req.params.taskId).populate("team");
    if (!task) return res.status(404).json({ message: "Task not found" });

    const member = findMember(task.team, req.user._id);
    if (!member || !["admin", "manager"].includes(member.role)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const subtask = task.subtasks.id(req.params.subtaskId);
    if (!subtask) return res.status(404).json({ message: "Subtask not found" });

    const progressBefore = asProgress(task.progress);
    task.subtasks.pull(req.params.subtaskId);
    await task.save();

    await logProgressChange({
      taskType: "team",
      taskId: task._id,
      teamId: task.team._id,
      actorId: req.user._id,
      before: progressBefore,
      after: task.progress,
      triggerSource: getTriggerSource(req, "subtask_deleted"),
      metadata: { route: "DELETE /api/team-tasks/:taskId/subtasks/:subtaskId" },
    });

    await TaskComment.create({
      task: task._id,
      team: task.team._id,
      type: "system",
      action: "subtask_deleted",
      meta: { subtaskId: req.params.subtaskId },
    });

    const populatedTask = await populateTaskForClient(task);
    invalidateTasks(task.team._id);
    invalidateComments(task.team._id, task._id);
    res.json(decorateTaskForViewer(populatedTask, req.user._id));
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

    res.json(decorateTaskForViewer(populatedTask, req.user._id));
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
      emitNotificationsChanged([task.assignedTo]);
      await sendPushToUsers([task.assignedTo], {
        title: "Extension Approved",
        body: `${req.user.name} approved extension for "${task.title}".`,
        url: `/teams/${task.team._id}`,
        tag: `extension-approved-${task._id}`,
      });
    }

    invalidateTasks(task.team._id);
    invalidateExtensions(task.team._id);
    invalidateComments(task.team._id, task._id);

    res.json(decorateTaskForViewer(populatedTask, req.user._id));
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
      emitNotificationsChanged([task.assignedTo]);
      await sendPushToUsers([task.assignedTo], {
        title: "Extension Rejected",
        body: `${req.user.name} rejected extension for "${task.title}".`,
        url: `/teams/${task.team._id}`,
        tag: `extension-rejected-${task._id}`,
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
