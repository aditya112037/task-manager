const express = require("express");
const router = express.Router();

const Team = require("../models/team");
const TTask = require("../models/TTask");
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
   2️⃣ MY ASSIGNED TASKS IN A TEAM
----------------------------------------- */
router.get("/:teamId/my", protect, async (req, res) => {
  const tasks = await TTask.find({
    team: req.params.teamId,
    assignedTo: req.user._id
  })
  .populate("team", "name color icon");

  res.json(tasks);
});

/* -----------------------------------------
   3️⃣ TASKS ASSIGNED TO SPECIFIC USER
----------------------------------------- */
router.get("/:teamId/user/:userId", protect, async (req, res) => {
  const tasks = await TTask.find({
    team: req.params.teamId,
    assignedTo: req.params.userId
  })
  .populate("team", "name")
  .populate("assignedTo", "name");

  res.json(tasks);
});

/* -----------------------------------------
   4️⃣ CREATE TASK, UPDATE TASK, DELETE TASK
   (Your existing CRUD stays here)
----------------------------------------- */

/* -----------------------------------------
   5️⃣ MUST BE LAST — GET ALL TASKS FOR TEAM
----------------------------------------- */
router.get("/:teamId", protect, async (req, res) => {
  const tasks = await TTask.find({ team: req.params.teamId })
    .populate("assignedTo", "name photo")
    .populate("createdBy", "name photo")
    .populate("team", "name color icon");

  res.json(tasks);
});

module.exports = router;
