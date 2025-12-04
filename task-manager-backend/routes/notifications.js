// routes/notifications.js
const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");
const { protect } = require("../middleware/auth");

// GET user notifications
router.get("/", protect, async (req, res) => {
  try {
    const notifications = await Notification.find({
      user: req.user._id,
    })
    .populate("relatedTask", "title")
    .populate("relatedTeam", "name")
    .sort({ createdAt: -1 })
    .limit(50);

    const unreadCount = await Notification.countDocuments({
      user: req.user._id,
      read: false,
    });

    res.json({ notifications, unreadCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// MARK NOTIFICATION AS READ
router.put("/:id/read", protect, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    if (String(notification.user) !== String(req.user._id)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    notification.read = true;
    await notification.save();

    res.json({ message: "Notification marked as read", notification });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// MARK ALL NOTIFICATIONS AS READ
router.put("/read-all", protect, async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, read: false },
      { $set: { read: true } }
    );

    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE NOTIFICATION
router.delete("/:id", protect, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    if (String(notification.user) !== String(req.user._id)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await notification.deleteOne();

    res.json({ message: "Notification deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// CLEAR ALL NOTIFICATIONS
router.delete("/", protect, async (req, res) => {
  try {
    await Notification.deleteMany({ user: req.user._id });
    
    res.json({ message: "All notifications cleared" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;