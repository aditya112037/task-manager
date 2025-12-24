// services/socket.js
import { io } from "socket.io-client";

let socket = null;

export const initSocket = (userId) => {
  if (socket) return socket;

  socket = io(process.env.REACT_APP_API_URL, {
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    transports: ["websocket"],
    auth: {
      userId,
    },
  });

  return socket;
};

export const getSocket = () => socket;

export const connectSocket = () => {
  if (socket && !socket.connected) {
    socket.connect();
  }
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
