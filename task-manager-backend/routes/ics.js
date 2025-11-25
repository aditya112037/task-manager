const express = require("express");
const router = express.Router();
const Task = require("../models/task");
const generateICS = require("../utils/generateICS");

// -------------------------------------------------------------
// 1️⃣  DOWNLOAD .ICS FILE (with reminders)
//     /api/ics/:id
// -------------------------------------------------------------
router.get("/:id", async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const icsData = generateICS(task);

    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=task_${task._id}.ics`
    );

    return res.send(icsData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// -------------------------------------------------------------
// 2️⃣  GET GOOGLE CALENDAR URL
//     /api/ics/google/:id
// -------------------------------------------------------------
router.get("/google/:id", async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

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

    res.json({ googleURL });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
