/*
  Analytics Utility Functions
  ---------------------------
  PURE functions only (no React)
*/

/* ---------------- TASK STATS ---------------- */

export const getTaskStats = (tasks = []) => {
  const now = new Date();

  const total = tasks.length;
  const completed = tasks.filter(t => t.status === "completed").length;
  const overdue = tasks.filter(
    t =>
      t.status !== "completed" &&
      t.dueDate &&
      new Date(t.dueDate) < now
  ).length;

  const pending = total - completed;

  return {
    total,
    completed,
    overdue,
    pending,
  };
};

/* ---------------- STATUS DISTRIBUTION ---------------- */

export const getStatusDistribution = (tasks = []) => {
  return tasks.reduce(
    (acc, task) => {
      const status = task.status || "unknown";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    },
    {}
  );
};
