const TaskProgressHistory = require("../models/TaskProgressHistory");

const asProgress = (value = {}) => ({
  totalSubtasks: Number(value.totalSubtasks || 0),
  completedSubtasks: Number(value.completedSubtasks || 0),
  percentage: Number(value.percentage || 0),
});

const hasProgressChanged = (before, after) =>
  before.totalSubtasks !== after.totalSubtasks ||
  before.completedSubtasks !== after.completedSubtasks ||
  before.percentage !== after.percentage;

const logProgressChange = async ({
  taskType,
  taskId,
  teamId = null,
  userId = null,
  actorId,
  before,
  after,
  triggerSource = "unknown",
  metadata = {},
}) => {
  const normalizedBefore = asProgress(before);
  const normalizedAfter = asProgress(after);
  if (!hasProgressChanged(normalizedBefore, normalizedAfter)) return null;

  return TaskProgressHistory.create({
    taskType,
    taskId,
    teamId,
    userId,
    actorId,
    before: normalizedBefore,
    after: normalizedAfter,
    delta: {
      totalSubtasks: normalizedAfter.totalSubtasks - normalizedBefore.totalSubtasks,
      completedSubtasks:
        normalizedAfter.completedSubtasks - normalizedBefore.completedSubtasks,
      percentage: normalizedAfter.percentage - normalizedBefore.percentage,
    },
    triggerSource,
    metadata,
  });
};

module.exports = {
  asProgress,
  logProgressChange,
};
