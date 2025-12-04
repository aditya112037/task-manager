const express = require("express");
const router = express.Router();
const Team = require("../models/Team");
const TTask = require("../models/TTask");
const Notification = require("../models/Notification");
const { protect } = require("../middleware/auth");

// ----------------------------------------------------
// GET all tasks for team (with assignment filtering)
// ----------------------------------------------------
router.get("/:teamId", protect, async (req, res) => {
  try {
    // Check if user is a member of the team
    const team = await Team.findById(req.params.teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    const member = team.members.find(
      m => String(m.user) === String(req.user._id)
    );

    if (!member) {
      return res.status(403).json({ message: "Not a member of this team" });
    }

    // Build query based on user role
    let query = { team: req.params.teamId };
    
    // If user is a regular member, only show tasks assigned to them OR unassigned tasks
    if (member.role === "member") {
      query.$or = [
        { assignedTo: req.user._id },
        { assignedTo: null }
      ];
    }

    // Apply filters from query params
    if (req.query.priority) {
      query.priority = req.query.priority;
    }
    
    if (req.query.status) {
      query.status = req.query.status;
    }
    
    if (req.query.assignedTo === "me") {
      query.assignedTo = req.user._id;
    }
    
    // Date filtering
    if (req.query.dateFilter) {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const endOfWeek = new Date(now);
      endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
      
      switch(req.query.dateFilter) {
        case "today":
          query.dueDate = {
            $gte: new Date(now.setHours(0,0,0,0)),
            $lt: new Date(now.setHours(23,59,59,999))
          };
          break;
        case "tomorrow":
          query.dueDate = {
            $gte: new Date(tomorrow.setHours(0,0,0,0)),
            $lt: new Date(tomorrow.setHours(23,59,59,999))
          };
          break;
        case "this_week":
          query.dueDate = { $lte: endOfWeek };
          break;
        case "overdue":
          query.dueDate = { $lt: new Date() };
          query.status = { $in: ["todo", "in-progress"] };
          break;
        case "no_date":
          query.dueDate = null;
          break;
      }
    }

    const tasks = await TTask.find(query)
      .sort({ dueDate: 1, createdAt: -1 })
      .populate("createdBy", "name email photo")
      .populate("assignedTo", "name email photo")
      .populate("team", "name color icon");

    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ----------------------------------------------------
// CREATE TASK (Admin or Manager) - WITH ASSIGNMENT
// ----------------------------------------------------
router.post("/:teamId", protect, async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    // Check if user is admin or manager
    const member = team.members.find(
      m => String(m.user) === String(req.user._id)
    );

    if (!member) {
      return res.status(403).json({ message: "Not a member of this team" });
    }

    if (!["admin", "manager"].includes(member.role)) {
      return res.status(403).json({ 
        message: "Only admin or manager can create tasks" 
      });
    }

    // Validate assignedTo if provided
    if (req.body.assignedTo) {
      const assignedMember = team.members.find(
        m => String(m.user) === String(req.body.assignedTo)
      );
      if (!assignedMember) {
        return res.status(400).json({ 
          message: "Cannot assign task to non-team member" 
        });
      }
    }

    const task = await TTask.create({
      team: req.params.teamId,
      title: req.body.title,
      description: req.body.description,
      priority: req.body.priority,
      status: req.body.status || "todo",
      dueDate: req.body.dueDate,
      assignedTo: req.body.assignedTo || null,
      createdBy: req.user._id,
      color: req.body.color || "#4CAF50",
      icon: req.body.icon || "📋",
      category: req.body.category || "general",
      tags: req.body.tags || [],
    });

    // Create notification if task is assigned to someone
    if (req.body.assignedTo && req.body.assignedTo !== req.user._id) {
      await Notification.create({
        user: req.body.assignedTo,
        type: "task_assigned",
        title: "New Task Assigned",
        message: `You have been assigned a new task "${req.body.title}" in team "${team.name}"`,
        relatedTask: task._id,
        relatedTeam: team._id,
        metadata: {
          assignedBy: req.user.name,
          priority: req.body.priority || "medium",
          dueDate: req.body.dueDate,
        }
      });
    }

    const populatedTask = await TTask.findById(task._id)
      .populate("createdBy", "name email photo")
      .populate("assignedTo", "name email photo")
      .populate("team", "name color icon");

    res.json(populatedTask);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ----------------------------------------------------
// UPDATE TASK (Admin, Manager, or assigned member)
// ----------------------------------------------------
router.put("/:taskId", protect, async (req, res) => {
  try {
    const task = await TTask.findById(req.params.taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const team = await Team.findById(task.team);

    const member = team.members.find(
      m => String(m.user) === String(req.user._id)
    );

    if (!member) {
      return res.status(403).json({ message: "Not a member of this team" });
    }

    const isTaskAssignedToUser = String(task.assignedTo) === String(req.user._id);
    const canModify = ["admin", "manager"].includes(member.role) || isTaskAssignedToUser;

    if (!canModify) {
      return res.status(403).json({
        message: "Only admin, manager, or assigned member can modify this task"
      });
    }

    // Only admin/manager can change assignment
    if (req.body.assignedTo && !["admin", "manager"].includes(member.role)) {
      return res.status(403).json({
        message: "Only admin or manager can change task assignment"
      });
    }

    // If assignment is changing, create notification
    if (req.body.assignedTo && req.body.assignedTo !== task.assignedTo?.toString()) {
      const assignedMember = team.members.find(
        m => String(m.user) === String(req.body.assignedTo)
      );
      if (!assignedMember) {
        return res.status(400).json({ 
          message: "Cannot assign task to non-team member" 
        });
      }
      
      // Create notification for newly assigned user
      if (req.body.assignedTo !== req.user._id) {
        await Notification.create({
          user: req.body.assignedTo,
          type: "task_assigned",
          title: "Task Re-assigned",
          message: `Task "${task.title}" has been assigned to you in team "${team.name}"`,
          relatedTask: task._id,
          relatedTeam: team._id,
          metadata: {
            assignedBy: req.user.name,
            priority: task.priority,
            dueDate: task.dueDate,
          }
        });
      }
    }

    // If marking as complete
    if (req.body.status === "completed" && task.status !== "completed") {
      req.body.completedAt = new Date();
      req.body.completedBy = req.user._id;
      
      // Create notification for task creator and admins
      const teamMembers = team.members.filter(m => 
        ["admin", "manager"].includes(m.role) || 
        String(m.user) === String(task.createdBy)
      );

      for (const teamMember of teamMembers) {
        if (String(teamMember.user) !== String(req.user._id)) {
          await Notification.create({
            user: teamMember.user,
            type: "task_completed",
            title: "Task Completed",
            message: `Task "${task.title}" has been completed by ${req.user.name}`,
            relatedTask: task._id,
            relatedTeam: team._id,
          });
        }
      }
    }

    const updated = await TTask.findByIdAndUpdate(
      task._id, 
      req.body, 
      { new: true }
    )
    .populate("createdBy", "name email photo")
    .populate("assignedTo", "name email photo")
    .populate("team", "name color icon");

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ----------------------------------------------------
// DELETE TASK (Admin or Manager only)
// ----------------------------------------------------
router.delete("/:taskId", protect, async (req, res) => {
  try {
    const task = await TTask.findById(req.params.taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const team = await Team.findById(task.team);

    const member = team.members.find(
      m => String(m.user) === String(req.user._id)
    );

    if (!member) {
      return res.status(403).json({ message: "Not a member of this team" });
    }

    if (!["admin", "manager"].includes(member.role)) {
      return res.status(403).json({
        message: "Only admin or manager can delete tasks."
      });
    }

    await task.deleteOne();

    res.json({ message: "Task deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ----------------------------------------------------
// GET ALL MY TEAM TASKS (across all teams)
// ----------------------------------------------------
router.get("/my/all", protect, async (req, res) => {
  try {
    const teams = await Team.find({
      "members.user": req.user._id
    });

    const teamIds = teams.map(team => team._id);

    const teamRoles = {};
    teams.forEach(team => {
      const member = team.members.find(m => String(m.user) === String(req.user._id));
      teamRoles[team._id] = member?.role || "member";
    });

    // Build query with filters
    let query = { team: { $in: teamIds } };
    
    // Apply filters from query params
    if (req.query.priority) {
      query.priority = req.query.priority;
    }
    
    if (req.query.status) {
      query.status = req.query.status;
    }
    
    if (req.query.teamId) {
      query.team = req.query.teamId;
    }
    
    if (req.query.assignedTo === "me") {
      query.assignedTo = req.user._id;
    } else if (req.query.assignedTo === "others") {
      query.assignedTo = { $ne: req.user._id, $ne: null };
    } else if (req.query.assignedTo === "unassigned") {
      query.assignedTo = null;
    }

    let tasks = await TTask.find(query)
    .populate("team", "name color icon")
    .populate("createdBy", "name email photo")
    .populate("assignedTo", "name email photo")
    .sort({ dueDate: 1, createdAt: -1 });

    // Filter tasks based on user role in each team
    if (tasks.length > 0) {
      tasks = tasks.filter(task => {
        const userRole = teamRoles[task.team._id];
        
        if (["admin", "manager"].includes(userRole)) {
          return true;
        }
        
        return !task.assignedTo || String(task.assignedTo._id) === String(req.user._id);
      });
    }

    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ----------------------------------------------------
// NEW: GET TASKS ASSIGNED TO ME (in specific team)
// ----------------------------------------------------
router.get("/:teamId/my", protect, async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    const isMember = team.members.some(
      m => String(m.user) === String(req.user._id)
    );

    if (!isMember) {
      return res.status(403).json({ message: "Not a member of this team" });
    }

    // Build query with filters
    let query = {
      team: req.params.teamId,
      assignedTo: req.user._id
    };
    
    if (req.query.status) {
      query.status = req.query.status;
    }
    
    if (req.query.priority) {
      query.priority = req.query.priority;
    }
    
    // Date filtering
    if (req.query.dateFilter) {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const endOfWeek = new Date(now);
      endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
      
      switch(req.query.dateFilter) {
        case "today":
          query.dueDate = {
            $gte: new Date(now.setHours(0,0,0,0)),
            $lt: new Date(now.setHours(23,59,59,999))
          };
          break;
        case "tomorrow":
          query.dueDate = {
            $gte: new Date(tomorrow.setHours(0,0,0,0)),
            $lt: new Date(tomorrow.setHours(23,59,59,999))
          };
          break;
        case "this_week":
          query.dueDate = { $lte: endOfWeek };
          break;
        case "overdue":
          query.dueDate = { $lt: new Date() };
          query.status = { $in: ["todo", "in-progress"] };
          break;
        case "no_date":
          query.dueDate = null;
          break;
      }
    }

    const tasks = await TTask.find(query)
    .populate("createdBy", "name email photo")
    .populate("assignedTo", "name email photo")
    .populate("team", "name color icon")
    .sort({ dueDate: 1, createdAt: -1 });

    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ----------------------------------------------------
// NEW: REQUEST EXTENSION
// ----------------------------------------------------
router.post("/:taskId/request-extension", protect, async (req, res) => {
  try {
    const task = await TTask.findById(req.params.taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const { reason, requestedDueDate } = req.body;
    
    if (String(task.assignedTo) !== String(req.user._id)) {
      return res.status(403).json({ message: "Only assigned user can request extension" });
    }

    task.extensionRequest = {
      requested: true,
      reason,
      requestedBy: req.user._id,
      requestedAt: new Date(),
      status: "pending",
      requestedDueDate: requestedDueDate ? new Date(requestedDueDate) : null,
    };

    await task.save();

    // Get team admins and managers
    const team = await Team.findById(task.team).populate("members.user");
    const adminsAndManagers = team.members.filter(
      m => ["admin", "manager"].includes(m.role)
    );

    // Create notification for each admin/manager
    for (const member of adminsAndManagers) {
      await Notification.create({
        user: member.user._id,
        type: "extension_requested",
        title: "Extension Requested",
        message: `${req.user.name} requested an extension for task "${task.title}"`,
        relatedTask: task._id,
        relatedTeam: task.team,
        metadata: {
          reason: reason,
          requestedBy: req.user.name,
          currentDueDate: task.dueDate,
          requestedDueDate: requestedDueDate,
        }
      });
    }

    const populatedTask = await TTask.findById(task._id)
      .populate("createdBy", "name email photo")
      .populate("assignedTo", "name email photo")
      .populate("team", "name color icon");

    res.json({ message: "Extension request submitted", task: populatedTask });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ----------------------------------------------------
// NEW: APPROVE/REJECT EXTENSION (Admin/Manager only)
// ----------------------------------------------------
router.put("/:taskId/extension/:action", protect, async (req, res) => {
  try {
    const task = await TTask.findById(req.params.taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const team = await Team.findById(task.team);
    const member = team.members.find(m => String(m.user) === String(req.user._id));

    if (!member || !["admin", "manager"].includes(member.role)) {
      return res.status(403).json({ message: "Only admin or manager can manage extensions" });
    }

    const action = req.params.action;
    
    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ message: "Invalid action" });
    }

    if (!task.extensionRequest?.requested) {
      return res.status(400).json({ message: "No extension request found" });
    }

    task.extensionRequest.status = action === "approve" ? "approved" : "rejected";
    
    if (action === "approve" && task.extensionRequest.requestedDueDate) {
      task.dueDate = task.extensionRequest.requestedDueDate;
    }

    await task.save();

    // Create notification for the assigned user
    await Notification.create({
      user: task.assignedTo,
      type: action === "approve" ? "extension_approved" : "extension_rejected",
      title: action === "approve" ? "Extension Approved" : "Extension Rejected",
      message: action === "approve" 
        ? `Your extension request for task "${task.title}" has been approved`
        : `Your extension request for task "${task.title}" has been rejected`,
      relatedTask: task._id,
      relatedTeam: task.team,
    });

    const populatedTask = await TTask.findById(task._id)
      .populate("createdBy", "name email photo")
      .populate("assignedTo", "name email photo")
      .populate("team", "name color icon");

    res.json({ 
      message: `Extension ${action}d`, 
      task: populatedTask 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ----------------------------------------------------
// NEW: QUICK COMPLETE TASK
// ----------------------------------------------------
router.post("/:taskId/quick-complete", protect, async (req, res) => {
  try {
    const task = await TTask.findById(req.params.taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const team = await Team.findById(task.team);
    const member = team.members.find(m => String(m.user) === String(req.user._id));
    
    const canComplete = member && (
      ["admin", "manager"].includes(member.role) || 
      String(task.assignedTo) === String(req.user._id)
    );

    if (!canComplete) {
      return res.status(403).json({ message: "Not authorized to complete this task" });
    }

    task.status = "completed";
    task.completedAt = new Date();
    task.completedBy = req.user._id;

    await task.save();

    // Create notification for task creator and admins
    const teamMembers = team.members.filter(m => 
      ["admin", "manager"].includes(m.role) || 
      String(m.user) === String(task.createdBy)
    );

    for (const teamMember of teamMembers) {
      if (String(teamMember.user) !== String(req.user._id)) {
        await Notification.create({
          user: teamMember.user._id,
          type: "task_completed",
          title: "Task Completed",
          message: `Task "${task.title}" has been completed by ${req.user.name}`,
          relatedTask: task._id,
          relatedTeam: task.team,
        });
      }
    }

    const populatedTask = await TTask.findById(task._id)
      .populate("createdBy", "name email photo")
      .populate("assignedTo", "name email photo")
      .populate("team", "name color icon");

    res.json({ message: "Task marked as complete", task: populatedTask });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ----------------------------------------------------
// NEW: GET TASKS ASSIGNED TO SPECIFIC USER (Admin/Manager only)
// ----------------------------------------------------
router.get("/:teamId/user/:userId", protect, async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    const member = team.members.find(
      m => String(m.user) === String(req.user._id)
    );

    if (!member || !["admin", "manager"].includes(member.role)) {
      return res.status(403).json({ 
        message: "Only admin or manager can view tasks by user" 
      });
    }

    const targetIsMember = team.members.some(
      m => String(m.user) === String(req.params.userId)
    );

    if (!targetIsMember) {
      return res.status(400).json({ 
        message: "User is not a member of this team" 
      });
    }

    const tasks = await TTask.find({
      team: req.params.teamId,
      assignedTo: req.params.userId
    })
    .populate("createdBy", "name email photo")
    .populate("assignedTo", "name email photo")
    .populate("team", "name color icon")
    .sort({ dueDate: 1, createdAt: -1 });

    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;