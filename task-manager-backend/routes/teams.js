const express = require("express");
const router = express.Router();
const Team = require("../models/team");
const { protect } = require("../middleware/auth");

// ----------------------------------------------------
// CREATE TEAM ✓
// ----------------------------------------------------
router.post("/", protect, async (req, res) => {
  const { name, description, color, icon } = req.body;

  try {
    const team = await Team.create({
      name,
      description,
      color,
      icon,
      admin: req.user._id,
      members: [
        {
          user: req.user._id,
          role: "admin",
        },
      ],
    });

    res.status(201).json(team);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ----------------------------------------------------
// GET MY TEAMS ✓
// ----------------------------------------------------
router.get("/my", protect, async (req, res) => {
  try {
    const teams = await Team.find({
      "members.user": req.user._id,
    })
    .populate("admin", "name email photo");

    res.json(teams);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ----------------------------------------------------
// GENERATE INVITE LINK ✓
// ----------------------------------------------------
router.get("/:teamId/invite", protect, async (req, res) => {
  const { teamId } = req.params;

  const inviteLink = `${process.env.FRONTEND_URL}/join/${teamId}`;
  res.json({ inviteLink });
});

// ----------------------------------------------------
// JOIN TEAM ✓
// ----------------------------------------------------
router.post("/:teamId/join", protect, async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    const alreadyMember = team.members.some(
      (m) => m.user.toString() === req.user._id.toString()
    );

    if (!alreadyMember) {
      team.members.push({ user: req.user._id, role: "member" });
      await team.save();
    }

    res.json({ message: "Joined team", team });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ----------------------------------------------------
// REMOVE MEMBER (ADMIN ONLY) ✓ - UPDATED
// ----------------------------------------------------
router.delete("/:teamId/members/:userId", protect, async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    // Check if user is admin
    const isAdmin = team.admin.toString() === req.user._id.toString();
    if (!isAdmin) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Prevent removing admin
    if (req.params.userId === team.admin.toString()) {
      return res.status(400).json({ message: "Cannot remove team admin" });
    }

    // Remove member
    team.members = team.members.filter(
      (m) => m.user.toString() !== req.params.userId
    );

    await team.save();
    res.json({ message: "Member removed" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ----------------------------------------------------
// DELETE TEAM (ADMIN ONLY) ✓
// ----------------------------------------------------
router.delete("/:teamId", protect, async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    if (String(team.admin) !== String(req.user._id))
      return res.status(403).json({ message: "Not authorized" });

    await team.deleteOne();
    res.json({ message: "Team deleted" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ----------------------------------------------------
// GET TEAM DETAILS (with members + admin info) ✓ - FIXED
// ----------------------------------------------------
router.get("/:teamId/details", protect, async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId)
      .populate("members.user", "name email photo")
      .populate("admin", "name email photo");

    if (!team) return res.status(404).json({ message: "Team not found" });

    // Check if user is a member
    const isMember = team.members.some(
      m => String(m.user?._id || m.user) === String(req.user._id)
    );

    if (!isMember)
      return res.status(403).json({ message: "Not authorized in this team" });

    res.json(team);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ----------------------------------------------------
// UPDATE TEAM INFO (ADMIN ONLY) ✓
// ----------------------------------------------------
router.put("/:teamId", protect, async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId);

    if (!team) return res.status(404).json({ message: "Team not found" });

    if (String(team.admin) !== String(req.user._id)) {
      return res.status(403).json({ message: "Only admin can update the team." });
    }

    const updated = await Team.findByIdAndUpdate(
      req.params.teamId,
      req.body,
      { new: true }
    )
    .populate("members.user", "name email photo")
    .populate("admin", "name email photo");

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ----------------------------------------------------
// UPDATE MEMBER ROLE (ADMIN ONLY) ✓ - FIXED
// ----------------------------------------------------
router.put("/:teamId/members/:userId/role", protect, async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    // Check if user is admin
    if (String(team.admin) !== String(req.user._id)) {
      return res.status(403).json({ message: "Only admin can update roles" });
    }

    // Find member
    const member = team.members.find(
      (m) => String(m.user) === req.params.userId
    );

    if (!member)
      return res.status(404).json({ message: "Member not found" });

    // Update role
    member.role = req.body.role;
    await team.save();

    // Return populated team
    const updatedTeam = await Team.findById(team._id)
      .populate("members.user", "name email photo")
      .populate("admin", "name email photo");

    res.json({ message: "Role updated", team: updatedTeam });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ----------------------------------------------------
// LEAVE TEAM ✓ - FIXED
// ----------------------------------------------------
router.post("/:teamId/leave", protect, async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    // Check if user is admin
    if (String(team.admin) === String(req.user._id)) {
      return res.status(400).json({ message: "Admin cannot leave. Transfer admin role first." });
    }

    // Remove user from members
    team.members = team.members.filter(
      m => String(m.user) !== String(req.user._id)
    );

    await team.save();

    res.json({ message: "Left team successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ----------------------------------------------------
// NEW: GET MY ALL TEAM TASKS
// ----------------------------------------------------
router.get("/my/tasks", protect, async (req, res) => {
  try {
    // Find all teams user is a member of
    const teams = await Team.find({
      "members.user": req.user._id
    });

    const teamIds = teams.map(team => team._id);

    // Get all TTask from those teams
    const TTask = require("../models/TTask");
    const tasks = await TTask.find({
      team: { $in: teamIds }
    })
    .populate("team", "name color icon")
    .populate("createdBy", "name email")
    .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});




// ----------------------------------------------------
// NEW: TRANSFER ADMIN ROLE (ADMIN ONLY)
// ----------------------------------------------------
router.put("/:teamId/transfer-admin/:userId", protect, async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    // Check if current user is admin
    if (String(team.admin) !== String(req.user._id)) {
      return res.status(403).json({ message: "Only admin can transfer admin role" });
    }

    // Check if target user is a member
    const targetMember = team.members.find(
      m => String(m.user) === req.params.userId
    );

    if (!targetMember) {
      return res.status(404).json({ message: "User not found in team" });
    }

    // Transfer admin role
    team.admin = req.params.userId;
    
    // Update roles
    targetMember.role = "admin";
    
    // Update current user's role to member
    const currentMember = team.members.find(
      m => String(m.user) === String(req.user._id)
    );
    if (currentMember) {
      currentMember.role = "member";
    }

    await team.save();

    // Return populated team
    const updatedTeam = await Team.findById(team._id)
      .populate("members.user", "name email photo")
      .populate("admin", "name email photo");

    res.json({ 
      message: "Admin role transferred successfully", 
      team: updatedTeam 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});




// ----------------------------------------------------
// TEAM OVERVIEW ANALYTICS (NEW)
// ----------------------------------------------------
router.get("/:teamId/overview", protect, async (req, res) => {
  try {
    const teamId = req.params.teamId;

    // 1️⃣ Verify team + membership
    const team = await Team.findById(teamId).populate("members.user", "_id name photo");
    if (!team) return res.status(404).json({ message: "Team not found" });

    const isMember = team.members.some(
      m => String(m.user?._id || m.user) === String(req.user._id)
    );
    if (!isMember) return res.status(403).json({ message: "Not authorized" });

    const now = new Date();
    const riskWindow = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    // 2️⃣ Fetch tasks
    const tasks = await TTask.find({ team: teamId })
      .populate("assignedTo", "name photo")
      .lean();

    // 3️⃣ KPIs
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === "completed").length;
    const overdue = tasks.filter(
      t => t.status !== "completed" && t.dueDate && t.dueDate < now
    ).length;
    const atRisk = tasks.filter(
      t =>
        t.status !== "completed" &&
        t.dueDate &&
        t.dueDate >= now &&
        t.dueDate <= riskWindow
    ).length;

    // 4️⃣ Workload per member
    const workloadMap = {};
    tasks.forEach(t => {
      if (!t.assignedTo) return;

      const id = t.assignedTo._id.toString();
      if (!workloadMap[id]) {
        workloadMap[id] = {
          userId: id,
          name: t.assignedTo.name,
          photo: t.assignedTo.photo,
          active: 0,
          overdue: 0,
        };
      }

      if (t.status !== "completed") {
        workloadMap[id].active += 1;
        if (t.dueDate && t.dueDate < now) {
          workloadMap[id].overdue += 1;
        }
      }
    });

    const workload = Object.values(workloadMap);

    // 5️⃣ Delivery health
    let onTime = 0;
    let late = 0;

    tasks.forEach(t => {
      if (t.status === "completed" && t.completedAt && t.dueDate) {
        if (t.completedAt <= t.dueDate) onTime++;
        else late++;
      }
    });

    // 6️⃣ Status distribution
    const statusDistribution = {
      todo: 0,
      "in-progress": 0,
      completed: 0,
    };

    tasks.forEach(t => {
      statusDistribution[t.status] += 1;
    });

    // 7️⃣ Recent activity (last 10)
    const activity = await TaskComment.find({
      team: teamId,
      type: "system",
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("user", "name photo")
      .lean();

    // 8️⃣ Response
    res.json({
      kpis: { total, completed, overdue, atRisk },
      workload,
      delivery: { onTime, late, overdue },
      statusDistribution,
      activity,
    });
  } catch (err) {
    console.error("Team overview error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;