const mongoose = require("mongoose");

const baseSubtaskFields = {
  title: { type: String, required: true, trim: true, maxlength: 200 },
  progressPercentage: { type: Number, min: 0, max: 100, default: 0 },
  completed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  lastProgressAt: { type: Date, default: Date.now },
  completedAt: { type: Date, default: null },
};

const personalSubtaskSchema = new mongoose.Schema(baseSubtaskFields, {
  _id: true,
});

const teamSubtaskSchema = new mongoose.Schema(
  {
    ...baseSubtaskFields,
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    _id: true,
  }
);

module.exports = {
  personalSubtaskSchema,
  teamSubtaskSchema,
};
