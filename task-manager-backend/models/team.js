const mongoose = require("mongoose");

const teamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    color: {
      type: String,
      default: "#4CAF50", // fallback if user doesn't pick
    },

    icon: {
      type: String, // can store emoji or an icon URL
      default: "📌",
    },

    // The creator of the team
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // All members including admin
    members: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        role: { type: String, enum: ["admin", "member"], default: "member" },
      },
    ],

    // For invite links
    inviteTokens: [
      {
        token: String,
        createdAt: Date,
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Team", teamSchema);
