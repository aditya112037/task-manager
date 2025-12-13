// server.js
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const passport = require("./config/google");
const http = require("http");                // <- Required for socket.io
const { Server } = require("socket.io");     // <- Socket.io

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);       // <- Replace app.listen()

// ------------------------------
// CORS CONFIG
// ------------------------------
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

app.use(express.json());
app.use(passport.initialize());

// ------------------------------
// SOCKET.IO — REAL-TIME ENGINE
// ------------------------------
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

// Make globally accessible to routes
global._io = io;

// SOCKET CONNECTION
io.on("connection", (socket) => {
  console.log("🔥 Socket Connected:", socket.id);

  // JOIN TEAM ROOM
  socket.on("joinTeam", (teamId) => {
    socket.join(`team_${teamId}`);
    console.log(`👥 User joined room: team_${teamId}`);
  });

  // LEAVE TEAM ROOM
  socket.on("leaveTeam", (teamId) => {
    socket.leave(`team_${teamId}`);
    console.log(`🚪 User left room: team_${teamId}`);
  });

  socket.on("disconnect", () => {
    console.log("❌ Socket Disconnected:", socket.id);
  });
});

// Helper for routes to broadcast:
global.emitToTeam = (teamId, eventName, payload) => {
  io.to(`team_${teamId}`).emit(eventName, payload);
};

// ------------------------------
// ROUTES
// ------------------------------
app.use("/api/auth", require("./routes/auth"));
app.use("/api/auth", require("./routes/googleAuth"));
app.use("/api/tasks", require("./routes/tasks"));
app.use("/api/teams", require("./routes/teams"));
app.use("/api/team-tasks", require("./routes/TTRoutes"));
app.use("/api/ics", require("./routes/ics"));
app.use("/api/notifications", require("./routes/notifications"));

app.get("/", (req, res) => {
  res.json({ status: "OK", message: "Task Manager API Running" });
});

// ------------------------------
// START SERVER
// ------------------------------
const PORT = process.env.PORT || 5000;

server.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);
