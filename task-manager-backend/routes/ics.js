const express = require("express");
const router = express.Router();
const Task = require("../models/task");
const generateICS = require("../utils/generateICS");

// Helper to convert date → YYYYMMDDTHHMMSSZ
function formatICS(date) {
  const d = new Date(date);
  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

router.get("/:taskId", async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // --- ICS FILE GENERATION ---
    const icsContent = generateICS(task);

    // --- GOOGLE CALENDAR LINK ---
    const start = formatICS(task.dueDate);
    const end = formatICS(task.dueDate);

    const googleCalendarURL =
      `https://calendar.google.com/calendar/render?action=TEMPLATE` +
      `&text=${encodeURIComponent(task.title)}` +
      `&details=${encodeURIComponent(task.description || "")}` +
      `&dates=${start}/${end}`;

    // --- SEND BOTH IN JSON ---
    return res.json({
      icsData: icsContent,
      googleCalendarURL: googleCalendarURL
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
