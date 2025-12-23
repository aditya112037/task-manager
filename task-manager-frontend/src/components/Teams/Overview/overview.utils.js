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
    // Task created
    if (task.createdAt) {
      activities.push({
        id: `${task._id}-created`,
        taskTitle: task.title,
        action: "task_created",
        createdAt: task.createdAt,
      });
    }

    // Status change (updatedAt differs from createdAt)
    if (
      task.updatedAt &&
      task.createdAt &&
      new Date(task.updatedAt).getTime() !==
        new Date(task.createdAt).getTime()
    ) {
      activities.push({
        id: `${task._id}-status`,
        taskTitle: task.title,
        action: "status_changed",
        meta: {
          to: task.status,
        },
        createdAt: task.updatedAt,
      });
    }

    // Assignment
    if (task.assignedTo) {
      activities.push({
        id: `${task._id}-assigned`,
        taskTitle: task.title,
        action: "assigned",
        meta: {
          user: task.assignedTo.name || "User",
        },
        createdAt: task.updatedAt || task.createdAt,
      });
    }

    // Overdue detection
    if (
      task.dueDate &&
      new Date(task.dueDate) < new Date() &&
      task.status !== "completed"
    ) {
      activities.push({
        id: `${task._id}-overdue`,
        taskTitle: task.title,
        action: "overdue",
        createdAt: task.dueDate,
      });
    }
  });

  // Sort newest first
  return activities
    .sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    )
    .slice(0, limit);
};
// ---------------- AT RISK TASKS ----------------
export const getAtRiskTasks = (tasks = [], hours = 48) => {
  const now = new Date();
  const threshold = new Date(now.getTime() + hours * 60 * 60 * 1000);

  return tasks.filter((task) => {
    if (!task.dueDate) return false;
    if (task.status === "completed") return false;

    const due = new Date(task.dueDate);

    // ✅ Include overdue + upcoming within threshold
    return due <= threshold;
  });
};

