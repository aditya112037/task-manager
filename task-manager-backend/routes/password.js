const crypto = require("crypto");
const User = require("../models/user");
const express = require("express");
const router = express.Router();
const sendEmail = require("../utils/sendEmail");

// -------------------------------------------
// POST /api/auth/forgot-password
// -------------------------------------------
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.googleId)
      return res.status(400).json({
        message: "This account uses Google login. No password is set.",
      });

    const resetToken = crypto.randomBytes(32).toString("hex");

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    const resetURL = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    await sendEmail({
      to: user.email,
      subject: "Password Reset Link",
      text: `Reset your password here: ${resetURL}`,
    });

    res.json({ message: "Password reset email sent" });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
});


// -------------------------------------------
// POST /api/auth/reset-password/:token
// -------------------------------------------
router.post("/reset-password/:token", async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user)
      return res.status(400).json({ message: "Invalid or expired token" });

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.json({ message: "Password reset success" });

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
