// routes/notifications.js
const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");
const User = require("../models/user");
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

// GET web push public key
router.get("/push/vapid-public-key", protect, async (req, res) => {
  return res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || null });
});

// SAVE / UPDATE user push subscription
router.post("/push/subscribe", protect, async (req, res) => {
  try {
    const subscription = req.body?.subscription;
    const endpoint = subscription?.endpoint;
    const p256dh = subscription?.keys?.p256dh;
    const auth = subscription?.keys?.auth;

    if (!endpoint || !p256dh || !auth) {
      return res.status(400).json({ message: "Invalid push subscription payload" });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const existing = (user.pushSubscriptions || []).find(
      (s) => s.endpoint === endpoint
    );

    if (existing) {
      existing.expirationTime = subscription.expirationTime
        ? new Date(subscription.expirationTime)
        : null;
      existing.keys = { p256dh, auth };
    } else {
      user.pushSubscriptions.push({
        endpoint,
        expirationTime: subscription.expirationTime
          ? new Date(subscription.expirationTime)
          : null,
        keys: { p256dh, auth },
      });
    }

    await user.save();
    return res.json({ message: "Push subscription saved" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

// REMOVE user push subscription
router.post("/push/unsubscribe", protect, async (req, res) => {
  try {
    const endpoint = req.body?.endpoint;
    if (!endpoint) {
      return res.status(400).json({ message: "Endpoint is required" });
    }

    await User.updateOne(
      { _id: req.user._id },
      { $pull: { pushSubscriptions: { endpoint } } }
    );

    return res.json({ message: "Push subscription removed" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
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
