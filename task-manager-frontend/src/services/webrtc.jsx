/* ====================================================
   WebRTC service (clean rewrite)
   - mic = track.enabled switch (no stream destroy)
   - camera/screen independent
   - stable peer lifecycle
==================================================== */

const peers = new Map(); // socketId -> { pc, socket, senders: {audio,camera,screen}, makingOffer }

let audioStream = null;
let cameraStream = null;
let screenStream = null;

const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];

const uniqueLiveTracks = (tracks) => {
  const seen = new Set();
  return tracks.filter((track) => {
    if (!track || track.readyState !== "live") return false;
    if (seen.has(track.id)) return false;
    seen.add(track.id);
    return true;
  });
};

const emitRemoteMediaUpdate = (socketId) => {
  const peer = peers.get(socketId);
  if (!peer) return;

  const receivers = peer.pc.getReceivers();
  const audioTracks = [];
  const cameraTracks = [];
  const screenTracks = [];

  receivers.forEach((receiver) => {
    const track = receiver.track;
    if (!track) return;

    if (track.kind === "audio") {
      audioTracks.push(track);
      return;
    }

    if (track.kind === "video") {
      const isScreen =
        track.label?.toLowerCase().includes("screen") ||
        track.label?.toLowerCase().includes("window") ||
        track.getSettings?.().displaySurface;

      if (isScreen) screenTracks.push(track);
      else cameraTracks.push(track);
    }
  });

  // Guard against renegotiation artifacts that can leave multiple live
  // remote audio tracks for one peer and cause audible echo/doubling.
  const liveAudioTracks = uniqueLiveTracks(audioTracks).slice(0, 1);
  const liveCameraTracks = uniqueLiveTracks(cameraTracks);
  const liveScreenTracks = uniqueLiveTracks(screenTracks);

  window.dispatchEvent(
    new CustomEvent("webrtc:remote-media", {
      detail: {
        socketId,
        audioStream: liveAudioTracks.length ? new MediaStream(liveAudioTracks) : null,
        cameraStream: liveCameraTracks.length ? new MediaStream(liveCameraTracks) : null,
        screenStream: liveScreenTracks.length ? new MediaStream(liveScreenTracks) : null,
      },
    })
  );
};

const createPeerConnection = (socketId, socket) => {
  const pc = new RTCPeerConnection({
    iceServers: ICE_SERVERS,
    sdpSemantics: "unified-plan",
  });

  pc.onicecandidate = (e) => {
    if (!e.candidate) return;
    socket.emit("conference:ice-candidate", {
      to: socketId,
      candidate: e.candidate,
    });
  };

  pc.ontrack = () => {
    emitRemoteMediaUpdate(socketId);
  };

  pc.onconnectionstatechange = () => {
    window.dispatchEvent(
      new CustomEvent("webrtc:peer-state", {
        detail: {
          socketId,
          connectionState: pc.connectionState,
          iceConnectionState: pc.iceConnectionState,
          signalingState: pc.signalingState,
        },
      })
    );

    if (["failed", "closed", "disconnected"].includes(pc.connectionState)) {
      emitRemoteMediaUpdate(socketId);
    }
  };

  return pc;
};

const getOrCreatePeer = (socketId, socket) => {
  const existing = peers.get(socketId);
  if (existing) return existing;

  const pc = createPeerConnection(socketId, socket);
  const peer = {
    pc,
    socket,
    makingOffer: false,
    senders: {
      audio: null,
      camera: null,
      screen: null,
    },
  };
  peers.set(socketId, peer);
  return peer;
};

const renegotiatePeer = async (socketId) => {
  const peer = peers.get(socketId);
  if (!peer || !peer.socket) return;
  if (peer.makingOffer) return;
  if (peer.pc.signalingState !== "stable") return;

  try {
    peer.makingOffer = true;
    const offer = await peer.pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });
    await peer.pc.setLocalDescription(offer);

    peer.socket.emit("conference:offer", {
      to: socketId,
      offer,
    });
  } catch {
    // ignore renegotiation races
  } finally {
    peer.makingOffer = false;
  }
};

const renegotiateAllPeers = async () => {
  const ids = Array.from(peers.keys());
  await Promise.all(ids.map((id) => renegotiatePeer(id)));
};

const upsertSender = async (peer, key, track, stream) => {
  const existing = peer.senders[key];

  if (!track) {
    if (existing) {
      try {
        peer.pc.removeTrack(existing);
      } catch {
        // ignore stale sender removal errors
      }
      peer.senders[key] = null;
    }
    return;
  }

  if (existing) {
    await existing.replaceTrack(track);
    return;
  }

  peer.senders[key] = peer.pc.addTrack(track, stream);
};

export const syncPeerTracks = async (socketId) => {
  const peer = peers.get(socketId);
  if (!peer) return;

  const audioTrack = audioStream?.getAudioTracks?.()[0] || null;
  const cameraTrack = cameraStream?.getVideoTracks?.()[0] || null;
  const screenTrack = screenStream?.getVideoTracks?.()[0] || null;

  await upsertSender(peer, "audio", audioTrack, audioStream);
  await upsertSender(peer, "camera", cameraTrack, cameraStream);
  await upsertSender(peer, "screen", screenTrack, screenStream);
};

export const syncAllPeerTracks = async () => {
  const ids = Array.from(peers.keys());
  await Promise.all(ids.map((id) => syncPeerTracks(id)));
};

export const createPeer = async (socketId, socket) => {
  const peer = getOrCreatePeer(socketId, socket);
  await syncPeerTracks(socketId);
  return peer.pc;
};

export const createOffer = async (socketId, socket) => {
  const peer = getOrCreatePeer(socketId, socket);
  await syncPeerTracks(socketId);

  const offer = await peer.pc.createOffer({
    offerToReceiveAudio: true,
    offerToReceiveVideo: true,
  });
  await peer.pc.setLocalDescription(offer);

  socket.emit("conference:offer", {
    to: socketId,
    offer,
  });
};

export const handleOffer = async ({ from, offer }, socket) => {
  const peer = getOrCreatePeer(from, socket);

  if (peer.pc.signalingState !== "stable") {
    await Promise.allSettled([
      peer.pc.setLocalDescription({ type: "rollback" }),
      peer.pc.setRemoteDescription(offer),
    ]);
  } else {
    await peer.pc.setRemoteDescription(offer);
  }

  await syncPeerTracks(from);
  const answer = await peer.pc.createAnswer();
  await peer.pc.setLocalDescription(answer);

  socket.emit("conference:answer", {
    to: from,
    answer,
  });
};

export const handleAnswer = async ({ from, answer }) => {
  const peer = peers.get(from);
  if (!peer) return;
  if (peer.pc.signalingState === "have-local-offer") {
    await peer.pc.setRemoteDescription(answer);
  }
};

export const handleIceCandidate = async ({ from, candidate }) => {
  const peer = peers.get(from);
  if (!peer || !candidate) return;
  try {
    await peer.pc.addIceCandidate(candidate);
  } catch {
    // ignore race candidates
  }
};

export const removePeer = (socketId) => {
  const peer = peers.get(socketId);
  if (!peer) return;

  try {
    peer.pc.getSenders().forEach((sender) => {
      try {
        peer.pc.removeTrack(sender);
      } catch {
        // ignore
      }
    });
    peer.pc.close();
  } catch {
    // ignore
  }

  peers.delete(socketId);

  window.dispatchEvent(
    new CustomEvent("webrtc:remote-media", {
      detail: {
        socketId,
        audioStream: null,
        cameraStream: null,
        screenStream: null,
      },
    })
  );
};

export const closeAllPeers = () => {
  Array.from(peers.keys()).forEach(removePeer);
};

export const startAudio = async () => {
  if (audioStream) return audioStream;

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      channelCount: 1,
      sampleRate: 48000,
      sampleSize: 16,
    },
  });

  const track = stream.getAudioTracks()[0];
  if (track) {
    track.enabled = true;
    try {
      await track.applyConstraints({
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      });
    } catch {
      // Some browsers do not allow re-applying these constraints.
    }
  }

  audioStream = stream;
  await syncAllPeerTracks();
  await renegotiateAllPeers();
  return audioStream;
};

export const setMicEnabled = async (enabled) => {
  if (!audioStream) {
    if (!enabled) return false;
    await startAudio();
  }

  const track = audioStream?.getAudioTracks?.()[0];
  if (!track) return false;

  track.enabled = Boolean(enabled);
  return track.enabled;
};

export const muteAudio = () => setMicEnabled(false);
export const unmuteAudio = () => setMicEnabled(true);

export const destroyAudio = async () => {
  if (!audioStream) return;
  audioStream.getTracks().forEach((t) => t.stop());
  audioStream = null;
  await syncAllPeerTracks();
  await renegotiateAllPeers();
};

export const startCamera = async () => {
  if (cameraStream) return cameraStream;

  cameraStream = await navigator.mediaDevices.getUserMedia({
    video: {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 24, max: 30 },
    },
    audio: false,
  });

  await syncAllPeerTracks();
  await renegotiateAllPeers();
  return cameraStream;
};

export const stopCamera = async () => {
  if (!cameraStream) return;
  cameraStream.getTracks().forEach((t) => t.stop());
  cameraStream = null;
  await syncAllPeerTracks();
  await renegotiateAllPeers();
};

export const startScreen = async () => {
  if (screenStream) return screenStream;

  screenStream = await navigator.mediaDevices.getDisplayMedia({
    video: {
      frameRate: { ideal: 24, max: 30 },
    },
    audio: false,
  });

  const screenTrack = screenStream.getVideoTracks()[0];
  if (screenTrack) {
    screenTrack.onended = () => {
      stopScreen();
    };
  }

  await syncAllPeerTracks();
  await renegotiateAllPeers();
  return screenStream;
};

export const stopScreen = async () => {
  if (!screenStream) return;
  screenStream.getTracks().forEach((t) => t.stop());
  screenStream = null;
  await syncAllPeerTracks();
  await renegotiateAllPeers();
};

export const getAudioStream = () => audioStream;
export const getCameraStream = () => cameraStream;
export const getScreenStream = () => screenStream;
export const getPeerIds = () => Array.from(peers.keys());

export const getMicEnabled = () => {
  const track = audioStream?.getAudioTracks?.()[0];
  return Boolean(track?.enabled);
};

export const cleanupWebRTC = async () => {
  closeAllPeers();
  await stopScreen();
  await stopCamera();
  await destroyAudio();
};
