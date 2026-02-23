const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/user');
const Task = require('../models/task');
const TTask = require('../models/TTask');
const TaskProgressHistory = require("../models/TaskProgressHistory");
const { protect } = require('../middleware/auth');

const router = express.Router();

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

/* =============================
     EMAIL + PASSWORD AUTH
============================= */

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {

  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  const { name, email, password } = req.body;

  try {
    const existing = await User.findOne({ email });

    if (existing)
      return res.status(400).json({ message: 'User already exists' });

    const user = await User.create({ name, email, password });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      token: generateToken(user._id)
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
router.post('/login', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').exists().withMessage('Password is required')
], async (req, res) => {

  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    // If Google signup (no password stored)
    if (user && !user.password) {
      return res.status(400).json({
        message: "This account uses Google Sign-In. Please log in using Google."
      });
    }

    if (user && (await user.matchPassword(password))) {
      return res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        token: generateToken(user._id)
      });
    }

    res.status(401).json({ message: 'Invalid credentials' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get profile
// @route   GET /api/auth/profile
// @access  Private
router.get('/profile', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const since30Days = new Date(now.getTime() - THIRTY_DAYS_MS);
    const since7Days = new Date(now.getTime() - SEVEN_DAYS_MS);

    const [personalTasks, teamTasks, recentHistory] = await Promise.all([
      Task.find({ user: userId })
        .select("status dueDate createdAt subtasks progress")
        .lean(),
      TTask.find({
        $or: [{ assignedTo: userId }, { "subtasks.assignedTo": userId }],
      })
        .select("status dueDate assignedTo createdAt subtasks progress")
        .lean(),
      TaskProgressHistory.find({
        actorId: userId,
        createdAt: { $gte: since30Days },
      })
        .select("createdAt triggerSource")
        .lean(),
    ]);

    const personalTotalSubtasks = personalTasks.reduce(
      (sum, task) => sum + (task.progress?.totalSubtasks ?? task.subtasks?.length ?? 0),
      0
    );
    const personalCompletedSubtasks = personalTasks.reduce(
      (sum, task) =>
        sum +
        (task.progress?.completedSubtasks ??
          (task.subtasks || []).filter((item) => item.completed).length),
      0
    );

    const assignedTaskCount = teamTasks.filter(
      (task) => String(task.assignedTo || "") === String(userId)
    ).length;
    const assignedTaskCompletedCount = teamTasks.filter(
      (task) =>
        String(task.assignedTo || "") === String(userId) && task.status === "completed"
    ).length;

    const assignedSubtasks = teamTasks.flatMap((task) =>
      (task.subtasks || []).filter(
        (item) => String(item.assignedTo || "") === String(userId)
      )
    );
    const assignedSubtaskCount = assignedSubtasks.length;
    const assignedSubtaskCompletedCount = assignedSubtasks.filter(
      (item) => item.completed
    ).length;

    // Phase C metrics foundation
    const personalSubtasks = personalTasks.flatMap((task) =>
      (task.subtasks || []).map((subtask) => ({
        ...subtask,
        parentDueDate: task.dueDate || null,
      }))
    );
    const userScopedTeamSubtasks = teamTasks.flatMap((task) =>
      (task.subtasks || [])
        .filter((subtask) => String(subtask.assignedTo || "") === String(userId))
        .map((subtask) => ({
          ...subtask,
          parentDueDate: task.dueDate || null,
        }))
    );

    const allUserSubtasks = [...personalSubtasks, ...userScopedTeamSubtasks];
    const completedUserSubtasks = allUserSubtasks.filter((subtask) => subtask.completed);

    const completionRate =
      allUserSubtasks.length > 0
        ? Number(((completedUserSubtasks.length / allUserSubtasks.length) * 100).toFixed(2))
        : 0;

    const completedWithDueDate = completedUserSubtasks.filter(
      (subtask) => subtask.parentDueDate
    );
    const completedOnTimeCount = completedWithDueDate.filter((subtask) => {
      if (!subtask.completedAt) return false;
      return new Date(subtask.completedAt) <= new Date(subtask.parentDueDate);
    }).length;
    const onTimeRate =
      completedWithDueDate.length > 0
        ? Number(((completedOnTimeCount / completedWithDueDate.length) * 100).toFixed(2))
        : 0;

    const completedWithDuration = completedUserSubtasks.filter(
      (subtask) => subtask.createdAt && subtask.completedAt
    );
    const averageSubtaskDurationHours =
      completedWithDuration.length > 0
        ? Number(
            (
              completedWithDuration.reduce((sum, subtask) => {
                const durationMs =
                  new Date(subtask.completedAt).getTime() -
                  new Date(subtask.createdAt).getTime();
                return sum + Math.max(durationMs, 0);
              }, 0) /
              completedWithDuration.length /
              (1000 * 60 * 60)
            ).toFixed(2)
          )
        : 0;

    const completedInLast7Days = completedUserSubtasks.filter(
      (subtask) => subtask.completedAt && new Date(subtask.completedAt) >= since7Days
    ).length;
    const completedInLast30Days = completedUserSubtasks.filter(
      (subtask) => subtask.completedAt && new Date(subtask.completedAt) >= since30Days
    ).length;
    const historyEventsLast30Days = recentHistory.length;
    const activityFrequency = {
      completionsLast7Days: completedInLast7Days,
      completionsLast30Days: completedInLast30Days,
      progressEventsLast30Days: historyEventsLast30Days,
      avgProgressEventsPerDay30d: Number((historyEventsLast30Days / 30).toFixed(2)),
      avgCompletionsPerWeek4w: Number(((completedInLast30Days / 30) * 7).toFixed(2)),
    };

    res.json({
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      progress: {
        personal: {
          totalTasks: personalTasks.length,
          completedTasks: personalTasks.filter((task) => task.status === "completed").length,
          totalCheckpoints: personalTotalSubtasks,
          completedCheckpoints: personalCompletedSubtasks,
        },
        team: {
          assignedTasks: assignedTaskCount,
          completedAssignedTasks: assignedTaskCompletedCount,
          assignedCheckpoints: assignedSubtaskCount,
          completedAssignedCheckpoints: assignedSubtaskCompletedCount,
        },
        metrics: {
          subtasksCompleted: completedUserSubtasks.length,
          totalSubtasks: allUserSubtasks.length,
          completionRate,
          onTimeRate,
          averageSubtaskDurationHours,
          activityFrequency,
        },
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
