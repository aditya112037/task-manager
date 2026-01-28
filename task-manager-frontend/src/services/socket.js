// services/socket.js
import { io } from "socket.io-client";

let socket = null;

/* ---------------------------------------------------
   CREATE SOCKET (NO AUTO-CONNECT)
--------------------------------------------------- */
export const initSocket = () => {
  if (socket) return socket;

  const token = localStorage.getItem("token");
  if (!token) {
    console.warn("No token found in localStorage");
    return null;
  }

  const socketUrl =
    process.env.REACT_APP_API_URL || "http://localhost:5000";

  console.log(
    "🔄 Creating socket instance with token:",
    token.substring(0, 20) + "..."
  );

  socket = io(socketUrl, {
    autoConnect: false, // 🔴 IMPORTANT
    transports: ["websocket", "polling"],
    auth: { token },
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on("connect", () => {
    console.log("✅ Socket connected:", socket.id);
  });

  socket.on("disconnect", (reason) => {
    console.warn("⚠️ Socket disconnected:", reason);
  });

  socket.on("connect_error", (err) => {
    console.error("❌ Socket error:", err.message);
  });

  return socket;
};

/* ---------------------------------------------------
   CONNECT / DISCONNECT (EXPLICIT)
--------------------------------------------------- */
export const connectSocket = () => {
  if (!socket) return;
  if (socket.connected) return;

  socket.connect();
};

export const disconnectSocket = () => {
  if (!socket) return;

  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
};

/* ---------------------------------------------------
   SAFE GETTER (NO SIDE EFFECTS)
--------------------------------------------------- */
export const getSocket = () => socket;

/* ---------------------------------------------------
   TEAM ROOMS
--------------------------------------------------- */
export const joinTeamRoom = (teamId) => {
  if (socket && socket.connected && teamId) {
    console.log("Joining team room:", `team_${teamId}`);
    socket.emit("joinTeam", teamId);
  }
};

export const leaveTeamRoom = (teamId) => {
  if (socket && socket.connected && teamId) {
    console.log("Leaving team room:", `team_${teamId}`);
    socket.emit("leaveTeam", teamId);
  }
};

/* ---------------------------------------------------
   GENERIC HELPERS
--------------------------------------------------- */
export const addSocketListener = (event, callback) => {
  if (socket) socket.on(event, callback);
};

export const removeSocketListener = (event, callback) => {
  if (socket) socket.off(event, callback);
};

/* ---------------------------------------------------
   WEBRTC HELPERS
--------------------------------------------------- */
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
