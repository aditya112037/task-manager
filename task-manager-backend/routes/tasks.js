const express = require('express');
const { body, validationResult } = require('express-validator');
const Task = require('../models/task');
const Notification = require("../models/Notification");
const { emitNotificationsChanged } = require("../utils/notificationEvents");
const { sendPushToUsers } = require("../utils/pushNotifications");
const { protect } = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(protect);

const normalizePersonalSubtasks = (subtasks) => {
  if (!Array.isArray(subtasks)) return [];
  return subtasks
    .map((item) => {
      const title = String(item?.title || "").trim();
      if (!title) return null;
      const completed = Boolean(item?.completed);
      return {
        _id: item?._id,
        title,
        completed,
        completedAt: completed ? item?.completedAt || new Date() : null,
      };
    })
    .filter(Boolean);
};

// @desc    Get all tasks for user
// @route   GET /api/tasks
// @access  Private
router.get('/', async (req, res) => {
  try {
    const tasks = await Task.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Create a task
// @route   POST /api/tasks
// @access  Private
router.post('/', [
  body('title').notEmpty().withMessage('Title is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const payload = { ...req.body };
    if (Object.prototype.hasOwnProperty.call(payload, "subtasks")) {
      payload.subtasks = normalizePersonalSubtasks(payload.subtasks);
    }

    const task = await Task.create({
      ...payload,
      user: req.user._id
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
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Update a task
// @route   PUT /api/tasks/:id
// @access  Private
router.put('/:id', async (req, res) => {
  try {
    let task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if task belongs to user
    if (task.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    const oldTitle = task.title;
    const updates = { ...req.body };
    if (Object.prototype.hasOwnProperty.call(updates, "subtasks")) {
      updates.subtasks = normalizePersonalSubtasks(updates.subtasks);
    }

    Object.assign(task, updates);
    await task.save();

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
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Delete a task
// @route   DELETE /api/tasks/:id
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if task belongs to user
    if (task.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

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

    res.json({ message: 'Task removed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
