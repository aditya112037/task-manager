/* ====================================================
   WEBRTC CORE — CLEAN & BORING v1
   Audio / Camera / Screen are FULLY independent
==================================================== */

/* -----------------------------
   LOCAL MEDIA STATE
------------------------------ */

let audioStream = null;    // mic only
let cameraStream = null;   // camera only
let screenStream = null;   // screen only

/* -----------------------------
   PEER STATE
------------------------------ */

const peers = {}; // socketId -> { pc, audioSender, cameraSender, screenSender }

/* -----------------------------
   PEER CREATION
------------------------------ */

export const createPeer = (socketId, socket) => {
  if (peers[socketId]) return peers[socketId].pc;

  const pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    sdpSemantics: 'unified-plan' // Ensure unified plan for proper track handling
  });

  pc.onicecandidate = e => {
    if (e.candidate) {
      socket.emit("conference:ice-candidate", {
        to: socketId,
        candidate: e.candidate,
      });
    }
  };

  // FIXED: Better track handling with proper stream identification
  pc.ontrack = (e) => {
    const track = e.track;
    const stream = e.streams[0];
    
    if (!track || !stream) return;

    // Determine track type
    let kind = 'unknown';
    if (track.kind === 'audio') {
      kind = 'audio';
    } else if (track.kind === 'video') {
      // Try to detect screen share
      const settings = track.getSettings();
      if (settings.displaySurface || settings.logicalSurface || 
          track.contentHint === 'detail' || track.contentHint === 'text') {
        kind = 'screen';
      } else {
        kind = 'camera';
      }
    }

    console.log(`Received ${kind} track from ${socketId}:`, track.id);
    
    // Dispatch event with the stream
    window.dispatchEvent(
      new CustomEvent("webrtc:remote-stream", {
        detail: {
          socketId,
          kind,
          stream: stream,
        },
      })
    );
  };

  // Handle connection state changes
  pc.onconnectionstatechange = () => {
    console.log(`Peer ${socketId} connection state:`, pc.connectionState);
  };

  peers[socketId] = {
    pc,
    audioSender: null,
    cameraSender: null,
    screenSender: null,
  };

  return pc;
};

/* -----------------------------
   ADD TRACKS TO PEER
------------------------------ */

/* -----------------------------
   ADD TRACKS TO PEER
------------------------------ */

export const syncPeerTracks = (socketId) => {
  const peer = peers[socketId];
  if (!peer) return;

  const { pc } = peer;

  // 🎤 AUDIO - FIXED: Proper track replacement
  const audioTrack = audioStream?.getAudioTracks()[0];
  
  if (audioTrack) {
    if (peer.audioSender) {
      try {
        // First remove the old track if it exists
        peer.audioSender.replaceTrack(audioTrack).catch(err => {
          console.warn("Error replacing audio track:", err);
          // Fallback: remove and add new
          if (peer.audioSender) {
            pc.removeTrack(peer.audioSender);
          }
          peer.audioSender = pc.addTrack(audioTrack, audioStream);
        });
      } catch (err) {
        console.warn("Failed to replace audio track, adding new:", err);
        peer.audioSender = pc.addTrack(audioTrack, audioStream);
      }
    } else {
      peer.audioSender = pc.addTrack(audioTrack, audioStream);
    }
  } else {
    // No audio track - remove if exists
    if (peer.audioSender) {
      pc.removeTrack(peer.audioSender);
      peer.audioSender = null;
    }
  }

  // 🎥 CAMERA - FIXED: Proper track management
  const cameraTrack = cameraStream?.getVideoTracks()[0];
  if (cameraTrack) {
    if (!peer.cameraSender) {
      peer.cameraSender = pc.addTrack(cameraTrack, cameraStream);
    } else if (peer.cameraSender.track !== cameraTrack) {
      // Track changed (restart camera), replace it
      peer.cameraSender.replaceTrack(cameraTrack);
    }
  } else if (peer.cameraSender) {
    // Camera stopped, remove track
    pc.removeTrack(peer.cameraSender);
    peer.cameraSender = null;
  }

  // 🖥️ SCREEN - FIXED: Proper track management
  const screenTrack = screenStream?.getVideoTracks()[0];
  if (screenTrack) {
    screenTrack.contentHint = "detail";
    if (!peer.screenSender) {
      peer.screenSender = pc.addTrack(screenTrack, screenStream);
    } else if (peer.screenSender.track !== screenTrack) {
      // Screen track changed, replace it
      peer.screenSender.replaceTrack(screenTrack);
    }
  } else if (peer.screenSender) {
    // Screen sharing stopped, remove track
    pc.removeTrack(peer.screenSender);
    peer.screenSender = null;
  }
};

/* -----------------------------
   UPDATE SINGLE TRACK
------------------------------ */

export const updatePeerTrack = (socketId, kind, enabled) => {
  const peer = peers[socketId];
  if (!peer) return;

  switch (kind) {
    case 'audio':
      if (peer.audioSender) {
        const track = peer.audioSender.track;
        if (track) track.enabled = enabled;
      }
      break;
    case 'camera':
      if (peer.cameraSender) {
        const track = peer.cameraSender.track;
        if (track) track.enabled = enabled;
      }
      break;
    default:
      break;
  }
};


/* -----------------------------
   REMOVE PEER
------------------------------ */

export const removePeer = (socketId) => {
  const peer = peers[socketId];
  if (!peer) return;

  try {
    peer.pc.close();
  } catch (err) {
    console.warn("Error closing peer connection:", err);
  }

  delete peers[socketId];
};

/* -----------------------------
   LOCAL MEDIA — AUDIO
------------------------------ */

export const startAudio = async () => {
  // Always create new stream to ensure fresh tracks
  if (audioStream) {
    stopAudio();
  }

  try {
    audioStream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1
      } 
    });
    
    // Ensure track is enabled
    audioStream.getAudioTracks().forEach(t => {
      t.enabled = true;
    });
    
    return audioStream;
  } catch (error) {
    console.error("Failed to start audio:", error);
    throw error;
  }
};
export const stopAudio = () => {
  if (!audioStream) return;

  // Only stop tracks, don't just disable
  audioStream.getAudioTracks().forEach(t => {
    t.stop(); // Stop the track completely
  });
  
  audioStream = null; // Clear the stream reference
};





/* -----------------------------
   LOCAL MEDIA — CAMERA
------------------------------ */

export const startCamera = async () => {
  if (cameraStream) return cameraStream;

  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ 
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 }
      } 
    });
    return cameraStream;
  } catch (error) {
    console.error("Failed to start camera:", error);
    throw error;
  }
};

export const stopCamera = () => {
  if (cameraStream) {
    cameraStream.getTracks().forEach(t => t.stop());
    cameraStream = null;
  }
};



/* -----------------------------
   LOCAL MEDIA — SCREEN
------------------------------ */

export const startScreen = async () => {
  if (screenStream) return screenStream;

  try {
    screenStream = await navigator.mediaDevices.getDisplayMedia({ 
      video: { 
        displaySurface: "monitor",
        frameRate: { ideal: 30 },
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      },
      audio: false // Screen share typically doesn't include audio
    });

    const track = screenStream.getVideoTracks()[0];
    if (track) {
      // ✅ Set contentHint for proper screen detection
      track.contentHint = "detail";
      track.onended = stopScreen;
    }

    return screenStream;
  } catch (error) {
    console.error("Failed to start screen sharing:", error);
    throw error;
  }
};

export const stopScreen = () => {
  if (screenStream) {
    screenStream.getTracks().forEach(t => t.stop());
    screenStream = null;
  }
};

/* -----------------------------
   TOGGLES (NO SIDE EFFECTS)
------------------------------ */

export const setAudioEnabled = (enabled) => {
  if (audioStream) {
    audioStream.getAudioTracks().forEach(t => {
      if (t.enabled !== enabled) {
        t.enabled = enabled;
      }
    });
  }
};

export const setCameraEnabled = (enabled) => {
  if (cameraStream) {
    cameraStream.getVideoTracks().forEach(t => {
      if (t.enabled !== enabled) {
        t.enabled = enabled;
      }
    });
  }
};

/* -----------------------------
   STREAM GETTERS
------------------------------ */

export const getAudioStream = () => audioStream;

export const getCameraStream = () => cameraStream;

export const getScreenStream = () => screenStream;

/* -----------------------------
   UTILITIES
------------------------------ */

export const getLocalState = () => ({
  audio: !!audioStream,
  camera: !!cameraStream,
  screen: !!screenStream,
  peers: Object.keys(peers).length,
});

export const getPeerIds = () => Object.keys(peers);

export const getPeers = () => peers;

export const getLocalStream = () => {
  return (
    screenStream ||
    cameraStream ||
    audioStream ||
    null
  );
};

export const isAudioActive = () => {
  return audioStream && audioStream.getAudioTracks().some(t => t.enabled);
};

export const isCameraActive = () => {
  return cameraStream && cameraStream.getVideoTracks().some(t => t.enabled);
};

export const isScreenActive = () => {
  return screenStream && screenStream.getVideoTracks().some(t => t.readyState === 'live');
};

/* -----------------------------
   OFFER/ANSWER HELPERS
------------------------------ */

export const createOffer = async (socketId) => {
  const pc = createPeer(socketId);
  const offer = await pc.createOffer({
    offerToReceiveAudio: true,
    offerToReceiveVideo: true,
  });
  await pc.setLocalDescription(offer);
  return offer;
};

export const handleOffer = async (socketId, offer) => {
  const pc = createPeer(socketId);
  await pc.setRemoteDescription(offer);
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  return answer;
};

export const handleAnswer = async (socketId, answer) => {
  const pc = peers[socketId]?.pc;
  if (pc) {
    await pc.setRemoteDescription(answer);
  }
};

export const addIceCandidate = async (socketId, candidate) => {
  const pc = peers[socketId]?.pc;
  if (pc) {
    await pc.addIceCandidate(candidate);
  }
};

/* -----------------------------
   CLEANUP
------------------------------ */

export const cleanup = () => {
  stopAudio();
  stopCamera();
  stopScreen();
  Object.keys(peers).forEach(removePeer);
};

/* -----------------------------
   DEBUGGING
------------------------------ */

export const debugPeers = () => {
  console.group("WebRTC Debug Info");
  console.log("Audio Stream:", audioStream?.id || "null");
  console.log("Camera Stream:", cameraStream?.id || "null");
  console.log("Screen Stream:", screenStream?.id || "null");
  console.log("Peers:", Object.keys(peers).length);
  Object.entries(peers).forEach(([id, peer]) => {
    console.log(`  Peer ${id}:`, {
      connectionState: peer.pc.connectionState,
      audioSender: !!peer.audioSender,
      cameraSender: !!peer.cameraSender,
      screenSender: !!peer.screenSender
    });
  });
  console.groupEnd();
};