// services/webrtc.js

let localStream = null;
const peers = {};
let screenShareStream = null;
let isScreenSharing = false;

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

/* ---------------- AUDIO / VIDEO CONTROLS ---------------- */

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

/* ---------------- SCREEN SHARE ---------------- */

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

/* ---------------- STREAM MANAGEMENT ---------------- */

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

export const cleanup = () => {
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