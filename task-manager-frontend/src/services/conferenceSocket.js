// services/conferenceSocket.js - PURE SIGNALING VERSION
import { getSocket } from "./socket";

/* ----------------------------------------------------
   ATOMIC LOCKS - Module-level, single source of truth
   MEDIA LOCKS REMOVED - WebRTC owns media now
---------------------------------------------------- */
const locks = {
  conference: {
    joinInProgress: false,
    joined: false,
    currentConferenceId: null
  }
};

/* ----------------------------------------------------
   SAFE HELPER FUNCTIONS
---------------------------------------------------- */

/**
 * Safe socket check - never throws
 */
const getSafeSocket = () => {
  const socket = getSocket();
  if (!socket || !socket.connected) {
    console.warn("Socket not available or disconnected");
    return null;
  }
  return socket;
};

/* ----------------------------------------------------
   CONFERENCE JOIN - ATOMICALLY LOCKED
   Rule: One join per conference, no duplicates
---------------------------------------------------- */

/**
 * Joins a conference with atomic locking
 * @param {string} conferenceId - Conference ID to join
 * @returns {boolean} True if join was attempted, false if blocked
 */
export const joinConference = (conferenceId) => {
  // SAFETY CHECK: Already joined this conference? Stop.
  if (locks.conference.joined && locks.conference.currentConferenceId === conferenceId) {
    console.warn("Already joined conference:", conferenceId);
    return false;
  }

  // ATOMIC LOCK: Join in progress? Stop.
  if (locks.conference.joinInProgress) {
    console.warn("Conference join already in progress. Skipping duplicate.");
    return false;
  }

  const socket = getSafeSocket();
  if (!socket) {
    console.warn("Cannot join conference: socket not available");
    return false;
  }

  // SET LOCKS
  locks.conference.joinInProgress = true;
  locks.conference.currentConferenceId = conferenceId;

  console.log("Joining conference (atomic):", conferenceId);
  
  socket.emit("conference:join", { conferenceId });

  // Event-based lock management
  const handleJoined = ({ participants }) => {
    locks.conference.joined = true; 
    locks.conference.joinInProgress = false;
    socket.off("conference:joined", handleJoined);
    socket.off("conference:error", handleError);
  };

  const handleError = () => {
    locks.conference.joined = false;
    locks.conference.joinInProgress = false;
    locks.conference.currentConferenceId = null;
    socket.off("conference:joined", handleJoined);
    socket.off("conference:error", handleError);
  };
socket.once("conference:user-joined", () => {
  locks.conference.joined = true;
  locks.conference.joinInProgress = false;
});
  socket.once("conference:error", handleError);

  // ✅ FIX 2: Safety timeout to prevent permanent deadlock
  setTimeout(() => {
    if (locks.conference.joinInProgress) {
      console.warn("Join timeout, releasing conference lock");
      locks.conference.joinInProgress = false;
      locks.conference.currentConferenceId = null;
      
      // Clean up listeners
      socket.off("conference:joined", handleJoined);
      socket.off("conference:error", handleError);
    }
  }, 5000);

  return true;
};

/**
 * Leaves current conference safely
 */
export const leaveConference = () => {
  if (!locks.conference.joined || !locks.conference.currentConferenceId) {
    console.warn("Not in a conference, nothing to leave");
    return;
  }

  const socket = getSafeSocket();
  const conferenceId = locks.conference.currentConferenceId;

  console.log("Leaving conference:", conferenceId);

  if (socket) {
    socket.emit("conference:leave", { conferenceId });
  }

  // RESET LOCKS IMMEDIATELY
  locks.conference.joined = false;
  locks.conference.joinInProgress = false;
  locks.conference.currentConferenceId = null;
};

/* ----------------------------------------------------
   CONFERENCE CREATION - EVENT-DRIVEN ONLY
   Rule: No promises, only events
---------------------------------------------------- */

/**
 * Request conference creation (event-driven, no promise)
 * @param {string} teamId - Team ID
 */
export const requestConferenceCreation = (teamId) => {
  const socket = getSafeSocket();
  if (!socket) {
    console.warn("Cannot create conference: socket not available");
    return false;
  }

  console.log("Requesting conference creation for team:", teamId);
  socket.emit("conference:create", { teamId });
  return true;
};

/**
 * Conference creation helper - sets up listeners for creation flow
 * @param {Object} handlers - onCreated, onCreateError
 * @returns {Function} Cleanup function
 */
export const setupConferenceCreationListeners = (handlers) => {
  const socket = getSafeSocket();
  if (!socket) {
    console.warn("Cannot setup creation listeners: socket not available");
    return () => {};
  }

  const { onCreated, onCreateError } = handlers;

  // ✅ FIX: Backend emits "conference:started" not "conference:created"
  if (onCreated) socket.on("conference:started", onCreated);
  if (onCreateError) socket.on("conference:error", onCreateError);

  return () => {
    if (onCreated) socket.off("conference:started", onCreated);
    if (onCreateError) socket.off("conference:error", onCreateError);
  };
};

/* ----------------------------------------------------
   PARTICIPANT INTERACTIONS - SAFE VERSIONS
---------------------------------------------------- */

/**
 * Raise hand (safe, no throws)
 */
export const raiseHand = () => {
  if (!locks.conference.joined || !locks.conference.currentConferenceId) {
    console.warn("Cannot raise hand: not in a conference");
    return false;
  }

  const socket = getSafeSocket();
  if (!socket) return false;

  socket.emit("conference:raise-hand", { 
    conferenceId: locks.conference.currentConferenceId 
  });
  return true;
};

/**
 * Lower hand (safe, no throws)
 */
export const lowerHand = () => {
  if (!locks.conference.joined || !locks.conference.currentConferenceId) {
    console.warn("Cannot lower hand: not in a conference");
    return false;
  }

  const socket = getSafeSocket();
  if (!socket) return false;

  socket.emit("conference:lower-hand", { 
    conferenceId: locks.conference.currentConferenceId 
  });
  return true;
};

/**
 * Send speaking status (safe, no throws)
 */
export const sendSpeakingStatus = (speaking) => {
  if (!locks.conference.joined || !locks.conference.currentConferenceId) {
    return false;
  }

  const socket = getSafeSocket();
  if (!socket) return false;

  socket.emit("conference:speaking", { 
    conferenceId: locks.conference.currentConferenceId, 
    speaking 
  });
  return true;
};

/* ----------------------------------------------------
   CONFERENCE STATE GETTERS
---------------------------------------------------- */

/**
 * Get current conference state (safe, read-only)
 */
export const getConferenceState = () => ({
  joined: locks.conference.joined,
  joinInProgress: locks.conference.joinInProgress,
  conferenceId: locks.conference.currentConferenceId
});

/**
 * Check if in a conference (simple helper)
 */
export const isInConference = () => {
  return locks.conference.joined && locks.conference.currentConferenceId !== null;
};

/* ----------------------------------------------------
   EVENT LISTENER MANAGEMENT
---------------------------------------------------- */

/**
 * Sets up conference event listeners
 */
export const setupConferenceListeners = (handlers) => {
  const socket = getSafeSocket();
  
  if (!socket) {
    console.warn("Socket not connected, cannot setup listeners");
    return () => {};
  }

  const {
    onUserJoined,
    onUserLeft,
    onParticipantsUpdate,
    onHandsUpdated,
    onConferenceEnded,
    onActiveSpeakerUpdate,
    onSpeakerModeToggled,
    onSpeakerAssigned,
    onForceMute,
    onForceCameraOff,
    onRemovedByAdmin,
    onOffer,
    onAnswer,
    onIceCandidate,
    onScreenShareUpdate,
  } = handlers;

  // Setup all listeners
  if (onUserJoined) socket.on("conference:user-joined", onUserJoined);
  if (onUserLeft) socket.on("conference:user-left", onUserLeft);
  if (onParticipantsUpdate) socket.on("conference:participants", onParticipantsUpdate);
  if (onHandsUpdated) socket.on("conference:hands-updated", onHandsUpdated);
  if (onConferenceEnded) socket.on("conference:ended", onConferenceEnded);
  if (onActiveSpeakerUpdate) socket.on("conference:active-speaker", onActiveSpeakerUpdate);
  if (onSpeakerModeToggled) socket.on("conference:speaker-mode-toggled", onSpeakerModeToggled);
  if (onSpeakerAssigned) socket.on("conference:speaker-assigned", onSpeakerAssigned);
  if (onForceMute) socket.on("conference:force-mute", onForceMute);
  if (onForceCameraOff) socket.on("conference:force-camera-off", onForceCameraOff);
  if (onRemovedByAdmin) socket.on("conference:removed-by-admin", onRemovedByAdmin);
  if (onOffer) socket.on("conference:offer", onOffer);
  if (onAnswer) socket.on("conference:answer", onAnswer);
  if (onIceCandidate) socket.on("conference:ice-candidate", onIceCandidate);
  if (onScreenShareUpdate) socket.on("conference:screen-share-update", onScreenShareUpdate);

  console.log("Conference listeners setup complete");

  // Return cleanup function
  return () => {
    if (!socket) return;
    
    if (onUserJoined) socket.off("conference:user-joined", onUserJoined);
    if (onUserLeft) socket.off("conference:user-left", onUserLeft);
    if (onParticipantsUpdate) socket.off("conference:participants", onParticipantsUpdate);
    if (onHandsUpdated) socket.off("conference:hands-updated", onHandsUpdated);
    if (onConferenceEnded) socket.off("conference:ended", onConferenceEnded);
    if (onActiveSpeakerUpdate) socket.off("conference:active-speaker", onActiveSpeakerUpdate);
    if (onSpeakerModeToggled) socket.off("conference:speaker-mode-toggled", onSpeakerModeToggled);
    if (onSpeakerAssigned) socket.off("conference:speaker-assigned", onSpeakerAssigned);
    if (onForceMute) socket.off("conference:force-mute", onForceMute);
    if (onForceCameraOff) socket.off("conference:force-camera-off", onForceCameraOff);
    if (onRemovedByAdmin) socket.off("conference:removed-by-admin", onRemovedByAdmin);
    if (onOffer) socket.off("conference:offer", onOffer);
    if (onAnswer) socket.off("conference:answer", onAnswer);
    if (onIceCandidate) socket.off("conference:ice-candidate", onIceCandidate);
    if (onScreenShareUpdate) socket.off("conference:screen-share-update", onScreenShareUpdate);
    
    console.log("Conference listeners cleaned up");
  };
};

/* ----------------------------------------------------
   CLEANUP - PURE SIGNALING ONLY
---------------------------------------------------- */

/**
 * Complete cleanup of all conference resources (signaling only)
 */
export const cleanupConference = () => {
  console.log("Conference cleanup (signaling only)");

  if (locks.conference.joined) {
    leaveConference();
  }

  console.log("Conference socket cleanup complete");
};

/* ----------------------------------------------------
   DEBUGGING UTILITIES
---------------------------------------------------- */

/**
 * Log current lock states (for debugging only)
 */
export const logLockStatus = () => {
  console.group("Conference Socket Locks");
  console.log("CONFERENCE:");
  console.log("  joinInProgress:", locks.conference.joinInProgress);
  console.log("  joined:", locks.conference.joined);
  console.log("  conferenceId:", locks.conference.currentConferenceId);
  console.groupEnd();
};

/**
 * Force reset all locks (emergency use only)
 */
export const forceResetLocks = () => {
  console.warn("FORCING RESET OF ALL LOCKS");
  locks.conference.joinInProgress = false;
  locks.conference.joined = false;
  locks.conference.currentConferenceId = null;
};