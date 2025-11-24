const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a name'],
      trim: true,
    },

    email: {
      type: String,
      required: [true, 'Please add an email'],
      unique: true,
      lowercase: true,
      trim: true,
    },

    // Password is required only if NOT registering via Google
    password: {
      type: String,
      minlength: 6,
      required: function () {
        return !this.googleId;
      },
    },

    // For Google OAuth users
    googleId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// 🔐 Hash password if modified AND user is not using Google OAuth
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || this.googleId) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// 🔍 Compare plaintext password → hashed password
userSchema.methods.matchPassword = async function (enteredPassword) {
  if (this.googleId) return false; // Google user → no password
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
