const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please add a name"],
      trim: true,
    },

    email: {
      type: String,
      required: [true, "Please add an email"],
      unique: true,
      lowercase: true,
    },

    password: {
      type: String,
      minlength: 6,
      required: function () {
        return !this.googleId;
      },
    },

    googleId: {
      type: String,
      default: null,
    },

    // 🔥 NEW — user can belong to multiple teams
    teams: [
      {
        teamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team" },
        role: { type: String, enum: ["admin", "member"], default: "member" },
      },
    ],

    pushSubscriptions: [
      {
        endpoint: { type: String, required: true },
        expirationTime: { type: Date, default: null },
        keys: {
          p256dh: { type: String, required: true },
          auth: { type: String, required: true },
        },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// Hash password when needed
userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || this.googleId) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);

  next();
});

// Compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  if (this.googleId) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
