// services/webrtc.js

let localStream = null;
const peers = {};
let screenShareStream = null;
let isScreenSharing = false;

/* ----------------------------------------------------
   LOCAL STREAM MANAGEMENT
---------------------------------------------------- */

export const setLocalStream = (stream) => {
  if (!stream || !stream.active) {
    throw new Error("Invalid media stream");
  }

  if (localStream) return localStream;

  localStream = stream;
  console.log("Local stream set", {
    audio: stream.getAudioTracks().length,
    video: stream.getVideoTracks().length,
  });

  return localStream;
};

export const getLocalStream = () => localStream;

/* ----------------------------------------------------
   PEER CONNECTIONS
---------------------------------------------------- */

export const createPeer = (peerSocketId, socket) => {
  if (!localStream) throw new Error("Local stream not initialized");

  if (peers[peerSocketId]) return peers[peerSocketId];

  const pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });

  // Add existing tracks ONCE
  localStream.getTracks().forEach(track => {
    pc.addTrack(track, localStream);
  });

  pc.onicecandidate = e => {
    if (e.candidate) {
      socket.emit("conference:ice-candidate", {
        to: peerSocketId,
        candidate: e.candidate,
      });
    }
  };

  peers[peerSocketId] = pc;
  return pc;
};

export const removePeer = (peerSocketId) => {
  if (peers[peerSocketId]) {
    peers[peerSocketId].close();
    delete peers[peerSocketId];
  }
};

export const closeAllPeers = () => {
  Object.values(peers).forEach(pc => pc.close());
  Object.keys(peers).forEach(k => delete peers[k]);
};

/* ----------------------------------------------------
   AUDIO / VIDEO TOGGLES (SAFE)
---------------------------------------------------- */

export const toggleAudio = (enabled) => {
  localStream?.getAudioTracks().forEach(track => {
    track.enabled = enabled;
  });
};

export const toggleVideo = (enabled) => {
  localStream?.getVideoTracks().forEach(track => {
    track.enabled = enabled;
  });
};

/* ----------------------------------------------------
   SCREEN SHARE (CORRECT WAY)
---------------------------------------------------- */

export const startScreenShare = async () => {
  if (isScreenSharing) return;

  if (!localStream) throw new Error("Local stream missing");

  screenShareStream = await navigator.mediaDevices.getDisplayMedia({
    video: true,
    audio: false,
  });

  const screenTrack = screenShareStream.getVideoTracks()[0];
  if (!screenTrack) throw new Error("No screen track");

  Object.values(peers).forEach(pc => {
    const sender = pc.getSenders().find(s => s.track?.kind === "video");
    sender?.replaceTrack(screenTrack);
  });

  isScreenSharing = true;

  screenTrack.onended = stopScreenShare;
};

export const stopScreenShare = async () => {
  if (!isScreenSharing) return;

  const cameraTrack = localStream.getVideoTracks()[0];
  if (!cameraTrack) {
    console.error("Camera track missing");
    return;
  }

  Object.values(peers).forEach(pc => {
    const sender = pc.getSenders().find(s => s.track?.kind === "video");
    sender?.replaceTrack(cameraTrack);
  });

  screenShareStream?.getTracks().forEach(t => t.stop());
  screenShareStream = null;
  isScreenSharing = false;
};

/* ----------------------------------------------------
   CLEANUP (ONLY ON LEAVE)
---------------------------------------------------- */

export const cleanupWebRTC = () => {
  closeAllPeers();

  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localStream = null;
  }

  if (screenShareStream) {
    screenShareStream.getTracks().forEach(track => track.stop());
    screenShareStream = null;
  }

  isScreenSharing = false;
};

/* ----------------------------------------------------
   DEBUG
---------------------------------------------------- */

export const getWebRTCState = () => ({
  localStream: !!localStream,
  peers: Object.keys(peers).length,
  screenSharing: isScreenSharing,
});
