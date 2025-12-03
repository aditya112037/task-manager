const express = require("express");
const router = express.Router();
const Team = require("../models/team");
const TTask = require("../models/TTask");
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

    const tasks = await TTask.find(query)
      .sort({ createdAt: -1 })
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

    // Only admin or manager can create tasks
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
      color: req.body.color || "#4CAF50", // Add color support
      icon: req.body.icon || "📋" // Add icon support
    });

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

    // Check if user is a member
    const member = team.members.find(
      m => String(m.user) === String(req.user._id)
    );

    if (!member) {
      return res.status(403).json({ message: "Not a member of this team" });
    }

    // Check permissions
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

    // Validate new assignment if provided
    if (req.body.assignedTo && req.body.assignedTo !== task.assignedTo?.toString()) {
      const assignedMember = team.members.find(
        m => String(m.user) === String(req.body.assignedTo)
      );
      if (!assignedMember) {
        return res.status(400).json({ 
          message: "Cannot assign task to non-team member" 
        });
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

    // Check if user is a member
    const member = team.members.find(
      m => String(m.user) === String(req.user._id)
    );

    if (!member) {
      return res.status(403).json({ message: "Not a member of this team" });
    }

    // Only admin or manager can delete tasks
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
    // Find all teams user is a member of
    const teams = await Team.find({
      "members.user": req.user._id
    });

    const teamIds = teams.map(team => team._id);

    // Get user's role in each team
    const teamRoles = {};
    teams.forEach(team => {
      const member = team.members.find(m => String(m.user) === String(req.user._id));
      teamRoles[team._id] = member?.role || "member";
    });

    // Get all tasks from those teams
    let tasks = await TTask.find({
      team: { $in: teamIds }
    })
    .populate("team", "name color icon")
    .populate("createdBy", "name email photo")
    .populate("assignedTo", "name email photo")
    .sort({ createdAt: -1 });

    // Filter tasks based on user role in each team
    if (tasks.length > 0) {
      tasks = tasks.filter(task => {
        const userRole = teamRoles[task.team._id];
        
        // Admin/manager can see all tasks
        if (["admin", "manager"].includes(userRole)) {
          return true;
        }
        
        // Regular members can only see tasks assigned to them or unassigned
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

    // Get tasks assigned to current user
    const tasks = await TTask.find({
      team: req.params.teamId,
      assignedTo: req.user._id
    })
    .populate("createdBy", "name email photo")
    .populate("assignedTo", "name email photo")
    .populate("team", "name color icon")
    .sort({ createdAt: -1 });

    res.json(tasks);
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

    // Check if requesting user is admin/manager
    const member = team.members.find(
      m => String(m.user) === String(req.user._id)
    );

    if (!member || !["admin", "manager"].includes(member.role)) {
      return res.status(403).json({ 
        message: "Only admin or manager can view tasks by user" 
      });
    }

    // Check if target user is a team member
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
    .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;