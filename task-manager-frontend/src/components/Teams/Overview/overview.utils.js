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

// ---------------- WORKLOAD BY MEMBER ----------------
export const getWorkloadByMember = (tasks = [], members = []) => {
  const map = {};

  // initialize members
  members.forEach((m) => {
    const id = m.user?._id || m.user;
    if (!id) return;

    map[id] = {
      id,
      name: m.user?.name || "Unknown",
      count: 0,
    };
  });

  // count tasks
  tasks.forEach((task) => {
    if (!task.assignedTo) return;
    const id = task.assignedTo?._id || task.assignedTo;

    if (!map[id]) {
      map[id] = {
        id,
        name: task.assignedTo?.name || "Unknown",
        count: 0,
      };
    }

    map[id].count += 1;
  });

  return Object.values(map);
};

// ---------------- DELIVERY HEALTH ----------------
export const getDeliveryHealth = (tasks = []) => {
  const now = new Date();

  let completed = 0;
  let overdue = 0;
  let onTrack = 0;

  tasks.forEach((task) => {
    if (task.status === "completed") {
      completed += 1;
      return;
    }

    if (task.dueDate) {
      const due = new Date(task.dueDate);
      if (due < now) {
        overdue += 1;
      } else {
        onTrack += 1;
      }
    } else {
      // No due date = assume on track
      onTrack += 1;
    }
  });

  return {
    completed,
    overdue,
    onTrack,
    total: tasks.length,
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

// ---------------- ACTIVITY FEED ----------------
export const getActivityFeed = (tasks = [], limit = 10) => {
  const activities = [];

  tasks.forEach((task) => {
    if (!task.comments || !Array.isArray(task.comments)) return;

    task.comments.forEach((c) => {
      activities.push({
        id: c._id,
        taskId: task._id,
        taskTitle: task.title,
        type: c.type,           // system | user
        action: c.action,       // task_created, status_changed, etc
        meta: c.meta || {},
        createdAt: c.createdAt,
        user: c.user || null,
      });
    });
  });

  return activities
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit);
};

// ---------------- AT RISK TASKS ----------------
export const getAtRiskTasks = (tasks = [], hours = 48) => {
  const now = new Date();
  const threshold = new Date(
    now.getTime() + hours * 60 * 60 * 1000
  );

  return tasks.filter((task) => {
    if (task.status === "completed") return false;
    if (!task.dueDate) return false;

    const due = new Date(task.dueDate);

    return due > now && due <= threshold;
  });
};
