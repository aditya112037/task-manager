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
  // 🚨 CRITICAL: Enable connection state recovery
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
  }
});

// 🔒 Single global socket instance
global._io = io;

// 🔒 Optional helper (still useful, but semantic-neutral)
global.emitToTeam = (teamId, event, payload = {}) => {
  io.to(`team_${teamId}`).emit(event, payload);
};

// In-memory stores for hand raises
const conferenceHands = {};

/* ---------------------------------------------------
   🚨 CRITICAL: ENHANCED SOCKET AUTHENTICATION MIDDLEWARE
   With detailed debugging and error handling
--------------------------------------------------- */
io.use(async (socket, next) => {
  try {
    console.log("🔐 Socket auth attempt:", {
      socketId: socket.id,
      hasAuth: !!socket.handshake.auth,
      authKeys: socket.handshake.auth ? Object.keys(socket.handshake.auth) : 'none',
      headers: socket.handshake.headers ? Object.keys(socket.handshake.headers) : 'none',
      hasAuthorizationHeader: !!socket.handshake.headers?.authorization,
    });

    // 🚨 CRITICAL: Try multiple ways to get token
    let token = null;
    
    // 1. Try auth.token first (primary method)
    if (socket.handshake.auth?.token) {
      token = socket.handshake.auth.token;
      console.log('📦 Token found in auth.token');
    }
    // 2. Try auth.authorization
    else if (socket.handshake.auth?.authorization) {
      const authHeader = socket.handshake.auth.authorization;
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
        console.log('📦 Token found in auth.authorization');
      }
    }
    // 3. Try headers.authorization as fallback
    else if (socket.handshake.headers?.authorization) {
      const authHeader = socket.handshake.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
        console.log('📦 Token found in headers.authorization');
      }
    }

    if (!token) {
      console.error('❌ No token provided in socket handshake', {
        auth: socket.handshake.auth,
        headersAuth: socket.handshake.headers?.authorization
      });
      return next(new Error("Unauthorized: No token provided"));
    }

    // 🚨 CRITICAL: Validate token format
    console.log('🔑 Token received:', {
      length: token.length,
      startsWith: token.substring(0, 10) + '...',
      endsWith: '...' + token.substring(token.length - 10),
    });

    // Check if token looks like a JWT (3 parts separated by dots)
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      console.error('❌ Invalid token format - not a JWT', {
        parts: tokenParts.length,
        tokenSample: token.substring(0, 50)
      });
      return next(new Error("Unauthorized: Invalid token format"));
    }

    try {
      // Verify the token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('✅ Token decoded successfully:', {
        id: decoded.id,
        email: decoded.email,
        exp: new Date(decoded.exp * 1000),
        iat: new Date(decoded.iat * 1000),
        now: new Date(),
        isExpired: decoded.exp * 1000 < Date.now()
      });

      // Check if token is expired
      if (decoded.exp * 1000 < Date.now()) {
        console.error('❌ Token expired:', {
          expiredAt: new Date(decoded.exp * 1000),
          now: new Date()
        });
        return next(new Error("Unauthorized: Token expired"));
      }

      // Find user in database
      const user = await User.findById(decoded.id).select("name email _id");
      
      if (!user) {
        console.error('❌ User not found in database:', decoded.id);
        return next(new Error("Unauthorized: User not found"));
      }

      // 🚨 CRITICAL: Attach user to socket
      socket.user = user;
      socket.userId = user._id.toString();
      
      console.log(`✅ Socket ${socket.id} authenticated successfully as:`, {
        userId: user._id,
        email: user.email,
        name: user.name
      });
      
      next();
      
    } catch (jwtError) {
      console.error('❌ JWT verification failed:', {
        name: jwtError.name,
        message: jwtError.message,
        expiredAt: jwtError.expiredAt,
      });
      
      if (jwtError.name === 'TokenExpiredError') {
        return next(new Error("Unauthorized: Token expired"));
      }
      if (jwtError.name === 'JsonWebTokenError') {
        return next(new Error("Unauthorized: Invalid token signature"));
      }
      
      return next(new Error("Unauthorized: Token verification failed"));
    }
    
  } catch (err) {
    console.error('❌ Unexpected socket auth error:', {
      name: err.name,
      message: err.message,
      stack: err.stack
    });
    
    return next(new Error("Unauthorized: Authentication failed"));
  }
});

/* ---------------------------------------------------
   SOCKET CONNECTION HANDLER
--------------------------------------------------- */
io.on("connection", (socket) => {
  console.log("🔥 Socket connected:", {
    socketId: socket.id,
    userId: socket.userId,
    email: socket.user?.email,
    name: socket.user?.name,
    authenticated: !!socket.user
  });

  // 🚨 CRITICAL: Verify socket.user exists
  if (!socket.user || !socket.userId) {
    console.error('❌ Socket connected without user data - disconnecting', socket.id);
    socket.disconnect();
    return;
  }

  /* ------------------------------
     JOIN TEAM ROOM
  ------------------------------ */
  socket.on("joinTeam", (teamId) => {
    if (!teamId) {
      console.error('❌ joinTeam called without teamId:', { socketId: socket.id });
      return;
    }
    const room = `team_${teamId}`;
    socket.join(room);
    console.log(`👥 Socket ${socket.id} (${socket.user?.email}) joined ${room}`);
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
     JOIN CONFERENCE ROOM
  ------------------------------ */
  socket.on("joinConference", ({ conferenceId, conferenceData }) => {
    if (!conferenceId) {
      console.error('❌ joinConference called without conferenceId:', { socketId: socket.id });
      return;
    }
    const room = `conference_${conferenceId}`;
    socket.join(room);
    console.log(`🎤 Socket ${socket.id} (${socket.user?.email}) joined ${room}`);
  });

  /* ------------------------------
     LEAVE CONFERENCE ROOM
  ------------------------------ */
  socket.on("leaveConference", (conferenceId) => {
    if (!conferenceId) return;
    const room = `conference_${conferenceId}`;
    socket.leave(room);
    
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
      userId: socket.userId,
      userName: socket.user?.name,
    });
    
    console.log(`✋ Hand raised by ${socket.user?.name} (${socket.userId}) in conference ${conferenceId}`);
  });

  socket.on("conference:lower-hand", ({ conferenceId }) => {
    if (!conferenceId) return;
    
    conferenceHands[conferenceId]?.delete(socket.id);

    io.to(`conference_${conferenceId}`).emit("conference:hands-updated", {
      raisedHands: Array.from(conferenceHands[conferenceId] || []),
    });
    
    console.log(`👇 Hand lowered by ${socket.user?.name} (${socket.userId}) in conference ${conferenceId}`);
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
    if (!isAdmin) {
      console.warn('❌ Non-admin attempted admin action:', { 
        userId, 
        conferenceId,
        action,
        socketId: socket.id 
      });
      return;
    }

    switch (action) {
      case "lower-hand":
        conferenceHands[conferenceId]?.delete(targetSocketId);
        io.to(`conference_${conferenceId}`).emit(
          "conference:hands-updated",
          {
            raisedHands: Array.from(conferenceHands[conferenceId] || []),
          }
        );
        console.log(`🛠️ Admin ${userId} lowered hand for socket ${targetSocketId}`);
        break;

      case "mute":
        io.to(targetSocketId).emit("conference:force-mute");
        console.log(`🛠️ Admin ${userId} muted socket ${targetSocketId}`);
        break;

      case "camera-off":
        io.to(targetSocketId).emit("conference:force-camera-off");
        console.log(`🛠️ Admin ${userId} turned off camera for socket ${targetSocketId}`);
        break;
        
      case "remove-from-conference":
        // Find the socket and emit remove event
        io.to(targetSocketId).emit("conference:removed-by-admin");
        console.log(`🛠️ Admin ${userId} removed socket ${targetSocketId} from conference`);
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
    if (!isAdmin) {
      console.warn('❌ Non-admin attempted to clear hands:', { 
        userId, 
        conferenceId,
        socketId: socket.id 
      });
      return;
    }
    
    if (conferenceHands[conferenceId]) {
      conferenceHands[conferenceId].clear();
    }

    io.to(`conference_${conferenceId}`).emit("conference:hands-updated", {
      raisedHands: [],
    });
    
    console.log(`🧹 All hands cleared by admin ${userId} in conference ${conferenceId}`);
  });

  /* ------------------------------
     REGISTER CONFERENCE SOCKET HANDLERS
  ------------------------------ */
  registerConferenceSocket(io, socket);

  /* ------------------------------
     DISCONNECT HANDLER
  ------------------------------ */
  socket.on("disconnect", (reason) => {
    console.log("❌ Socket disconnected:", {
      socketId: socket.id,
      userId: socket.userId,
      email: socket.user?.email,
      reason: reason
    });
    
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
    socketConnections: io.engine.clientsCount,
    conferenceStats,
  });
});

/* ---------------------------------------------------
   DEBUG ENDPOINTS
--------------------------------------------------- */

// View all active conferences
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

// View connected sockets
app.get("/debug/sockets", (req, res) => {
  const sockets = [];
  
  io.of("/").sockets.forEach((socket) => {
    sockets.push({
      id: socket.id,
      userId: socket.userId,
      email: socket.user?.email,
      name: socket.user?.name,
      rooms: Array.from(socket.rooms),
      connected: socket.connected,
    });
  });

  res.json({
    totalConnections: io.engine.clientsCount,
    sockets: sockets,
  });
});

// Verify JWT token endpoint (for debugging)
app.post("/debug/verify-token", (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const tokenInfo = {
      valid: true,
      id: decoded.id,
      email: decoded.email,
      exp: new Date(decoded.exp * 1000),
      iat: new Date(decoded.iat * 1000),
      now: new Date(),
      isExpired: decoded.exp * 1000 < Date.now(),
    };

    res.json(tokenInfo);
  } catch (error) {
    res.status(401).json({
      valid: false,
      error: error.name,
      message: error.message,
      expiredAt: error.expiredAt,
    });
  }
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
  console.log(`🔐 JWT_SECRET configured: ${process.env.JWT_SECRET ? 'Yes' : 'No'}`);
  console.log(`🔌 Socket.IO ready for connections`);
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

// Export for testing
module.exports = { app, server, io };