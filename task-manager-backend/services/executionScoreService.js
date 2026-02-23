const User = require("../models/user");
const Task = require("../models/task");
const TTask = require("../models/TTask");
const TaskProgressHistory = require("../models/TaskProgressHistory");
const ExecutionScoreSnapshot = require("../models/ExecutionScoreSnapshot");

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const WINDOW_DAYS = 30;
const FORMULA_VERSION = "v1";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const toStartOfUtcDay = (date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const percent = (numerator, denominator) =>
  denominator > 0 ? Number(((numerator / denominator) * 100).toFixed(2)) : 0;

const dayKeyUtc = (value) => {
  const d = new Date(value);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate()
  ).padStart(2, "0")}`;
};

const weighted = (rate, weight) => Number(((rate * weight) / 100).toFixed(2));

const buildUserSubtaskView = ({ personalTasks, teamTasks, userId }) => {
  const personalSubtasks = personalTasks.flatMap((task) =>
    (task.subtasks || []).map((subtask) => ({
      ...subtask,
      parentDueDate: task.dueDate || null,
      scope: "personal",
    }))
  );

  const teamSubtasks = teamTasks.flatMap((task) =>
    (task.subtasks || [])
      .filter((subtask) => String(subtask.assignedTo || "") === String(userId))
      .map((subtask) => ({
        ...subtask,
        parentDueDate: task.dueDate || null,
        scope: "team",
      }))
  );

  return [...personalSubtasks, ...teamSubtasks];
};

const computeExecutionScoreInput = ({ subtasks, progressEvents, windowStart, windowEnd, now }) => {
  const completedInWindow = subtasks.filter(
    (subtask) =>
      subtask.completed &&
      subtask.completedAt &&
      new Date(subtask.completedAt) >= windowStart &&
      new Date(subtask.completedAt) <= windowEnd
  );

  const completedWithDueDate = completedInWindow.filter((subtask) => subtask.parentDueDate);
  const completedOnTime = completedWithDueDate.filter(
    (subtask) => new Date(subtask.completedAt) <= new Date(subtask.parentDueDate)
  );

  const completionDays = new Set(completedInWindow.map((subtask) => dayKeyUtc(subtask.completedAt)));
  const progressDays = new Set(progressEvents.map((event) => dayKeyUtc(event.createdAt)));

  const openWithDueDate = subtasks.filter(
    (subtask) => !subtask.completed && subtask.parentDueDate
  );
  const overdueOpenSubtasks = openWithDueDate.filter(
    (subtask) => new Date(subtask.parentDueDate) < now
  );

  const onTimeCompletionRate = percent(completedOnTime.length, completedWithDueDate.length);
  const subtasksConsistencyRate = percent(completionDays.size, WINDOW_DAYS);
  const progressUpdateConsistencyRate = percent(progressDays.size, WINDOW_DAYS);
  const overduePenaltyRate = percent(overdueOpenSubtasks.length, openWithDueDate.length);

  const weightedOnTime = weighted(onTimeCompletionRate, 40);
  const weightedSubtasksConsistency = weighted(subtasksConsistencyRate, 25);
  const weightedProgressConsistency = weighted(progressUpdateConsistencyRate, 20);
  const weightedOverduePenaltyDeduction = weighted(overduePenaltyRate, 15);

  const scoreRaw =
    weightedOnTime +
    weightedSubtasksConsistency +
    weightedProgressConsistency -
    weightedOverduePenaltyDeduction;
  const score = Number(clamp(Number(scoreRaw.toFixed(2)), 0, 100).toFixed(2));

  return {
    score,
    breakdown: {
      onTimeCompletionRate,
      subtasksConsistencyRate,
      progressUpdateConsistencyRate,
      overduePenaltyRate,
      weightedOnTime,
      weightedSubtasksConsistency,
      weightedProgressConsistency,
      weightedOverduePenaltyDeduction,
    },
    counters: {
      completedSubtasksInWindow: completedInWindow.length,
      completedSubtasksOnTimeInWindow: completedOnTime.length,
      completionActiveDays: completionDays.size,
      progressUpdateActiveDays: progressDays.size,
      overdueOpenSubtasks: overdueOpenSubtasks.length,
      openSubtasksWithDueDate: openWithDueDate.length,
    },
  };
};

const recomputeExecutionScoreForUser = async (userId, now = new Date()) => {
  const windowEnd = now;
  const windowStart = new Date(now.getTime() - WINDOW_DAYS * MS_PER_DAY);
  const snapshotDate = toStartOfUtcDay(now);

  const [personalTasks, teamTasks, progressEvents] = await Promise.all([
    Task.find({ user: userId })
      .select("dueDate subtasks")
      .lean(),
    TTask.find({
      $or: [{ assignedTo: userId }, { "subtasks.assignedTo": userId }],
    })
      .select("dueDate subtasks")
      .lean(),
    TaskProgressHistory.find({
      actorId: userId,
      createdAt: { $gte: windowStart, $lte: windowEnd },
    })
      .select("createdAt")
      .lean(),
  ]);

  const subtasks = buildUserSubtaskView({ personalTasks, teamTasks, userId });
  const computed = computeExecutionScoreInput({
    subtasks,
    progressEvents,
    windowStart,
    windowEnd,
    now,
  });

  const snapshot = await ExecutionScoreSnapshot.findOneAndUpdate(
    { userId, snapshotDate },
    {
      userId,
      snapshotDate,
      windowStart,
      windowEnd,
      score: computed.score,
      formulaVersion: FORMULA_VERSION,
      breakdown: computed.breakdown,
      counters: computed.counters,
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return snapshot;
};

const recomputeExecutionScoresForAllUsers = async () => {
  const users = await User.find({}).select("_id").lean();
  if (!users.length) return { usersProcessed: 0 };

  for (const user of users) {
    await recomputeExecutionScoreForUser(user._id);
  }

  return { usersProcessed: users.length };
};

module.exports = {
  recomputeExecutionScoreForUser,
  recomputeExecutionScoresForAllUsers,
};
