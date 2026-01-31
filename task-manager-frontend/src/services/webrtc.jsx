/* ----------------------------------------------------
   GLOBAL STATE - STABLE ARCHITECTURE
---------------------------------------------------- */

let cameraStream = null;      // Camera + mic (persistent)
let screenStream = null;      // Screen share only
let isScreenSharing = false;
let mediaInitialized = false;

// Peer connections - KEY CHANGE: Use socketId as key
const peers = {};

// Speaker detection
let audioContext = null;
let analyser = null;
let microphoneSource = null;
let speakingInterval = null;
let isSpeaking = false;
let audioDetectionEnabled = false;

/* ----------------------------------------------------
   MEDIA INITIALIZATION - INTERNAL USE ONLY
---------------------------------------------------- */

// 🚨 FIX 1: REMOVED FROM PUBLIC API - Media lifecycle belongs to conferenceSocket.js
// This function is kept internally but should NOT be called from UI


export const getLocalStream = () => cameraStream;
export const isMediaInitialized = () =>
  !!cameraStream && cameraStream.active && mediaInitialized;

/* ----------------------------------------------------
   PEER CONNECTION MANAGEMENT - FIXED: Use socketId
---------------------------------------------------- */

/**
 * 🔧 FIX 2 — PREVENT DUPLICATE TRACK ADDITION
 * Peer creation = signaling only, NO track addition
 * Track attachment happens later via addTracksToAllPeers()
 */
export const createPeer = (socketId, socket) => {
  // ✅ FIX 7: Don't throw if cameraStream is null
  if (!cameraStream) {
    console.warn("Peer created before media:", socketId);
  }

  // ✅ FIX: Check if peer already exists for this socketId
  if (peers[socketId]) {
    console.log(`Peer already exists for socketId: ${socketId}`);
    return peers[socketId];
  }

  const pc = new RTCPeerConnection({
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
    ],
  });

  // ✅ FIX 2: REMOVED track addition from here
  // Tracks will be added later via addTracksToAllPeers()
  // This prevents duplicate track addition and follows single-source-of-truth principle

  // Ice candidate handling
  pc.onicecandidate = e => {
    if (e.candidate) {
      socket.emit("conference:ice-candidate", {
        to: socketId,
        candidate: e.candidate,
      });
    }
  };

  pc.ontrack = e => {
    console.log(`Received track from ${socketId}:`, e.track.kind);
    window.dispatchEvent(
      new CustomEvent("webrtc:track", {
        detail: { socketId, stream: e.streams[0], track: e.track },
      })
    );
  };

  // ✅ FIX 3: Handle disconnected state as well
  pc.onconnectionstatechange = () => {
    console.log(`Peer ${socketId} connection state:`, pc.connectionState);
    if (
      pc.connectionState === "failed" ||
      pc.connectionState === "disconnected"
    ) {
      console.log(`Removing failed/disconnected peer: ${socketId}`);
      removePeer(socketId);
    }
  };

  pc.oniceconnectionstatechange = () => {
    console.log(`Peer ${socketId} ICE state:`, pc.iceConnectionState);
  };

  // Store peer with socketId as key
  peers[socketId] = pc;
  console.log(`Created peer for socketId: ${socketId}, total peers:`, Object.keys(peers).length);
  
  return pc;
};

/**
 * 🔧 FIX 8 — Function to attach tracks to existing peers
 * MANDATORY: Call this when media becomes available
 */
export const addTracksToAllPeers = (stream) => {
  if (!stream) {
    console.warn("No stream provided to addTracksToAllPeers");
    return;
  }

  console.log("Adding tracks to all existing peers");
  
  Object.entries(peers).forEach(([socketId, pc]) => {
    if (!pc || pc.connectionState === "closed") {
      console.log(`Skipping closed peer: ${socketId}`);
      return;
    }
    
    const existingSenders = pc.getSenders();
    const existingAudio = existingSenders.some(s => s.track?.kind === "audio");
    const existingVideo = existingSenders.some(s => s.track?.kind === "video");
    
    // Add audio track if not already added
    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack && !existingAudio) {
      try {
        pc.addTrack(audioTrack, stream);
        console.log(`Added audio track to peer ${socketId}`);
      } catch (error) {
        console.warn(`Failed to add audio track to peer ${socketId}:`, error);
      }
    }
    
    // Add video track if not already added
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack && !existingVideo) {
      try {
        const videoSender = pc.addTrack(videoTrack, stream);
        pc.__videoSender = videoSender; // Store for screen sharing
        console.log(`Added video track to peer ${socketId}`);
      } catch (error) {
        console.warn(`Failed to add video track to peer ${socketId}:`, error);
      }
    }
  });
};

/**
 * 🔧 FIX 2 — Remove peer by socketId
 */
export const removePeer = (socketId) => {
  console.log(`Removing peer for socketId: ${socketId}`);
  if (peers[socketId]) {
    try {
      peers[socketId].close();
    } catch (err) {
      console.warn(`Error closing peer ${socketId}:`, err);
    }
    delete peers[socketId];
  }
};

export const getPeer = (socketId) => peers[socketId] || null;
export const getAllPeers = () => ({ ...peers });

export const closeAllPeers = () => {
  console.log("Closing all peers");
  Object.keys(peers).forEach(socketId => {
    try {
      peers[socketId].close();
    } catch (err) {
      console.warn(`Error closing peer ${socketId}:`, err);
    }
    delete peers[socketId];
  });
  console.log("All peers closed");
};

/* ----------------------------------------------------
   MEDIA CONTROL
---------------------------------------------------- */

export const toggleAudio = (enabled) => {
  cameraStream?.getAudioTracks().forEach(t => {
    t.enabled = enabled;
  });
};

export const toggleVideo = (enabled) => {
  cameraStream?.getVideoTracks().forEach(t => {
    t.enabled = enabled;
  });
};

export const isAudioEnabled = () =>
  cameraStream?.getAudioTracks()[0]?.enabled ?? false;

export const isVideoEnabled = () =>
  cameraStream?.getVideoTracks()[0]?.enabled ?? false;

export const getAudioTrack = () =>
  cameraStream?.getAudioTracks()[0] || null;

export const getVideoTrack = () =>
  cameraStream?.getVideoTracks()[0] || null;

/* ----------------------------------------------------
   SCREEN SHARING
---------------------------------------------------- */

export const startScreenShare = async (videoRef) => {
  try {
    screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        cursor: "always",
        displaySurface: "monitor",
      },
      audio: false,
    });

    const screenTrack = screenStream.getVideoTracks()[0];
    
    // Replace camera track with screen track in all active peers
    Object.values(peers).forEach(pc => {
      if (pc.__videoSender && screenTrack) {
        try {
          pc.__videoSender.replaceTrack(screenTrack);
        } catch (err) {
          console.warn("Failed to replace track for screen sharing:", err);
        }
      }
    });

    // Update local video display
    if (videoRef?.current) {
      videoRef.current.srcObject = screenStream;
    }

    // Handle screen sharing stop via browser UI
    screenTrack.onended = () => {
      console.log("Screen sharing stopped by user");
      stopScreenShare(videoRef);
    };

    isScreenSharing = true;
    console.log("Screen sharing started");
    
  } catch (error) {
    console.error("Screen share error:", error);
    throw error;
  }
};

export const stopScreenShare = async (videoRef) => {
  if (!isScreenSharing) return;

  const cameraTrack = cameraStream?.getVideoTracks()[0];

  // Replace screen track with camera track in all active peers
  if (cameraTrack) {
    Object.values(peers).forEach(pc => {
      if (pc.__videoSender && cameraTrack) {
        try {
          pc.__videoSender.replaceTrack(cameraTrack);
        } catch (err) {
          console.warn("Failed to replace track back to camera:", err);
        }
      }
    });
  }

  // Restore local video display to camera
  if (videoRef?.current && cameraStream) {
    videoRef.current.srcObject = cameraStream;
  }

  // Stop screen tracks
  if (screenStream) {
    screenStream.getTracks().forEach(track => track.stop());
    screenStream = null;
  }

  isScreenSharing = false;
  console.log("Screen sharing stopped");
};

export const isScreenSharingActive = () => isScreenSharing;
export const getScreenStream = () => screenStream;

/**
 * Update all peers with new track when toggling media
 */
export const updatePeersTrack = (kind, enabled) => {
  Object.values(peers).forEach(pc => {
    const senders = pc.getSenders();
    senders.forEach(sender => {
      if (sender.track && sender.track.kind === kind) {
        // For remote peers, we just update the existing track's enabled state
        // The track replacement happens automatically
        if (sender.track) {
          sender.track.enabled = enabled;
        }
      }
    });
  });
};

/* ----------------------------------------------------
   SPEAKER DETECTION
---------------------------------------------------- */

export const startSpeakerDetection = (cb) => {
  if (!cameraStream) {
    console.warn("No camera stream for speaker detection");
    return () => {};
  }

  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioCtx();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.3;

    microphoneSource = audioContext.createMediaStreamSource(cameraStream);
    microphoneSource.connect(analyser);

    const data = new Uint8Array(analyser.frequencyBinCount);
    audioDetectionEnabled = true;
    isSpeaking = false;

    speakingInterval = setInterval(() => {
      if (!audioDetectionEnabled || !analyser) return;
      
      analyser.getByteFrequencyData(data);
      const volume = Math.sqrt(
        data.reduce((s, v) => s + v * v, 0) / data.length
      );
      
      // More sophisticated detection with hysteresis
      const speakingNow = volume > 25; // Threshold
      
      if (speakingNow !== isSpeaking) {
        isSpeaking = speakingNow;
        console.log(`Speaking state changed: ${isSpeaking}, volume: ${volume}`);
        cb?.(isSpeaking, volume);
      }
    }, 200); // Check every 200ms

    console.log("Speaker detection started");
    
    return () => {
      stopSpeakerDetection();
    };
    
  } catch (error) {
    console.error("Speaker detection error:", error);
    return () => {};
  }
};

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
    audioContext.close().catch(console.warn);
    audioContext = null;
  }
  
  isSpeaking = false;
  console.log("Speaker detection stopped");
};

export const getSpeakingState = () => isSpeaking;

/* ----------------------------------------------------
   CLEANUP - FIXED: Comprehensive cleanup
---------------------------------------------------- */

export const cleanup = () => {
  console.log("Performing WebRTC cleanup");
  
  // 🧹 FIX 5 — Cleanup on leave (important)
  stopSpeakerDetection();
  
  // Close all peer connections
  closeAllPeers();
  
  // Stop screen sharing if active
  if (screenStream) {
    screenStream.getTracks().forEach(track => {
      try {
        track.stop();
      } catch (err) {
        console.warn("Error stopping screen track:", err);
      }
    });
    screenStream = null;
    isScreenSharing = false;
  }
  
  // Stop camera stream
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => {
      try {
        track.stop();
      } catch (err) {
        console.warn("Error stopping camera track:", err);
      }
    });
    cameraStream = null;
  }
  
  mediaInitialized = false;
  
  console.log("WebRTC cleanup completed");
};

/* ----------------------------------------------------
   DEBUG & UTILITIES
---------------------------------------------------- */

export const getWebRTCState = () => ({
  camera: !!cameraStream,
  screenSharing: isScreenSharing,
  peers: Object.keys(peers).length,
  peerIds: Object.keys(peers),
  speakerDetection: audioDetectionEnabled,
  isSpeaking,
  mediaInitialized,
});

/**
 * Get stats for debugging
 */
export const getPeerStats = async (socketId) => {
  const pc = peers[socketId];
  if (!pc) return null;
  
  try {
    const stats = await pc.getStats();
    const results = [];
    
    stats.forEach(report => {
      results.push({
        type: report.type,
        id: report.id,
        timestamp: report.timestamp,
        ...report,
      });
    });
    
    return results;
  } catch (err) {
    console.warn(`Failed to get stats for peer ${socketId}:`, err);
    return null;
  }
};

/**
 * Check if a specific track is being sent to a peer
 */
export const hasTrackForPeer = (socketId, kind) => {
  const pc = peers[socketId];
  if (!pc) return false;
  
  const senders = pc.getSenders();
  return senders.some(sender => sender.track && sender.track.kind === kind);
};

/* ----------------------------------------------------
   EXPORT SERVICE - FIX 1: Remove initializeMedia from public API
---------------------------------------------------- */

const WebRTCService = {
  // 🚨 FIX 1: REMOVED initializeMedia - Media lifecycle belongs to conferenceSocket.js
  getLocalStream,
  isMediaInitialized,

  createPeer,
  removePeer,
  getPeer,
  getAllPeers,
  closeAllPeers,
  addTracksToAllPeers,
  updatePeersTrack,
  
  toggleAudio,
  toggleVideo,
  isAudioEnabled,
  isVideoEnabled,
  getAudioTrack,
  getVideoTrack,

  startScreenShare,
  stopScreenShare,
  isScreenSharingActive,
  getScreenStream,

  startSpeakerDetection,
  stopSpeakerDetection,
  getSpeakingState,

  cleanup,
  getWebRTCState,
  getPeerStats,
  hasTrackForPeer,
};

export default WebRTCService;