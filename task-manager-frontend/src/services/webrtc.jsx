// services/webrtc.js

/* ----------------------------------------------------
   GLOBAL STATE
---------------------------------------------------- */
let localStream = null;
let screenStream = null;
let isScreenSharing = false;
let mediaInitialized = false;

// Peer connections store
const peers = {};

// Speaker detection
let audioContext = null;
let analyser = null;
let microphoneSource = null;
let speakingInterval = null;
let isSpeaking = false;
let onSpeakingChangeCallback = null;
let audioDetectionEnabled = false;

/**
 * Initialize camera + microphone (ONE TIME)
 * @param {MediaStreamConstraints} constraints
 * @returns {Promise<MediaStream>}
 */
export const initializeMedia = async (
  constraints = { audio: true, video: true }
) => {
  // ✅ Prevent duplicate initialization
  if (mediaInitialized && localStream && localStream.active) {
    console.warn("Media already initialized, reusing stream");
    return localStream;
  }

  try {
    console.log("🎥 Initializing media...", constraints);

    // ✅ Add optimized video constraints to prevent "Could not start video source"
    const optimizedConstraints = {
      audio: constraints.audio,
      video: constraints.video === true ? {
        width: { ideal: 1280, max: 1920 },
        height: { ideal: 720, max: 1080 },
        frameRate: { ideal: 30, max: 60 },
        facingMode: { ideal: 'user' }
      } : constraints.video
    };

    const stream = await navigator.mediaDevices.getUserMedia(optimizedConstraints);

    const success = setLocalStream(stream);
    if (!success) {
      throw new Error("Failed to set local stream");
    }

    mediaInitialized = true;
    return stream;

  } catch (error) {
    console.error("❌ initializeMedia failed:", error);
    
    // ✅ Fallback to audio-only if video fails
    if (error.name === 'NotReadableError' || error.name === 'NotFoundError') {
      console.warn("⚠️ Camera error, falling back to audio-only");
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: constraints.audio,
          video: false
        });
        
        const success = setLocalStream(audioStream);
        if (success) {
          mediaInitialized = true;
          console.log("✅ Fallback to audio-only succeeded");
          return audioStream;
        }
      } catch (fallbackError) {
        console.error("❌ Audio-only fallback also failed:", fallbackError);
      }
    }
    
    throw error;
  }
};



export const setLocalStream = (stream) => {
  if (!stream || !stream.active) {
    console.error("Cannot set invalid stream");
    return false;
  }

  // ✅ Allow replacing audio-only stream with video-capable stream
  if (localStream) {
    const hasVideo = localStream.getVideoTracks().length > 0;
    const newHasVideo = stream.getVideoTracks().length > 0;

    if (hasVideo && !newHasVideo) {
      console.warn("Keeping existing video stream");
      return false;
    }

    // Stop old tracks
    localStream.getTracks().forEach(t => t.stop());
  }

  localStream = stream;
  mediaInitialized = true;

  console.log("Local stream set:", {
    audioTracks: stream.getAudioTracks().length,
    videoTracks: stream.getVideoTracks().length,
  });

  return true;
};


/**
 * Get the current local stream
 * @returns {MediaStream|null} Local stream
 */
export const getLocalStream = () => localStream;

/**
 * Check if media is initialized
 * @returns {boolean} True if media is ready
 */
export const isMediaInitialized = () => mediaInitialized && localStream && localStream.active;

/* ----------------------------------------------------
   PEER CONNECTION MANAGEMENT
---------------------------------------------------- */

/**
 * Create a new peer connection for a user
 * @param {string} userId - Target user ID
 * @param {object} socket - Socket.io instance for signaling
 * @returns {RTCPeerConnection} New peer connection
 */
export const createPeer = (userId, socket) => {
  // Validate state
  if (!localStream || !localStream.active) {
    throw new Error("Local stream not ready. Call initializeMedia() first.");
  }
  
  if (peers[userId]) {
    console.warn(`Peer already exists for ${userId}, returning existing`);
    return peers[userId];
  }
  
  console.log(`Creating peer connection for ${userId}`);
  
  try {
    // Create peer connection
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" }
      ],
      iceCandidatePoolSize: 10
    });
    
    // Add local tracks
    localStream.getTracks().forEach(track => {
      if (track.kind === 'audio' || track.kind === 'video') {
        console.log(`Adding ${track.kind} track to peer ${userId}`);
        pc.addTrack(track, localStream);
      }
    });
    
    // ICE candidate handling
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("conference:ice-candidate", {
        to: userId,
        candidate: event.candidate
      });

      }
    };
    
    // Connection state handling
pc.onconnectionstatechange = () => {
  console.log(`Connection state for ${userId}: ${pc.connectionState}`);

  switch (pc.connectionState) {
    case "failed":
      console.error(`Connection with ${userId} failed`);
      removePeer(userId);
      break;

    case "disconnected":
      console.warn(`Connection with ${userId} disconnected`);
      break;

    case "connected":
      console.log(`Connected to ${userId}`);
      break;

    default:
      break;
  }
};

    
    // ICE connection state
    pc.oniceconnectionstatechange = () => {
      console.log(`ICE state for ${userId}: ${pc.iceConnectionState}`);
    };
    
    // Track event (remote stream)
    pc.ontrack = (event) => {
      console.log(`Received ${event.track.kind} track from ${userId}`);
      
      // You can dispatch an event or call a callback here
      if (window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('webrtc:track', {
          detail: { userId, track: event.track, stream: event.streams[0] }
        }));
      }
    };
    
    // Store peer
    peers[userId] = pc;
    return pc;
    
  } catch (error) {
    console.error(`Failed to create peer for ${userId}:`, error);
    throw error;
  }
};

/**
 * Remove a peer connection
 * @param {string} userId - User ID to remove
 */
export const removePeer = (userId) => {
  if (peers[userId]) {
    console.log(`Removing peer connection for ${userId}`);
    
    try {
      peers[userId].close();
    } catch (error) {
      console.error(`Error closing peer ${userId}:`, error);
    }
    
    delete peers[userId];
  }
};

/**
 * Get a specific peer connection
 * @param {string} userId - User ID
 * @returns {RTCPeerConnection|null} Peer connection or null
 */
export const getPeer = (userId) => peers[userId] || null;

/**
 * Get all peer connections
 * @returns {Object} All peer connections
 */
export const getAllPeers = () => ({ ...peers });

/**
 * Close all peer connections
 */
export const closeAllPeers = () => {
  console.log(`Closing all peer connections (${Object.keys(peers).length})`);
  
  Object.keys(peers).forEach(userId => {
    try {
      peers[userId].close();
    } catch (error) {
      console.error(`Error closing peer ${userId}:`, error);
    }
    delete peers[userId];
  });
};

/**
 * Replace video track in ALL peers + local stream
 * @param {MediaStreamTrack} newTrack
 */
export const replaceVideoTrack = (newTrack) => {
  if (!localStream || !newTrack) {
    console.warn("replaceVideoTrack: missing stream or track");
    return;
  }

  console.log("🔁 Replacing video track across peers");

  // Remove old video tracks
  localStream.getVideoTracks().forEach(track => {
    localStream.removeTrack(track);
    track.stop();
  });

  // Add new track
  localStream.addTrack(newTrack);

  // Replace in all peer connections
  Object.values(peers).forEach(pc => {
    const sender = pc.getSenders().find(s => s.track?.kind === "video");
    if (sender) {
      sender.replaceTrack(newTrack);
    }
  });

  isScreenSharing = true;
};


/* ----------------------------------------------------
   AUDIO/VIDEO CONTROLS
---------------------------------------------------- */

/**
 * Toggle audio mute/unmute
 * @param {boolean} enabled - True to enable audio
 * @returns {boolean} Success status
 */
export const toggleAudio = (enabled) => {
  if (!localStream) {
    console.error("No local stream to toggle audio");
    return false;
  }
  
  const audioTracks = localStream.getAudioTracks();
  if (audioTracks.length === 0) {
    console.warn("No audio tracks found");
    return false;
  }
  
  audioTracks.forEach(track => {
    if (track.readyState === 'live') {
      track.enabled = enabled;
      console.log(`Audio track ${enabled ? 'enabled' : 'disabled'}`);
    }
  });
  
  return true;
};

/**
 * Toggle video on/off
 * @param {boolean} enabled - True to enable video
 * @returns {boolean} Success status
 */
export const toggleVideo = (enabled) => {
  if (!localStream) {
    console.error("No local stream to toggle video");
    return false;
  }
  
  const videoTracks = localStream.getVideoTracks();
  if (videoTracks.length === 0) {
    console.warn("No video tracks found");
    return false;
  }
  
  videoTracks.forEach(track => {
    if (track.readyState === 'live') {
      track.enabled = enabled;
      console.log(`Video track ${enabled ? 'enabled' : 'disabled'}`);
    }
  });
  
  return true;
};

/**
 * Check if audio is enabled
 * @returns {boolean} True if audio enabled
 */
export const isAudioEnabled = () => {
  if (!localStream) return false;
  const audioTrack = localStream.getAudioTracks()[0];
  return audioTrack ? audioTrack.enabled : false;
};

/**
 * Check if video is enabled
 * @returns {boolean} True if video enabled
 */
export const isVideoEnabled = () => {
  if (!localStream) return false;
  const videoTrack = localStream.getVideoTracks()[0];
  return videoTrack ? videoTrack.enabled : false;
};

/**
 * Get current audio track
 * @returns {MediaStreamTrack|null} Audio track or null
 */
export const getAudioTrack = () => {
  return localStream ? localStream.getAudioTracks()[0] : null;
};

/**
 * Get current video track
 * @returns {MediaStreamTrack|null} Video track or null
 */
export const getVideoTrack = () => {
  return localStream ? localStream.getVideoTracks()[0] : null;
};

/* ----------------------------------------------------
   SCREEN SHARING - CORRECT ARCHITECTURE
---------------------------------------------------- */

/**
 * Start screen sharing
 * @param {React.RefObject} videoRef - Reference to video element
 * @returns {Promise<MediaStreamTrack>} Screen share track
 */
export async function startScreenShare(videoRef) {
  console.log("🎥 Starting screen share...");

  const displayStream = await navigator.mediaDevices.getDisplayMedia({
    video: true,
    audio: false,
  });

  const screenTrack = displayStream.getVideoTracks()[0];

  if (!screenTrack) {
    throw new Error("No screen track available");
  }

  // 🔥 DO NOT depend on camera track
  replaceVideoTrack(screenTrack);

  if (videoRef?.current) {
    videoRef.current.srcObject = displayStream;
  }

  screenTrack.onended = () => {
    stopScreenShare(videoRef);
  };

  return displayStream;
}


/**
 * Stop screen sharing and restore camera
 * @param {React.RefObject} videoRef - Reference to video element
 * @returns {Promise<MediaStreamTrack>} Restored camera track
 */
export const stopScreenShare = async (videoRef = null) => {
  if (!isScreenSharing) {
    console.log("Not screen sharing");
    return null;
  }
  
  console.log("Stopping screen share...");
  
  try {
    // ✅ Camera track MUST exist and be live
    const cameraTrack = localStream.getVideoTracks()[0];
    
  if (!cameraTrack || cameraTrack.readyState !== "live") {
  console.warn("Camera unavailable, reverting to audio-only");

  if (videoRef?.current) {
    videoRef.current.srcObject = null;
  }

  if (screenStream) {
    screenStream.getTracks().forEach(t => t.stop());
    screenStream = null;
  }

  isScreenSharing = false;
  return null;
}

    
    // ✅ Restore camera track in all peers
    Object.values(peers).forEach((pc, index) => {
      const videoSender = pc.getSenders().find(s => 
        s.track && s.track.kind === "video"
      );
      
      if (videoSender) {
        videoSender.replaceTrack(cameraTrack);
      }
    });
    
    // ✅ Restore camera in local video element
    if (videoRef && videoRef.current) {
      videoRef.current.srcObject = localStream;
    }
    
    // ✅ Clean up screen stream
    if (screenStream) {
      screenStream.getTracks().forEach(t => t.stop());
      screenStream = null;
    }
    
    isScreenSharing = false;
    console.log("Screen sharing stopped, camera restored");
    
    return cameraTrack;
    
  } catch (error) {
    console.error("Failed to stop screen share:", error);
    
    // Force cleanup
    isScreenSharing = false;
    if (screenStream) {
      screenStream.getTracks().forEach(t => t.stop());
      screenStream = null;
    }
    
    throw error;
  }
};

/**
 * Check if screen sharing is active
 * @returns {boolean} True if screen sharing
 */
export const isScreenSharingActive = () => isScreenSharing;

/**
 * Get current screen stream (for debugging)
 * @returns {MediaStream|null} Screen stream or null
 */
export const getScreenStream = () => screenStream;

/* ----------------------------------------------------
   SPEAKER DETECTION
---------------------------------------------------- */

/**
 * Start speaker detection
 * @param {Function} onSpeakingChange - Callback when speaking state changes
 * @returns {Function} Cleanup function
 */
export const startSpeakerDetection = (onSpeakingChange) => {
  if (!localStream) {
    console.error("No local stream for speaker detection");
    return () => {};
  }
  
  const audioTrack = localStream.getAudioTracks()[0];
  if (!audioTrack) {
    console.warn("No audio track for speaker detection");
    return () => {};
  }
  
  try {
    // Initialize audio context
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      console.warn("Web Audio API not supported");
      return () => {};
    }
    
    audioContext = new AudioContextClass();
    analyser = audioContext.createAnalyser();
    
    // Configure analyzer
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;
    analyser.minDecibels = -45;
    analyser.maxDecibels = -10;
    
    // Connect audio source
    microphoneSource = audioContext.createMediaStreamSource(localStream);
    microphoneSource.connect(analyser);
    
    // Initialize detection
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    let speaking = false;
    let silenceCounter = 0;
    const speakingHistory = [];
    
    onSpeakingChangeCallback = onSpeakingChange;
    audioDetectionEnabled = true;
    
    /**
     * Calculate volume from audio data
     */
    const calculateVolume = () => {
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      return Math.sqrt(sum / dataArray.length);
    };
    
    /**
     * Detect speaking state
     */
    const detectSpeaking = () => {
      if (!audioDetectionEnabled) return;
      
      const volume = calculateVolume();
      const speakingThreshold = 20;
      const historyLength = 5;
      
      // Update history
      speakingHistory.push(volume > speakingThreshold);
      if (speakingHistory.length > historyLength) {
        speakingHistory.shift();
      }
      
      // Determine speaking state
      const recentSpeakingFrames = speakingHistory.filter(v => v).length;
      const shouldBeSpeaking = recentSpeakingFrames > historyLength * 0.6;
      
      if (shouldBeSpeaking) {
        silenceCounter = 0;
        if (!speaking) {
          speaking = true;
          isSpeaking = true;
          if (onSpeakingChangeCallback) {
            onSpeakingChangeCallback(true, volume);
          }
        }
      } else {
        silenceCounter++;
        if (silenceCounter > 3 && speaking) {
          speaking = false;
          isSpeaking = false;
          if (onSpeakingChangeCallback) {
            onSpeakingChangeCallback(false, volume);
          }
        }
      }
    };
    
    // Start detection interval
    speakingInterval = setInterval(detectSpeaking, 100);
    
    console.log("Speaker detection started");
    
    return () => {
      stopSpeakerDetection();
    };
    
  } catch (error) {
    console.error("Failed to start speaker detection:", error);
    return () => {};
  }
};

/**
 * Stop speaker detection
 */
export const stopSpeakerDetection = () => {
  audioDetectionEnabled = false;
  
  if (speakingInterval) {
    clearInterval(speakingInterval);
    speakingInterval = null;
  }
  
  if (analyser) {
    analyser.disconnect();
    analyser = null;
  }
  
  if (microphoneSource) {
    microphoneSource.disconnect();
    microphoneSource = null;
  }
  
  if (audioContext) {
    audioContext.close().catch(console.error);
    audioContext = null;
  }
  
  isSpeaking = false;
  onSpeakingChangeCallback = null;
  
  console.log("Speaker detection stopped");
};

/**
 * Get current speaking state
 * @returns {boolean} True if speaking
 */
export const getSpeakingState = () => isSpeaking;

/**
 * Get current volume level
 * @returns {number} Volume (0-100)
 */
export const getCurrentVolume = () => {
  if (!analyser || !audioDetectionEnabled) return 0;
  
  try {
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);
    
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i] * dataArray[i];
    }
    const rms = Math.sqrt(sum / dataArray.length);
    
    return Math.min(100, Math.max(0, rms));
  } catch (error) {
    return 0;
  }
};

/* ----------------------------------------------------
   MEDIA MANAGEMENT & CLEANUP
---------------------------------------------------- */

/**
 * Clean up local stream only (keep peers)
 */
const cleanupStreamOnly = () => {
  console.log("Cleaning up local stream");
  
  // Stop screen sharing first
  if (isScreenSharing) {
    if (screenStream) {
      screenStream.getTracks().forEach(t => t.stop());
      screenStream = null;
    }
    isScreenSharing = false;
  }
  
  // Stop local stream
  if (localStream) {
    localStream.getTracks().forEach(track => {
      console.log(`Stopping ${track.kind} track`);
      track.stop();
    });
    localStream = null;
  }
  
  // Stop speaker detection
  stopSpeakerDetection();
  
  mediaInitialized = false;
};

/**
 * Restart media with new constraints
 * @param {MediaStreamConstraints} constraints - New constraints
 * @returns {Promise<MediaStream>} New stream
 */
export const restartMedia = async (constraints = { video: true, audio: true }) => {
  console.log("Restarting media...");
  
  try {
    // Preserve screen sharing state
    const wasScreenSharing = isScreenSharing;
    
    // Clean up existing stream
    cleanupStreamOnly();
    
    // Get new stream
    const newStream = await navigator.mediaDevices.getUserMedia(constraints);
    setLocalStream(newStream);
    
    // If we were screen sharing, we need to reapply it
    // (Screen sharing can't be restored automatically)
    if (wasScreenSharing) {
      console.warn("Screen sharing was active before restart. User must restart manually.");
    }
    
    return newStream;
    
  } catch (error) {
    console.error("Failed to restart media:", error);
    throw error;
  }
};

/**
 * Emergency camera restart (MANUAL USE ONLY)
 * @param {MediaStreamConstraints} constraints - Camera constraints
 * @returns {Promise<MediaStreamTrack>} New camera track
 */
export const emergencyCameraRestart = async (constraints = { video: true }) => {
  console.warn("🚨 MANUAL EMERGENCY CAMERA RESTART");
  
  // Don't allow during screen share
  if (isScreenSharing) {
    throw new Error("Stop screen sharing before camera restart");
  }
  
  try {
    // Get new camera
    const newStream = await navigator.mediaDevices.getUserMedia(constraints);
    const newTrack = newStream.getVideoTracks()[0];
    
    if (!newTrack) {
      throw new Error("No video track from camera");
    }
    
    // Stop audio from new stream
    newStream.getAudioTracks().forEach(t => t.stop());
    
    // Replace in local stream
    if (localStream) {
      const oldVideoTracks = localStream.getVideoTracks();
      oldVideoTracks.forEach(track => {
        localStream.removeTrack(track);
        track.stop();
      });
      localStream.addTrack(newTrack);
    } else {
      localStream = new MediaStream([newTrack]);
    }
    
    // Replace in all peers
    Object.values(peers).forEach(pc => {
      const videoSender = pc.getSenders().find(s => s.track?.kind === "video");
      if (videoSender) {
        videoSender.replaceTrack(newTrack);
      }
    });
    
    console.log("✅ Emergency camera restart successful");
    return newTrack;
    
  } catch (error) {
    console.error("❌ Emergency restart failed:", error);
    throw error;
  }
};

/**
 * Full cleanup of all WebRTC resources
 */
export const cleanup = () => {
  console.log("=== FULL WEBRTC CLEANUP ===");
  
  // Stop screen sharing
  if (isScreenSharing && screenStream) {
    screenStream.getTracks().forEach(t => t.stop());
    screenStream = null;
    isScreenSharing = false;
  }
  
  // Close all peer connections
  closeAllPeers();
  
  // Stop local stream
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localStream = null;
  }
  
  // Stop speaker detection
  stopSpeakerDetection();
  
  mediaInitialized = false;
  
  console.log("=== CLEANUP COMPLETE ===");
};

/* ----------------------------------------------------
   UTILITIES & DEBUGGING
---------------------------------------------------- */

/**
 * Get current WebRTC state
 * @returns {Object} State object
 */
export const getWebRTCState = () => {
  return {
    localStream: {
      exists: !!localStream,
      active: localStream?.active || false,
      audioTracks: localStream?.getAudioTracks().length || 0,
      videoTracks: localStream?.getVideoTracks().length || 0,
    },
    screenSharing: {
      active: isScreenSharing,
      stream: !!screenStream
    },
    peers: Object.keys(peers).length,
    mediaInitialized,
    speakerDetection: audioDetectionEnabled
  };
};

/**
 * Debug all tracks
 */
export const debugTracks = () => {
  console.group("📊 WebRTC Track Debug");
  
  if (localStream) {
    const tracks = localStream.getTracks();
    console.log(`Local Stream (${tracks.length} tracks):`);
    tracks.forEach((track, i) => {
      console.log(`  [${i}] ${track.kind}: ${track.label || 'no-label'} | state: ${track.readyState} | enabled: ${track.enabled}`);
    });
  } else {
    console.log("No local stream");
  }
  
  if (screenStream) {
    const tracks = screenStream.getTracks();
    console.log(`Screen Stream (${tracks.length} tracks):`);
    tracks.forEach((track, i) => {
      console.log(`  [${i}] ${track.kind}: ${track.label || 'no-label'} | state: ${track.readyState} | enabled: ${track.enabled}`);
    });
  } else {
    console.log("No screen stream");
  }
  
  console.log(`Screen Sharing Active: ${isScreenSharing}`);
  console.log(`Active Peers: ${Object.keys(peers).length}`);
  console.groupEnd();
};

/**
 * Check if all tracks are healthy
 * @returns {boolean} True if all tracks are live
 */
export const areTracksHealthy = () => {
  if (!localStream) return false;
  
  const tracks = localStream.getTracks();
  if (tracks.length === 0) return false;
  
  return tracks.every(track => track.readyState === 'live');
};

/**
 * Update video constraints
 * @param {MediaTrackConstraints} constraints - New video constraints
 * @returns {Promise<boolean>} Success status
 */
export const updateVideoConstraints = async (constraints) => {
  const videoTrack = getVideoTrack();
  if (!videoTrack) {
    console.error("No video track to update");
    return false;
  }
  
  try {
    await videoTrack.applyConstraints(constraints);
    console.log("Video constraints updated:", constraints);
    return true;
  } catch (error) {
    console.error("Failed to update video constraints:", error);
    return false;
  }
};

/**
 * Update audio constraints
 * @param {MediaTrackConstraints} constraints - New audio constraints
 * @returns {Promise<boolean>} Success status
 */
export const updateAudioConstraints = async (constraints) => {
  const audioTrack = getAudioTrack();
  if (!audioTrack) {
    console.error("No audio track to update");
    return false;
  }
  
  try {
    await audioTrack.applyConstraints(constraints);
    console.log("Audio constraints updated:", constraints);
    return true;
  } catch (error) {
    console.error("Failed to update audio constraints:", error);
    return false;
  }
};

/* ----------------------------------------------------
   EXPORT EVERYTHING
---------------------------------------------------- */
const WebRTCService = {
  setLocalStream,
  getLocalStream,
  isMediaInitialized,
  initializeMedia,
  createPeer,
  removePeer,
  getPeer,
  getAllPeers,
  closeAllPeers,

  toggleAudio,
  toggleVideo,
  isAudioEnabled,
  isVideoEnabled,
  getAudioTrack,
  getVideoTrack,
  replaceVideoTrack,
  startScreenShare,
  stopScreenShare,
  isScreenSharingActive,
  getScreenStream,

  startSpeakerDetection,
  stopSpeakerDetection,
  getSpeakingState,
  getCurrentVolume,

  restartMedia,
  emergencyCameraRestart,
  cleanup,

  getWebRTCState,
  debugTracks,
  areTracksHealthy,
  updateVideoConstraints,
  updateAudioConstraints
};

export default WebRTCService;
