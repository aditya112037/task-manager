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
  });

  pc.onicecandidate = e => {
    if (e.candidate) {
      socket.emit("conference:ice-candidate", {
        to: socketId,
        candidate: e.candidate,
      });
    }
  };

  pc.ontrack = e => {
    if (!e.streams?.[0]) return;
    window.dispatchEvent(
      new CustomEvent("webrtc:remote-stream", {
        detail: {
          socketId,
          stream: e.streams[0],
          track: e.track,
        },
      })
    );
  };

  pc.onconnectionstatechange = () => {
    if (["failed", "disconnected"].includes(pc.connectionState)) {
      removePeer(socketId);
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
  if (!peer) return;

  const { pc } = peer;

  // 🎤 AUDIO
  const audioTrack = audioStream?.getAudioTracks()[0];
  if (audioTrack && !peer.audioSender) {
    peer.audioSender = pc.addTrack(audioTrack, audioStream);
  }

  // 🎥 CAMERA
  const cameraTrack = cameraStream?.getVideoTracks()[0];
  if (cameraTrack && !peer.cameraSender) {
    peer.cameraSender = pc.addTrack(cameraTrack, cameraStream);
  }

  // 🖥️ SCREEN
  const screenTrack = screenStream?.getVideoTracks()[0];
  if (screenTrack && !peer.screenSender) {
    peer.screenSender = pc.addTrack(screenTrack, screenStream);
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
  } catch {}

  delete peers[socketId];
};

/* -----------------------------
   LOCAL MEDIA — AUDIO
------------------------------ */

export const startAudio = async () => {
  if (audioStream) return audioStream;

  audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  return audioStream;
};

export const stopAudio = () => {
  audioStream?.getTracks().forEach(t => t.stop());
  audioStream = null;
};

/* -----------------------------
   LOCAL MEDIA — CAMERA
------------------------------ */

export const startCamera = async () => {
  if (cameraStream) return cameraStream;

  cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
  return cameraStream;
};

export const stopCamera = () => {
  cameraStream?.getTracks().forEach(t => t.stop());
  cameraStream = null;
};

/* -----------------------------
   LOCAL MEDIA — SCREEN
------------------------------ */

export const startScreen = async () => {
  if (screenStream) return screenStream;

  screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });

  const track = screenStream.getVideoTracks()[0];
  track.onended = stopScreen;

  return screenStream;
};

export const stopScreen = () => {
  screenStream?.getTracks().forEach(t => t.stop());
  screenStream = null;
};

/* -----------------------------
   TOGGLES (NO SIDE EFFECTS)
------------------------------ */

export const setAudioEnabled = (enabled) =>
  audioStream?.getAudioTracks().forEach(t => (t.enabled = enabled));

export const setCameraEnabled = (enabled) =>
  cameraStream?.getVideoTracks().forEach(t => (t.enabled = enabled));

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

/* -----------------------------
   CLEANUP
------------------------------ */

export const cleanup = () => {
  stopAudio();
  stopCamera();
  stopScreen();
  Object.keys(peers).forEach(removePeer);
};