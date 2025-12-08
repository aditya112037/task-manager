// server.js
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const passport = require("./config/google");

dotenv.config();
connectDB();

const app = express();

// CORS Configuration
const allowedOrigins = [
  "http://localhost:3000",
  "https://task-manager-psi-lake.vercel.app"
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("CORS Not Allowed"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);

// Middleware
app.use(express.json());
app.use(passport.initialize());

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// ROUTES
app.use("/api/auth", require("./routes/auth"));
app.use("/api/auth", require("./routes/googleAuth"));
app.use("/api/tasks", require("./routes/tasks"));
app.use("/api/teams", require("./routes/teams"));
app.use("/api/team-tasks", require("./routes/TTRoutes")); // This should be correct
app.use("/api/ics", require("./routes/ics"));
app.use("/api/notifications", require("./routes/notifications"));

// Test route
app.get("/api/test", (req, res) => {
  res.json({ message: "API is working" });
});

// Base route
app.get("/", (req, res) => {
  res.json({ status: "OK", message: "Task Manager API Running" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ 
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);