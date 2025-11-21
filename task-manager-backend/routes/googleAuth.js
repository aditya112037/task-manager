const passport = require("../config/google");
const jwt = require("jsonwebtoken");

// STEP 1: Start Google OAuth
const startGoogleAuth = passport.authenticate("google", {
  scope: ["profile", "email"]
});

// STEP 2: Handle Google OAuth callback
const handleGoogleCallback = [
  passport.authenticate("google", { session: false }),
  (req, res) => {
    const token = jwt.sign(
      { id: req.user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Redirect to frontend with token
    res.redirect(`${process.env.FRONTEND_URL}/oauth-success?token=${token}`);
  }
];

module.exports = {
  startGoogleAuth,
  handleGoogleCallback
};
