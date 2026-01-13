// server.js
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

app.use(
  cors({
    origin: (origin, callback) => {
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

/* ---------------------------------------------------
   SOCKET.IO — INVALIDATION ENGINE
--------------------------------------------------- */
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

// 🔒 Single global socket instance
global._io = io;

// 🔒 Optional helper (still useful, but semantic-neutral)
global.emitToTeam = (teamId, event, payload = {}) => {
  io.to(`team_${teamId}`).emit(event, payload);
};

// In-memory stores for hand raises
const conferenceHands = {};

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Unauthorized"));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("name email");

    if (!user) return next(new Error("Unauthorized"));

    socket.user = user;
    socket.userId = user._id.toString();
    next();
  } catch (err) {
    next(new Error("Unauthorized"));
  }
});

io.on("connection", (socket) => {
  console.log("🔥 Socket connected:", socket.id, "User:", socket.user?.email);

  /* ------------------------------
     JOIN TEAM ROOM
  ------------------------------ */
  socket.on("joinTeam", (teamId) => {
    if (!teamId) return;
    const room = `team_${teamId}`;
    socket.join(room);
    console.log(`👥 Socket ${socket.id} joined ${room}`);
  });

  /* ------------------------------
     JOIN CONFERENCE ROOM
  ------------------------------ */
  socket.on("joinConference", ({ conferenceId, conferenceData }) => {
    if (!conferenceId) return;
    const room = `conference_${conferenceId}`;
    socket.join(room);
    
    // Note: Conference metadata is now stored in the shared conferenceStore
    // We don't need to duplicate it here
    
    console.log(`🎤 Socket ${socket.id} joined ${room}`);
  });

  /* ------------------------------
     LEAVE TEAM ROOM
  ------------------------------ */
  socket.on("leaveTeam", (teamId) => {
    if (!teamId) return;
    const room = `team_${teamId}`;
    socket.leave(room);
    console.log(`🚪 Socket ${socket.id} left ${room}`);
  });

  /* ------------------------------
     LEAVE CONFERENCE ROOM
  ------------------------------ */
  socket.on("leaveConference", (conferenceId) => {
    if (!conferenceId) return;
    const room = `conference_${conferenceId}`;
    socket.leave(room);
    
    // Note: Conference participants are managed in the shared conferenceStore
    // We don't need to manage them here
    
    // Lower hand when leaving conference
    if (conferenceHands[conferenceId]?.has(socket.id)) {
      conferenceHands[conferenceId].delete(socket.id);
      io.to(room).emit("conference:hands-updated", {
        raisedHands: Array.from(conferenceHands[conferenceId] || []),
      });
    }
    
    console.log(`🚪 Socket ${socket.id} left ${room}`);
  });

  /* ------------------------------
     CONFERENCE HAND RAISE/LOWER
  ------------------------------ */
  socket.on("conference:raise-hand", ({ conferenceId }) => {
    if (!conferenceId) return;
    
    if (!conferenceHands[conferenceId]) {
      conferenceHands[conferenceId] = new Set();
    }

    conferenceHands[conferenceId].add(socket.id);

    io.to(`conference_${conferenceId}`).emit("conference:hands-updated", {
      raisedHands: Array.from(conferenceHands[conferenceId]),
      userId: socket.user?._id,
      userName: socket.user?.name,
    });
    
    console.log(`✋ Hand raised by ${socket.user?.name} in conference ${conferenceId}`);
  });

  socket.on("conference:lower-hand", ({ conferenceId }) => {
    if (!conferenceId) return;
    
    conferenceHands[conferenceId]?.delete(socket.id);

    io.to(`conference_${conferenceId}`).emit("conference:hands-updated", {
      raisedHands: Array.from(conferenceHands[conferenceId] || []),
    });
    
    console.log(`👇 Hand lowered by ${socket.user?.name} in conference ${conferenceId}`);
  });

  /* ------------------------------
     CONFERENCE ADMIN ACTIONS (Legacy - Now handled in conference.js)
     Keeping this for backward compatibility
  ------------------------------ */
  socket.on("conference:admin-action", async (payload) => {
    const { action, targetSocketId, conferenceId, userId } = payload;

    // Check conference exists in shared store
    const conference = conferences.get(conferenceId);
    if (!conference) return;

    // Verify admin - simple check: if user is the conference creator
    const isAdmin = String(conference.createdBy) === String(userId);
    if (!isAdmin) return;

    switch (action) {
      case "lower-hand":
        conferenceHands[conferenceId]?.delete(targetSocketId);
        io.to(`conference_${conferenceId}`).emit(
          "conference:hands-updated",
          {
            raisedHands: Array.from(conferenceHands[conferenceId] || []),
          }
        );
        console.log(`🛠️ Admin lowered hand for socket ${targetSocketId}`);
        break;

      case "mute":
        io.to(targetSocketId).emit("conference:force-mute");
        console.log(`🛠️ Admin muted socket ${targetSocketId}`);
        break;

      case "camera-off":
        io.to(targetSocketId).emit("conference:force-camera-off");
        console.log(`🛠️ Admin turned off camera for socket ${targetSocketId}`);
        break;
        
      case "remove-from-conference":
        // Find the socket and emit remove event
        io.to(targetSocketId).emit("conference:removed-by-admin");
        console.log(`🛠️ Admin removed socket ${targetSocketId} from conference`);
        break;
    }
  });

  /* ------------------------------
     CLEAR ALL HANDS (for host) - Legacy
  ------------------------------ */
  socket.on("conference:clear-hands", ({ conferenceId, userId }) => {
    if (!conferenceId) return;
    
    // Verify admin
    const conference = conferences.get(conferenceId);
    if (!conference) return;
    
    const isAdmin = String(conference.createdBy) === String(userId);
    if (!isAdmin) return;
    
    if (conferenceHands[conferenceId]) {
      conferenceHands[conferenceId].clear();
    }

    io.to(`conference_${conferenceId}`).emit("conference:hands-updated", {
      raisedHands: [],
    });
    
    console.log(`🧹 All hands cleared by admin in conference ${conferenceId}`);
  });

  /* ------------------------------
     REGISTER CONFERENCE SOCKET HANDLERS
  ------------------------------ */
  registerConferenceSocket(io, socket);

  /* ------------------------------
     DISCONNECT HANDLER
  ------------------------------ */
  socket.on("disconnect", (reason) => {
    console.log("❌ Socket disconnected:", socket.id, reason);
    
    // Clean up hand raises on disconnect
    for (const confId in conferenceHands) {
      if (conferenceHands[confId]?.has(socket.id)) {
        conferenceHands[confId].delete(socket.id);
        io.to(`conference_${confId}`).emit("conference:hands-updated", {
          raisedHands: Array.from(conferenceHands[confId] || []),
        });
      }
    }
    
    // Note: Conference participant cleanup is now handled in conference.js
    // using the shared conference store
  });
});

/* ---------------------------------------------------
   HEALTH CHECK ENDPOINT - Shows conference stats
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
    socket: "Active",
    conferenceStats,
  });
});

/* ---------------------------------------------------
   DEBUG ENDPOINT - View all active conferences
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
      })),
      raisedHands: Array.from(conf.raisedHands),
    };
  });

  res.json({
    count: allConferences.length,
    conferences: allConferences,
  });
});

/* ---------------------------------------------------
   ROUTES
--------------------------------------------------- */
app.use("/api/auth", require("./routes/auth"));
app.use("/api/auth", require("./routes/googleAuth"));
app.use("/api/tasks", require("./routes/tasks")); // personal tasks
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
  console.log(`🌐 CORS allowed origins: ${allowedOrigins.join(", ")}`);
  console.log(`📊 Conference store initialized`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('🔄 Shutting down gracefully...');
  console.log(`📊 Cleaning up ${conferences.size} conferences...`);
  
  // Close all conference connections
  conferences.clear();
  
  server.close(() => {
    console.log('👋 Server closed');
    process.exit(0);
  });
});