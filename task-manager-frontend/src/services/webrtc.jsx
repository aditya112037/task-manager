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

/* ----------------------------------------------------
   CORE WEBRTC FUNCTIONS
---------------------------------------------------- */

export const setLocalStream = (stream) => {
  localStream = stream;
};

export const getLocalStream = () => localStream;

export const createPeer = (userId, socket) => {
  if (!localStream) {
    throw new Error("Local stream not set. Call setLocalStream first.");
  }

  if (peers[userId]) {
    console.warn(`Peer connection already exists for user: ${userId}`);
    return peers[userId];
  }

  try {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" }
      ],
    });

    // Add local tracks
    localStream.getTracks().forEach((track) => {
      pc.addTrack(track, localStream);
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
      console.log(`Connection state with ${userId}:`, pc.connectionState);
    };

    // ICE connection state
    pc.oniceconnectionstatechange = () => {
      console.log(`ICE connection state with ${userId}:`, pc.iceConnectionState);
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        console.warn(`ICE connection failed for ${userId}`);
      }
    };

    peers[userId] = pc;
    return pc;

  } catch (error) {
    console.error("Failed to create peer connection:", error);
    throw error;
  }
};

export const removePeer = (userId) => {
  if (peers[userId]) {
    peers[userId].close();
    delete peers[userId];
  }
};

export const getPeer = (userId) => peers[userId];

export const getAllPeers = () => ({ ...peers });

export const closeAllPeers = () => {
  Object.keys(peers).forEach(userId => {
    peers[userId].close();
    delete peers[userId];
  });
};

/* ----------------------------------------------------
   AUDIO / VIDEO CONTROLS
---------------------------------------------------- */

export const toggleAudio = (enabled) => {
  if (!localStream) return false;
  
  const audioTracks = localStream.getAudioTracks();
  audioTracks.forEach((track) => {
    track.enabled = enabled;
  });
  
  return audioTracks.length > 0;
};

export const toggleVideo = (enabled) => {
  if (!localStream) return false;
  
  const videoTracks = localStream.getVideoTracks();
  videoTracks.forEach((track) => {
    track.enabled = enabled;
  });
  
  return videoTracks.length > 0;
};

export const isAudioEnabled = () => {
  if (!localStream) return false;
  const audioTrack = localStream.getAudioTracks()[0];
  return audioTrack ? audioTrack.enabled : false;
};

export const isVideoEnabled = () => {
  if (!localStream) return false;
  const videoTrack = localStream.getVideoTracks()[0];
  return videoTrack ? videoTrack.enabled : false;
};

/* ----------------------------------------------------
   SPEAKER DETECTION (PHASE 3)
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
    analyser.smoothingTimeConstant = 0.8; // Smooth out rapid changes
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
    const speakingHistory = []; // Track recent speaking state for hysteresis
    
    onSpeakingChangeCallback = onSpeakingChange;
    audioDetectionEnabled = true;

    /**
     * Calculate audio volume from frequency data
     * @returns {number} Volume level (0-100)
     */
    const calculateVolume = () => {
      analyser.getByteFrequencyData(dataArray);
      
      // Calculate RMS (Root Mean Square) volume
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / dataArray.length);
      
      return rms;
    };

    /**
     * Detect if user is speaking based on volume and thresholds
     * Uses hysteresis to prevent rapid switching
     */
    const detectSpeaking = () => {
      if (!audioDetectionEnabled) return;
      
      const volume = calculateVolume();
      
      // Adaptive thresholds based on environment
      const speakingThreshold = 25; // Volume level to start speaking
      const silenceThreshold = 20;  // Volume level to stop speaking
      const historyLength = 5;      // Number of frames to consider
      
      // Add current volume to history
      speakingHistory.push(volume > speakingThreshold);
      if (speakingHistory.length > historyLength) {
        speakingHistory.shift();
      }
      
      // Determine speaking state based on history (hysteresis)
      const recentSpeakingFrames = speakingHistory.filter(v => v).length;
      const shouldBeSpeaking = recentSpeakingFrames > historyLength * 0.6; // 60% of recent frames
      
      // Apply silence debounce
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
        // Require 5 frames of silence to stop speaking (prevents brief pauses)
        if (silenceCounter > 5 && speaking) {
          speaking = false;
          isSpeaking = false;
          if (onSpeakingChangeCallback) {
            onSpeakingChangeCallback(false);
          }
        }
      }
    };

    // Start detection interval (60ms = ~16.6fps)
    speakingInterval = setInterval(detectSpeaking, 60);

    console.log("Speaker detection started");
    
    // Return cleanup function
    return () => {
      stopSpeakerDetection();
    };

  } catch (error) {
    console.error("Failed to start speaker detection:", error);
    
    // Clean up on error
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

export const startScreenShare = async (videoRef) => {
  try {
    if (isScreenSharing) {
      console.warn("Already screen sharing");
      return;
    }

    // Get screen share stream
    const screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        cursor: "always",
        displaySurface: "monitor"
      },
      audio: false
    });

    const screenTrack = screenStream.getVideoTracks()[0];
    screenShareStream = screenStream;
    isScreenSharing = true;

    // Store original video track
    const originalVideoTrack = localStream.getVideoTracks()[0];

    // Replace video track in all peer connections
    Object.values(peers).forEach((pc) => {
      const videoSender = pc.getSenders().find(s => 
        s.track && s.track.kind === "video"
      );
      
      if (videoSender) {
        videoSender.replaceTrack(screenTrack);
      }
    });

    // Replace video track in local stream
    if (originalVideoTrack) {
      localStream.removeTrack(originalVideoTrack);
      originalVideoTrack.stop(); // Stop the original track
    }
    localStream.addTrack(screenTrack);

    // Update video element
    if (videoRef && videoRef.current) {
      videoRef.current.srcObject = localStream;
    }

    // Handle screen sharing stop
    screenTrack.onended = async () => {
      await stopScreenShare(videoRef);
    };

    return screenTrack;

  } catch (error) {
    console.error("Failed to start screen share:", error);
    throw error;
  }
};

export const stopScreenShare = async (videoRef) => {
  try {
    if (!isScreenSharing) return;

    // Get new camera stream
    const cameraStream = await navigator.mediaDevices.getUserMedia({
      video: true
    });

    const cameraTrack = cameraStream.getVideoTracks()[0];

    // Replace screen track with camera track in all peer connections
    Object.values(peers).forEach((pc) => {
      const videoSender = pc.getSenders().find(s => 
        s.track && s.track.kind === "video"
      );
      
      if (videoSender) {
        videoSender.replaceTrack(cameraTrack);
      }
    });

    // Replace in local stream
    const oldVideoTrack = localStream.getVideoTracks()[0];
    if (oldVideoTrack) {
      localStream.removeTrack(oldVideoTrack);
      oldVideoTrack.stop(); // Stop the screen track
    }
    localStream.addTrack(cameraTrack);

    // Update video element
    if (videoRef && videoRef.current) {
      videoRef.current.srcObject = localStream;
    }

    // Clean up screen share stream
    if (screenShareStream) {
      screenShareStream.getTracks().forEach(track => track.stop());
      screenShareStream = null;
    }

    isScreenSharing = false;
    return cameraTrack;

  } catch (error) {
    console.error("Failed to stop screen share:", error);
    throw error;
  }
};

export const isScreenSharingActive = () => isScreenSharing;

/* ----------------------------------------------------
   STREAM MANAGEMENT
---------------------------------------------------- */

export const replaceVideoTrack = async (newVideoTrack) => {
  if (!localStream) return;

  const oldVideoTrack = localStream.getVideoTracks()[0];
  
  if (oldVideoTrack) {
    localStream.removeTrack(oldVideoTrack);
    oldVideoTrack.stop();
  }
  
  localStream.addTrack(newVideoTrack);

  // Update all peer connections
  Object.values(peers).forEach((pc) => {
    const videoSender = pc.getSenders().find(s => 
      s.track && s.track.kind === "video"
    );
    
    if (videoSender) {
      videoSender.replaceTrack(newVideoTrack);
    }
  });
};

/* ----------------------------------------------------
   CLEANUP
---------------------------------------------------- */

export const cleanup = () => {
  // Stop speaker detection first
  stopSpeakerDetection();
  
  // Close all peer connections
  closeAllPeers();
  
  // Stop local stream
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localStream = null;
  }
  
  // Stop screen share stream
  if (screenShareStream) {
    screenShareStream.getTracks().forEach(track => track.stop());
    screenShareStream = null;
  }
  
  isScreenSharing = false;
};
