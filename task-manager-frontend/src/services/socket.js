// services/socket.js
import { io } from "socket.io-client";

let socket = null;

export const initSocket = () => {
  if (socket) return socket;

  const token = localStorage.getItem("token");
  if (!token) {
    console.warn("No token found in localStorage");
    return null;
  }

  const socketUrl = process.env.REACT_APP_API_URL || "http://localhost:5000";

  console.log("🔄 Creating socket connection with token:", token.substring(0, 20) + "...");

  socket = io(socketUrl, {
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

export const getSocket = () => {
  if (!socket) {
    return initSocket();
  }
  return socket;
};

export const joinTeamRoom = (teamId) => {
  const currentSocket = getSocket();
  if (currentSocket && currentSocket.connected && teamId) {
    console.log("Joining team room:", `team_${teamId}`);
    currentSocket.emit("joinTeam", teamId);
  } else {
    console.warn("Cannot join team room: Socket not connected or missing teamId");
  }
};

export const leaveTeamRoom = (teamId) => {
  const currentSocket = getSocket();
  if (currentSocket && currentSocket.connected && teamId) {
    console.log("Leaving team room:", `team_${teamId}`);
    currentSocket.emit("leaveTeam", teamId);
  }
};

// Generic event listener management
export const addSocketListener = (event, callback) => {
  const currentSocket = getSocket();
  if (currentSocket) {
    currentSocket.on(event, callback);
  }
};

export const removeSocketListener = (event, callback) => {
  const currentSocket = getSocket();
  if (currentSocket) {
    currentSocket.off(event, callback);
  }
};

export const removeAllSocketListeners = (event) => {
  const currentSocket = getSocket();
  if (currentSocket) {
    currentSocket.removeAllListeners(event);
  }
};

export const sendOffer = (to, offer) => {
  const currentSocket = getSocket();
  if (currentSocket && currentSocket.connected) {
    currentSocket.emit("conference:offer", { to, offer });
  }
};

export const sendAnswer = (to, answer) => {
  const currentSocket = getSocket();
  if (currentSocket && currentSocket.connected) {
    currentSocket.emit("conference:answer", { to, answer });
  }
};

export const sendIceCandidate = (to, candidate) => {
  const currentSocket = getSocket();
  if (currentSocket && currentSocket.connected) {
    currentSocket.emit("conference:ice-candidate", { to, candidate });
  }
};