const express = require("express");
const router = express.Router();
const TTask = require("../models/TTask");
const Team = require("../models/team");
const Notification = require("../models/Notification");
const { protect } = require("../middleware/auth");

/* ---------------------------------------------------
   🔧 Helper: Safe Member Lookup (works for populated & unpopulated)
--------------------------------------------------- */
function findMember(team, userId) {
  return team.members.find(m => {
    const memberId = m.user?._id || m.user;
    return String(memberId) === String(userId);
  });
}

/* ---------------------------------------------------
   1️⃣ GET PENDING EXTENSION REQUESTS (ADMIN/MANAGER ONLY)
--------------------------------------------------- */
router.get("/:teamId/extensions/pending", protect, async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    const member = findMember(team, req.user._id);
    if (!member || !["admin", "manager"].includes(member.role)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const pending = await TTask.find({
      team: req.params.teamId,
      "extensionRequest.status": "pending",
    })
      .populate("extensionRequest.requestedBy", "name email photo")
      .populate("assignedTo", "name photo")
      .populate("createdBy", "name photo");

    res.json(pending);
  } catch (err) {
    console.error("Pending extension error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ---------------------------------------------------
   2️⃣ APPROVE EXTENSION REQUEST
--------------------------------------------------- */
router.post("/:taskId/extension/approve", protect, async (req, res) => {
  try {
    const task = await TTask.findById(req.params.taskId).populate({
      path: "team",
      populate: { path: "members.user", select: "name email photo" },
    });

    if (!task) return res.status(404).json({ message: "Task not found" });

    const member = findMember(task.team, req.user._id);
    if (!member || !["admin", "manager"].includes(member.role)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (
      !task.extensionRequest ||
      !task.extensionRequest.requested ||
      task.extensionRequest.status !== "pending"
    ) {
      return res.status(400).json({ message: "No pending request" });
    }

    // Apply extension
    task.dueDate = task.extensionRequest.requestedDueDate;
    task.extensionRequest.status = "approved";
    task.extensionRequest.reviewedBy = req.user._id;
    task.extensionRequest.reviewedAt = new Date();
    await task.save();

    // Notify assignee
    if (task.assignedTo) {
      await Notification.create({
        user: task.assignedTo,
        title: "Extension Approved",
        message: `Your extension request for "${task.title}" has been approved.`,
        link: `/teams/${task.team._id}?tab=tasks`,
        type: "extension",
        team: task.team._id,
      });
    }

    res.json({ message: "Extension approved", task });
  } catch (err) {
    console.error("Approve extension error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ---------------------------------------------------
   3️⃣ REJECT EXTENSION REQUEST
--------------------------------------------------- */
router.post("/:taskId/extension/reject", protect, async (req, res) => {
  try {
    const task = await TTask.findById(req.params.taskId).populate({
      path: "team",
      populate: { path: "members.user", select: "name email photo" },
    });

    if (!task) return res.status(404).json({ message: "Task not found" });

    const member = findMember(task.team, req.user._id);
    if (!member || !["admin", "manager"].includes(member.role)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (
      !task.extensionRequest ||
      !task.extensionRequest.requested ||
      task.extensionRequest.status !== "pending"
    ) {
      return res.status(400).json({ message: "No pending request" });
    }

    task.extensionRequest.status = "rejected";
    task.extensionRequest.reviewedBy = req.user._id;
    task.extensionRequest.reviewedAt = new Date();
    await task.save();

    if (task.assignedTo) {
      await Notification.create({
        user: task.assignedTo,
        title: "Extension Rejected",
        message: `Your extension request for "${task.title}" has been rejected.`,
        link: `/teams/${task.team._id}?tab=tasks`,
        type: "extension",
        team: task.team._id,
      });
    }

    res.json({ message: "Extension rejected", task });
  } catch (err) {
    console.error("Reject extension error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ---------------------------------------------------
   4️⃣ CREATE TEAM TASK (ADMIN/MANAGER ONLY)
--------------------------------------------------- */
router.post("/:teamId", protect, async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    const member = findMember(team, req.user._id);
    if (!member) return res.status(403).json({ message: "Not a member" });

    if (!["admin", "manager"].includes(member.role)) {
      return res.status(403).json({ message: "Only admins/managers can create tasks" });
    }

    const { title, description, priority, dueDate, assignedTo, color, icon } = req.body;

    if (assignedTo) {
      const assignedMember = findMember(team, assignedTo);
      if (!assignedMember) return res.status(400).json({ message: "Assigned user not member" });
    }

    const task = await TTask.create({
      team: req.params.teamId,
      title,
      description,
      priority: priority || "medium",
      dueDate: dueDate ? new Date(dueDate) : null,
      assignedTo: assignedTo || null,
      color: color || "#4CAF50",
      icon: icon || "📋",
      createdBy: req.user._id,
    });

    if (assignedTo) {
      await Notification.create({
        user: assignedTo,
        title: "New Task Assigned",
        message: `You have been assigned "${title}".`,
        link: `/teams/${team._id}?tab=tasks`,
        type: "task_assigned",
        team: team._id,
      });
    }

    res.status(201).json(task);
  } catch (err) {
    console.error("Create task error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ---------------------------------------------------
   5️⃣ UPDATE TASK (ADMIN/MANAGER; member only updates status)
--------------------------------------------------- */
router.put("/:taskId", protect, async (req, res) => {
  try {
    const task = await TTask.findById(req.params.taskId).populate({
      path: "team",
      populate: { path: "members.user" },
    });

    if (!task) return res.status(404).json({ message: "Task not found" });

    const member = findMember(task.team, req.user._id);
    if (!member) return res.status(403).json({ message: "Not a member" });

    const { title, description, priority, dueDate, assignedTo, status, color, icon } =
      req.body;

    // MEMBER logic
    if (member.role === "member") {
      if (!task.assignedTo || String(task.assignedTo) !== String(req.user._id)) {
        return res.status(403).json({ message: "Not allowed" });
      }
      if (!["todo", "in-progress", "completed"].includes(status)) {
        return res.status(403).json({ message: "Members can only update task status" });
      }

      task.status = status;
      if (status === "completed") {
        task.completedAt = new Date();
        task.completedBy = req.user._id;
      }

      await task.save();
      return res.json(task);
    }

    // ADMIN/MANAGER logic:
    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (priority !== undefined) task.priority = priority;
    if (dueDate !== undefined) task.dueDate = new Date(dueDate);
    if (color !== undefined) task.color = color;
    if (icon !== undefined) task.icon = icon;

    if (status && ["todo", "in-progress", "completed"].includes(status)) {
      task.status = status;
      if (status === "completed") {
        task.completedAt = new Date();
        task.completedBy = req.user._id;
      }
    }

    if (assignedTo !== undefined) {
      if (assignedTo === "" || assignedTo === null) {
        task.assignedTo = null;
      } else {
        const assignedMember = findMember(task.team, assignedTo);
        if (!assignedMember) {
          return res.status(400).json({ message: "Assigned user not member" });
        }
        task.assignedTo = assignedTo;
      }
    }

    await task.save();
    res.json(task);
  } catch (err) {
    console.error("Update task error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ---------------------------------------------------
   6️⃣ DELETE TASK
--------------------------------------------------- */
router.delete("/:taskId", protect, async (req, res) => {
  try {
    const task = await TTask.findById(req.params.taskId).populate("team");

    if (!task) return res.status(404).json({ message: "Task not found" });

    const member = findMember(task.team, req.user._id);
    if (!member || !["admin", "manager"].includes(member.role)) {
      return res.status(403).json({ message: "Not allowed" });
    }

    await task.deleteOne();
    res.json({ message: "Task deleted" });
  } catch (err) {
    console.error("Delete task error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ---------------------------------------------------
   7️⃣ GET ALL TASKS FOR TEAM (Member sees only their tasks)
--------------------------------------------------- */
router.get("/:teamId", protect, async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    const member = findMember(team, req.user._id);
    if (!member) return res.status(403).json({ message: "Not a member" });

    let query = { team: req.params.teamId };

    if (member.role === "member") {
      query.$or = [{ assignedTo: req.user._id }, { assignedTo: null }];
    }

    const tasks = await TTask.find(query)
      .populate("assignedTo", "name photo")
      .populate("createdBy", "name photo")
      .populate("team", "name color icon");

    res.json(tasks);
  } catch (err) {
    console.error("Get tasks error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ---------------------------------------------------
   8️⃣ REQUEST EXTENSION
--------------------------------------------------- */
router.post("/:taskId/request-extension", protect, async (req, res) => {
  try {
    const { reason, requestedDueDate } = req.body;

    const task = await TTask.findById(req.params.taskId).populate({
      path: "team",
      populate: { path: "members.user" },
    });

    if (!task) return res.status(404).json({ message: "Task not found" });

    if (!task.assignedTo || String(task.assignedTo) !== String(req.user._id)) {
      return res.status(403).json({ message: "Not allowed" });
    }

    // Prevent duplicate pending request
    if (
      task.extensionRequest &&
      task.extensionRequest.requested &&
      task.extensionRequest.status === "pending"
    ) {
      return res.status(400).json({ message: "Already requested" });
    }

    const reqDate = new Date(requestedDueDate);
    if (reqDate <= new Date(task.dueDate)) {
      return res
        .status(400)
        .json({ message: "Requested due date must be later" });
    }

    task.extensionRequest = {
      requested: true,
      requestedBy: req.user._id,
      reason,
      requestedDueDate: reqDate,
      requestedAt: new Date(),
      status: "pending",
      reviewedBy: null,
      reviewedAt: null,
    };

    await task.save();

    const admins = task.team.members.filter(m =>
      ["admin", "manager"].includes(m.role)
    );

    for (const admin of admins) {
      await Notification.create({
        user: admin.user,
        title: "Extension Request",
        message: `${req.user.name} requested extension for "${task.title}"`,
        link: `/teams/${task.team._id}?tab=extensions`,
        type: "extension_request",
        team: task.team._id,
      });
    }

    res.json({ message: "Extension request submitted", task });
  } catch (err) {
    console.error("Extension request error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
