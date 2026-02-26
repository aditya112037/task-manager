const express = require("express");
const { body, validationResult } = require("express-validator");
const Task = require("../models/task");
const Notification = require("../models/Notification");
const { emitNotificationsChanged } = require("../utils/notificationEvents");
const { sendPushToUsers } = require("../utils/pushNotifications");
const { asProgress, logProgressChange } = require("../utils/progressHistory");
const { protect } = require("../middleware/auth");

const router = express.Router();

// All routes are protected
router.use(protect);

const clampPercentage = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.min(100, Math.max(0, Math.round(numeric)));
};

const normalizePersonalSubtasks = (subtasks, existingById = new Map()) => {
  if (!Array.isArray(subtasks)) return [];
  return subtasks
    .map((item) => {
      const title = String(item?.title || "").trim();
      if (!title) return null;
      const id = String(item?._id || "");
      const existing = id ? existingById.get(id) : null;
      const alreadyCompleted =
        Boolean(existing?.completed) ||
        clampPercentage(existing?.progressPercentage) >= 100;
      let progressPercentage = Object.prototype.hasOwnProperty.call(
        item || {},
        "progressPercentage"
      )
        ? clampPercentage(item.progressPercentage)
        : Boolean(item?.completed)
          ? 100
          : clampPercentage(existing?.progressPercentage);

      if (alreadyCompleted || progressPercentage >= 100) {
        progressPercentage = 100;
      }
      const completed = progressPercentage >= 100;
      return {
        _id: item?._id,
        title,
        progressPercentage,
        completed,
        createdAt: item?.createdAt || existing?.createdAt || new Date(),
        lastProgressAt: item?.lastProgressAt || new Date(),
        completedAt: completed ? existing?.completedAt || item?.completedAt || new Date() : null,
      };
    })
    .filter(Boolean);
};

const loadAuthorizedTask = async (taskId, userId) => {
  const task = await Task.findById(taskId);
  if (!task) return { error: { code: 404, message: "Task not found" } };
  if (String(task.user) !== String(userId)) {
    return { error: { code: 401, message: "Not authorized" } };
  }
  return { task };
};

// @desc    Get all tasks for user
// @route   GET /api/tasks
// @access  Private
router.get("/", async (req, res) => {
  try {
    const tasks = await Task.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// @desc    Create a task
// @route   POST /api/tasks
// @access  Private
router.post(
  "/",
  [body("title").notEmpty().withMessage("Title is required")],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const payload = { ...req.body };
      if (Object.prototype.hasOwnProperty.call(payload, "subtasks")) {
        payload.subtasks = normalizePersonalSubtasks(payload.subtasks, new Map());
      }

      const task = await Task.create({
        ...payload,
        user: req.user._id,
      });

      await logProgressChange({
        taskType: "personal",
        taskId: task._id,
        userId: req.user._id,
        actorId: req.user._id,
        before: asProgress(),
        after: task.progress,
        triggerSource: req.body?.triggerSource || "task_created",
        metadata: { route: "POST /api/tasks" },
      });

      await Notification.create({
        user: req.user._id,
        type: "personal_task_created",
        title: "Personal Task Created",
        message: `You created "${task.title}".`,
        metadata: { taskId: task._id, title: task.title },
      });
      emitNotificationsChanged([req.user._id]);
      await sendPushToUsers([req.user._id], {
        title: "Personal Task Created",
        body: `You created "${task.title}".`,
        url: "/",
        tag: `personal-task-created-${task._id}`,
      });

      res.status(201).json(task);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @desc    Update a task
// @route   PUT /api/tasks/:id
// @access  Private
router.put("/:id", async (req, res) => {
  try {
    const { task, error } = await loadAuthorizedTask(req.params.id, req.user._id);
    if (error) return res.status(error.code).json({ message: error.message });

    const oldTitle = task.title;
    const before = asProgress(task.progress);
    const updates = { ...req.body };

    if (
      Object.prototype.hasOwnProperty.call(updates, "progress") &&
      task.subtasks.length === 0 &&
      clampPercentage(task.progress?.percentage) >= 100 &&
      clampPercentage(updates?.progress?.percentage) < 100
    ) {
      return res.status(400).json({ message: "Completed task progress cannot be reverted" });
    }

    if (
      Object.prototype.hasOwnProperty.call(updates, "status") &&
      task.subtasks.length === 0 &&
      clampPercentage(task.progress?.percentage) >= 100 &&
      String(updates.status) !== "completed"
    ) {
      return res.status(400).json({ message: "Completed task status cannot be reverted" });
    }

    if (Object.prototype.hasOwnProperty.call(updates, "subtasks")) {
      const existingById = new Map(
        (task.subtasks || []).map((item) => [String(item._id), item])
      );
      updates.subtasks = normalizePersonalSubtasks(updates.subtasks, existingById);
    }

    Object.assign(task, updates);
    await task.save();

    await logProgressChange({
      taskType: "personal",
      taskId: task._id,
      userId: req.user._id,
      actorId: req.user._id,
      before,
      after: task.progress,
      triggerSource: req.body?.triggerSource || "task_updated",
      metadata: { route: "PUT /api/tasks/:id", updatedFields: Object.keys(updates) },
    });

    await Notification.create({
      user: req.user._id,
      type: "personal_task_updated",
      title: "Personal Task Updated",
      message: `You updated "${task.title || oldTitle}".`,
      metadata: { taskId: task._id, title: task.title || oldTitle },
    });
    emitNotificationsChanged([req.user._id]);
    await sendPushToUsers([req.user._id], {
      title: "Personal Task Updated",
      body: `You updated "${task.title || oldTitle}".`,
      url: "/",
      tag: `personal-task-updated-${task._id}`,
    });

    res.json(task);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// @desc    Create subtask
// @route   POST /api/tasks/:id/subtasks
// @access  Private
router.post("/:id/subtasks", async (req, res) => {
  try {
    const { task, error } = await loadAuthorizedTask(req.params.id, req.user._id);
    if (error) return res.status(error.code).json({ message: error.message });

    const title = String(req.body?.title || "").trim();
    if (!title) return res.status(400).json({ message: "Subtask title is required" });

    const before = asProgress(task.progress);
    task.subtasks.push({
      title,
      progressPercentage: 0,
      completed: false,
      createdAt: new Date(),
      lastProgressAt: new Date(),
      completedAt: null,
    });
    await task.save();

    await logProgressChange({
      taskType: "personal",
      taskId: task._id,
      userId: req.user._id,
      actorId: req.user._id,
      before,
      after: task.progress,
      triggerSource: req.body?.triggerSource || "subtask_created",
      metadata: { route: "POST /api/tasks/:id/subtasks" },
    });

    res.status(201).json(task);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// @desc    Update subtask fields (title/completed)
// @route   PUT /api/tasks/:id/subtasks/:subtaskId
// @access  Private
router.put("/:id/subtasks/:subtaskId", async (req, res) => {
  try {
    const { task, error } = await loadAuthorizedTask(req.params.id, req.user._id);
    if (error) return res.status(error.code).json({ message: error.message });

    const subtask = task.subtasks.id(req.params.subtaskId);
    if (!subtask) return res.status(404).json({ message: "Subtask not found" });

    if (Object.prototype.hasOwnProperty.call(req.body, "title")) {
      const title = String(req.body.title || "").trim();
      if (!title) return res.status(400).json({ message: "Subtask title is required" });
      subtask.title = title;
      subtask.lastProgressAt = new Date();
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "completed")) {
      if (Boolean(subtask.completed) && !Boolean(req.body.completed)) {
        return res.status(400).json({ message: "Completed subtask cannot be reverted" });
      }
      subtask.completed = Boolean(req.body.completed);
      subtask.progressPercentage = subtask.completed ? 100 : 0;
      subtask.completedAt = subtask.completed ? new Date() : null;
      subtask.lastProgressAt = new Date();
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "progressPercentage")) {
      const nextProgress = clampPercentage(req.body.progressPercentage);
      if (Boolean(subtask.completed) && nextProgress < 100) {
        return res.status(400).json({ message: "Completed subtask cannot be reverted" });
      }
      subtask.progressPercentage = nextProgress;
      subtask.completed = nextProgress >= 100;
      subtask.completedAt = subtask.completed ? subtask.completedAt || new Date() : null;
      subtask.lastProgressAt = new Date();
    }

    const before = asProgress(task.progress);
    await task.save();

    await logProgressChange({
      taskType: "personal",
      taskId: task._id,
      userId: req.user._id,
      actorId: req.user._id,
      before,
      after: task.progress,
      triggerSource: req.body?.triggerSource || "subtask_updated",
      metadata: { route: "PUT /api/tasks/:id/subtasks/:subtaskId" },
    });

    res.json(task);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// @desc    Toggle subtask completion
// @route   PATCH /api/tasks/:id/subtasks/:subtaskId/toggle
// @access  Private
router.patch("/:id/subtasks/:subtaskId/toggle", async (req, res) => {
  try {
    const { task, error } = await loadAuthorizedTask(req.params.id, req.user._id);
    if (error) return res.status(error.code).json({ message: error.message });

    const subtask = task.subtasks.id(req.params.subtaskId);
    if (!subtask) return res.status(404).json({ message: "Subtask not found" });

    const before = asProgress(task.progress);
    const completed =
      Object.prototype.hasOwnProperty.call(req.body, "completed") ?
        Boolean(req.body.completed) :
        !subtask.completed;
    if (Boolean(subtask.completed) && !completed) {
      return res.status(400).json({ message: "Completed subtask cannot be reverted" });
    }
    subtask.completed = completed;
    subtask.progressPercentage = completed ? 100 : 0;
    subtask.completedAt = completed ? new Date() : null;
    subtask.lastProgressAt = new Date();

    await task.save();

    await logProgressChange({
      taskType: "personal",
      taskId: task._id,
      userId: req.user._id,
      actorId: req.user._id,
      before,
      after: task.progress,
      triggerSource: req.body?.triggerSource || "subtask_toggled",
      metadata: { route: "PATCH /api/tasks/:id/subtasks/:subtaskId/toggle" },
    });

    res.json(task);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// @desc    Delete subtask
// @route   DELETE /api/tasks/:id/subtasks/:subtaskId
// @access  Private
router.delete("/:id/subtasks/:subtaskId", async (req, res) => {
  try {
    const { task, error } = await loadAuthorizedTask(req.params.id, req.user._id);
    if (error) return res.status(error.code).json({ message: error.message });

    const subtask = task.subtasks.id(req.params.subtaskId);
    if (!subtask) return res.status(404).json({ message: "Subtask not found" });

    const before = asProgress(task.progress);
    task.subtasks.pull(req.params.subtaskId);
    await task.save();

    await logProgressChange({
      taskType: "personal",
      taskId: task._id,
      userId: req.user._id,
      actorId: req.user._id,
      before,
      after: task.progress,
      triggerSource: req.body?.triggerSource || "subtask_deleted",
      metadata: { route: "DELETE /api/tasks/:id/subtasks/:subtaskId" },
    });

    res.json(task);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// @desc    Delete a task
// @route   DELETE /api/tasks/:id
// @access  Private
router.delete("/:id", async (req, res) => {
  try {
    const { task, error } = await loadAuthorizedTask(req.params.id, req.user._id);
    if (error) return res.status(error.code).json({ message: error.message });

    const removedTitle = task.title;
    await Task.findByIdAndDelete(req.params.id);

    await Notification.create({
      user: req.user._id,
      type: "personal_task_deleted",
      title: "Personal Task Deleted",
      message: `You deleted "${removedTitle}".`,
      metadata: { taskId: req.params.id, title: removedTitle },
    });
    emitNotificationsChanged([req.user._id]);
    await sendPushToUsers([req.user._id], {
      title: "Personal Task Deleted",
      body: `You deleted "${removedTitle}".`,
      url: "/",
      tag: `personal-task-deleted-${req.params.id}`,
    });

    res.json({ message: "Task removed" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
