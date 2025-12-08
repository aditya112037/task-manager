const express = require("express");
const router = express.Router();
const TTask = require("../models/TTask");
const Team = require("../models/team");
const Notification = require("../models/Notification");
const { protect } = require("../middleware/auth");

/* -----------------------------------------
   1️⃣ PENDING EXTENSION REQUESTS
----------------------------------------- */
router.get("/:teamId/extensions/pending", protect, async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    const member = team.members.find(
      m => String(m.user) === String(req.user._id)
    );

    if (!member || !["admin","manager"].includes(member.role)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const pending = await TTask.find({
      team: req.params.teamId,
      "extensionRequest.status": "pending"
    })
    .populate("extensionRequest.requestedBy", "name email photo")
    .populate("assignedTo", "name photo")
    .populate("createdBy", "name photo");

    res.json(pending);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

/* -----------------------------------------
   2️⃣ EXTENSION APPROVAL
----------------------------------------- */
router.post("/:taskId/extension/approve", protect, async (req, res) => {
  try {
    const task = await TTask.findById(req.params.taskId)
      .populate("team", "name members")
      .populate("assignedTo", "name email");

    if (!task) return res.status(404).json({ message: "Task not found" });

    // Check if user is admin/manager of the team
    const team = await Team.findById(task.team._id);
    const member = team.members.find(m => String(m.user) === String(req.user._id));
    
    if (!member || !["admin", "manager"].includes(member.role)) {
      return res.status(403).json({ message: "Only admins/managers can approve extensions" });
    }

    // Check if there's a pending extension request
    if (!task.extensionRequest.requested || task.extensionRequest.status !== "pending") {
      return res.status(400).json({ message: "No pending extension request" });
    }

    // Update due date and extension status
    task.dueDate = task.extensionRequest.requestedDueDate;
    task.extensionRequest.status = "approved";
    task.extensionRequest.reviewedBy = req.user._id;
    task.extensionRequest.reviewedAt = new Date();
    
    await task.save();

    // Create notification for the task assignee
    if (task.assignedTo) {
      await Notification.create({
        user: task.assignedTo._id,
        title: "Extension Approved",
        message: `Your extension request for "${task.title}" has been approved. New due date: ${new Date(task.dueDate).toLocaleDateString()}`,
        link: `/teams/${task.team._id}?tab=tasks`,
        type: "extension",
        team: task.team._id,
      });
    }

    res.json({ 
      message: "Extension approved", 
      task: await TTask.findById(task._id)
        .populate("assignedTo", "name photo")
        .populate("createdBy", "name photo")
        .populate("team", "name color icon")
    });
  } catch (err) {
    console.error("Approve extension error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* -----------------------------------------
   3️⃣ EXTENSION REJECTION
----------------------------------------- */
router.post("/:taskId/extension/reject", protect, async (req, res) => {
  try {
    const task = await TTask.findById(req.params.taskId)
      .populate("team", "name members")
      .populate("assignedTo", "name email");

    if (!task) return res.status(404).json({ message: "Task not found" });

    // Check if user is admin/manager of the team
    const team = await Team.findById(task.team._id);
    const member = team.members.find(m => String(m.user) === String(req.user._id));
    
    if (!member || !["admin", "manager"].includes(member.role)) {
      return res.status(403).json({ message: "Only admins/managers can reject extensions" });
    }

    // Check if there's a pending extension request
    if (!task.extensionRequest.requested || task.extensionRequest.status !== "pending") {
      return res.status(400).json({ message: "No pending extension request" });
    }

    // Update extension status (don't change due date)
    task.extensionRequest.status = "rejected";
    task.extensionRequest.reviewedBy = req.user._id;
    task.extensionRequest.reviewedAt = new Date();
    
    await task.save();

    // Create notification for the task assignee
    if (task.assignedTo) {
      await Notification.create({
        user: task.assignedTo._id,
        title: "Extension Rejected",
        message: `Your extension request for "${task.title}" has been rejected.`,
        link: `/teams/${task.team._id}?tab=tasks`,
        type: "extension",
        team: task.team._id,
      });
    }

    res.json({ 
      message: "Extension rejected", 
      task: await TTask.findById(task._id)
        .populate("assignedTo", "name photo")
        .populate("createdBy", "name photo")
        .populate("team", "name color icon")
    });
  } catch (err) {
    console.error("Reject extension error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* -----------------------------------------
   4️⃣ CREATE TASK (with assigned/unassigned handling)
----------------------------------------- */
router.post("/:teamId", protect, async (req, res) => {
  try {
    const { title, description, priority, dueDate, assignedTo, color, icon } = req.body;
    const teamId = req.params.teamId;

    // Check if user is member of the team
    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    const member = team.members.find(m => String(m.user) === String(req.user._id));
    if (!member) return res.status(403).json({ message: "You are not a member of this team" });

    // Only admins/managers can create tasks
    if (!["admin", "manager"].includes(member.role)) {
      return res.status(403).json({ message: "Only admins/managers can create tasks" });
    }

    // Validate assignedTo if provided
    if (assignedTo) {
      const assignedMember = team.members.find(m => String(m.user) === String(assignedTo));
      if (!assignedMember) {
        return res.status(400).json({ message: "Assigned user must be a team member" });
      }
    }

    const task = new TTask({
      team: teamId,
      title,
      description,
      priority: priority || "medium",
      dueDate: dueDate ? new Date(dueDate) : null,
      assignedTo: assignedTo || null,
      color: color || "#4CAF50",
      icon: icon || "📋",
      createdBy: req.user._id,
    });

    await task.save();

    // Populate the task for response
    const populatedTask = await TTask.findById(task._id)
      .populate("assignedTo", "name photo")
      .populate("createdBy", "name photo")
      .populate("team", "name color icon");

    // Create notification if task is assigned
    if (assignedTo) {
      await Notification.create({
        user: assignedTo,
        title: "New Task Assigned",
        message: `You have been assigned to "${title}" in team ${team.name}`,
        link: `/teams/${teamId}?tab=tasks`,
        type: "task_assigned",
        team: teamId,
      });
    }

    res.status(201).json(populatedTask);
  } catch (err) {
    console.error("Create task error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* -----------------------------------------
   5️⃣ UPDATE TASK (with permission checks)
----------------------------------------- */
router.put("/:taskId", protect, async (req, res) => {
  try {
    const task = await TTask.findById(req.params.taskId)
      .populate("team", "name members")
      .populate("assignedTo", "name photo");

    if (!task) return res.status(404).json({ message: "Task not found" });

    // Check team membership
    const team = await Team.findById(task.team._id);
    const member = team.members.find(m => String(m.user) === String(req.user._id));
    
    if (!member) return res.status(403).json({ message: "You are not a member of this team" });

    // Determine what can be updated
    const { title, description, priority, dueDate, assignedTo, status, color, icon } = req.body;
    
    // Regular members can only update their own task status
    if (member.role === "member") {
      // Can only update status if assigned to them
      if (task.assignedTo && String(task.assignedTo._id) !== String(req.user._id)) {
        return res.status(403).json({ message: "You can only update tasks assigned to you" });
      }
      
      // Can only update status field
      if (status && ["todo", "in-progress", "completed"].includes(status)) {
        const oldStatus = task.status;
        task.status = status;
        
        if (status === "completed") {
          task.completedAt = new Date();
          task.completedBy = req.user._id;
        }
        
        await task.save();
        
        // Notification for task completion
        if (oldStatus !== "completed" && status === "completed") {
          await Notification.create({
            user: task.createdBy,
            title: "Task Completed",
            message: `"${task.title}" has been marked as completed by ${req.user.name || "a team member"}`,
            link: `/teams/${task.team._id}?tab=tasks`,
            type: "task_completed",
            team: task.team._id,
          });
        }
      } else {
        return res.status(403).json({ message: "Members can only update task status" });
      }
    } else {
      // Admin/manager can update anything
      if (title !== undefined) task.title = title;
      if (description !== undefined) task.description = description;
      if (priority !== undefined) task.priority = priority;
      if (dueDate !== undefined) task.dueDate = dueDate ? new Date(dueDate) : null;
      if (color !== undefined) task.color = color;
      if (icon !== undefined) task.icon = icon;
      
      // Handle status updates
      if (status !== undefined && ["todo", "in-progress", "completed"].includes(status)) {
        const oldStatus = task.status;
        task.status = status;
        
        if (status === "completed") {
          task.completedAt = new Date();
          task.completedBy = req.user._id;
        }
        
        // Notification for task completion
        if (oldStatus !== "completed" && status === "completed" && task.assignedTo) {
          await Notification.create({
            user: task.createdBy,
            title: "Task Completed",
            message: `"${task.title}" has been marked as completed by ${req.user.name || "a team member"}`,
            link: `/teams/${task.team._id}?tab=tasks`,
            type: "task_completed",
            team: task.team._id,
          });
        }
      }
      
      // Handle assignment changes
      if (assignedTo !== undefined) {
        const oldAssignee = task.assignedTo;
        
        if (assignedTo === null || assignedTo === "") {
          task.assignedTo = null;
        } else {
          // Validate new assignee is a team member
          const assignedMember = team.members.find(m => String(m.user) === String(assignedTo));
          if (!assignedMember) {
            return res.status(400).json({ message: "Assigned user must be a team member" });
          }
          task.assignedTo = assignedTo;
          
          // Notification for new assignment
          if (String(oldAssignee?._id) !== String(assignedTo)) {
            await Notification.create({
              user: assignedTo,
              title: "Task Assigned",
              message: `You have been assigned to "${task.title}" in team ${team.name}`,
              link: `/teams/${task.team._id}?tab=tasks`,
              type: "task_assigned",
              team: task.team._id,
            });
          }
        }
      }
      
      await task.save();
    }

    // Populate the updated task
    const populatedTask = await TTask.findById(task._id)
      .populate("assignedTo", "name photo")
      .populate("createdBy", "name photo")
      .populate("team", "name color icon");

    res.json(populatedTask);
  } catch (err) {
    console.error("Update task error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* -----------------------------------------
   6️⃣ DELETE TASK
----------------------------------------- */
router.delete("/:taskId", protect, async (req, res) => {
  try {
    const task = await TTask.findById(req.params.taskId)
      .populate("team", "name members");

    if (!task) return res.status(404).json({ message: "Task not found" });

    // Check team membership and permissions
    const team = await Team.findById(task.team._id);
    const member = team.members.find(m => String(m.user) === String(req.user._id));
    
    if (!member) return res.status(403).json({ message: "You are not a member of this team" });
    
    // Only admins/managers can delete tasks
    if (!["admin", "manager"].includes(member.role)) {
      return res.status(403).json({ message: "Only admins/managers can delete tasks" });
    }

    await TTask.findByIdAndDelete(req.params.taskId);
    res.json({ message: "Task deleted successfully" });
  } catch (err) {
    console.error("Delete task error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* -----------------------------------------
   7️⃣ GET ALL TASKS FOR TEAM (with member filtering)
----------------------------------------- */
router.get("/:teamId", protect, async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    const member = team.members.find(m => String(m.user) === String(req.user._id));
    if (!member) return res.status(403).json({ message: "You are not a member of this team" });

    let query = { team: req.params.teamId };
    
    // Regular members only see tasks assigned to them or unassigned
    if (member.role === "member") {
      query.$or = [
        { assignedTo: req.user._id },
        { assignedTo: null }
      ];
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

/* -----------------------------------------
   8️⃣ REQUEST EXTENSION
----------------------------------------- */
router.post("/:taskId/request-extension", protect, async (req, res) => {
  try {
    const { reason, requestedDueDate } = req.body;
    const task = await TTask.findById(req.params.taskId)
      .populate("team", "name members")
      .populate("assignedTo", "name email");

    if (!task) return res.status(404).json({ message: "Task not found" });

    // Check if task is assigned to the current user
    if (!task.assignedTo || String(task.assignedTo._id) !== String(req.user._id)) {
      return res.status(403).json({ message: "You can only request extensions for tasks assigned to you" });
    }

    // Check if there's already a pending request
    if (task.extensionRequest.requested && task.extensionRequest.status === "pending") {
      return res.status(400).json({ message: "You already have a pending extension request" });
    }

    // Validate requested due date
    const requestedDate = new Date(requestedDueDate);
    const currentDueDate = new Date(task.dueDate);
    
    if (requestedDate <= currentDueDate) {
      return res.status(400).json({ message: "Requested due date must be after the current due date" });
    }

    // Create extension request
    task.extensionRequest = {
      requested: true,
      requestedBy: req.user._id,
      reason,
      requestedDueDate: requestedDate,
      requestedAt: new Date(),
      status: "pending",
      reviewedBy: null,
      reviewedAt: null,
    };

    await task.save();

    // Create notifications for admins/managers
    const team = await Team.findById(task.team._id);
    const adminsManagers = team.members.filter(m => ["admin", "manager"].includes(m.role));
    
    for (const adminManager of adminsManagers) {
      await Notification.create({
        user: adminManager.user,
        title: "Extension Request",
        message: `${req.user.name || "A user"} has requested an extension for "${task.title}"`,
        link: `/teams/${task.team._id}?tab=extensions`,
        type: "extension_request",
        team: task.team._id,
      });
    }

    res.json({ 
      message: "Extension request submitted", 
      task: await TTask.findById(task._id)
        .populate("assignedTo", "name photo")
        .populate("createdBy", "name photo")
        .populate("team", "name color icon")
    });
  } catch (err) {
    console.error("Request extension error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;