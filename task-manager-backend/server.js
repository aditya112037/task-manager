// server.js
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");

dotenv.config();
connectDB();

const app = express();

// ----------------------
// CORS WHITELIST
// ----------------------
const allowedOrigins = [
  "http://localhost:3000",                         // Local frontend
  "https://task-manager-psi-lake.vercel.app"       // Production frontend
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow mobile apps / Postman / curl (no origin)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error("CORS Not Allowed"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

// Middleware
app.use(express.json());

// API Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/tasks", require("./routes/tasks"));

// Base route
app.get("/", (req, res) => {
  res.json({ status: "OK", message: "Task Manager API Running" });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);
