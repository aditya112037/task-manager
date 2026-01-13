// services/socket.js
import { io } from "socket.io-client";

let socket = null;

export const initSocket = (userId, token) => {
  if (socket && socket.connected) return socket;

  // Disconnect existing socket if any
  if (socket) {
    socket.disconnect();
  }

  const socketUrl = process.env.REACT_APP_API_URL || "http://localhost:5000";
  
  socket = io(socketUrl, {
    autoConnect: false,
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    auth: { 
      userId,
      token 
    },
    withCredentials: true,
  });

  // Connection event listeners
  socket.on("connect", () => {
    console.log("Socket connected:", socket.id);
  });

  socket.on("connect_error", (error) => {
    console.error("Socket connection error:", error);
  });

  socket.on("disconnect", (reason) => {
    console.log("Socket disconnected:", reason);
  });

  socket.on("reconnect", (attemptNumber) => {
    console.log("Socket reconnected after", attemptNumber, "attempts");
  });

  socket.on("reconnect_error", (error) => {
    console.error("Socket reconnection error:", error);
  });

  socket.on("reconnect_failed", () => {
    console.error("Socket reconnection failed");
  });

  return socket;
};

export const connectSocket = (token) => {
  if (!socket) {
    console.error("Socket not initialized");
    return null;
  }
  
  if (!socket.connected) {
    // Update auth with latest token
    if (token) {
      socket.auth.token = token;
    }
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
    console.warn("Socket not initialized. Call initSocket first.");
  }
  return socket;
};

export const isSocketConnected = () => {
  return socket && socket.connected;
};

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

export const joinConferenceRoom = (conferenceId, conferenceData) => {
  if (socket && socket.connected && conferenceId) {
    console.log("Joining conference room:", `conference_${conferenceId}`);
    socket.emit("joinConference", { conferenceId, conferenceData });
  } else {
    console.warn("Cannot join conference room: Socket not connected or missing conferenceId");
  }
};

export const leaveConferenceRoom = (conferenceId) => {
  if (socket && socket.connected && conferenceId) {
    console.log("Leaving conference room:", `conference_${conferenceId}`);
    socket.emit("leaveConference", conferenceId);
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

// Conference specific event helpers
export const setupConferenceListeners = (handlers) => {
  if (!socket) return;

  const {
    onConferenceStarted,
    onConferenceEnded,
    onConferenceCreated,
    onConferenceError,
    onUserJoined,
    onUserLeft,
    onActiveSpeaker,
    onSpeakerModeToggled,
    onSpeakerAssigned,
    onHandsUpdated,
    onForceMute,
    onForceCameraOff,
    onRemovedByAdmin,
    onParticipantsUpdated,
    onConferenceState,
  } = handlers;

  // Conference lifecycle events
  if (onConferenceStarted) {
    socket.on("conference:started", onConferenceStarted);
  }
  
  if (onConferenceEnded) {
    socket.on("conference:ended", onConferenceEnded);
  }
  
  if (onConferenceCreated) {
    socket.on("conference:created", onConferenceCreated);
  }
  
  if (onConferenceError) {
    socket.on("conference:error", onConferenceError);
  }

  // Participant events
  if (onUserJoined) {
    socket.on("conference:user-joined", onUserJoined);
  }
  
  if (onUserLeft) {
    socket.on("conference:user-left", onUserLeft);
  }
  
  if (onParticipantsUpdated) {
    socket.on("conference:participants", onParticipantsUpdated);
  }

  // Speaker mode events
  if (onActiveSpeaker) {
    socket.on("conference:active-speaker", onActiveSpeaker);
  }
  
  if (onSpeakerModeToggled) {
    socket.on("conference:speaker-mode-toggled", onSpeakerModeToggled);
  }
  
  if (onSpeakerAssigned) {
    socket.on("conference:speaker-assigned", onSpeakerAssigned);
  }

  // Hand raise events
  if (onHandsUpdated) {
    socket.on("conference:hands-updated", onHandsUpdated);
  }

  // Admin action events
  if (onForceMute) {
    socket.on("conference:force-mute", onForceMute);
  }
  
  if (onForceCameraOff) {
    socket.on("conference:force-camera-off", onForceCameraOff);
  }
  
  if (onRemovedByAdmin) {
    socket.on("conference:removed-by-admin", onRemovedByAdmin);
  }

  // State sync
  if (onConferenceState) {
    socket.on("conference:state", onConferenceState);
  }
};

export const cleanupConferenceListeners = (handlers) => {
  if (!socket) return;

  const handlerKeys = Object.keys(handlers || {});
  
  handlerKeys.forEach(key => {
    const event = key.replace(/^on/, '').replace(/([A-Z])/g, '-$1').toLowerCase().substring(1);
    const fullEvent = `conference:${event}`;
    
    if (handlers[key]) {
      socket.off(fullEvent, handlers[key]);
    }
  });
};

// WebRTC signaling helpers
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