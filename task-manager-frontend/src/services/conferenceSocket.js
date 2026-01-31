// services/conferenceSocket.js - UPDATED VERSION
import { getSocket } from "./socket";
import { getLocalStream, cleanup as cleanupWebRTC } from "./webrtc";

/* ----------------------------------------------------
   ATOMIC LOCKS - Module-level, single source of truth
---------------------------------------------------- */
const locks = {
  media: {
    initAttempted: false,
    initInProgress: false,
    initialized: false
  },
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

/**
 * Safe media access with cleanup
 */
const safeGetUserMedia = async (constraints) => {
  try {
    return await navigator.mediaDevices.getUserMedia(constraints);
  } catch (error) {
    console.error("getUserMedia failed:", error.name, error.message);
    
    // Stop all tracks if partially initialized
    if (error.name === 'NotReadableError') {
      console.warn("Camera/mic already in use - stopping attempts");
    }
    
    throw error;
  }
};

/* ----------------------------------------------------
   MEDIA INITIALIZATION - ATOMICALLY LOCKED
   Rule: One attempt per session, no retries
---------------------------------------------------- */

/**
 * Initializes media once and only once
 * @returns {Promise<MediaStream|null>} Stream or null on failure
 */
export const initMedia = async () => {
  // ATOMIC CHECK: Already attempted? Stop.
  if (locks.media.initAttempted) {
    console.warn("Media initialization already attempted this session. Returning existing stream or null.");
    
    const existingStream = getLocalStream();
    if (existingStream && existingStream.active) {
      return existingStream;
    }
    return null;
  }

  // ATOMIC LOCK: Mark attempt in progress
  if (locks.media.initInProgress) {
    console.warn("Media initialization already in progress. Waiting...");
    
    // Wait up to 2 seconds for completion
    for (let i = 0; i < 20; i++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (!locks.media.initInProgress) {
        const existingStream = getLocalStream();
        if (existingStream && existingStream.active) {
          return existingStream;
        }
        return null;
      }
    }
    console.warn("Media init timeout, returning null");
    return null;
  }

  // SET LOCKS
  locks.media.initAttempted = true;
  locks.media.initInProgress = true;

  try {
    console.log("Initializing media (one-time attempt)...");
    
    const stream = await safeGetUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 },
        facingMode: "user"
      },
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });

    console.log("Media initialized successfully");
    locks.media.initialized = true;
    return stream;

  } catch (error) {
    console.error("Media initialization failed:", error.message);
    
    // User-friendly error without throwing
    const errorMap = {
      'NotReadableError': 'Camera/microphone is already in use by another application.',
      'NotFoundError': 'No camera or microphone found.',
      'NotAllowedError': 'Permission denied for camera/microphone.',
      'AbortError': 'Camera/microphone access was aborted.',
      'OverconstrainedError': 'Camera constraints could not be met.'
    };
    
    console.warn(errorMap[error.name] || 'Failed to access camera/microphone.');
    return null;
    
  } finally {
    // RELEASE PROGRESS LOCK (keep attempted lock)
    locks.media.initInProgress = false;
  }
};

/**
 * Check if media was initialized (safe, no side effects)
 */
export const isMediaInitialized = () => {
  return locks.media.initialized;
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
  const handleJoined = () => {
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

  socket.once("conference:joined", handleJoined);
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
  conferenceId: locks.conference.currentConferenceId,
  mediaInitialized: locks.media.initialized,
  mediaInitAttempted: locks.media.initAttempted
});

/**
 * Check if in a conference (simple helper)
 */
export const isInConference = () => {
  return locks.conference.joined && locks.conference.currentConferenceId !== null;
};

/* ----------------------------------------------------
   EVENT LISTENER MANAGEMENT (UNCHANGED, WORKS WELL)
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
    
    console.log("Conference listeners cleaned up");
  };
};

/* ----------------------------------------------------
   CLEANUP - RESETS ALL LOCKS
---------------------------------------------------- */

/**
 * Complete cleanup of all conference resources
 */
export const cleanupConference = () => {
  console.log("Performing complete conference cleanup");
  
  // Leave conference if joined
  if (locks.conference.joined) {
    leaveConference();
  }
  
  // Cleanup WebRTC
  try {
    cleanupWebRTC();
  } catch (error) {
    console.warn("Error cleaning up WebRTC:", error);
  }
  
  // ✅ FIX 3: Keep initAttempted true for session safety
  locks.media.initInProgress = false;
  locks.media.initialized = false;
  
  console.log("Cleanup complete. Locks reset.");
};

/* ----------------------------------------------------
   DEBUGGING UTILITIES
---------------------------------------------------- */

/**
 * Log current lock states (for debugging only)
 */
export const logLockStatus = () => {
  console.group("Conference Socket Locks");
  console.log("MEDIA:");
  console.log("  initAttempted:", locks.media.initAttempted);
  console.log("  initInProgress:", locks.media.initInProgress);
  console.log("  initialized:", locks.media.initialized);
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
  locks.media.initAttempted = false;
  locks.media.initInProgress = false;
  locks.media.initialized = false;
  locks.conference.joinInProgress = false;
  locks.conference.joined = false;
  locks.conference.currentConferenceId = null;
};