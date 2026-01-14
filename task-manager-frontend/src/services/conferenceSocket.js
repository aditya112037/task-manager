// services/conferenceSocket.js
import { getSocket } from "./socket";
import { getLocalStream, isMediaInitialized, cleanup as cleanupWebRTC } from "./webrtc";

/* ----------------------------------------------------
   MEDIA INITIALIZATION
---------------------------------------------------- */

/**
 * Initializes media (camera and microphone)
 * @returns {Promise<MediaStream>} The media stream
 */
export const initMedia = async () => {
  try {
    // Check if media is already initialized
    if (isMediaInitialized()) {
      const existingStream = getLocalStream();
      if (existingStream && existingStream.active) {
        console.log("Media already initialized, returning existing stream");
        return existingStream;
      }
    }

    console.log("Initializing media...");
    
    const stream = await navigator.mediaDevices.getUserMedia({
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

    console.log("Media initialized successfully", {
      audioTracks: stream.getAudioTracks().length,
      videoTracks: stream.getVideoTracks().length,
      active: stream.active
    });

    return stream;

  } catch (error) {
    console.error("Error initializing media:", error);
    
    // Enhanced error handling with user-friendly messages
    let userMessage = "Failed to access camera/microphone";
    
    if (error.name === 'NotReadableError') {
      userMessage = "Camera/microphone is already in use by another application. Please close other applications using your camera/mic and try again.";
      console.error("Camera/microphone already in use");
    } else if (error.name === 'NotFoundError') {
      userMessage = "No camera or microphone found. Please check if your device has a camera/microphone connected.";
      console.error("Camera/microphone not found");
    } else if (error.name === 'NotAllowedError') {
      userMessage = "Permission denied for camera/microphone. Please allow camera and microphone access in your browser settings.";
      console.error("Permission denied");
    } else if (error.name === 'AbortError') {
      userMessage = "Camera/microphone access was aborted. Please try again.";
      console.error("Access aborted");
    } else if (error.name === 'OverconstrainedError') {
      userMessage = "Camera constraints could not be met. Please try with different camera settings.";
      console.error("Constraints could not be met:", error.constraint);
    }
    
    throw new Error(userMessage);
  }
};

/**
 * Initializes media with specific constraints
 * @param {Object} constraints - Media constraints
 * @returns {Promise<MediaStream>} The media stream
 */
export const initMediaWithConstraints = async (constraints) => {
  try {
    console.log("Initializing media with custom constraints:", constraints);
    
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    
    console.log("Media initialized with custom constraints", {
      audioTracks: stream.getAudioTracks().length,
      videoTracks: stream.getVideoTracks().length
    });

    return stream;

  } catch (error) {
    console.error("Error initializing media with constraints:", error);
    throw error;
  }
};

/* ----------------------------------------------------
   CONFERENCE MANAGEMENT
---------------------------------------------------- */

/**
 * Starts a new conference for a team
 * @param {string} teamId - The team ID
 * @returns {Promise<string>} Conference ID
 */
export const startConference = (teamId) => {
  return new Promise((resolve, reject) => {
    const socket = getSocket();
    
    if (!socket) {
      reject(new Error("Socket not connected"));
      return;
    }

    if (!socket.connected) {
      reject(new Error("Socket is not connected"));
      return;
    }

    console.log("Starting conference for team:", teamId);
    
    socket.emit("conference:create", { teamId }, (response) => {
      if (response.error) {
        console.error("Failed to start conference:", response.error);
        reject(new Error(response.error));
      } else {
        console.log("Conference started successfully:", response.conferenceId);
        resolve(response.conferenceId);
      }
    });
  });
};

/**
 * Joins an existing conference
 * @param {string} conferenceId - The conference ID
 * @param {Object} conferenceData - Optional conference data
 */
export const joinConference = (conferenceId, conferenceData = null) => {
  const socket = getSocket();
  
  if (!socket) {
    throw new Error("Socket not connected");
  }

  if (!socket.connected) {
    throw new Error("Socket is not connected");
  }

  console.log("Joining conference:", conferenceId);
  
  socket.emit("conference:join", { 
    conferenceId, 
    conferenceData 
  });
};

/**
 * Leaves a conference
 * @param {string} conferenceId - The conference ID
 */
export const leaveConference = (conferenceId) => {
  const socket = getSocket();
  
  if (!socket) {
    console.warn("Socket not connected, cannot leave conference");
    return;
  }

  console.log("Leaving conference:", conferenceId);
  
  socket.emit("conference:leave", { conferenceId });
};

/* ----------------------------------------------------
   PARTICIPANT INTERACTIONS
---------------------------------------------------- */

/**
 * Raises hand in conference
 * @param {string} conferenceId - The conference ID
 */
export const raiseHand = (conferenceId) => {
  const socket = getSocket();
  
  if (!socket) {
    throw new Error("Socket not connected");
  }

  if (!socket.connected) {
    throw new Error("Socket is not connected");
  }

  console.log("Raising hand in conference:", conferenceId);
  
  socket.emit("conference:raise-hand", { conferenceId });
};

/**
 * Lowers hand in conference
 * @param {string} conferenceId - The conference ID
 */
export const lowerHand = (conferenceId) => {
  const socket = getSocket();
  
  if (!socket) {
    throw new Error("Socket not connected");
  }

  if (!socket.connected) {
    throw new Error("Socket is not connected");
  }

  console.log("Lowering hand in conference:", conferenceId);
  
  socket.emit("conference:lower-hand", { conferenceId });
};

/**
 * Sends speaking status to conference
 * @param {string} conferenceId - The conference ID
 * @param {boolean} speaking - Whether the user is speaking
 */
export const sendSpeakingStatus = (conferenceId, speaking) => {
  const socket = getSocket();
  
  if (!socket) {
    console.warn("Socket not connected, cannot send speaking status");
    return;
  }

  if (!socket.connected) {
    console.warn("Socket is not connected, cannot send speaking status");
    return;
  }

  socket.emit("conference:speaking", { conferenceId, speaking });
};

/* ----------------------------------------------------
   ADMIN ACTIONS
---------------------------------------------------- */

/**
 * Performs an admin action on a participant
 * @param {Object} options - Admin action options
 * @param {string} options.action - Action to perform
 * @param {string} options.targetSocketId - Target socket ID
 * @param {string} options.conferenceId - Conference ID
 * @param {string} options.userId - Admin user ID
 */
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

  if (!socket.connected) {
    throw new Error("Socket is not connected");
  }

  console.log("Performing admin action:", { action, targetSocketId, conferenceId });
  
  socket.emit("conference:admin-action", {
    action,
    targetSocketId,
    conferenceId,
    userId,
  });
};

/**
 * Clears all raised hands in conference
 * @param {string} conferenceId - The conference ID
 * @param {string} userId - Admin user ID
 */
export const clearAllHands = (conferenceId, userId) => {
  adminAction({
    action: "clear-hands",
    targetSocketId: null,
    conferenceId,
    userId,
  });
};

/**
 * Removes a participant from conference
 * @param {string} targetSocketId - Target socket ID
 * @param {string} conferenceId - Conference ID
 * @param {string} userId - Admin user ID
 */
export const removeParticipant = (targetSocketId, conferenceId, userId) => {
  adminAction({
    action: "remove-from-conference",
    targetSocketId,
    conferenceId,
    userId,
  });
};

/**
 * Forces mute on a participant
 * @param {string} targetSocketId - Target socket ID
 * @param {string} conferenceId - Conference ID
 * @param {string} userId - Admin user ID
 */
export const forceMute = (targetSocketId, conferenceId, userId) => {
  adminAction({
    action: "mute",
    targetSocketId,
    conferenceId,
    userId,
  });
};

/**
 * Forces camera off on a participant
 * @param {string} targetSocketId - Target socket ID
 * @param {string} conferenceId - Conference ID
 * @param {string} userId - Admin user ID
 */
export const forceCameraOff = (targetSocketId, conferenceId, userId) => {
  adminAction({
    action: "camera-off",
    targetSocketId,
    conferenceId,
    userId,
  });
};

/* ----------------------------------------------------
   SPEAKER MODE CONTROLS
---------------------------------------------------- */

/**
 * Toggles speaker mode in conference
 * @param {string} conferenceId - The conference ID
 * @param {boolean} enabled - Whether speaker mode should be enabled
 */
export const toggleSpeakerMode = (conferenceId, enabled) => {
  const socket = getSocket();
  
  if (!socket) {
    throw new Error("Socket not connected");
  }

  if (!socket.connected) {
    throw new Error("Socket is not connected");
  }

  console.log("Toggling speaker mode:", { conferenceId, enabled });
  
  socket.emit("conference:toggle-speaker-mode", { conferenceId, enabled });
};

/**
 * Sets a participant as the active speaker
 * @param {string} conferenceId - The conference ID
 * @param {string} targetSocketId - Target socket ID
 */
export const setSpeaker = (conferenceId, targetSocketId) => {
  const socket = getSocket();
  
  if (!socket) {
    throw new Error("Socket not connected");
  }

  if (!socket.connected) {
    throw new Error("Socket is not connected");
  }

  console.log("Setting speaker:", { conferenceId, targetSocketId });
  
  socket.emit("conference:set-speaker", { conferenceId, targetSocketId });
};

/**
 * Clears the active speaker
 * @param {string} conferenceId - The conference ID
 */
export const clearSpeaker = (conferenceId) => {
  const socket = getSocket();
  
  if (!socket) {
    throw new Error("Socket not connected");
  }

  if (!socket.connected) {
    throw new Error("Socket is not connected");
  }

  console.log("Clearing speaker for conference:", conferenceId);
  
  socket.emit("conference:clear-speaker", { conferenceId });
};

/* ----------------------------------------------------
   CONFERENCE STATE MANAGEMENT
---------------------------------------------------- */

/**
 * Gets active conference for a team
 * @param {string} teamId - The team ID
 * @returns {Promise<Object>} Conference data
 */
export const getActiveConference = (teamId) => {
  return new Promise((resolve, reject) => {
    const socket = getSocket();
    
    if (!socket) {
      reject(new Error("Socket not connected"));
      return;
    }

    fetch(`/api/teams/${teamId}/conference`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        if (data.error) {
          reject(new Error(data.error));
        } else {
          resolve(data);
        }
      })
      .catch(error => {
        console.error("Error getting active conference:", error);
        reject(error);
      });
  });
};

/**
 * Ends a conference
 * @param {string} conferenceId - The conference ID
 * @param {string} userId - Admin user ID
 */
export const endConference = (conferenceId, userId) => {
  const socket = getSocket();
  
  if (!socket) {
    throw new Error("Socket not connected");
  }

  if (!socket.connected) {
    throw new Error("Socket is not connected");
  }

  console.log("Ending conference:", conferenceId);
  
  socket.emit("conference:end", { conferenceId, userId });
};

/* ----------------------------------------------------
   PERMISSION HELPERS
---------------------------------------------------- */

/**
 * Checks if user can start a conference
 * @param {string} userRole - User's role
 * @returns {boolean} True if user can start conference
 */
export const canStartConference = (userRole) => {
  return ["admin", "manager", "owner"].includes(userRole);
};

/**
 * Checks if user can join a conference
 * @param {Object} conference - Conference object
 * @param {string} userId - User ID
 * @returns {boolean} True if user can join
 */
export const canJoinConference = (conference, userId) => {
  if (!conference) return false;
  
  // Check if conference is active
  if (conference.status !== 'active') {
    return false;
  }
  
  // Check if user is the creator
  if (conference.createdBy === userId) {
    return true;
  }
  
  // Check if user is in the team (you would need team membership data)
  // For now, assume they can join if they have the link
  return true;
};

/**
 * Checks if user can perform admin actions
 * @param {Object} conference - Conference object
 * @param {string} userId - User ID
 * @returns {boolean} True if user is admin
 */
export const isConferenceAdmin = (conference, userId) => {
  if (!conference) return false;
  
  // User is admin if they created the conference
  return conference.createdBy === userId;
};

/* ----------------------------------------------------
   EVENT LISTENER HELPERS
---------------------------------------------------- */

/**
 * Sets up conference event listeners
 * @param {Object} handlers - Event handlers
 * @returns {Function} Cleanup function
 */
export const setupConferenceListeners = (handlers) => {
  const socket = getSocket();
  
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
   CLEANUP
---------------------------------------------------- */

/**
 * Cleans up all conference resources
 * @param {string} conferenceId - The conference ID
 */
export const cleanupConference = (conferenceId) => {
  console.log("Cleaning up conference resources for:", conferenceId);
  
  // Leave conference if connected
  try {
    leaveConference(conferenceId);
  } catch (error) {
    console.warn("Error leaving conference:", error);
  }
  
  // Cleanup WebRTC resources
  try {
    cleanupWebRTC();
  } catch (error) {
    console.warn("Error cleaning up WebRTC:", error);
  }
};

/* ----------------------------------------------------
   STATUS & DEBUGGING
---------------------------------------------------- */

/**
 * Gets conference connection status
 * @returns {Object} Connection status
 */
export const getConferenceStatus = () => {
  const socket = getSocket();
  
  return {
    socketConnected: socket ? socket.connected : false,
    socketId: socket ? socket.id : null,
    mediaInitialized: isMediaInitialized(),
    localStream: getLocalStream(),
  };
};

/**
 * Logs detailed conference status
 */
export const logConferenceStatus = () => {
  const status = getConferenceStatus();
  
  console.group("Conference Status");
  console.log("Socket Connected:", status.socketConnected);
  console.log("Socket ID:", status.socketId);
  console.log("Media Initialized:", status.mediaInitialized);
  
  if (status.localStream) {
    const stream = status.localStream;
    console.log("Local Stream:", {
      active: stream.active,
      audioTracks: stream.getAudioTracks().length,
      videoTracks: stream.getVideoTracks().length,
      id: stream.id
    });
  } else {
    console.log("Local Stream: Not available");
  }
  
  console.groupEnd();
};