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
      trim: true,
    },

    color: {
      type: String,
      default: "#4CAF50",
    },

    icon: {
      type: String,
      default: "📌",
    },

    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        role: {
          type: String,
          enum: ["admin", "member"],
          default: "member",
        },
      },
    ],

    inviteTokens: [
      {
        token: { type: String, required: true },
        createdAt: {
          type: Date,
          default: Date.now,
          expires: 60 * 60 * 24 * 7, // auto delete after 7 days
        },
      },
    ],
  },
  { timestamps: true }
);

// Always ensure admin is in members list
teamSchema.pre("save", function (next) {
  if (!this.members.some((m) => m.user.toString() === this.admin.toString())) {
    this.members.push({ user: this.admin, role: "admin" });
  }
  next();
});

module.exports = mongoose.model("Team", teamSchema);
