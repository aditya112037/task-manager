import { io } from "socket.io-client";

let socket = null;

export const initSocket = () => {
  if (socket && socket.connected) return socket;

  // Disconnect existing socket if any
  if (socket) {
    socket.disconnect();
  }

  // 🚨 CRITICAL FIX: Get token from localStorage
  const token = localStorage.getItem("token");
  
  if (!token) {
    console.warn("No token found in localStorage");
    return null;
  }

const socketUrl =
  process.env.REACT_APP_API_URL || "http://localhost:5000";

  
  console.log("🔄 Creating socket connection with token:", token.substring(0, 20) + "...");
  
socket = io(socketUrl, {
  autoConnect: false,

  // ✅ CRITICAL: allow fallback for Render
  transports: ["websocket", "polling"],

  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,

  // ✅ token only
  auth: {
    token,
  },

  withCredentials: true,
});


  // Connection event listeners
  socket.on("connect", () => {
    console.log("✅ Socket connected:", socket.id);
  });

  socket.on("connect_error", (error) => {
    console.error("❌ Socket connection error:", error.message);
  });

  socket.on("disconnect", (reason) => {
    console.log("❌ Socket disconnected:", reason);
  });

  return socket;
};

export const connectSocket = () => {
  if (!socket) {
    socket = initSocket();
  }
  
  if (socket && !socket.connected) {
    socket.connect();
  }
  
  return socket;
};

export const disconnectSocket = () => {
  if (socket && socket.connected) {
    socket.disconnect();
  }
};

export const getSocket = () => {
  if (!socket) {
    socket = initSocket();
  }
  return socket;
};

export const isSocketConnected = () => {
  return socket && socket.connected;
};

// ... rest of your socket.js functions remain the same

export const joinTeamRoom = (teamId) => {
  if (socket && socket.connected && teamId) {
    console.log("Joining team room:", `team_${teamId}`);
    socket.emit("joinTeam", teamId);
  } else {
    console.warn("Cannot join team room: Socket not connected or missing teamId");
  }
};

export const leaveTeamRoom = (teamId) => {
  if (socket && socket.connected && teamId) {
    console.log("Leaving team room:", `team_${teamId}`);
    socket.emit("leaveTeam", teamId);
  }
};


// Generic event listener management
export const addSocketListener = (event, callback) => {
  if (socket) {
    socket.on(event, callback);
  }
};

export const removeSocketListener = (event, callback) => {
  if (socket) {
    socket.off(event, callback);
  }
};

export const removeAllSocketListeners = (event) => {
  if (socket) {
    socket.removeAllListeners(event);
  }
};


export const sendOffer = (to, offer) => {
  if (socket && socket.connected) {
    socket.emit("conference:offer", { to, offer });
  }
};

export const sendAnswer = (to, answer) => {
  if (socket && socket.connected) {
    socket.emit("conference:answer", { to, answer });
  }
};

export const sendIceCandidate = (to, candidate) => {
  if (socket && socket.connected) {
    socket.emit("conference:ice-candidate", { to, candidate });
  }
};

// Cleanup function
export const cleanupSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};