const express = require("express");
const { body, validationResult } = require("express-validator");
const JournalEntry = require("../models/JournalEntry");
const User = require("../models/user");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.use(protect);

const parseBoolean = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
  }
  return null;
};

const parseDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const parseCsv = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const normalizeReminderTime = (value) => {
  const raw = String(value || "").trim();
  const isoMatch = raw.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (isoMatch) return raw;

  const ampmMatch = raw.match(/^(\d{1,2}):([0-5]\d)\s*(am|pm)$/i);
  if (ampmMatch) {
    let hour = Number(ampmMatch[1]);
    const minute = Number(ampmMatch[2]);
    const period = ampmMatch[3].toLowerCase();
    if (hour === 12) hour = period === "am" ? 0 : 12;
    else if (period === "pm") hour += 12;
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    }
  }

  return "21:00";
};

// @desc    Get journal reminder settings
// @route   GET /api/journals/reminder-settings
// @access  Private
router.get("/reminder-settings", async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("journalReminderSettings");
    const settings = user?.journalReminderSettings || {};
    res.json({
      enabled: Boolean(settings.enabled),
      time: normalizeReminderTime(settings.time || "21:00"),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// @desc    Update journal reminder settings
// @route   PUT /api/journals/reminder-settings
// @access  Private
router.put(
  "/reminder-settings",
  [
    body("enabled").optional().isBoolean(),
    body("time").optional().isString(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const user = await User.findById(req.user._id);
      if (!user) return res.status(404).json({ message: "User not found" });

      const current = user.journalReminderSettings || {};
      const enabled = Object.prototype.hasOwnProperty.call(req.body, "enabled")
        ? Boolean(req.body.enabled)
        : Boolean(current.enabled);
      const time = Object.prototype.hasOwnProperty.call(req.body, "time")
        ? normalizeReminderTime(req.body.time)
        : normalizeReminderTime(current.time || "21:00");

      user.journalReminderSettings = {
        enabled,
        time,
        updatedAt: new Date(),
      };
      await user.save();

      res.json({ enabled, time });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

const buildUserJournalQuery = (query, userId) => {
  const filter = { user: userId };
  const and = [];

  if (query.search) {
    and.push({
      $or: [
        { title: { $regex: query.search, $options: "i" } },
        { content: { $regex: query.search, $options: "i" } },
        { tags: { $in: [new RegExp(query.search, "i")] } },
      ],
    });
  }

  if (query.mood) {
    and.push({ mood: query.mood });
  }

  const favorite = parseBoolean(query.favorite);
  if (favorite !== null) {
    and.push({ isFavorite: favorite });
  }

  const tags = parseCsv(query.tags).map((tag) => tag.toLowerCase());
  if (tags.length > 0) {
    and.push({ tags: { $all: tags } });
  }

  const from = parseDate(query.from);
  const to = parseDate(query.to);
  if (from || to) {
    const range = {};
    if (from) range.$gte = from;
    if (to) range.$lte = to;
    and.push({ entryDate: range });
  }

  if (and.length > 0) filter.$and = and;
  return filter;
};

const sanitizePayload = (body = {}) => {
  const payload = { ...body };
  if (Object.prototype.hasOwnProperty.call(payload, "tags")) {
    payload.tags = toArray(payload.tags);
  }
  if (Object.prototype.hasOwnProperty.call(payload, "gratitude")) {
    payload.gratitude = toArray(payload.gratitude);
  }
  if (Object.prototype.hasOwnProperty.call(payload, "highlights")) {
    payload.highlights = toArray(payload.highlights);
  }
  if (Object.prototype.hasOwnProperty.call(payload, "attachments")) {
    const list = Array.isArray(payload.attachments) ? payload.attachments : [];
    payload.attachments = list
      .map((item) => ({
        type: String(item?.type || "").trim(),
        url: String(item?.url || "").trim(),
        caption: String(item?.caption || "").trim().slice(0, 240),
      }))
      .filter((item) => ["image", "audio", "link"].includes(item.type) && Boolean(item.url))
      .slice(0, 12);
  }
  return payload;
};

// @desc    Journal insights summary
// @route   GET /api/journals/insights/summary
// @access  Private
router.get("/insights/summary", async (req, res) => {
  try {
    const days = Math.min(365, Math.max(7, Number(req.query.days || 30)));
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [entries, moodAgg, tagAgg] = await Promise.all([
      JournalEntry.find({ user: req.user._id, entryDate: { $gte: cutoff } })
        .select("entryDate wordCount isFavorite")
        .lean(),
      JournalEntry.aggregate([
        { $match: { user: req.user._id, entryDate: { $gte: cutoff } } },
        { $group: { _id: "$mood", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      JournalEntry.aggregate([
        { $match: { user: req.user._id, entryDate: { $gte: cutoff } } },
        { $unwind: "$tags" },
        { $group: { _id: "$tags", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
    ]);

    const uniqueDays = new Set(entries.map((e) => new Date(e.entryDate).toDateString())).size;
    const favoriteCount = entries.filter((entry) => entry.isFavorite).length;
    const totalWords = entries.reduce((sum, entry) => sum + Number(entry.wordCount || 0), 0);
    const avgWords = entries.length > 0 ? Math.round(totalWords / entries.length) : 0;
    const allDaysSorted = Array.from(
      new Set(
        entries
          .map((entry) => {
            const d = new Date(entry.entryDate);
            const year = d.getUTCFullYear();
            const month = String(d.getUTCMonth() + 1).padStart(2, "0");
            const day = String(d.getUTCDate()).padStart(2, "0");
            return `${year}-${month}-${day}`;
          })
          .filter(Boolean)
      )
    ).sort();

    let longestStreak = 0;
    let currentRun = 0;
    for (let i = 0; i < allDaysSorted.length; i += 1) {
      if (i === 0) {
        currentRun = 1;
      } else {
        const prev = new Date(`${allDaysSorted[i - 1]}T00:00:00.000Z`).getTime();
        const curr = new Date(`${allDaysSorted[i]}T00:00:00.000Z`).getTime();
        const dayDiff = Math.round((curr - prev) / (24 * 60 * 60 * 1000));
        currentRun = dayDiff === 1 ? currentRun + 1 : 1;
      }
      if (currentRun > longestStreak) longestStreak = currentRun;
    }

    let currentStreak = 0;
    if (allDaysSorted.length > 0) {
      const latest = new Date(`${allDaysSorted[allDaysSorted.length - 1]}T00:00:00.000Z`);
      const today = new Date();
      const todayUTC = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
      const latestUTC = Date.UTC(latest.getUTCFullYear(), latest.getUTCMonth(), latest.getUTCDate());
      const gapDays = Math.round((todayUTC - latestUTC) / (24 * 60 * 60 * 1000));
      if (gapDays <= 1) {
        currentStreak = 1;
        for (let i = allDaysSorted.length - 1; i > 0; i -= 1) {
          const curr = new Date(`${allDaysSorted[i]}T00:00:00.000Z`).getTime();
          const prev = new Date(`${allDaysSorted[i - 1]}T00:00:00.000Z`).getTime();
          const dayDiff = Math.round((curr - prev) / (24 * 60 * 60 * 1000));
          if (dayDiff === 1) {
            currentStreak += 1;
          } else {
            break;
          }
        }
      }
    }

    res.json({
      days,
      totalEntries: entries.length,
      uniqueDays,
      favoriteCount,
      totalWords,
      avgWordsPerEntry: avgWords,
      streak: {
        current: currentStreak,
        longest: longestStreak,
      },
      moodDistribution: moodAgg.map((item) => ({ mood: item._id, count: item.count })),
      topTags: tagAgg.map((item) => ({ tag: item._id, count: item.count })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// @desc    Get journal entries
// @route   GET /api/journals
// @access  Private
router.get("/", async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
    const skip = (page - 1) * limit;
    const filter = buildUserJournalQuery(req.query, req.user._id);

    const [entries, total] = await Promise.all([
      JournalEntry.find(filter)
        .sort({ entryDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      JournalEntry.countDocuments(filter),
    ]);

    res.json({
      entries,
      page,
      limit,
      total,
      hasNext: skip + entries.length < total,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// @desc    Get journal entry by id
// @route   GET /api/journals/:id
// @access  Private
router.get("/:id", async (req, res) => {
  try {
    const entry = await JournalEntry.findOne({ _id: req.params.id, user: req.user._id });
    if (!entry) return res.status(404).json({ message: "Entry not found" });
    res.json(entry);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// @desc    Create journal entry
// @route   POST /api/journals
// @access  Private
router.post(
  "/",
  [
    body("title").optional().isString(),
    body("content").optional().isString(),
    body("energy").optional().isInt({ min: 1, max: 5 }),
    body("entryDate").optional().isISO8601(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const payload = sanitizePayload(req.body);
      const entry = await JournalEntry.create({ ...payload, user: req.user._id });
      res.status(201).json(entry);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @desc    Update journal entry
// @route   PUT /api/journals/:id
// @access  Private
router.put(
  "/:id",
  [
    body("title").optional().isString(),
    body("content").optional().isString(),
    body("energy").optional().isInt({ min: 1, max: 5 }),
    body("entryDate").optional().isISO8601(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const entry = await JournalEntry.findOne({ _id: req.params.id, user: req.user._id });
      if (!entry) return res.status(404).json({ message: "Entry not found" });

      const payload = sanitizePayload(req.body);
      Object.assign(entry, payload);
      await entry.save();
      res.json(entry);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @desc    Toggle favorite
// @route   PATCH /api/journals/:id/favorite
// @access  Private
router.patch("/:id/favorite", async (req, res) => {
  try {
    const entry = await JournalEntry.findOne({ _id: req.params.id, user: req.user._id });
    if (!entry) return res.status(404).json({ message: "Entry not found" });
    entry.isFavorite = !entry.isFavorite;
    await entry.save();
    res.json(entry);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// @desc    Delete entry
// @route   DELETE /api/journals/:id
// @access  Private
router.delete("/:id", async (req, res) => {
  try {
    const entry = await JournalEntry.findOne({ _id: req.params.id, user: req.user._id });
    if (!entry) return res.status(404).json({ message: "Entry not found" });
    await JournalEntry.deleteOne({ _id: entry._id });
    res.json({ message: "Entry removed" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
