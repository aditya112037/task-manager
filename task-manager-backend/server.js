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
const { conferences } = require("./utils/conferenceStore");

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);

/* ---------------------------------------------------
   CORS CONFIG (🔥 THIS WAS MISSING)
--------------------------------------------------- */
const allowedOrigins = [
  "http://localhost:3000",
  "https://task-manager-psi-lake.vercel.app",
];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);

/* ---------------------------------------------------
   MIDDLEWARE
--------------------------------------------------- */
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
    let token = socket.handshake.auth?.token;

    if (!token && socket.handshake.headers?.authorization) {
      const authHeader = socket.handshake.headers.authorization;
      if (authHeader.startsWith("Bearer ")) {
        token = authHeader.slice(7);
      }
    }

    if (!token) return next(new Error("Unauthorized"));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("name email _id");

    if (!user) return next(new Error("Unauthorized"));

    socket.user = user;
    socket.userId = user._id.toString();

    next();
  } catch (err) {
    next(new Error("Unauthorized"));
  }
});

/* ---------------------------------------------------
   SOCKET HANDLERS
--------------------------------------------------- */
io.on("connection", (socket) => {
  console.log("🔥 Socket connected:", socket.id, socket.user?.email);

  socket.on("joinTeam", (teamId) => {
    if (!teamId) return;
    socket.join(`team_${teamId}`);
  });

  socket.on("leaveTeam", (teamId) => {
    if (!teamId) return;
    socket.leave(`team_${teamId}`);
  });

  registerConferenceSocket(io, socket);

  socket.on("disconnect", (reason) => {
    console.log("❌ Socket disconnected:", reason);
  });
});

/* ---------------------------------------------------
   ROUTES (🔥 THESE WERE FAILING)
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
    message: "🚀 Task Manager API Running",
    socketConnections: io.engine.clientsCount,
    activeConferences: conferences.size,
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
