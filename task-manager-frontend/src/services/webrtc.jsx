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

  console.log(`🔄 Creating peer for ${socketId}`);

  const pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    sdpSemantics: 'unified-plan'
  });

  pc.onicecandidate = e => {
    if (e.candidate) {
      console.log(`❄️ ICE candidate for ${socketId}:`, e.candidate.type);
      socket.emit("conference:ice-candidate", {
        to: socketId,
        candidate: e.candidate,
      });
    }
  };

  pc.ontrack = (e) => {
    const track = e.track;
    if (!track) return;

    // 🔥 CRITICAL FIX: Always create a stream for the track
    let stream;
    if (e.streams && e.streams[0]) {
      stream = e.streams[0];
    } else {
      console.log(`📡 Reconstructing stream for ${track.kind} track from ${socketId}`);
      stream = new MediaStream([track]);
    }

    const kind = track.kind; // 'audio' or 'video'

    console.log(`📡 Received ${kind} track from ${socketId}:`, {
      trackId: track.id,
      enabled: track.enabled,
      readyState: track.readyState
    });

    // 🔥 Add track event listeners
    track.onended = () => {
      console.log(`⚠️ ${kind} track ended from ${socketId} - this should NOT happen during active call`);
    };

    // For audio tracks specifically
    if (kind === 'audio') {
      console.log(`🔊 AUDIO TRACK RECEIVED from ${socketId} - READY TO PLAY`);
      track.onmute = () => console.log(`🔇 Audio track muted from ${socketId}`);
      track.onunmute = () => console.log(`🔊 Audio track unmuted from ${socketId}`);
      
      // Ensure track is enabled
      if (!track.enabled) {
        console.log(`⚠️ Audio track from ${socketId} is disabled, enabling...`);
        track.enabled = true;
      }
    }

    window.dispatchEvent(
      new CustomEvent("webrtc:remote-stream", {
        detail: {
          socketId,
          kind,
          stream,
        },
      })
    );

    // Force UI update
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("webrtc:force-render"));
    }, 100);
  };

  // Handle connection state changes
  pc.onconnectionstatechange = () => {
    console.log(`Peer ${socketId} connection state:`, pc.connectionState);
    if (pc.connectionState === 'connected') {
      console.log(`✅ Peer ${socketId} fully connected`);
      // Force sync tracks when connection is established
      setTimeout(() => {
        if (peers[socketId]) {
          syncPeerTracks(socketId);
        }
      }, 500);
    }
  };

  // Handle negotiation needed
  pc.onnegotiationneeded = async () => {
    console.log(`🤝 Negotiation needed for ${socketId}`);
    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await pc.setLocalDescription(offer);
      socket.emit("conference:offer", {
        to: socketId,
        offer,
      });
      console.log(`📤 Offer sent to ${socketId} (renegotiation)`);
    } catch (err) {
      console.error("Renegotiation failed:", err);
    }
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

export const syncPeerTracks = (socketId) => {
  const peer = peers[socketId];
  if (!peer) {
    console.warn(`No peer found for ${socketId}`);
    return;
  }

  const { pc } = peer;

  console.log(`🔄 Syncing tracks for ${socketId}:`, {
    hasAudioStream: !!audioStream,
    audioTrack: audioStream?.getAudioTracks()[0]?.enabled,
    hasCameraStream: !!cameraStream,
    hasScreenStream: !!screenStream
  });

  // 🎤 AUDIO - CRITICAL: Only sync if we have audio stream
  const audioTrack = audioStream?.getAudioTracks()[0];
  
  if (audioTrack && audioTrack.enabled) {
    console.log(`🔊 Audio track available for ${socketId}:`, audioTrack.id, audioTrack.enabled);
    
    if (peer.audioSender) {
      try {
        console.log(`🔄 Replacing audio track for ${socketId}`);
        peer.audioSender.replaceTrack(audioTrack).then(() => {
          console.log(`✅ Audio track replaced for ${socketId}`);
        }).catch(err => {
          console.error(`❌ Error replacing audio track for ${socketId}:`, err);
          // Fallback: remove and add new
          if (peer.audioSender) {
            pc.removeTrack(peer.audioSender);
          }
          peer.audioSender = pc.addTrack(audioTrack, audioStream);
          console.log(`🔄 Added new audio track (fallback) for ${socketId}`);
        });
      } catch (err) {
        console.error(`❌ Failed to replace audio track for ${socketId}:`, err);
        peer.audioSender = pc.addTrack(audioTrack, audioStream);
        console.log(`🔄 Added new audio track (catch) for ${socketId}`);
      }
    } else {
      console.log(`➕ Adding new audio track for ${socketId}`);
      peer.audioSender = pc.addTrack(audioTrack, audioStream);
    }
  } else {
    console.log(`🔇 No active audio track for ${socketId}`);
    // No audio track - remove if exists
    if (peer.audioSender) {
      console.log(`🗑️ Removing audio sender for ${socketId}`);
      try {
        pc.removeTrack(peer.audioSender);
      } catch (err) {
        console.warn(`Could not remove audio sender:`, err);
      }
      peer.audioSender = null;
    }
  }

  // 🎥 CAMERA
  const cameraTrack = cameraStream?.getVideoTracks()[0];
  if (cameraTrack) {
    if (!peer.cameraSender) {
      peer.cameraSender = pc.addTrack(cameraTrack, cameraStream);
    } else if (peer.cameraSender.track !== cameraTrack) {
      peer.cameraSender.replaceTrack(cameraTrack);
    }
  } else if (peer.cameraSender) {
    try {
      pc.removeTrack(peer.cameraSender);
    } catch (err) {
      console.warn(`Could not remove camera sender:`, err);
    }
    peer.cameraSender = null;
  }

  // 🖥️ SCREEN
  const screenTrack = screenStream?.getVideoTracks()[0];
  if (screenTrack) {
    screenTrack.contentHint = "detail";
    if (!peer.screenSender) {
      peer.screenSender = pc.addTrack(screenTrack, screenStream);
    } else if (peer.screenSender.track !== screenTrack) {
      peer.screenSender.replaceTrack(screenTrack);
    }
  } else if (peer.screenSender) {
    try {
      pc.removeTrack(peer.screenSender);
    } catch (err) {
      console.warn(`Could not remove screen sender:`, err);
    }
    peer.screenSender = null;
  }
};

/* -----------------------------
   AUDIO LIFECYCLE FIXES (CRITICAL)
   Rule: NEVER stop() audio tracks during active call
------------------------------ */

// 1️⃣ SAFE MUTE (most common)
export const muteAudio = () => {
  if (!audioStream) return;
  console.log("🔇 Muting audio");
  audioStream.getAudioTracks().forEach(t => {
    t.enabled = false;
  });
};

// 2️⃣ SAFE UNMUTE
export const unmuteAudio = () => {
  if (!audioStream) return;
  console.log("🔊 Unmuting audio");
  audioStream.getAudioTracks().forEach(t => {
    t.enabled = true;
  });
};

// 3️⃣ HARD DESTROY (ONLY on leave/end)
export const destroyAudio = () => {
  if (!audioStream) {
    console.log("No audio stream to destroy");
    return;
  }
  
  console.log("💀 Destroying audio (calling .stop() on tracks)");
  const tracks = audioStream.getTracks();
  tracks.forEach(t => {
    console.log(`Stopping track: ${t.id}, kind: ${t.kind}`);
    t.stop();
  });
  
  audioStream = null;
  console.log("✅ Audio destroyed");
};

/* -----------------------------
   ORIGINAL stopAudio - KEEP FOR COMPATIBILITY
   But mark it as DEPRECATED
------------------------------ */
export const stopAudio = () => {
  console.warn("⚠️ stopAudio() called - use muteAudio() during call, destroyAudio() on leave");
  muteAudio();
};

/* -----------------------------
   LOCAL MEDIA — AUDIO (UPDATED)
------------------------------ */

export const startAudio = async () => {
  // Always create new stream to ensure fresh tracks
  if (audioStream) {
    console.log("🔄 Recreating audio stream");
    destroyAudio(); // Clean up old stream completely
  }

  try {
    console.log("🎤 Requesting microphone permission...");
    audioStream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1
      } 
    });
    
    const audioTrack = audioStream.getAudioTracks()[0];
    if (audioTrack) {
      console.log("✅ Microphone acquired:", {
        id: audioTrack.id,
        label: audioTrack.label,
        enabled: audioTrack.enabled
      });
      
      // Ensure track is enabled
      audioTrack.enabled = true;
      
      // 🔥 CRITICAL: Add ended listener to detect premature stops
      audioTrack.onended = () => {
        console.error("❌ CRITICAL: Audio track ENDED unexpectedly");
        console.trace("Track ended stack trace");
      };
      
      // Add other event listeners
      audioTrack.onmute = () => console.log("🔇 Audio track muted");
      audioTrack.onunmute = () => console.log("🔊 Audio track unmuted");
    }
    
    return audioStream;
  } catch (error) {
    console.error("❌ Failed to start audio:", error);
    throw error;
  }
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
      track.contentHint = "detail";
      track.onended = () => {
        console.log("🖥️ Screen share ended by user");
        stopScreen();
      };
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
   These only change enabled state, never stop tracks
------------------------------ */

export const setAudioEnabled = (enabled) => {
  if (audioStream) {
    console.log(enabled ? "🔊 Enabling audio" : "🔇 Disabling audio");
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
  audioEnabled: audioStream?.getAudioTracks()[0]?.enabled || false,
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
   IMPORTANT: Use destroyAudio() for audio, not stopAudio()
------------------------------ */

export const cleanup = () => {
  console.log("🧹 Cleaning up WebRTC resources");
  destroyAudio(); // Use destroyAudio, not stopAudio
  stopCamera();
  stopScreen();
  Object.keys(peers).forEach(removePeer);
};

/* -----------------------------
   DEBUGGING
------------------------------ */

export const debugPeers = () => {
  console.group("🔍 WebRTC Debug Info");
  console.log("Audio Stream:", audioStream?.id || "null");
  if (audioStream) {
    const audioTrack = audioStream.getAudioTracks()[0];
    console.log("Audio Track:", {
      id: audioTrack?.id,
      enabled: audioTrack?.enabled,
      readyState: audioTrack?.readyState,
      muted: audioTrack?.muted
    });
  }
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

/* -----------------------------
   NEW: Force sync all peers (for debugging)
------------------------------ */

export const forceResyncAllPeers = () => {
  console.log("🔄 Force re-syncing all peers");
  const peerIds = getPeerIds();
  console.log(`Re-syncing ${peerIds.length} peers`);
  
  peerIds.forEach(socketId => {
    console.log(`Syncing tracks for ${socketId}`);
    syncPeerTracks(socketId);
  });
  
  return peerIds.length;
};

/* -----------------------------
   NEW: Check audio health
------------------------------ */

export const checkAudioHealth = () => {
  const state = {
    hasAudioStream: !!audioStream,
    audioTrack: null,
    peers: Object.keys(peers).length,
    peerAudioSenders: Object.values(peers).filter(p => p.audioSender).length
  };
  
  if (audioStream) {
    const track = audioStream.getAudioTracks()[0];
    state.audioTrack = {
      id: track?.id,
      enabled: track?.enabled,
      readyState: track?.readyState,
      muted: track?.muted
    };
  }
  
  console.log("🔊 Audio Health Check:", state);
  return state;
};