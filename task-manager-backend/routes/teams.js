const express = require("express");
const router = express.Router();
const Team = require("../models/team");
const { protect } = require("../middleware/auth");

// -------------------------------
// CREATE TEAM (ADMIN)
// -------------------------------
router.post("/", protect, async (req, res) => {
  const { name, description, color, icon } = req.body;

  try {
    const team = await Team.create({
      name,
      description,
      color,
      icon,
      admin: req.user._id,
      members: [req.user._id],
    });

    res.status(201).json(team);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
});

// -------------------------------
// GET MY TEAMS (Admin + Member)
// -------------------------------
router.get("/my", protect, async (req, res) => {
  try {
    const teams = await Team.find({
      members: req.user._id,
    });

    res.json(teams);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
});

// -------------------------------
// GENERATE INVITE LINK
// -------------------------------
router.get("/:teamId/invite", protect, async (req, res) => {
  const { teamId } = req.params;

  const inviteLink = `${process.env.FRONTEND_URL}/join-team/${teamId}`;
  res.json({ inviteLink });
});

// -------------------------------
// JOIN TEAM
// -------------------------------
router.post("/:teamId/join", protect, async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    if (!team.members.includes(req.user._id)) {
      team.members.push(req.user._id);
      await team.save();
    }

    res.json({ message: "Joined team", team });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
});

// -------------------------------
// REMOVE MEMBER (Admin only)
// -------------------------------
router.delete("/:teamId/members/:userId", protect, async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId);

    if (!team) return res.status(404).json({ message: "Team not found" });
    if (team.admin.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Not authorized" });

    team.members = team.members.filter(
      (m) => m.toString() !== req.params.userId
    );

    await team.save();

    res.json({ message: "Member removed" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
});

// -------------------------------
// DELETE TEAM (Admin only)
// -------------------------------
router.delete("/:teamId", protect, async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId);

    if (!team) return res.status(404).json({ message: "Team not found" });
    if (team.admin.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Not authorized" });

    await team.deleteOne();

    res.json({ message: "Team deleted" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
