// server.js
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const passport = require("./config/google");
const http = require("http");
const { Server } = require("socket.io");

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);

/* ---------------------------------------------------
   CORS CONFIG
--------------------------------------------------- */
const allowedOrigins = [
  "http://localhost:3000",
  "https://task-manager-psi-lake.vercel.app",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // allow mobile / postman
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("CORS Not Allowed"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);

app.use(express.json());
app.use(passport.initialize());

/* ---------------------------------------------------
   SOCKET.IO — REAL-TIME ENGINE
--------------------------------------------------- */
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

// 🔥 expose globally for routes
global._io = io;

// OPTIONAL helper (recommended)
global.emitToTeam = (teamId, event, payload) => {
  io.to(`team_${teamId}`).emit(event, payload);
};

io.on("connection", (socket) => {
  console.log("🔥 Socket connected:", socket.id);

  /* ------------------------------
     JOIN TEAM ROOM
  ------------------------------ */
  socket.on("joinTeam", (teamId) => {
    if (!teamId) return;
    const room = `team_${teamId}`;
    socket.join(room);
    console.log(`👥 Joined room: ${room}`);
  });

  /* ------------------------------
     LEAVE TEAM ROOM
  ------------------------------ */
  socket.on("leaveTeam", (teamId) => {
    if (!teamId) return;
    const room = `team_${teamId}`;
    socket.leave(room);
    console.log(`🚪 Left room: ${room}`);
  });

  socket.on("disconnect", () => {
    console.log("❌ Socket disconnected:", socket.id);
  });
});

/* ---------------------------------------------------
   ROUTES
--------------------------------------------------- */
app.use("/api/auth", require("./routes/auth"));
app.use("/api/auth", require("./routes/googleAuth"));
app.use("/api/tasks", require("./routes/tasks"));
app.use("/api/teams", require("./routes/teams"));
app.use("/api/team-tasks", require("./routes/TTRoutes"));
app.use("/api/comments", require("./routes/taskComments"));
app.use("/api/notifications", require("./routes/notifications"));
app.use("/api/ics", require("./routes/ics"));

app.get("/", (req, res) => {
  res.json({
    status: "OK",
    message: "🚀 Task Manager API Running",
  });
});

/* ---------------------------------------------------
   START SERVER
--------------------------------------------------- */
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
