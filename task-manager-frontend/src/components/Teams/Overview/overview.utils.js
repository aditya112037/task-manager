/* ---------------------------------------------------
   TEAM OVERVIEW CALCULATIONS
--------------------------------------------------- */

export const getTaskStats = (tasks = []) => {
  const total = tasks.length;

  const completed = tasks.filter(t => t.status === "completed");
  const inProgress = tasks.filter(t => t.status === "in-progress");
  const todo = tasks.filter(t => t.status === "todo");

  const now = new Date();

  const overdue = tasks.filter(t => {
    if (!t.dueDate) return false;
    if (t.status === "completed") return false;
    return new Date(t.dueDate) < now;
  });

  return {
    total,
    completed: completed.length,
    inProgress: inProgress.length,
    todo: todo.length,
    overdue: overdue.length,
    completionRate: total === 0 ? 0 : Math.round((completed.length / total) * 100),
  };
};

/* ---------------------------------------------------
   WORKLOAD PER MEMBER
--------------------------------------------------- */
export const getWorkloadByMember = (tasks = [], members = []) => {
  const map = {};

  members.forEach(m => {
    const id = typeof m.user === "string" ? m.user : m.user?._id;
    if (!id) return;

    map[id] = {
      name: m.user?.name || "User",
      total: 0,
      completed: 0,
    };
  });

  tasks.forEach(t => {
    if (!t.assignedTo) return;

    const id = typeof t.assignedTo === "string"
      ? t.assignedTo
      : t.assignedTo?._id;

    if (!map[id]) return;

    map[id].total += 1;
    if (t.status === "completed") {
      map[id].completed += 1;
    }
  });

  return Object.values(map);
};

/* ---------------------------------------------------
   DELIVERY HEALTH
--------------------------------------------------- */
export const getDeliveryHealth = (tasks = []) => {
  let onTime = 0;
  let late = 0;

  tasks.forEach(t => {
    if (!t.completedAt || !t.dueDate) return;

    const completedAt = new Date(t.completedAt);
    const dueDate = new Date(t.dueDate);

    if (completedAt <= dueDate) onTime += 1;
    else late += 1;
  });

  const total = onTime + late;

  return {
    onTime,
    late,
    score: total === 0 ? 100 : Math.round((onTime / total) * 100),
  };
};

/* ---------------------------------------------------
   STATUS DONUT DATA
--------------------------------------------------- */
export const getStatusDistribution = (tasks = []) => ({
  todo: tasks.filter(t => t.status === "todo").length,
  inProgress: tasks.filter(t => t.status === "in-progress").length,
  completed: tasks.filter(t => t.status === "completed").length,
});
