const express = require("express");
const router = express.Router();
const Team = require("../models/team");
const { protect } = require("../middleware/auth");

// ----------------------------------------------------
// CREATE TEAM  ✓
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
// GET MY TEAMS  ✓
// ----------------------------------------------------
router.get("/my", protect, async (req, res) => {
  try {
    const teams = await Team.find({
      "members.user": req.user._id,
    });

    res.json(teams);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ----------------------------------------------------
// GENERATE INVITE LINK  ✓
// ----------------------------------------------------
router.get("/:teamId/invite", protect, async (req, res) => {
  const { teamId } = req.params;

  const inviteLink = `${process.env.FRONTEND_URL}/join/${teamId}`;
  res.json({ inviteLink });
});

// ----------------------------------------------------
// JOIN TEAM  ✓
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
// REMOVE MEMBER (ADMIN ONLY)  ✓
// ----------------------------------------------------
router.delete("/:teamId/members/:userId", protect, async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    if (team.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // remove target user
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
// DELETE TEAM (ADMIN ONLY)  ✓
// ----------------------------------------------------
router.delete("/:teamId", protect, async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    if (team.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await team.deleteOne();
    res.json({ message: "Team deleted" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
