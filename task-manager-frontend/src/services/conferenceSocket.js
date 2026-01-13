// services/conferenceSocket.js
import { getSocket } from "./socket";

let localStream = null;

export const initMedia = async () => {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    console.log("Media initialized successfully");
    return localStream;
  } catch (error) {
    console.error("Error initializing media:", error);
    throw error;
  }
};

export const getLocalStream = () => localStream;

export const setLocalStream = (stream) => {
  localStream = stream;
};

export const startConference = (teamId) => {
  const socket = getSocket();
  if (!socket) {
    throw new Error("Socket not connected");
  }
  console.log("Starting conference for team:", teamId);
  socket.emit("conference:create", { teamId });
};

export const joinConference = (conferenceId, conferenceData) => {
  const socket = getSocket();
  if (!socket) {
    throw new Error("Socket not connected");
  }
  console.log("Joining conference:", conferenceId);
  socket.emit("conference:join", { conferenceId, conferenceData });
};

export const leaveConference = (conferenceId) => {
  const socket = getSocket();
  if (!socket) {
    throw new Error("Socket not connected");
  }
  console.log("Leaving conference:", conferenceId);
  socket.emit("conference:leave", { conferenceId });
};

export const raiseHand = (conferenceId) => {
  const socket = getSocket();
  if (!socket) {
    throw new Error("Socket not connected");
  }
  console.log("Raising hand in conference:", conferenceId);
  socket.emit("conference:raise-hand", { conferenceId });
};

export const lowerHand = (conferenceId) => {
  const socket = getSocket();
  if (!socket) {
    throw new Error("Socket not connected");
  }
  console.log("Lowering hand in conference:", conferenceId);
  socket.emit("conference:lower-hand", { conferenceId });
};

export const adminAction = ({
  action,
  targetSocketId,
  conferenceId,
  userId,
}) => {
  const socket = getSocket();
  if (!socket) {
    throw new Error("Socket not connected");
  }
  console.log("Admin action:", { action, targetSocketId, conferenceId });
  socket.emit("conference:admin-action", {
    action,
    targetSocketId,
    conferenceId,
    userId,
  });
};

export const toggleSpeakerMode = (conferenceId, enabled) => {
  const socket = getSocket();
  if (!socket) {
    throw new Error("Socket not connected");
  }
  console.log("Toggling speaker mode:", { conferenceId, enabled });
  socket.emit("conference:toggle-speaker-mode", { conferenceId, enabled });
};

export const setSpeaker = (conferenceId, targetSocketId) => {
  const socket = getSocket();
  if (!socket) {
    throw new Error("Socket not connected");
  }
  console.log("Setting speaker:", { conferenceId, targetSocketId });
  socket.emit("conference:set-speaker", { conferenceId, targetSocketId });
};

export const clearSpeaker = (conferenceId) => {
  const socket = getSocket();
  if (!socket) {
    throw new Error("Socket not connected");
  }
  console.log("Clearing speaker for conference:", conferenceId);
  socket.emit("conference:clear-speaker", { conferenceId });
};

export const sendSpeakingStatus = (conferenceId, speaking) => {
  const socket = getSocket();
  if (!socket) {
    throw new Error("Socket not connected");
  }
  socket.emit("conference:speaking", { conferenceId, speaking });
};

// Conference state management helpers
export const getActiveConference = (teamId) => {
  return new Promise((resolve, reject) => {
    const socket = getSocket();
    if (!socket) {
      reject(new Error("Socket not connected"));
      return;
    }

    // This assumes your backend has an endpoint to check active conference
    // You might need to implement this server-side
    fetch(`/api/teams/${teamId}/conference`)
      .then(response => response.json())
      .then(data => resolve(data))
      .catch(error => reject(error));
  });
};

// Cleanup function
export const cleanupMedia = () => {
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localStream = null;
  }
};

// Check if user can start conference
export const canStartConference = (userRole) => {
  return ["admin", "manager"].includes(userRole);
};

// Conference permission helpers
export const canJoinConference = (conference, userId) => {
  if (!conference) return false;
  
  // Check if user is a team member (you might need to fetch team info)
  // For now, assume they can join if they're on the team page
  return true;
};