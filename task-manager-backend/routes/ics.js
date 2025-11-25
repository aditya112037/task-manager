const express = require("express");
const router = express.Router();
const generateICS = require("../utils/generateICS");
const Task = require("../models/task");

router.get("/:taskId", async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);

    if (!task)
      return res.status(404).json({ message: "Task not found" });

    const icsContent = generateICS(task);

    res.setHeader("Content-Type", "text/calendar");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${task.title}.ics"`
    );

    res.send(icsContent);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
