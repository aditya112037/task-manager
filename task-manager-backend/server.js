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
const { recomputeExecutionScoresForAllUsers } = require("./services/executionScoreService");

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);

/* ---------------------------------------------------
   CORS CONFIGURATION
--------------------------------------------------- */
const allowedOrigins = [
  "http://localhost:3000",
  "https://task-manager-psi-lake.vercel.app",
  "https://task-manager-8vth.onrender.com",
];

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  return allowedOrigins.includes(origin);
};

/* ---------------------------------------------------
   CRITICAL: PREFLIGHT HANDLER - MUST BE FIRST
--------------------------------------------------- */
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.path} - Origin: ${req.headers.origin}`);
  
  if (req.method === "OPTIONS") {
    console.log("🛡️ Intercepting OPTIONS preflight");
    if (!isAllowedOrigin(req.headers.origin)) {
      console.error(`🚫 Preflight blocked by CORS: ${req.headers.origin}`);
      return res.status(403).json({ error: "Not allowed by CORS" });
    }
    if (req.headers.origin) {
      res.header("Access-Control-Allow-Origin", req.headers.origin);
    }
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Max-Age", "86400"); // 24 hours
    return res.status(200).end();
  }
  next();
});

const corsOptions = {
  origin: function (origin, callback) {
    console.log("🌐 CORS check for origin:", origin);
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      console.error(`🚫 CORS blocked: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"]
};

app.use(cors(corsOptions));

/* ---------------------------------------------------
   MIDDLEWARE
--------------------------------------------------- */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(passport.initialize());

/* ---------------------------------------------------
   SOCKET.IO SETUP
--------------------------------------------------- */
const io = new Server(server, {
  cors: {
    origin: function(origin, callback) {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST"]
  },
  transports: ["websocket", "polling"],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
  },
});

// Store io instance globally for use in routes
global._io = io;

// Helper function to emit to team rooms
global.emitToTeam = (teamId, event, payload = {}) => {
  io.to(`team_${teamId}`).emit(event, payload);
};

/* ---------------------------------------------------
   SOCKET AUTH MIDDLEWARE
--------------------------------------------------- */
io.use(async (socket, next) => {
  try {
    console.log("🔐 Socket auth attempt for:", socket.id);
    
    let token = socket.handshake.auth?.token;

    if (!token && socket.handshake.headers?.authorization) {
      const authHeader = socket.handshake.headers.authorization;
      if (authHeader.startsWith("Bearer ")) {
        token = authHeader.slice(7);
      }
    }

    if (!token) {
      console.log("❌ No token provided");
      return next(new Error("Authentication token required"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("✅ Token decoded for user:", decoded.id);
    
    const user = await User.findById(decoded.id).select("name email _id");

    if (!user) {
      console.log("❌ User not found");
      return next(new Error("User not found"));
    }

    socket.user = user;
    socket.userId = user._id.toString();

    console.log("✅ Socket authenticated:", user.email);
    next();
  } catch (err) {
    console.error("❌ Socket auth error:", err.message);
    next(new Error("Authentication failed"));
  }
});

/* ---------------------------------------------------
   SOCKET HANDLERS
--------------------------------------------------- */
io.on("connection", (socket) => {
  console.log("🔥 Socket connected:", socket.id, socket.user?.email);
  if (socket.userId) {
    socket.join(`user_${socket.userId}`);
  }

  socket.on("joinTeam", (teamId) => {
    if (!teamId) return;
    console.log(`👥 Socket ${socket.id} joining team: ${teamId}`);
    socket.join(`team_${teamId}`);
  });

  socket.on("leaveTeam", (teamId) => {
    if (!teamId) return;
    console.log(`👋 Socket ${socket.id} leaving team: ${teamId}`);
    socket.leave(`team_${teamId}`);
  });

  // Conference socket handlers
  registerConferenceSocket(io, socket);

  socket.on("disconnect", (reason) => {
    console.log("❌ Socket disconnected:", socket.id, reason);
  });
});

/* ---------------------------------------------------
   ADD HEADERS MIDDLEWARE (For all responses)
--------------------------------------------------- */
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (isAllowedOrigin(origin) && origin) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  next();
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
   HEALTH CHECK (IMPORTANT!)
--------------------------------------------------- */
app.get("/", (req, res) => {
  res.json({
    status: "OK",
    message: "🚀 Task Manager API Running",
    socketConnections: io.engine?.clientsCount || 0,
    activeConferences: conferences.size,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development"
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    uptime: process.uptime(),
    timestamp: Date.now()
  });
});

/* ---------------------------------------------------
   ERROR HANDLING MIDDLEWARE
--------------------------------------------------- */
app.use((err, req, res, next) => {
  console.error("💥 Server error:", err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message || "Internal Server Error",
      ...(process.env.NODE_ENV === "development" && { stack: err.stack })
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Not Found",
    message: `Route ${req.method} ${req.path} not found`
  });
});

/* ---------------------------------------------------
   START SERVER
--------------------------------------------------- */
const startExecutionScoreScheduler = () => {
  const DAILY_MS = 24 * 60 * 60 * 1000;
  const INITIAL_DELAY_MS = 15 * 1000;

  const run = async () => {
    try {
      const result = await recomputeExecutionScoresForAllUsers();
      console.log("Execution score recompute completed:", result);
    } catch (err) {
      console.error("Execution score recompute failed:", err.message);
    }
  };

  setTimeout(run, INITIAL_DELAY_MS);
  setInterval(run, DAILY_MS);
};

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Allowed origins:`, allowedOrigins);
  console.log(`🔌 Socket.IO ready with transports: websocket, polling`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
  startExecutionScoreScheduler();
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("💥 Unhandled Promise Rejection:", err);
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("💥 Uncaught Exception:", err);
  process.exit(1);
});
