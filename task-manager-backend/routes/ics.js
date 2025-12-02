const express = require("express");
const router = express.Router();
const Task = require("../models/task");
const TTask = require("../models/TTask");
const Team = require("../models/team");
const generateICS = require("../utils/generateICS");

// -------------------------------------------------------------
// 1️⃣  DOWNLOAD .ICS FILE (with reminders) - UPDATED FOR BOTH TASK TYPES
//     /api/ics/:id
// -------------------------------------------------------------
router.get("/:id", async (req, res) => {
  try {
    let task = null;
    let taskType = "personal";
    
    // First try to find as personal task
    task = await Task.findById(req.params.id);
    
    // If not found as personal task, try as team task (TTask)
    if (!task) {
      task = await TTask.findById(req.params.id);
      taskType = "team";
    }
    
    if (!task) return res.status(404).json({ message: "Task not found" });

    // If it's a team task, check if user has access
    if (taskType === "team") {
      // You need to check if user is authenticated and has team access
      // For now, we'll just allow it, but ideally add authentication
      // const userId = req.user?._id;
      // const team = await Team.findOne({
      //   _id: task.team,
      //   "members.user": userId
      // });
      // if (!team) return res.status(403).json({ message: "Not authorized" });
    }

    const icsData = generateICS(task);

    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${taskType}_task_${task._id}.ics`
    );

    return res.send(icsData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// -------------------------------------------------------------
// 2️⃣  GET GOOGLE CALENDAR URL - UPDATED FOR BOTH TASK TYPES
//     /api/ics/google/:id
// -------------------------------------------------------------
router.get("/google/:id", async (req, res) => {
  try {
    let task = null;
    let taskType = "personal";
    
    // First try to find as personal task
    task = await Task.findById(req.params.id);
    
    // If not found as personal task, try as team task (TTask)
    if (!task) {
      task = await TTask.findById(req.params.id);
      taskType = "team";
    }
    
    if (!task) return res.status(404).json({ message: "Task not found" });

    // If it's a team task, check if user has access
    if (taskType === "team") {
      // Add authentication check here if needed
      // const userId = req.user?._id;
      // const team = await Team.findOne({
      //   _id: task.team,
      //   "members.user": userId
      // });
      // if (!team) return res.status(403).json({ message: "Not authorized" });
    }

    const start = new Date(task.dueDate)
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d+Z$/, "Z");

    const endDate = new Date(new Date(task.dueDate).getTime() + 30 * 60 * 1000); // +30 mins
    const end = endDate
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d+Z$/, "Z");

    const googleURL =
      `https://calendar.google.com/calendar/render?action=TEMPLATE` +
      `&text=${encodeURIComponent(task.title)}` +
      `&details=${encodeURIComponent(task.description || "")}` +
      `&dates=${start}/${end}`;

    res.json({ googleURL, taskType });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// -------------------------------------------------------------
// OPTIONAL: Separate endpoint for team tasks only
// /api/ics/team/:id
// -------------------------------------------------------------
router.get("/team/:id", async (req, res) => {
  try {
    const task = await TTask.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Team task not found" });

    // Add authentication/authorization here
    // const userId = req.user?._id;
    // const team = await Team.findOne({
    //   _id: task.team,
    //   "members.user": userId
    // });
    // if (!team) return res.status(403).json({ message: "Not authorized" });

    const icsData = generateICS(task);

    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=team_task_${task._id}.ics`
    );

    return res.send(icsData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;