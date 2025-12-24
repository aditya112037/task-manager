const express = require("express");
const router = express.Router();
const Team = require("../models/team");
const { protect } = require("../middleware/auth");

// ----------------------------------------------------
// SOCKET HELPERS (INVALIDATION ONLY)
// ----------------------------------------------------
const io = global._io;

const invalidateTeam = (teamId) => {
  if (!io) return;
  io.to(`team_${teamId}`).emit("invalidate:team", { teamId });
};

const invalidateTasks = (teamId) => {
  if (!io) return;
  io.to(`team_${teamId}`).emit("invalidate:tasks", { teamId });
};

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
      members: [{ user: req.user._id, role: "admin" }],
    });

    res.status(201).json(team);
  } catch (err) {
    console.error(err);
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
    }).populate("admin", "name email photo");

    res.json(teams);
  } catch (err) {
    console.error(err);
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

      // membership affects visibility
      invalidateTeam(team._id);
      invalidateTasks(team._id);
    }

    res.json({ message: "Joined team", team });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ----------------------------------------------------
// REMOVE MEMBER (ADMIN ONLY) ✓
// ----------------------------------------------------
router.delete("/:teamId/members/:userId", protect, async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    if (team.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (req.params.userId === team.admin.toString()) {
      return res.status(400).json({ message: "Cannot remove team admin" });
    }

    team.members = team.members.filter(
      (m) => m.user.toString() !== req.params.userId
    );

    await team.save();

    invalidateTeam(team._id);
    invalidateTasks(team._id);

    res.json({ message: "Member removed" });
  } catch (err) {
    console.error(err);
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

    if (String(team.admin) !== String(req.user._id)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await team.deleteOne();

    // no need to invalidate — team no longer exists
    res.json({ message: "Team deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ----------------------------------------------------
// GET TEAM DETAILS ✓
// ----------------------------------------------------
router.get("/:teamId/details", protect, async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId)
      .populate("members.user", "name email photo")
      .populate("admin", "name email photo");

    if (!team) return res.status(404).json({ message: "Team not found" });

    const isMember = team.members.some(
      (m) => String(m.user?._id || m.user) === String(req.user._id)
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

    invalidateTeam(team._id);

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ----------------------------------------------------
// UPDATE MEMBER ROLE (ADMIN ONLY) ✓
// ----------------------------------------------------
router.put("/:teamId/members/:userId/role", protect, async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    if (String(team.admin) !== String(req.user._id)) {
      return res.status(403).json({ message: "Only admin can update roles" });
    }

    const member = team.members.find(
      (m) => String(m.user) === req.params.userId
    );

    if (!member)
      return res.status(404).json({ message: "Member not found" });

    member.role = req.body.role;
    await team.save();

    invalidateTeam(team._id);
    invalidateTasks(team._id);

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
// LEAVE TEAM ✓
// ----------------------------------------------------
router.post("/:teamId/leave", protect, async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    if (String(team.admin) === String(req.user._id)) {
      return res
        .status(400)
        .json({ message: "Admin cannot leave. Transfer admin role first." });
    }

    team.members = team.members.filter(
      (m) => String(m.user) !== String(req.user._id)
    );

    await team.save();

    invalidateTeam(team._id);
    invalidateTasks(team._id);

    res.json({ message: "Left team successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ----------------------------------------------------
// TRANSFER ADMIN ROLE (ADMIN ONLY)
// ----------------------------------------------------
router.put("/:teamId/transfer-admin/:userId", protect, async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    if (String(team.admin) !== String(req.user._id)) {
      return res
        .status(403)
        .json({ message: "Only admin can transfer admin role" });
    }

    const targetMember = team.members.find(
      (m) => String(m.user) === req.params.userId
    );

    if (!targetMember)
      return res.status(404).json({ message: "User not found in team" });

    team.admin = req.params.userId;
    targetMember.role = "admin";

    const currentMember = team.members.find(
      (m) => String(m.user) === String(req.user._id)
    );
    if (currentMember) currentMember.role = "member";

    await team.save();

    invalidateTeam(team._id);
    invalidateTasks(team._id);

    const updatedTeam = await Team.findById(team._id)
      .populate("members.user", "name email photo")
      .populate("admin", "name email photo");

    res.json({
      message: "Admin role transferred successfully",
      team: updatedTeam,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
