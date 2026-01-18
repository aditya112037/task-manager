/* ----------------------------------------------------
   GLOBAL STATE - STABLE ARCHITECTURE
---------------------------------------------------- */

let cameraStream = null;      // Camera + mic (persistent)
let screenStream = null;      // Screen share only
let isScreenSharing = false;
let mediaInitialized = false;

// Peer connections
const peers = {};

// Speaker detection
let audioContext = null;
let analyser = null;
let microphoneSource = null;
let speakingInterval = null;
let isSpeaking = false;
let audioDetectionEnabled = false;

/* ----------------------------------------------------
   MEDIA INITIALIZATION
---------------------------------------------------- */

export const initializeMedia = async (
  constraints = { audio: true, video: true }
) => {
  if (
    mediaInitialized &&
    cameraStream &&
    cameraStream.getTracks().every(t => t.readyState === "live")
  ) {
    return cameraStream;
  }

  const optimizedConstraints = {
    audio: constraints.audio,
    video: constraints.video === true
      ? {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 60 },
          facingMode: "user",
        }
      : constraints.video,
  };

  try {
    cameraStream = await navigator.mediaDevices.getUserMedia(optimizedConstraints);
    mediaInitialized = true;
    return cameraStream;
  } catch (err) {
    console.error("Camera init failed, trying audio-only", err);
    cameraStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });
    mediaInitialized = true;
    return cameraStream;
  }
};

export const getLocalStream = () => cameraStream;
export const isMediaInitialized = () =>
  !!cameraStream && cameraStream.active && mediaInitialized;

/* ----------------------------------------------------
   PEER CONNECTION MANAGEMENT
---------------------------------------------------- */

export const createPeer = (userId, socket) => {
  if (!cameraStream) {
    throw new Error("initializeMedia() must be called first");
  }

  if (peers[userId]) return peers[userId];

  const pc = new RTCPeerConnection({
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
    ],
  });

  // Add camera tracks
cameraStream.getTracks().forEach(track => {
  const sender = pc.addTrack(track, cameraStream);
  if (track.kind === "video") {
    pc.__cameraSender = sender;
  }
});
  pc.onicecandidate = e => {
    if (e.candidate) {
      socket.emit("conference:ice-candidate", {
        to: userId,
        candidate: e.candidate,
      });
    }
  };

  pc.ontrack = e => {
    window.dispatchEvent(
      new CustomEvent("webrtc:track", {
        detail: { userId, stream: e.streams[0], track: e.track },
      })
    );
  };

  pc.onconnectionstatechange = () => {
    if (pc.connectionState === "failed") {
      removePeer(userId);
    }
  };

  peers[userId] = pc;
  return pc;
};

export const removePeer = (userId) => {
  if (peers[userId]) {
    peers[userId].close();
    delete peers[userId];
  }
};

export const getPeer = (userId) => peers[userId] || null;
export const getAllPeers = () => ({ ...peers });

export const closeAllPeers = () => {
  Object.keys(peers).forEach(id => {
    peers[id].close();
    delete peers[id];
  });
};


export const toggleAudio = (enabled) => {
  cameraStream?.getAudioTracks().forEach(t => (t.enabled = enabled));
};

export const toggleVideo = (enabled) => {
  cameraStream?.getVideoTracks().forEach(t => (t.enabled = enabled));
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
  screenStream = await navigator.mediaDevices.getDisplayMedia({
    video: true,
    audio: false,
  });

  const screenTrack = screenStream.getVideoTracks()[0];

  Object.values(peers).forEach(pc => {
    pc.__cameraSender?.replaceTrack(screenTrack);
  });

  if (videoRef?.current) {
    videoRef.current.srcObject = screenStream;
  }

  screenTrack.onended = () => stopScreenShare(videoRef);

  isScreenSharing = true;
};


export const stopScreenShare = async (videoRef) => {
  if (!isScreenSharing) return;

  const cameraTrack = cameraStream.getVideoTracks()[0];

  Object.values(peers).forEach(pc => {
    pc.__cameraSender?.replaceTrack(cameraTrack);
  });

  if (videoRef?.current) {
    videoRef.current.srcObject = cameraStream;
  }

  screenStream.getTracks().forEach(t => t.stop());
  screenStream = null;
  isScreenSharing = false;
};


export const isScreenSharingActive = () => isScreenSharing;
export const getScreenStream = () => screenStream;

/* ----------------------------------------------------
   SPEAKER DETECTION
---------------------------------------------------- */

export const startSpeakerDetection = (cb) => {
  if (!cameraStream) return () => {};

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  audioContext = new AudioCtx();
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 256;

  microphoneSource = audioContext.createMediaStreamSource(cameraStream);
  microphoneSource.connect(analyser);

  const data = new Uint8Array(analyser.frequencyBinCount);
  audioDetectionEnabled = true;

  speakingInterval = setInterval(() => {
    if (!audioDetectionEnabled) return;
    analyser.getByteFrequencyData(data);
    const volume = Math.sqrt(
      data.reduce((s, v) => s + v * v, 0) / data.length
    );
    const speakingNow = volume > 20;
    if (speakingNow !== isSpeaking) {
      isSpeaking = speakingNow;
      cb?.(isSpeaking, volume);
    }
  }, 100);

  return stopSpeakerDetection;
};

export const stopSpeakerDetection = () => {
  audioDetectionEnabled = false;
  clearInterval(speakingInterval);
  analyser?.disconnect();
  microphoneSource?.disconnect();
  audioContext?.close();
  analyser = microphoneSource = audioContext = null;
  isSpeaking = false;
};

export const getSpeakingState = () => isSpeaking;

/* ----------------------------------------------------
   CLEANUP
---------------------------------------------------- */

export const cleanup = () => {
  if (screenStream) {
    screenStream.getTracks().forEach(t => t.stop());
    screenStream = null;
  }

  if (cameraStream) {
    cameraStream.getTracks().forEach(t => t.stop());
    cameraStream = null;
  }

  closeAllPeers();
  stopSpeakerDetection();
  mediaInitialized = false;
};

/* ----------------------------------------------------
   DEBUG
---------------------------------------------------- */

export const getWebRTCState = () => ({
  camera: !!cameraStream,
  screenSharing: isScreenSharing,
  peers: Object.keys(peers).length,
  speakerDetection: audioDetectionEnabled,
});

/* ----------------------------------------------------
   EXPORT SERVICE
---------------------------------------------------- */

const WebRTCService = {
  initializeMedia,
  getLocalStream,
  isMediaInitialized,

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

  startScreenShare,
  stopScreenShare,
  isScreenSharingActive,
  getScreenStream,

  startSpeakerDetection,
  stopSpeakerDetection,
  getSpeakingState,

  cleanup,
  getWebRTCState,
};

export default WebRTCService;

