const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/user');
const Team = require("../models/team");
const Task = require('../models/task');
const TTask = require('../models/TTask');
const TaskProgressHistory = require("../models/TaskProgressHistory");
const ExecutionScoreSnapshot = require("../models/ExecutionScoreSnapshot");
const { protect } = require('../middleware/auth');

const router = express.Router();
const STALLED_DAYS = Number(process.env.STALLED_DAYS || 1);

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
      photo: user.photo || null,
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
        photo: user.photo || null,
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

    const [personalTasks, teamTasks, recentHistory, latestExecutionScore, scoreHistory, teams] = await Promise.all([
      Task.find({ user: userId })
        .select("status dueDate createdAt subtasks progress")
        .lean(),
      TTask.find({
        $or: [{ assignedTo: userId }, { "subtasks.assignedTo": userId }],
      })
        .select("status dueDate assignedTo createdAt title team subtasks progress")
        .lean(),
      TaskProgressHistory.find({
        actorId: userId,
        createdAt: { $gte: since30Days },
      })
        .select("createdAt triggerSource")
        .lean(),
      ExecutionScoreSnapshot.findOne({ userId })
        .sort({ snapshotDate: -1, createdAt: -1 })
        .lean(),
      ExecutionScoreSnapshot.find({ userId })
        .sort({ snapshotDate: -1 })
        .limit(4)
        .lean(),
      Team.find({ "members.user": userId })
        .select("name members color icon")
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
          parentTaskId: task._id,
          parentTaskTitle: task.title || "Task",
          parentTeamId: task.team || null,
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

    const teamIdentity = teams.map((team) => {
      const myMembership = (team.members || []).find(
        (member) => String(member.user) === String(userId)
      );
      return {
        _id: team._id,
        name: team.name,
        role: myMembership?.role || "member",
        color: team.color || null,
        icon: team.icon || null,
      };
    });
    const roleRank = { admin: 3, manager: 2, member: 1 };
    const primaryRole =
      teamIdentity.length > 0
        ? [...teamIdentity]
            .sort((a, b) => (roleRank[b.role] || 0) - (roleRank[a.role] || 0))[0]
            .role
        : "member";

    const activeTasks =
      personalTasks.filter((task) => task.status !== "completed").length +
      teamTasks.filter(
        (task) =>
          String(task.assignedTo || "") === String(userId) && task.status !== "completed"
      ).length;

    const weeklyCompletionTrend = Array.from({ length: 4 }).map((_, index) => {
      const end = new Date(now.getTime() - index * 7 * 24 * 60 * 60 * 1000);
      const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
      const completed = completedUserSubtasks.filter(
        (subtask) =>
          subtask.completedAt &&
          new Date(subtask.completedAt) >= start &&
          new Date(subtask.completedAt) < end
      ).length;
      return {
        label: `W${4 - index}`,
        completedSubtasks: completed,
        start,
        end,
      };
    }).reverse();

    const scoreTrend = [...scoreHistory]
      .reverse()
      .map((snap, idx) => ({
        label: `W${idx + 1}`,
        score: snap.score,
        snapshotDate: snap.snapshotDate,
      }));

    const stalledAssignedSubtasks = userScopedTeamSubtasks
      .filter((subtask) => !subtask.completed)
      .filter((subtask) => {
        const checkpoint = new Date(subtask.lastProgressAt || subtask.createdAt || now);
        return checkpoint.getTime() < now.getTime() - STALLED_DAYS * 24 * 60 * 60 * 1000;
      });

    const stalledTaskMap = new Map();
    stalledAssignedSubtasks.forEach((subtask) => {
      const key = String(subtask.parentTaskId || "");
      const existing = stalledTaskMap.get(key);
      const progressAt = new Date(subtask.lastProgressAt || subtask.createdAt || now);
      const daysStalled = Math.max(
        1,
        Math.floor((now.getTime() - progressAt.getTime()) / (24 * 60 * 60 * 1000))
      );
      if (!existing || daysStalled > existing.maxDaysStalled) {
        stalledTaskMap.set(key, {
          taskId: subtask.parentTaskId || null,
          teamId: subtask.parentTeamId || null,
          title: subtask.parentTaskTitle || "Task",
          stalledSubtasks: 1,
          maxDaysStalled: daysStalled,
        });
      } else {
        existing.stalledSubtasks += 1;
      }
    });
    const needsAttentionTasks = Array.from(stalledTaskMap.values());

    const badges = [];
    if (onTimeRate >= 90) {
      badges.push({
        id: "deadline_keeper",
        title: "Deadline Keeper",
        description: "Maintained 90%+ on-time completion over the last 30 days.",
      });
    }
    if (completedUserSubtasks.length >= 15) {
      badges.push({
        id: "reliable_executor",
        title: "Reliable Executor",
        description: "Completed 15+ subtasks in the last 30 days.",
      });
    }
    if (needsAttentionTasks.length === 0 && historyEventsLast30Days >= 8) {
      badges.push({
        id: "consistent_progress_updater",
        title: "Consistent Progress Updater",
        description: "No stalled assigned tasks and steady progress updates.",
      });
    }

    res.json({
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      photo: req.user.photo || null,
      identity: {
        primaryRole,
        teams: teamIdentity,
      },
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
          activeTasks,
          activityFrequency,
        },
        trend: {
          scoreLast4Weeks: scoreTrend,
          completionLast4Weeks: weeklyCompletionTrend,
        },
        executionScore: latestExecutionScore
          ? {
              score: latestExecutionScore.score,
              formulaVersion: latestExecutionScore.formulaVersion,
              snapshotDate: latestExecutionScore.snapshotDate,
              windowStart: latestExecutionScore.windowStart,
              windowEnd: latestExecutionScore.windowEnd,
              breakdown: latestExecutionScore.breakdown,
              counters: latestExecutionScore.counters,
            }
          : null,
        badges,
        nudges: {
          stalledDaysThreshold: STALLED_DAYS,
          needsAttentionTasks,
          reminder:
            needsAttentionTasks.length > 0
              ? `You have ${needsAttentionTasks.length} tasks with no progress update in ${STALLED_DAYS}+ days.`
              : null,
        },
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// @desc    Get public teammate profile summary (badges + photo)
// @route   GET /api/auth/profile/:userId/public
// @access  Private (teammates only)
router.get("/profile/:userId/public", protect, async (req, res) => {
  try {
    const requesterId = String(req.user._id);
    const targetUserId = String(req.params.userId || "");
    if (!targetUserId) {
      return res.status(400).json({ message: "User id is required" });
    }

    // Allow self, otherwise require shared team membership
    if (requesterId !== targetUserId) {
      const sharedTeam = await Team.exists({
        members: {
          $all: [
            { $elemMatch: { user: requesterId } },
            { $elemMatch: { user: targetUserId } },
          ],
        },
      });
      if (!sharedTeam) {
        return res.status(403).json({ message: "Not authorized to view this profile" });
      }
    }

    const targetUser = await User.findById(targetUserId).select("name photo email");
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const now = new Date();
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const since30Days = new Date(now.getTime() - THIRTY_DAYS_MS);

    const [personalTasks, teamTasks, recentHistory] = await Promise.all([
      Task.find({ user: targetUserId })
        .select("dueDate subtasks progress")
        .lean(),
      TTask.find({
        $or: [{ assignedTo: targetUserId }, { "subtasks.assignedTo": targetUserId }],
      })
        .select("dueDate title team subtasks")
        .lean(),
      TaskProgressHistory.find({
        actorId: targetUserId,
        createdAt: { $gte: since30Days },
      })
        .select("createdAt")
        .lean(),
    ]);

    const personalSubtasks = personalTasks.flatMap((task) =>
      (task.subtasks || []).map((subtask) => ({
        ...subtask,
        parentDueDate: task.dueDate || null,
      }))
    );

    const teamSubtasks = teamTasks.flatMap((task) =>
      (task.subtasks || [])
        .filter((subtask) => String(subtask.assignedTo || "") === String(targetUserId))
        .map((subtask) => ({
          ...subtask,
          parentDueDate: task.dueDate || null,
          parentTaskId: task._id,
          parentTaskTitle: task.title || "Task",
        }))
    );

    const allUserSubtasks = [...personalSubtasks, ...teamSubtasks];
    const completedUserSubtasks = allUserSubtasks.filter((subtask) => subtask.completed);

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

    const stalledAssignedSubtasks = teamSubtasks
      .filter((subtask) => !subtask.completed)
      .filter((subtask) => {
        const checkpoint = new Date(subtask.lastProgressAt || subtask.createdAt || now);
        return checkpoint.getTime() < now.getTime() - STALLED_DAYS * 24 * 60 * 60 * 1000;
      });

    const stalledTaskMap = new Map();
    stalledAssignedSubtasks.forEach((subtask) => {
      const key = String(subtask.parentTaskId || "");
      const existing = stalledTaskMap.get(key);
      const progressAt = new Date(subtask.lastProgressAt || subtask.createdAt || now);
      const daysStalled = Math.max(
        1,
        Math.floor((now.getTime() - progressAt.getTime()) / (24 * 60 * 60 * 1000))
      );
      if (!existing || daysStalled > existing.maxDaysStalled) {
        stalledTaskMap.set(key, {
          taskId: subtask.parentTaskId || null,
          title: subtask.parentTaskTitle || "Task",
          stalledSubtasks: 1,
          maxDaysStalled: daysStalled,
        });
      } else {
        existing.stalledSubtasks += 1;
      }
    });
    const needsAttentionTasks = Array.from(stalledTaskMap.values());

    const badges = [];
    if (onTimeRate >= 90) {
      badges.push({
        id: "deadline_keeper",
        title: "Deadline Keeper",
        description: "Maintained 90%+ on-time completion over the last 30 days.",
      });
    }
    if (completedUserSubtasks.length >= 15) {
      badges.push({
        id: "reliable_executor",
        title: "Reliable Executor",
        description: "Completed 15+ subtasks in the last 30 days.",
      });
    }
    if (needsAttentionTasks.length === 0 && recentHistory.length >= 8) {
      badges.push({
        id: "consistent_progress_updater",
        title: "Consistent Progress Updater",
        description: "No stalled assigned tasks and steady progress updates.",
      });
    }

    res.json({
      _id: targetUser._id,
      name: targetUser.name,
      photo: targetUser.photo || null,
      badges,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.put(
  "/profile/photo",
  protect,
  [body("imageData").notEmpty().withMessage("imageData is required")],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const imageData = String(req.body.imageData || "");
      const mimeMatch = imageData.match(/^data:(image\/(png|jpeg|jpg|webp));base64,/i);
      if (!mimeMatch) {
        return res.status(400).json({ message: "Only PNG, JPG, JPEG, or WEBP data URLs are allowed" });
      }

      const base64 = imageData.split(",")[1] || "";
      const bytes = Buffer.byteLength(base64, "base64");
      const MAX_BYTES = 2 * 1024 * 1024;
      if (bytes > MAX_BYTES) {
        return res.status(400).json({ message: "Image size must be <= 2MB" });
      }

      const user = await User.findById(req.user._id);
      if (!user) return res.status(404).json({ message: "User not found" });

      user.photo = imageData;
      await user.save();

      res.json({
        message: "Profile photo updated",
        photo: user.photo,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

module.exports = router;
