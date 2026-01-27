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

// Import shared conference store
const { conferences, deleteConference } = require("./utils/conferenceStore");

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
  }
});

// Global socket instance
global._io = io;

// Helper function
global.emitToTeam = (teamId, event, payload = {}) => {
  io.to(`team_${teamId}`).emit(event, payload);
};

/* ---------------------------------------------------
   SOCKET AUTHENTICATION MIDDLEWARE - SIMPLIFIED
--------------------------------------------------- */
io.use(async (socket, next) => {
  try {
    // Extract token
    let token = null;
    
    // Try auth.token first
    if (socket.handshake.auth?.token) {
      token = socket.handshake.auth.token;
    }
    // Fallback to headers
    else if (socket.handshake.headers?.authorization) {
      const authHeader = socket.handshake.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      console.error('❌ No token provided');
      return next(new Error("Unauthorized: No token provided"));
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check expiration
    if (decoded.exp * 1000 < Date.now()) {
      return next(new Error("Unauthorized: Token expired"));
    }

    // Find user
    const user = await User.findById(decoded.id).select("name email _id");
    if (!user) {
      return next(new Error("Unauthorized: User not found"));
    }

    // Attach user to socket
    socket.user = user;
    socket.userId = user._id.toString();
    
    console.log(`✅ Socket ${socket.id} authenticated: ${user.email}`);
    next();
    
  } catch (err) {
    console.error('❌ Socket auth error:', err.message);
    
    if (err.name === 'TokenExpiredError') {
      return next(new Error("Unauthorized: Token expired"));
    }
    if (err.name === 'JsonWebTokenError') {
      return next(new Error("Unauthorized: Invalid token"));
    }
    
    return next(new Error("Unauthorized: Authentication failed"));
  }
});

/* ---------------------------------------------------
   SOCKET CONNECTION HANDLER
--------------------------------------------------- */
io.on("connection", (socket) => {
  console.log("🔥 Socket connected:", socket.id, socket.user?.email);

  if (!socket.user || !socket.userId) {
    console.error('❌ Socket connected without user - disconnecting');
    socket.disconnect();
    return;
  }

  /* ------------------------------
     JOIN TEAM ROOM
  ------------------------------ */
  socket.on("joinTeam", (teamId) => {
    if (!teamId) return;
    const room = `team_${teamId}`;
    socket.join(room);
    console.log(`👥 ${socket.user.email} joined ${room}`);
  });

  /* ------------------------------
     LEAVE TEAM ROOM
  ------------------------------ */
  socket.on("leaveTeam", (teamId) => {
    if (!teamId) return;
    const room = `team_${teamId}`;
    socket.leave(room);
    console.log(`🚪 ${socket.user.email} left ${room}`);
  });

  /* ------------------------------
     REGISTER CONFERENCE HANDLERS
  ------------------------------ */
  registerConferenceSocket(io, socket);

  /* ------------------------------
     DISCONNECT HANDLER
  ------------------------------ */
  socket.on("disconnect", (reason) => {
    console.log("❌ Socket disconnected:", socket.id, reason);
  });
});

/* ---------------------------------------------------
   HEALTH CHECK
--------------------------------------------------- */
app.get("/", (req, res) => {
  const conferenceStats = {
    totalConferences: conferences.size,
    conferences: Array.from(conferences.values()).map(conf => ({
      conferenceId: conf.conferenceId,
      teamId: conf.teamId,
      participantCount: conf.participants.size,
      speakerModeEnabled: conf.speakerMode.enabled,
      activeSpeaker: conf.speakerMode.activeSpeaker,
      raisedHandsCount: conf.raisedHands.size,
    }))
  };

  res.json({
    status: "OK",
    message: "🚀 Task Manager API Running",
    socketConnections: io.engine.clientsCount,
    conferenceStats,
  });
});

/* ---------------------------------------------------
   DEBUG ENDPOINTS
--------------------------------------------------- */
app.get("/debug/conferences", (req, res) => {
  const allConferences = Array.from(conferences.values()).map(conf => {
    const participants = Array.from(conf.participants.values());
    return {
      conferenceId: conf.conferenceId,
      teamId: conf.teamId,
      createdBy: conf.createdBy,
      createdAt: conf.createdAt,
      speakerMode: conf.speakerMode,
      participantCount: conf.participants.size,
      participants: participants.map(p => ({
        userId: p.userId,
        name: p.name,
        role: p.role,
        socketId: p.socketId,
        micOn: p.micOn,
        camOn: p.camOn,
      })),
      raisedHands: Array.from(conf.raisedHands),
    };
  });

  res.json({
    count: allConferences.length,
    conferences: allConferences,
  });
});

app.get("/debug/sockets", (req, res) => {
  const sockets = [];
  
  io.of("/").sockets.forEach((socket) => {
    sockets.push({
      id: socket.id,
      userId: socket.userId,
      email: socket.user?.email,
      name: socket.user?.name,
      rooms: Array.from(socket.rooms),
    });
  });

  res.json({
    totalConnections: io.engine.clientsCount,
    sockets: sockets,
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

/* ---------------------------------------------------
   START SERVER
--------------------------------------------------- */
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔌 Socket.IO ready for connections`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('🔄 Shutting down gracefully...');
  console.log(`📊 Cleaning up ${conferences.size} conferences...`);
  
  conferences.clear();
  
  server.close(() => {
    console.log('👋 Server closed');
    process.exit(0);
  });
});

module.exports = { app, server, io };