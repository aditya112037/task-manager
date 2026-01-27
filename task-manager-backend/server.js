const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const passport = require("./config/google");
const http = require("http");
const { Server } = require("socket.io");
const registerConferenceSocket = require("./socket/conference");
const jwt = require("jsonwebtoken");
const User = require("./models/user");

// Shared conference store
const { conferences } = require("./utils/conferenceStore");

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);

/* ---------------------------------------------------
   ✅ CORS CONFIG — SINGLE SOURCE OF TRUTH
--------------------------------------------------- */
const allowedOrigins = [
  "http://localhost:3000",
  "https://task-manager-psi-lake.vercel.app",
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

// ✅ REQUIRED for preflight
app.options("*", cors());

app.use(express.json());
app.use(passport.initialize());

/* ---------------------------------------------------
   SOCKET.IO SETUP
--------------------------------------------------- */
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
  },
});

global._io = io;

global.emitToTeam = (teamId, event, payload = {}) => {
  io.to(`team_${teamId}`).emit(event, payload);
};

/* ---------------------------------------------------
   SOCKET AUTH MIDDLEWARE
--------------------------------------------------- */
io.use(async (socket, next) => {
  try {
    let token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace("Bearer ", "");

    if (!token) return next(new Error("Unauthorized"));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("_id name email");

    if (!user) return next(new Error("Unauthorized"));

    socket.user = user;
    socket.userId = user._id.toString();

    next();
  } catch (err) {
    return next(new Error("Unauthorized"));
  }
});

/* ---------------------------------------------------
   SOCKET CONNECTION
--------------------------------------------------- */
io.on("connection", (socket) => {
  console.log("🔥 Socket connected:", socket.user.email);

  socket.on("joinTeam", (teamId) => {
    if (teamId) socket.join(`team_${teamId}`);
  });

  socket.on("leaveTeam", (teamId) => {
    if (teamId) socket.leave(`team_${teamId}`);
  });

  registerConferenceSocket(io, socket);

  socket.on("disconnect", (reason) => {
    console.log("❌ Socket disconnected:", reason);
  });
});

/* ---------------------------------------------------
   ROUTES (LOGIN WILL WORK NOW)
--------------------------------------------------- */
app.use("/api/auth", require("./routes/auth"));
app.use("/api/auth", require("./routes/googleAuth"));
app.use("/api/tasks", require("./routes/tasks"));
app.use("/api/teams", require("./routes/teams"));
app.use("/api/team-tasks", require("./routes/TTRoutes"));
app.use("/api/comments", require("./routes/taskComments"));
app.use("/api/notifications", require("./routes/notifications"));
app.use("/api/ics", require("./routes/ics"));

/* ---------------------------------------------------
   HEALTH CHECK
--------------------------------------------------- */
app.get("/", (req, res) => {
  res.json({
    status: "OK",
    conferences: conferences.size,
    sockets: io.engine.clientsCount,
  });
});

/* ---------------------------------------------------
   START SERVER
--------------------------------------------------- */
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔌 Socket.IO ready`);
});

/* ---------------------------------------------------
   GRACEFUL SHUTDOWN
--------------------------------------------------- */
process.on("SIGINT", () => {
  conferences.clear();
  server.close(() => process.exit(0));
});

module.exports = { app, server, io };
