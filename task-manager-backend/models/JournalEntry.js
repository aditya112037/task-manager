const mongoose = require("mongoose");

const ATTACHMENT_TYPES = ["image", "audio", "link"];
const JOURNAL_TEMPLATES = ["freeform", "morning-intent", "day-review", "travel-log"];
const MOOD_OPTIONS = ["awful", "low", "neutral", "good", "great"];
const WEATHER_OPTIONS = ["sunny", "cloudy", "rainy", "stormy", "snowy", "windy", "unknown"];

const attachmentSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ATTACHMENT_TYPES, required: true },
    url: { type: String, required: true, trim: true },
    caption: { type: String, trim: true, maxlength: 240, default: "" },
  },
  { _id: false }
);

const journalEntrySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      trim: true,
      maxlength: 180,
      default: "Untitled Entry",
    },
    content: {
      type: String,
      trim: true,
      maxlength: 20000,
      default: "",
    },
    template: {
      type: String,
      enum: JOURNAL_TEMPLATES,
      default: "freeform",
    },
    entryDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    mood: {
      type: String,
      enum: MOOD_OPTIONS,
      default: "neutral",
      index: true,
    },
    energy: {
      type: Number,
      min: 1,
      max: 5,
      default: 3,
    },
    weather: {
      condition: { type: String, enum: WEATHER_OPTIONS, default: "unknown" },
      temperatureC: { type: Number, default: null },
    },
    location: {
      label: { type: String, trim: true, maxlength: 120, default: "" },
    },
    gratitude: {
      type: [String],
      default: [],
    },
    highlights: {
      type: [String],
      default: [],
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    attachments: {
      type: [attachmentSchema],
      default: [],
    },
    isFavorite: {
      type: Boolean,
      default: false,
      index: true,
    },
    wordCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const normalizeList = (values, maxItems = 10, maxLen = 80) => {
  if (!Array.isArray(values)) return [];
  return values
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .map((item) => item.slice(0, maxLen))
    .slice(0, maxItems);
};

journalEntrySchema.pre("save", function normalizeJournalFields(next) {
  this.title = String(this.title || "").trim() || "Untitled Entry";
  this.content = String(this.content || "").trim();
  this.tags = normalizeList(this.tags, 12, 36).map((tag) => tag.toLowerCase());
  this.gratitude = normalizeList(this.gratitude, 5, 160);
  this.highlights = normalizeList(this.highlights, 8, 220);
  this.wordCount = this.content ? this.content.split(/\s+/).filter(Boolean).length : 0;
  next();
});

journalEntrySchema.index({ user: 1, entryDate: -1 });
journalEntrySchema.index({ user: 1, createdAt: -1 });
journalEntrySchema.index({ user: 1, title: "text", content: "text", tags: "text" });

module.exports = mongoose.model("JournalEntry", journalEntrySchema);
