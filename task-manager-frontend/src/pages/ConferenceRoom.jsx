import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Chip,
  IconButton,
  Snackbar,
  Tooltip,
  Typography,
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import CallEndIcon from "@mui/icons-material/CallEnd";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import ScreenShareIcon from "@mui/icons-material/ScreenShare";
import StopScreenShareIcon from "@mui/icons-material/StopScreenShare";
import PanToolIcon from "@mui/icons-material/PanTool";
import PanToolAltIcon from "@mui/icons-material/PanToolAlt";
import PeopleIcon from "@mui/icons-material/People";
import RecordVoiceOverIcon from "@mui/icons-material/RecordVoiceOver";
import GridViewIcon from "@mui/icons-material/GridView";
import ViewAgendaIcon from "@mui/icons-material/ViewAgenda";

import { useAuth } from "../context/AuthContext";
import { getSocket } from "../services/socket";
import { joinConference, leaveConference, raiseHand, lowerHand, sendSpeakingStatus } from "../services/conferenceSocket";
import {
  cleanupWebRTC,
  createOffer,
  createPeer,
  getCameraStream,
  getMicEnabled,
  getScreenStream,
  handleAnswer,
  handleIceCandidate,
  handleOffer,
  muteAudio,
  removePeer,
  startAudio,
  startCamera,
  startScreen,
  stopCamera,
  stopScreen,
  unmuteAudio,
} from "../services/webrtc";
import VideoTile from "../components/Conference/VideoTile";
import ParticipantsPanel from "../components/Conference/ParticipantsPanel";
import RaiseHandIndicator from "../components/Conference/RaiseHandIndicator";

const LAYOUTS = {
  GRID: "grid",
  SPEAKER: "speaker",
};

const participantName = (p) => p?.name || p?.userName || "Participant";

export default function ConferenceRoom() {
  const { conferenceId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const socket = getSocket();

  const [participants, setParticipants] = useState([]);
  const [raisedHands, setRaisedHands] = useState([]);
  const [activeSpeaker, setActiveSpeaker] = useState(null);
  const [speakerModeEnabled, setSpeakerModeEnabled] = useState(false);
  const [remoteMedia, setRemoteMedia] = useState({});
  const [participantsPanelOpen, setParticipantsPanelOpen] = useState(true);
  const [layout, setLayout] = useState(LAYOUTS.GRID);
  const [handRaised, setHandRaised] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [screenOn, setScreenOn] = useState(false);
  const [toast, setToast] = useState({ open: false, severity: "info", message: "" });

  const localVideoRef = useRef(null);
  const localScreenRef = useRef(null);
  const remoteAudioElsRef = useRef({});
  const mountedRef = useRef(true);
  const micOnRef = useRef(false);
  const camOnRef = useRef(false);

  const showToast = useCallback((message, severity = "info") => {
    setToast({ open: true, severity, message });
  }, []);

  const mySocketId = socket?.id || null;

  const me = useMemo(
    () => participants.find((p) => p.socketId === mySocketId) || null,
    [participants, mySocketId]
  );

  const isAdminOrManager = useMemo(
    () => Boolean(me && ["admin", "manager"].includes(me.role)),
    [me]
  );

  const screenSharer = useMemo(
    () => participants.find((p) => p.socketId && remoteMedia[p.socketId]?.screenStream) || null,
    [participants, remoteMedia]
  );

  const attachRemoteAudios = useCallback(() => {
    Object.entries(remoteMedia).forEach(([socketId, media]) => {
      const audioStream = media?.audioStream;
      if (!audioStream) return;

      if (!remoteAudioElsRef.current[socketId]) {
        const audio = document.createElement("audio");
        audio.autoplay = true;
        audio.playsInline = true;
        audio.volume = 1;
        remoteAudioElsRef.current[socketId] = audio;
      }

      const audioEl = remoteAudioElsRef.current[socketId];
      if (audioEl.srcObject !== audioStream) {
        audioEl.srcObject = audioStream;
        audioEl.play().catch(() => {});
      }
    });

    Object.keys(remoteAudioElsRef.current).forEach((socketId) => {
      if (!remoteMedia[socketId]?.audioStream) {
        const audioEl = remoteAudioElsRef.current[socketId];
        if (audioEl) {
          audioEl.srcObject = null;
          delete remoteAudioElsRef.current[socketId];
        }
      }
    });
  }, [remoteMedia]);

  useEffect(() => {
    attachRemoteAudios();
  }, [attachRemoteAudios]);

  const applyParticipants = useCallback((incoming) => {
    const unique = [];
    const seen = new Set();

    (incoming || []).forEach((p) => {
      if (!p?.socketId || seen.has(p.socketId)) return;
      seen.add(p.socketId);
      unique.push(p);
    });

    setParticipants(unique);
  }, []);

  const ensurePeerFor = useCallback(
    async (targetSocketId) => {
      if (!socket || !mySocketId || !targetSocketId || targetSocketId === mySocketId) return;
      await createPeer(targetSocketId, socket);

      // deterministic offer initiator to reduce collisions
      if (mySocketId > targetSocketId) {
        await createOffer(targetSocketId, socket);
      }
    },
    [socket, mySocketId]
  );

  const syncPeersFromParticipants = useCallback(
    async (list) => {
      if (!mySocketId) return;
      const others = (list || []).filter((p) => p.socketId && p.socketId !== mySocketId);
      await Promise.all(others.map((p) => ensurePeerFor(p.socketId)));
    },
    [ensurePeerFor, mySocketId]
  );

  const updateLocalVideoRefs = useCallback(() => {
    const camera = getCameraStream();
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = camera || null;
      if (camera) localVideoRef.current.play().catch(() => {});
    }

    const screen = getScreenStream();
    if (localScreenRef.current) {
      localScreenRef.current.srcObject = screen || null;
      if (screen) localScreenRef.current.play().catch(() => {});
    }
  }, []);

  const emitMyMediaState = useCallback(
    (nextMic, nextCam) => {
      if (!socket || !conferenceId) return;
      socket.emit("conference:media-update", {
        conferenceId,
        micOn: Boolean(nextMic),
        camOn: Boolean(nextCam),
      });
    },
    [socket, conferenceId]
  );

  const handleAdminAction = useCallback(
    (action, targetSocketId) => {
      if (!socket || !conferenceId || !targetSocketId) return;
      socket.emit("conference:admin-action", {
        conferenceId,
        action,
        targetSocketId,
      });
    },
    [socket, conferenceId]
  );

  const toggleSpeakerMode = useCallback(() => {
    if (!socket || !conferenceId || !isAdminOrManager) return;
    socket.emit("conference:toggle-speaker-mode", {
      conferenceId,
      enabled: !speakerModeEnabled,
    });
  }, [socket, conferenceId, isAdminOrManager, speakerModeEnabled]);

  const setAsSpeaker = useCallback(
    (targetSocketId) => {
      if (!socket || !conferenceId || !isAdminOrManager || !targetSocketId) return;
      socket.emit("conference:set-speaker", { conferenceId, targetSocketId });
    },
    [socket, conferenceId, isAdminOrManager]
  );

  const leaveRoom = useCallback(
    async (navigateAway = true) => {
      try {
        leaveConference();
        await cleanupWebRTC();
      } finally {
        if (navigateAway) navigate("/teams");
      }
    },
    [navigate]
  );

  useEffect(() => {
    micOnRef.current = micOn;
  }, [micOn]);

  useEffect(() => {
    camOnRef.current = camOn;
  }, [camOn]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Setup conference + socket listeners
  useEffect(() => {
    if (!socket || !conferenceId) {
      showToast("Socket not connected", "error");
      return undefined;
    }

    let cancelled = false;

    const init = async () => {
      try {
        await startAudio();
        if (cancelled || !mountedRef.current) return;

        const enabled = getMicEnabled();
        setMicOn(enabled);
        emitMyMediaState(enabled, false);

        updateLocalVideoRefs();
        joinConference(conferenceId);
      } catch (err) {
        console.error("Conference init failed", err);
        showToast("Could not access microphone", "error");
      }
    };

    const onParticipants = async ({ participants: list }) => {
      applyParticipants(list || []);
      await syncPeersFromParticipants(list || []);
    };

    const onUserJoined = async ({ participant }) => {
      setParticipants((prev) => {
        const merged = [...prev.filter((p) => p.socketId !== participant?.socketId), participant].filter(Boolean);
        return merged;
      });
      if (participant?.socketId) await ensurePeerFor(participant.socketId);
    };

    const onUserLeft = ({ socketId }) => {
      if (!socketId) return;
      setParticipants((prev) => prev.filter((p) => p.socketId !== socketId));
      setRaisedHands((prev) => prev.filter((id) => id !== socketId));
      setRemoteMedia((prev) => {
        const next = { ...prev };
        delete next[socketId];
        return next;
      });
      removePeer(socketId);
    };

    const onMediaUpdate = ({ socketId, micOn: nextMic, camOn: nextCam }) => {
      setParticipants((prev) =>
        prev.map((p) => (p.socketId === socketId ? { ...p, micOn: nextMic, camOn: nextCam } : p))
      );
    };

    const onRemoteMedia = ({ detail }) => {
      if (!detail?.socketId) return;
      setRemoteMedia((prev) => ({
        ...prev,
        [detail.socketId]: {
          audioStream: detail.audioStream,
          cameraStream: detail.cameraStream,
          screenStream: detail.screenStream,
        },
      }));
    };

    const onConferenceState = ({ active, conference }) => {
      if (!active || !conference) return;
      setSpeakerModeEnabled(Boolean(conference.speakerMode?.enabled));
      setActiveSpeaker(conference.speakerMode?.activeSpeaker || null);
    };

    const onConferenceEnded = () => {
      showToast("Conference ended", "info");
      leaveRoom(true);
    };

    const onForceMute = async () => {
      await muteAudio();
      setMicOn(false);
      emitMyMediaState(false, camOnRef.current);
      showToast("You were muted by host", "warning");
    };

    const onForceCameraOff = async () => {
      await stopCamera();
      setCamOn(false);
      emitMyMediaState(micOnRef.current, false);
      updateLocalVideoRefs();
      showToast("Your camera was turned off by host", "warning");
    };

    const onRemovedByAdmin = () => {
      showToast("You were removed from conference", "warning");
      leaveRoom(true);
    };

    const onError = ({ message }) => {
      showToast(message || "Conference error", "error");
    };

    const onOffer = async (payload) => {
      try {
        await handleOffer(payload, socket);
      } catch (err) {
        console.error("handleOffer failed", err);
      }
    };

    const onAnswer = async (payload) => {
      try {
        await handleAnswer(payload);
      } catch (err) {
        console.error("handleAnswer failed", err);
      }
    };

    const onIce = async (payload) => {
      try {
        await handleIceCandidate(payload);
      } catch (err) {
        console.error("handleIceCandidate failed", err);
      }
    };

    socket.on("conference:participants", onParticipants);
    socket.on("conference:user-joined", onUserJoined);
    socket.on("conference:user-left", onUserLeft);
    socket.on("conference:media-update", onMediaUpdate);
    const onHandsUpdated = ({ raisedHands: hands }) => setRaisedHands(hands || []);
    const onActiveSpeaker = ({ socketId }) => setActiveSpeaker(socketId || null);
    const onSpeakerToggled = ({ enabled }) => setSpeakerModeEnabled(Boolean(enabled));

    socket.on("conference:hands-updated", onHandsUpdated);
    socket.on("conference:active-speaker", onActiveSpeaker);
    socket.on("conference:speaker-mode-toggled", onSpeakerToggled);
    socket.on("conference:state", onConferenceState);
    socket.on("conference:ended", onConferenceEnded);
    socket.on("conference:force-mute", onForceMute);
    socket.on("conference:force-camera-off", onForceCameraOff);
    socket.on("conference:removed-by-admin", onRemovedByAdmin);
    socket.on("conference:error", onError);
    socket.on("conference:offer", onOffer);
    socket.on("conference:answer", onAnswer);
    socket.on("conference:ice-candidate", onIce);

    window.addEventListener("webrtc:remote-media", onRemoteMedia);

    init();

    return () => {
      cancelled = true;
      socket.off("conference:participants", onParticipants);
      socket.off("conference:user-joined", onUserJoined);
      socket.off("conference:user-left", onUserLeft);
      socket.off("conference:media-update", onMediaUpdate);
      socket.off("conference:hands-updated", onHandsUpdated);
      socket.off("conference:active-speaker", onActiveSpeaker);
      socket.off("conference:speaker-mode-toggled", onSpeakerToggled);
      socket.off("conference:state", onConferenceState);
      socket.off("conference:ended", onConferenceEnded);
      socket.off("conference:force-mute", onForceMute);
      socket.off("conference:force-camera-off", onForceCameraOff);
      socket.off("conference:removed-by-admin", onRemovedByAdmin);
      socket.off("conference:error", onError);
      socket.off("conference:offer", onOffer);
      socket.off("conference:answer", onAnswer);
      socket.off("conference:ice-candidate", onIce);
      window.removeEventListener("webrtc:remote-media", onRemoteMedia);

      Object.values(remoteAudioElsRef.current).forEach((audioEl) => {
        audioEl.srcObject = null;
      });
      remoteAudioElsRef.current = {};

      leaveConference();
      cleanupWebRTC();
    };
  }, [
    applyParticipants,
    conferenceId,
    emitMyMediaState,
    ensurePeerFor,
    leaveRoom,
    showToast,
    socket,
    syncPeersFromParticipants,
    updateLocalVideoRefs,
  ]);

  const toggleMic = useCallback(async () => {
    const next = !micOn;
    if (next) await unmuteAudio();
    else await muteAudio();
    setMicOn(next);
    emitMyMediaState(next, camOn);
  }, [micOn, camOn, emitMyMediaState]);

  const toggleCam = useCallback(async () => {
    const next = !camOn;
    if (next) await startCamera();
    else await stopCamera();
    setCamOn(next);
    emitMyMediaState(micOn, next);
    updateLocalVideoRefs();
  }, [camOn, emitMyMediaState, micOn, updateLocalVideoRefs]);

  const toggleScreenShare = useCallback(async () => {
    const next = !screenOn;
    if (next) await startScreen();
    else await stopScreen();
    setScreenOn(next);
    updateLocalVideoRefs();
  }, [screenOn, updateLocalVideoRefs]);

  const toggleHand = useCallback(() => {
    if (handRaised) {
      lowerHand();
      setHandRaised(false);
    } else {
      raiseHand();
      setHandRaised(true);
    }
  }, [handRaised]);

  // simple speaking pulse for speaker mode
  useEffect(() => {
    if (!micOn) return undefined;
    const id = setInterval(() => {
      sendSpeakingStatus(micOn);
    }, 1200);
    return () => clearInterval(id);
  }, [micOn]);

  const remoteTiles = useMemo(
    () =>
      participants
        .filter((p) => p.socketId && p.socketId !== mySocketId)
        .map((p) => ({
          ...p,
          media: remoteMedia[p.socketId] || {},
        })),
    [participants, mySocketId, remoteMedia]
  );

  const allTiles = useMemo(() => {
    const localTile = {
      socketId: mySocketId || "local",
      name: user?.name || "You",
      role: me?.role || "member",
      isLocal: true,
      media: {
          media: {
        cameraStream: getCameraStream(),
        screenStream: getScreenStream(),
      },
    };

    return [localTile, ...remoteTiles];
  }, [mySocketId, user?.name, me?.role, remoteTiles]);
  }, [mySocketId, user?.name, me?.role, micOn, camOn, remoteTiles]);

  const activeTileId = activeSpeaker || allTiles[0]?.socketId;

  const gridColumns = allTiles.length <= 1 ? "1fr" : allTiles.length <= 4 ? "repeat(2, 1fr)" : "repeat(3, 1fr)";

  const endConference = useCallback(async () => {
    if (isAdminOrManager) {
      socket?.emit("conference:end", { conferenceId });
    }
    await leaveRoom(true);
  }, [conferenceId, isAdminOrManager, leaveRoom, socket]);

  return (
    <Box sx={{ height: "100vh", display: "flex", bgcolor: "#0b0b0b", color: "white" }}>
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <Box sx={{ px: 2, py: 1.5, borderBottom: "1px solid #1f1f1f", display: "flex", alignItems: "center", gap: 1.5 }}>
          <Chip label={`Participants: ${participants.length || 1}`} size="small" />
          <Chip label={speakerModeEnabled ? "Speaker mode on" : "Speaker mode off"} size="small" color={speakerModeEnabled ? "success" : "default"} />
          {screenSharer && <Chip label={`${participantName(screenSharer)} is sharing`} size="small" color="secondary" />}
          {isAdminOrManager && <Chip label="Host controls enabled" size="small" color="primary" />}
        </Box>

        <Box sx={{ flex: 1, p: 2, overflow: "auto" }}>
          {layout === LAYOUTS.SPEAKER ? (
            <Box sx={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 2, height: "100%" }}>
              <Box sx={{ minHeight: 320 }}>
                {allTiles
                  .filter((t) => t.socketId === activeTileId)
                  .map((tile) => (
                    <VideoTile
                      key={tile.socketId}
                      stream={tile.media.screenStream || tile.media.cameraStream}
                      videoRef={tile.isLocal && tile.media.screenStream ? localScreenRef : tile.isLocal ? localVideoRef : undefined}
                      label={participantName(tile)}
                      isLocal={tile.isLocal}
                      isScreen={Boolean(tile.media.screenStream)}
                      large
                      isActiveSpeaker={tile.socketId === activeSpeaker}
                    >
                      {raisedHands.includes(tile.socketId) && <RaiseHandIndicator label="Hand raised" />}
                    </VideoTile>
                  ))}
              </Box>
              <Box sx={{ display: "grid", gridTemplateRows: "repeat(auto-fill, minmax(140px, 1fr))", gap: 1.5, overflow: "auto" }}>
                {allTiles
                  .filter((t) => t.socketId !== activeTileId)
                  .map((tile) => (
                    <VideoTile
                      key={tile.socketId}
                      stream={tile.media.screenStream || tile.media.cameraStream}
                      label={participantName(tile)}
                      isLocal={tile.isLocal}
                      isScreen={Boolean(tile.media.screenStream)}
                      small
                      isActiveSpeaker={tile.socketId === activeSpeaker}
                    >
                      {raisedHands.includes(tile.socketId) && <RaiseHandIndicator label="Hand raised" />}
                    </VideoTile>
                  ))}
              </Box>
            </Box>
          ) : (
            <Box sx={{ display: "grid", gridTemplateColumns: gridColumns, gap: 2, alignItems: "stretch" }}>
              {allTiles.map((tile) => (
                <VideoTile
                  key={tile.socketId}
                  stream={tile.media.screenStream || tile.media.cameraStream}
                  videoRef={tile.isLocal && tile.media.screenStream ? localScreenRef : tile.isLocal ? localVideoRef : undefined}
                  label={participantName(tile)}
                  isLocal={tile.isLocal}
                  isScreen={Boolean(tile.media.screenStream)}
                  isActiveSpeaker={tile.socketId === activeSpeaker}
                >
                  {raisedHands.includes(tile.socketId) && <RaiseHandIndicator label="Hand raised" />}
                </VideoTile>
              ))}
            </Box>
          )}
        </Box>

        <Box sx={{ borderTop: "1px solid #1f1f1f", p: 1.5 }}>
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
            <Tooltip title={micOn ? "Mute mic" : "Unmute mic"}>
              <IconButton onClick={toggleMic} sx={{ bgcolor: micOn ? "#1f1f1f" : "#b71c1c", color: "white" }}>
                {micOn ? <MicIcon /> : <MicOffIcon />}
              </IconButton>
            </Tooltip>

            <Tooltip title={camOn ? "Turn camera off" : "Turn camera on"}>
              <IconButton onClick={toggleCam} sx={{ bgcolor: camOn ? "#1f1f1f" : "#b71c1c", color: "white" }}>
                {camOn ? <VideocamIcon /> : <VideocamOffIcon />}
              </IconButton>
            </Tooltip>

            <Tooltip title={screenOn ? "Stop screen share" : "Share screen"}>
              <IconButton onClick={toggleScreenShare} sx={{ bgcolor: screenOn ? "#4a148c" : "#1f1f1f", color: "white" }}>
                {screenOn ? <StopScreenShareIcon /> : <ScreenShareIcon />}
              </IconButton>
            </Tooltip>

            <Tooltip title={handRaised ? "Lower hand" : "Raise hand"}>
              <IconButton onClick={toggleHand} sx={{ bgcolor: handRaised ? "#f9a825" : "#1f1f1f", color: "white" }}>
                {handRaised ? <PanToolAltIcon /> : <PanToolIcon />}
              </IconButton>
            </Tooltip>

            <Tooltip title="Participants panel">
              <IconButton
                onClick={() => setParticipantsPanelOpen((v) => !v)}
                sx={{ bgcolor: participantsPanelOpen ? "#1565c0" : "#1f1f1f", color: "white" }}
              >
                <PeopleIcon />
              </IconButton>
            </Tooltip>

            {isAdminOrManager && (
              <>
                <Tooltip title="Toggle speaker mode">
                  <IconButton
                    onClick={toggleSpeakerMode}
                    sx={{ bgcolor: speakerModeEnabled ? "#2e7d32" : "#1f1f1f", color: "white" }}
                  >
                    <RecordVoiceOverIcon />
                  </IconButton>
                </Tooltip>

                <Tooltip title={layout === LAYOUTS.GRID ? "Switch to speaker view" : "Switch to grid view"}>
                  <IconButton
                    onClick={() => setLayout((v) => (v === LAYOUTS.GRID ? LAYOUTS.SPEAKER : LAYOUTS.GRID))}
                    sx={{ bgcolor: "#1f1f1f", color: "white" }}
                  >
                    {layout === LAYOUTS.GRID ? <ViewAgendaIcon /> : <GridViewIcon />}
                  </IconButton>
                </Tooltip>
              </>
            )}

            <Tooltip title={isAdminOrManager ? "End conference" : "Leave conference"}>
              <IconButton onClick={endConference} sx={{ bgcolor: "#d32f2f", color: "white" }}>
                <CallEndIcon />
              </IconButton>
            </Tooltip>
          </Box>

          <Box sx={{ mt: 1, textAlign: "center" }}>
            <Typography variant="caption" color="#bdbdbd">
              {`Mic: ${micOn ? "On" : "Off"} • Camera: ${camOn ? "On" : "Off"} • Screen: ${screenOn ? "Sharing" : "Off"} • Raised hands: ${raisedHands.length}`}
            </Typography>
          </Box>
        </Box>
      </Box>

      {participantsPanelOpen && (
        <ParticipantsPanel
          participants={participants}
          raisedHands={raisedHands}
          isAdminOrManager={isAdminOrManager}
          onAdminAction={handleAdminAction}
          currentSocketId={mySocketId}
          onClose={() => setParticipantsPanelOpen(false)}
          speakerModeEnabled={speakerModeEnabled}
          activeSpeaker={activeSpeaker}
          onSetSpeaker={setAsSpeaker}
        />
      )}

      <Snackbar
        open={toast.open}
        autoHideDuration={3500}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setToast((prev) => ({ ...prev, open: false }))}
          severity={toast.severity}
          sx={{ width: "100%" }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
