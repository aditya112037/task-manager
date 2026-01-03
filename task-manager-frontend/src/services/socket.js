// services/socket.js
import { io } from "socket.io-client";

let socket = null;

export const initSocket = (userId) => {
  if (socket) return socket;

  socket = io(process.env.REACT_APP_API_URL, {
    autoConnect: false,
    transports: ["websocket"],
    reconnection: true,
    auth: { userId },
  });

  return socket;
};

export const connectSocket = () => {
  if (socket && !socket.connected) {
    socket.connect();
  }
};

export const getSocket = () => socket;

export const joinTeamRoom = (teamId) => {
  if (socket && socket.connected && teamId) {
    socket.emit("joinTeam", teamId);
  }
};

export const leaveTeamRoom = (teamId) => {
  if (socket && socket.connected && teamId) {
    socket.emit("leaveTeam", teamId);
  }
};
