// services/webrtc.js

let localStream = null;
const peers = {};
let screenShareStream = null;
let isScreenSharing = false;

// Speaker detection variables
let audioContext = null;
let analyser = null;
let microphoneSource = null;
let speakingInterval = null;
let isSpeaking = false;
let onSpeakingChangeCallback = null;
let audioDetectionEnabled = false;

// 🚨 Guard to prevent multiple getUserMedia calls
let mediaInitialized = false;
let mediaInitializationPromise = null;

/* ----------------------------------------------------
   CORE WEBRTC FUNCTIONS
---------------------------------------------------- */

/**
 * Sets the local media stream (should be called once)
 * @param {MediaStream} stream - The media stream from getUserMedia
 */
export const setLocalStream = (stream) => {
  if (!stream) {
    console.error("Cannot set null stream");
    return false;
  }
  
  // Check if stream is active
  if (!stream.active) {
    console.error("Cannot set inactive stream");
    return false;
  }
  
  // 🚨 CRITICAL: Only set if we don't already have a stream
  if (localStream && localStream.active) {
    console.warn("Local stream already exists and is active, skipping setLocalStream");
    
    // But update if the stream is different
    if (localStream.id !== stream.id) {
      console.log("Replacing existing stream with new stream");
      cleanupStreamOnly(); // Clean up old stream
      localStream = stream;
      mediaInitialized = true;
      return true;
    }
    return false;
  }
  
  localStream = stream;
  mediaInitialized = true;
  console.log("Local stream set successfully, tracks:", {
    audio: localStream.getAudioTracks().length,
    video: localStream.getVideoTracks().length,
    streamId: localStream.id
  });
  
  return true;
};

/**
 * Gets the current local media stream
 * @returns {MediaStream|null} The local stream or null
 */
export const getLocalStream = () => localStream;

/**
 * Checks if media is already initialized
 * @returns {boolean} True if media is initialized
 */
export const isMediaInitialized = () => mediaInitialized && localStream && localStream.active;

/**
 * Creates a new WebRTC peer connection for a user
 * @param {string} userId - The user ID to connect to
 * @param {object} socket - Socket.io instance for signaling
 * @returns {RTCPeerConnection} The new peer connection
 */
export const createPeer = (userId, socket) => {
  if (!localStream) {
    console.error("Cannot create peer: Local stream not set");
    throw new Error("Local stream not set. Call setLocalStream first.");
  }

  if (!localStream.active) {
    console.error("Cannot create peer: Local stream is not active");
    throw new Error("Local stream is not active. Please reinitialize media.");
  }

  if (peers[userId]) {
    console.warn(`Peer connection already exists for user: ${userId}, returning existing`);
    return peers[userId];
  }

  try {
    console.log(`Creating peer connection for user: ${userId}`);
    
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" }
      ],
      iceCandidatePoolSize: 10
    });

    // Add local tracks to the peer connection
    localStream.getTracks().forEach((track) => {
      if (track.kind === 'audio' || track.kind === 'video') {
        console.log(`Adding ${track.kind} track to peer ${userId}`);
        pc.addTrack(track, localStream);
      }
    });

    // ICE candidate handling
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit("conference:ice-candidate", {
          to: userId,
          candidate: e.candidate,
        });
      }
    };

    // Connection state handling
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log(`Connection state with ${userId}: ${state}`);
      
      if (state === 'failed' || state === 'disconnected') {
        console.warn(`Connection with ${userId} is ${state}, attempting to recover...`);
        
        // Clean up failed connection
        if (state === 'failed') {
          removePeer(userId);
        }
      }
    };

    // ICE connection state
    pc.oniceconnectionstatechange = () => {
      const iceState = pc.iceConnectionState;
      console.log(`ICE connection state with ${userId}: ${iceState}`);
      
      if (iceState === 'failed') {
        console.error(`ICE connection failed for ${userId}`);
        // Don't auto-remove, let the connection state handler deal with it
      }
    };

    // Track event (when remote stream is received)
    pc.ontrack = (event) => {
      console.log(`Received ${event.track.kind} track from ${userId}`);
    };

    peers[userId] = pc;
    console.log(`Peer connection created successfully for ${userId}`);
    return pc;

  } catch (error) {
    console.error("Failed to create peer connection:", error);
    throw error;
  }
};

/**
 * Removes a peer connection
 * @param {string} userId - The user ID to remove
 */
export const removePeer = (userId) => {
  if (peers[userId]) {
    console.log(`Removing peer connection for user: ${userId}`);
    
    try {
      peers[userId].close();
      console.log(`Peer connection closed for ${userId}`);
    } catch (error) {
      console.error(`Error closing peer connection for ${userId}:`, error);
    }
    
    delete peers[userId];
  }
};

/**
 * Gets a peer connection by user ID
 * @param {string} userId - The user ID
 * @returns {RTCPeerConnection|null} The peer connection or null
 */
export const getPeer = (userId) => peers[userId] || null;

/**
 * Gets all peer connections
 * @returns {Object} All peer connections
 */
export const getAllPeers = () => ({ ...peers });

/**
 * Closes all peer connections
 */
export const closeAllPeers = () => {
  console.log(`Closing all peer connections (${Object.keys(peers).length} peers)`);
  
  Object.keys(peers).forEach(userId => {
    try {
      peers[userId].close();
      console.log(`Closed peer connection for ${userId}`);
    } catch (error) {
      console.error(`Error closing peer for ${userId}:`, error);
    }
    delete peers[userId];
  });
  
  console.log("All peer connections closed");
};

/* ----------------------------------------------------
   AUDIO / VIDEO CONTROLS
---------------------------------------------------- */

/**
 * Toggles audio (mute/unmute)
 * @param {boolean} enabled - True to enable audio, false to mute
 * @returns {boolean} Success status
 */
export const toggleAudio = (enabled) => {
  if (!localStream) {
    console.error("Cannot toggle audio - no local stream");
    return false;
  }
  
  const audioTracks = localStream.getAudioTracks();
  if (audioTracks.length === 0) {
    console.warn("No audio tracks available to toggle");
    return false;
  }
  
  let success = false;
  audioTracks.forEach((track) => {
    if (track.readyState === 'live') {
      track.enabled = enabled;
      success = true;
      console.log(`Audio track ${track.id} ${enabled ? 'enabled' : 'disabled'}`);
    } else {
      console.warn(`Audio track ${track.id} is not live (state: ${track.readyState})`);
    }
  });
  
  return success;
};

/**
 * Toggles video (on/off)
 * @param {boolean} enabled - True to enable video, false to disable
 * @returns {boolean} Success status
 */
export const toggleVideo = (enabled) => {
  if (!localStream) {
    console.error("Cannot toggle video - no local stream");
    return false;
  }
  
  const videoTracks = localStream.getVideoTracks();
  if (videoTracks.length === 0) {
    console.warn("No video tracks available to toggle");
    return false;
  }
  
  let success = false;
  videoTracks.forEach((track) => {
    if (track.readyState === 'live') {
      track.enabled = enabled;
      success = true;
      console.log(`Video track ${track.id} ${enabled ? 'enabled' : 'disabled'}`);
    } else {
      console.warn(`Video track ${track.id} is not live (state: ${track.readyState})`);
    }
  });
  
  return success;
};

/**
 * Checks if audio is enabled
 * @returns {boolean} True if audio is enabled
 */
export const isAudioEnabled = () => {
  if (!localStream) return false;
  const audioTrack = localStream.getAudioTracks()[0];
  return audioTrack ? audioTrack.enabled : false;
};

/**
 * Checks if video is enabled
 * @returns {boolean} True if video is enabled
 */
export const isVideoEnabled = () => {
  if (!localStream) return false;
  const videoTrack = localStream.getVideoTracks()[0];
  return videoTrack ? videoTrack.enabled : false;
};

/* ----------------------------------------------------
   SPEAKER DETECTION
---------------------------------------------------- */

/**
 * Starts real-time audio level detection for speaker detection
 * @param {MediaStream} stream - The audio stream to analyze
 * @param {Function} onSpeakingChange - Callback when speaking state changes
 * @returns {Function} Cleanup function to stop detection
 */
export const startSpeakerDetection = (stream, onSpeakingChange) => {
  if (!stream) {
    console.error("No audio stream provided for speaker detection");
    return () => {};
  }

  try {
    // Initialize AudioContext
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      console.warn("Web Audio API not supported in this browser");
      return () => {};
    }

    audioContext = new AudioContextClass();
    analyser = audioContext.createAnalyser();
    
    // Configure analyzer
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;
    analyser.minDecibels = -45;
    analyser.maxDecibels = -10;

    // Get audio track from stream
    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) {
      console.warn("No audio track in stream for speaker detection");
      audioContext.close();
      return () => {};
    }

    // Create media stream source
    microphoneSource = audioContext.createMediaStreamSource(stream);
    microphoneSource.connect(analyser);

    // Initialize data array and variables
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    let speaking = false;
    let silenceCounter = 0;
    const speakingHistory = [];
    
    onSpeakingChangeCallback = onSpeakingChange;
    audioDetectionEnabled = true;

    /**
     * Calculate audio volume from frequency data
     * @returns {number} Volume level (0-100)
     */
    const calculateVolume = () => {
      analyser.getByteFrequencyData(dataArray);
      
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / dataArray.length);
      
      return rms;
    };

    /**
     * Detect if user is speaking
     */
    const detectSpeaking = () => {
      if (!audioDetectionEnabled) return;
      
      const volume = calculateVolume();
      
      const speakingThreshold = 25;
      const silenceThreshold = 20;
      const historyLength = 5;
      
      speakingHistory.push(volume > speakingThreshold);
      if (speakingHistory.length > historyLength) {
        speakingHistory.shift();
      }
      
      const recentSpeakingFrames = speakingHistory.filter(v => v).length;
      const shouldBeSpeaking = recentSpeakingFrames > historyLength * 0.6;
      
      if (shouldBeSpeaking) {
        silenceCounter = 0;
        if (!speaking) {
          speaking = true;
          isSpeaking = true;
          if (onSpeakingChangeCallback) {
            onSpeakingChangeCallback(true);
          }
        }
      } else {
        silenceCounter++;
        if (silenceCounter > 5 && speaking) {
          speaking = false;
          isSpeaking = false;
          if (onSpeakingChangeCallback) {
            onSpeakingChangeCallback(false);
          }
        }
      }
    };

    speakingInterval = setInterval(detectSpeaking, 60);

    console.log("Speaker detection started");
    
    return () => {
      stopSpeakerDetection();
    };

  } catch (error) {
    console.error("Failed to start speaker detection:", error);
    
    if (audioContext) {
      audioContext.close().catch(console.error);
      audioContext = null;
    }
    
    return () => {};
  }
};

/**
 * Stops speaker detection and cleans up resources
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
 * Gets current speaking state
 * @returns {boolean} True if user is currently speaking
 */
export const getSpeakingState = () => isSpeaking;

/**
 * Gets current audio volume level
 * @returns {number} Current volume level (0-100)
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
    console.error("Error getting volume:", error);
    return 0;
  }
};

/**
 * Manually trigger speaking state (for testing or admin controls)
 * @param {boolean} speaking - Whether to set as speaking
 */
export const setSpeakingState = (speaking) => {
  const previousState = isSpeaking;
  isSpeaking = speaking;
  
  if (previousState !== speaking && onSpeakingChangeCallback) {
    onSpeakingChangeCallback(speaking);
  }
};

/* ----------------------------------------------------
   SCREEN SHARE
---------------------------------------------------- */

/**
 * Starts screen sharing
 * @param {Object} videoRef - React ref for the video element
 * @returns {Promise<MediaStreamTrack>} The screen share track
 */
export const startScreenShare = async (videoRef) => {
  try {
    if (isScreenSharing) {
      console.warn("Already screen sharing");
      return null;
    }

    if (!localStream) {
      throw new Error("Local stream not initialized");
    }

    console.log("Starting screen share...");
    
    // Get screen share stream
    const screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        cursor: "always",
        displaySurface: "monitor"
      },
      audio: false
    });

    const screenTrack = screenStream.getVideoTracks()[0];
    if (!screenTrack) {
      throw new Error("No screen track available");
    }
    
    console.log("Screen share track obtained:", screenTrack.label);
    screenShareStream = screenStream;
    isScreenSharing = true;

    // Store original video track
    const originalVideoTrack = localStream.getVideoTracks()[0];
    
    if (!originalVideoTrack) {
      console.error("No original video track to replace");
      throw new Error("No camera video track available");
    }

    console.log(`Replacing video track in ${Object.keys(peers).length} peer connections`);
    
    // Replace video track in all peer connections
    Object.values(peers).forEach((pc, index) => {
      const videoSender = pc.getSenders().find(s => 
        s.track && s.track.kind === "video"
      );
      
      if (videoSender) {
        console.log(`Replacing video track in peer connection ${index + 1}`);
        videoSender.replaceTrack(screenTrack);
      }
    });

    // Replace video track in local stream
    console.log("Replacing video track in local stream");
    Object.values(peers).forEach(pc => {
  const sender = pc.getSenders().find(s => s.track?.kind === "video");
  if (sender) sender.replaceTrack(screenTrack);
});

    localStream.addTrack(screenTrack);

    // Update video element
    if (videoRef && videoRef.current) {
      videoRef.current.srcObject = localStream;
      console.log("Video element updated with screen share");
    }

    // Handle screen sharing stop
    screenTrack.onended = async () => {
      console.log("Screen share ended by user");
      await stopScreenShare(videoRef);
    };

    console.log("Screen sharing started successfully");
    return screenTrack;

  } catch (error) {
    console.error("Failed to start screen share:", error);
    throw error;
  }
};

/**
 * Stops screen sharing and returns to camera
 * @param {Object} videoRef - React ref for the video element
 * @returns {Promise<MediaStreamTrack>} The camera track
 */
export const stopScreenShare = async (videoRef) => {
  try {
    if (!isScreenSharing || !localStream) {
      console.log("Not screen sharing or no local stream");
      return null;
    }

    console.log("Stopping screen share...");

const cameraTrack = localStream
  .getVideoTracks()
  .find(t => t.readyState === "live");

if (!cameraTrack) {
  console.error("Camera track missing — cannot restore");
  return;
}

Object.values(peers).forEach(pc => {
  const sender = pc.getSenders().find(s => s.track?.kind === "video");
  if (sender) sender.replaceTrack(cameraTrack);
});

    // Get the current screen track
    const oldVideoTrack = localStream.getVideoTracks()[0];
    
    console.log(`Replacing screen track in ${Object.keys(peers).length} peer connections`);
    
    // Replace screen track with camera track in all peer connections
    Object.values(peers).forEach((pc, index) => {
      const videoSender = pc.getSenders().find(s => 
        s.track && s.track.kind === "video"
      );
      
      if (videoSender) {
        console.log(`Replacing screen track with camera in peer connection ${index + 1}`);
        videoSender.replaceTrack(cameraTrack);
      }
    });

    // Replace in local stream
    if (oldVideoTrack) {
      console.log("Removing screen track from local stream");
      localStream.removeTrack(oldVideoTrack);
      oldVideoTrack.stop();
    }
    
    console.log("Adding camera track to local stream");
    localStream.addTrack(cameraTrack);

    // Update video element
    if (videoRef && videoRef.current) {
      videoRef.current.srcObject = localStream;
      console.log("Video element updated with camera");
    }

    // Clean up screen share stream
    if (screenShareStream) {
      console.log("Stopping screen share stream tracks");
      screenShareStream.getTracks().forEach(track => track.stop());
      screenShareStream = null;
    }

    // Stop the camera stream (we only need the track)
    console.log("Cleaning up temporary camera stream");
    cameraStream.getTracks().forEach(track => {
      if (track !== cameraTrack) track.stop();
    });

    isScreenSharing = false;
    console.log("Screen sharing stopped successfully");
    return cameraTrack;

  } catch (error) {
    console.error("Failed to stop screen share:", error);
    
    // Fallback: try to get any video track
    try {
      const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
      const fallbackTrack = fallbackStream.getVideoTracks()[0];
      
      if (fallbackTrack) {
        // Update all peers with fallback track
        Object.values(peers).forEach((pc) => {
          const videoSender = pc.getSenders().find(s => 
            s.track && s.track.kind === "video"
          );
          
          if (videoSender) {
            videoSender.replaceTrack(fallbackTrack);
          }
        });
        
        // Update local stream
        const oldTrack = localStream.getVideoTracks()[0];
        if (oldTrack) {
          localStream.removeTrack(oldTrack);
          oldTrack.stop();
        }
        localStream.addTrack(fallbackTrack);
        
        // Update video element
        if (videoRef && videoRef.current) {
          videoRef.current.srcObject = localStream;
        }
        
        // Clean up
        fallbackStream.getTracks().forEach(track => {
          if (track !== fallbackTrack) track.stop();
        });
        
        isScreenSharing = false;
        screenShareStream = null;
        console.log("Used fallback camera after screen share error");
        return fallbackTrack;
      }
    } catch (fallbackError) {
      console.error("Fallback camera also failed:", fallbackError);
    }
    
    throw error;
  }
};

/**
 * Checks if screen sharing is active
 * @returns {boolean} True if screen sharing is active
 */
export const isScreenSharingActive = () => isScreenSharing;

/* ----------------------------------------------------
   STREAM MANAGEMENT
---------------------------------------------------- */

/**
 * Replaces the current video track with a new one
 * @param {MediaStreamTrack} newVideoTrack - The new video track
 * @returns {boolean} Success status
 */
export const replaceVideoTrack = async (newVideoTrack) => {
  if (!localStream) {
    throw new Error("No local stream to replace track in");
  }

  if (!newVideoTrack) {
    throw new Error("No new video track provided");
  }

  console.log(`Replacing video track with: ${newVideoTrack.label || newVideoTrack.id}`);

  const oldVideoTrack = localStream.getVideoTracks()[0];
  
  if (oldVideoTrack) {
    console.log(`Stopping old video track: ${oldVideoTrack.label || oldVideoTrack.id}`);
    localStream.removeTrack(oldVideoTrack);
    oldVideoTrack.stop();
  }
  
  console.log("Adding new video track to local stream");
  localStream.addTrack(newVideoTrack);

  // Update all peer connections
  console.log(`Updating ${Object.keys(peers).length} peer connections`);
  Object.values(peers).forEach((pc, index) => {
    const videoSender = pc.getSenders().find(s => 
      s.track && s.track.kind === "video"
    );
    
    if (videoSender) {
      console.log(`Replacing track in peer connection ${index + 1}`);
      videoSender.replaceTrack(newVideoTrack);
    }
  });

  return true;
};

/* ----------------------------------------------------
   CLEANUP FUNCTIONS
---------------------------------------------------- */

/**
 * Cleans up only the local stream (keeps peer connections)
 */
const cleanupStreamOnly = () => {
  console.log("Cleaning up local stream only");
  
  if (localStream) {
    const tracks = localStream.getTracks();
    console.log(`Stopping ${tracks.length} local stream tracks`);
    tracks.forEach(track => {
      console.log(`Stopping ${track.kind} track: ${track.label || track.id}`);
      track.stop();
    });
    localStream = null;
  }
  
  if (screenShareStream) {
    console.log("Stopping screen share stream");
    screenShareStream.getTracks().forEach(track => track.stop());
    screenShareStream = null;
  }
  
  mediaInitialized = false;
  isScreenSharing = false;
  stopSpeakerDetection();
};

/**
 * Full cleanup of all WebRTC resources
 */
export const cleanup = () => {
  console.log("=== Starting full WebRTC cleanup ===");
  
  // Stop speaker detection first
  stopSpeakerDetection();
  
  // Close all peer connections
  closeAllPeers();
  
  // Clean up local stream
  cleanupStreamOnly();
  
  console.log("=== WebRTC cleanup complete ===");
};

/**
 * Quick check of WebRTC state
 * @returns {Object} Current WebRTC state
 */
export const getWebRTCState = () => {
  return {
    localStream: {
      exists: !!localStream,
      active: localStream?.active || false,
      audioTracks: localStream?.getAudioTracks().length || 0,
      videoTracks: localStream?.getVideoTracks().length || 0,
    },
    peers: Object.keys(peers).length,
    screenSharing: isScreenSharing,
    mediaInitialized,
    speakerDetection: audioDetectionEnabled,
  };
};

/* ----------------------------------------------------
   HELPER FUNCTIONS
---------------------------------------------------- */

/**
 * Gets all audio tracks
 * @returns {Array<MediaStreamTrack>} Audio tracks
 */
export const getAudioTracks = () => {
  return localStream ? localStream.getAudioTracks() : [];
};

/**
 * Gets all video tracks
 * @returns {Array<MediaStreamTrack>} Video tracks
 */
export const getVideoTracks = () => {
  return localStream ? localStream.getVideoTracks() : [];
};

/**
 * Checks if the local stream has active tracks
 * @returns {boolean} True if stream has active tracks
 */
export const hasActiveTracks = () => {
  if (!localStream) return false;
  
  const tracks = localStream.getTracks();
  return tracks.length > 0 && tracks.every(track => track.readyState === 'live');
};

/**
 * Restarts media with new constraints
 * @param {Object} constraints - Media constraints
 * @returns {Promise<MediaStream>} New media stream
 */
export const restartMedia = async (constraints = { video: true, audio: true }) => {
  console.log("Restarting media with constraints:", constraints);
  
  // First clean up existing stream
  if (localStream) {
    cleanupStreamOnly();
  }
  
  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    setLocalStream(stream);
    console.log("Media restarted successfully");
    return stream;
  } catch (error) {
    console.error("Failed to restart media:", error);
    throw error;
  }
};