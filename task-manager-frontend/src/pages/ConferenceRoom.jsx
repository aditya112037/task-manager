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

  const handleScreenShare = useCallback(async () => {
    try {
      if (getScreenStream()) {
        stopScreen();
        setSharingScreen(false);
        setScreenSharer(null);
        setLayout(LAYOUT.GRID);
      } else {
        await startScreen();
        getPeerIds().forEach(syncPeerTracks);
        setSharingScreen(true);
        setScreenSharer(socket.id);
        setLayout(LAYOUT.PRESENTATION);
      }
      
      socket.emit("conference:screen-share", { 
        active: !!getScreenStream(),
        conferenceId 
      });
      
      forceRender(v => v + 1);
    } catch (error) {
      console.error("Screen share error:", error);
      showNotification("Screen share failed", "error");
    }
  }, [socket, conferenceId, showNotification]);

// Auto-start audio when joining conference
useEffect(() => {
  const shouldInitialize = hasJoinedRef.current && !conferenceEndedRef.current;
  
  if (!shouldInitialize) return;
  
  const initializeMedia = async () => {
    try {
      // Start audio automatically when joining
      if (!getAudioStream()) {
        console.log("🔊 Auto-starting audio for new participant");
        await startAudio();
        unmuteAudio(); // ✅ Ensure it's unmuted
        setMicOn(true);
        
        // Sync with existing peers
        const peerIds = getPeerIds();
        peerIds.forEach(syncPeerTracks);
        
        forceRender(v => v + 1);
      }
    } catch (error) {
      console.warn("Could not auto-start audio:", error);
      // Don't show notification - some users might not have mic permission
    }
  };
  
  // Delay slightly to ensure WebRTC is ready
  const timer = setTimeout(initializeMedia, 1000);
  return () => clearTimeout(timer);
}, []); // Remove hasJoinedRef.current from dependencies

  // Media state sync effect
  useEffect(() => {
    const interval = setInterval(() => {
      const audioActive = !!getAudioStream();
      const cameraActive = !!getCameraStream();
      const screenActive = !!getScreenStream();
      
      if (micOn !== audioActive || camOn !== cameraActive || sharingScreen !== screenActive) {
        setMicOn(audioActive);
        setCamOn(cameraActive);
        setSharingScreen(screenActive);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [micOn, camOn, sharingScreen]);

// Remote audio attachment - FIXED VERSION
useEffect(() => {
  console.log("🎧 Checking remote streams:", Object.keys(remoteStreamsRef.current));
  
  Object.entries(remoteStreamsRef.current).forEach(([socketId, streams]) => {
    const audioStream = streams?.audio;
    
    if (!audioStream || typeof audioStream.getAudioTracks !== 'function') {
      console.log(`❌ No valid audio stream for ${socketId}`);
      return;
    }
    
    const audioTracks = audioStream.getAudioTracks();
    if (audioTracks.length === 0) {
      console.log(`❌ No audio tracks for ${socketId}`);
      return;
    }
    
    console.log(`🎧 Found audio for ${socketId}:`, {
      trackId: audioTracks[0].id,
      enabled: audioTracks[0].enabled,
      readyState: audioTracks[0].readyState
    });
    
    // Get or create audio element
    let audioEl = audioElsRef.current[socketId];
    
    if (!audioEl) {
      console.log(`🎧 CREATING audio element for ${socketId}`);
      audioEl = document.createElement("audio");
      audioEl.id = `remote-audio-${socketId}`;
      audioEl.autoplay = true;
      audioEl.playsInline = true;
      audioEl.muted = false;
      audioEl.volume = 1.0;
      audioEl.style.display = "none";
      
      // Debug event listeners
      audioEl.onloadedmetadata = () => console.log(`🎧 Metadata loaded for ${socketId}`);
      audioEl.oncanplay = () => console.log(`🎧 Can play for ${socketId}`);
      audioEl.onplay = () => console.log(`🎧 Playing for ${socketId}`);
      audioEl.onerror = (e) => console.error(`🎧 Error for ${socketId}:`, e);
      
      document.body.appendChild(audioEl);
      audioElsRef.current[socketId] = audioEl;
    }
    
    // Set the stream
    audioEl.srcObject = audioStream;
    
    // Play it
    audioEl.play().then(() => {
      console.log(`✅ Audio playing for ${socketId}`);
    }).catch(err => {
      console.warn(`⚠️ Auto-play blocked for ${socketId}:`, err.message);
    });
  });
  
  // Clean up
  Object.keys(audioElsRef.current).forEach(socketId => {
    if (!remoteStreamsRef.current[socketId]?.audio) {
      const audioEl = audioElsRef.current[socketId];
      if (audioEl) {
        audioEl.srcObject = null;
        audioEl.remove();
        delete audioElsRef.current[socketId];
      }
    }
  });
  
  console.log("🎧 Audio elements:", Object.keys(audioElsRef.current));
}, [remoteVersion]);

  useEffect(() => {
    if (!socket?.id || !currentUser) return;

    setParticipants(prev => {
      if (prev.some(p => p.socketId === socket.id)) return prev;

      return [
        {
          socketId: socket.id,
          userId: currentUser._id,
          userName: currentUser.name || "You",
          role: "participant",
        },
        ...prev,
      ];
    });
  }, [socket?.id, currentUser]);

  // Mic level monitoring
  useEffect(() => {
    if (!getAudioStream()) {
      setMicLevel(0);
      return;
    }

    try {
      const audioCtx = new AudioContext();
      const analyser = audioCtx.createAnalyser();
      const source = audioCtx.createMediaStreamSource(getAudioStream());

      analyser.fftSize = 256;
      source.connect(analyser);

      const data = new Uint8Array(analyser.frequencyBinCount);
      let raf;

      const loop = () => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setMicLevel(avg);
        raf = requestAnimationFrame(loop);
      };

      loop();

      return () => {
        cancelAnimationFrame(raf);
        source.disconnect();
        analyser.disconnect();
        audioCtx.close();
      };
    } catch (error) {
      console.error("Mic level detection error:", error);
      setMicLevel(0);
    }
  }, [micOn]);

  // Initialize and join conference
  useEffect(() => {
    if (!conferenceId) {
      showNotification("No conference ID provided", "error");
      navigate("/teams");
      return;
    }

    if (hasJoinedRef.current) {
      console.log("Already joined conference, skipping");
      return;
    }

    const initializeConference = async () => {
      if (!socket || !socket.connected) {
        showNotification("Waiting for socket connection...", "info");
        
        let resolved = false;
        const waitForSocket = () => new Promise(resolve => {
          if (socket && socket.connected) {
            resolved = true;
            resolve();
            return;
          }
          
          const onConnect = () => {
            if (resolved) return;
            resolved = true;
            socket.off("connect", onConnect);
            resolve();
          };
          
          socket.on("connect", onConnect);
          
          setTimeout(() => {
            if (resolved) return;
            resolved = true;
            socket.off("connect", onConnect);
            showNotification("Failed to connect to server", "error");
            navigate("/teams");
          }, 5000);
        });
        
        await waitForSocket();
      }

      try {
        hasJoinedRef.current = true;
        const joinSuccess = joinConference(conferenceId);
        if (!joinSuccess) {
          showNotification("Failed to join conference", "error");
        }

        showNotification("Joined conference successfully", "success");
      } catch (error) {
        console.error("Conference initialization error:", error);
        showNotification(`Failed to join: ${error.message}`, "error");
        navigate("/teams");
      }
    };

    initializeConference();

    return () => {
      mountedRef.current = false;
    };
  }, []);

useEffect(() => {
  console.log("🎯 Setting up webrtc:remote-stream listener");
  
  window.addEventListener("webrtc:remote-stream", handleRemoteStream);
  
  return () => {
    console.log("🎯 Removing webrtc:remote-stream listener");
    window.removeEventListener("webrtc:remote-stream", handleRemoteStream);
  };
}, [handleRemoteStream]);

  const handleUserJoined = useCallback(
    async ({ socketId }) => {
      if (!mountedRef.current) return;

      console.log("User joined, creating offer for:", socketId);

      if (socketId === socket.id) return;
      if (!hasJoinedRef.current) return;

      const pc = createPeer(socketId, socket);
      syncPeerTracks(socketId);

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

        console.log("Offer sent to:", socketId);
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
    return () => {
      // ❗ ONLY cleanup if conference actually ended
      if (conferenceEndedRef.current) {
        hardStopAllMedia();
        cleanupConference();
      }
    };
  }, []);

  return (
    <Box sx={{ display: "flex", height: "100vh", background: "#000" }}>
      <Box sx={{ 
        flex: 1, 
        display: "flex", 
        flexDirection: "column",
        p: 2 
      }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Typography color="white" fontWeight={600}>
            Conference Room: {conferenceId}
            {inConference && isAdminOrManager && (
              <Typography component="span" color="#4caf50" fontSize="0.8rem" ml={1}>
                (Admin)
              </Typography>
            )}
          </Typography>
          
          <Box sx={{ display: "flex", gap: 1 }}>
            <Tooltip title="Grid Layout">
              <IconButton
                onClick={() => toggleLayout(LAYOUT.GRID)}
                sx={{
                  background: layout === LAYOUT.GRID ? "#2196f3" : "#424242",
                  color: "white",
                  "&:hover": { background: layout === LAYOUT.GRID ? "#1976d2" : "#303030" },
                }}
              >
                <GroupsIcon />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Speaker Layout">
              <IconButton
                onClick={() => toggleLayout(LAYOUT.SPEAKER)}
                sx={{
                  background: layout === LAYOUT.SPEAKER ? "#2196f3" : "#424242",
                  color: "white",
                  "&:hover": { background: layout === LAYOUT.SPEAKER ? "#1976d2" : "#303030" },
                }}
              >
                <PresentToAllIcon />
              </IconButton>
            </Tooltip>
            
            {participantsLoaded && participants.length > 0 && (
              <Tooltip title={speakerModeEnabled ? "Disable Speaker Mode" : "Enable Speaker Mode"}>
                <IconButton
                  onClick={toggleSpeakerMode}
                  sx={{
                    background: speakerModeEnabled ? "#00e676" : "#424242",
                    color: speakerModeEnabled ? "#000" : "white",
                    "&:hover": {
                      background: speakerModeEnabled ? "#00c853" : "#303030",
                    },
                  }}
                >
                  <VolumeUpIcon />
                </IconButton>
              </Tooltip>
            )}
            
            {inConference && isAdminOrManager && raisedHands.length > 0 && (
              <Tooltip title="Clear All Raised Hands">
                <IconButton
                  onClick={handleClearAllHands}
                  sx={{
                    background: "#ff9800",
                    color: "white",
                    "&:hover": { background: "#f57c00" },
                  }}
                >
                  <ClearAllIcon />
                </IconButton>
              </Tooltip>
            )}
            
            <Tooltip title={participantsPanelOpen ? "Hide Participants" : "Show Participants"}>
              <IconButton
                onClick={toggleParticipantsPanel}
                sx={{
                  background: participantsPanelOpen ? "#2196f3" : "#424242",
                  color: "white",
                  "&:hover": { background: participantsPanelOpen ? "#1976d2" : "#303030" },
                }}
              >
                <PersonIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {speakerModeEnabled && (
          <Box sx={{ 
            mb: 2, 
            p: 1, 
            background: "rgba(0, 230, 118, 0.1)", 
            borderRadius: 1,
            border: "1px solid rgba(0, 230, 118, 0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <VolumeUpIcon sx={{ color: "#00e676", fontSize: 20 }} />
              <Typography color="#00e676" fontWeight={500}>
                Speaker Mode Active
              </Typography>
            </Box>
            
            {activeSpeaker && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography color="white" variant="body2">
                  Current Speaker:
                </Typography>
                <Chip 
                  label={activeSpeakerName}
                  size="small"
                  sx={{ 
                    background: "#00e676", 
                    color: "#000", 
                    fontWeight: "bold" 
                  }}
                />
                {inConference && isAdminOrManager && (
                  <IconButton 
                    size="small" 
                    onClick={clearSpeaker}
                    sx={{ color: "#ff4444" }}
                  >
                    <ClearAllIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>
            )}
            
            {!activeSpeaker && (
              <Typography color="#aaa" variant="body2">
                Waiting for speaker...
              </Typography>
            )}
          </Box>
        )}

        {layout === LAYOUT.PRESENTATION ? (
          <>
            <Box sx={{ flex: 1, mb: 2 }}>
              {screenSharer === socket.id ? (
                <VideoTile
                  stream={getScreenStream() || getCameraStream()}
                  label="You (Presenting)"
                  isScreen={!!getScreenStream()}
                  isLocal
                  isActiveSpeaker={speakerModeEnabled && activeSpeaker === socket.id}
                />
              ) : screenSharer && getRemoteScreenStream(screenSharer) ? (
                <VideoTile
                  stream={getRemoteScreenStream(screenSharer)}
                  label={`${participants.find(p => p.socketId === screenSharer)?.userName || 'Presenter'} (Presenting)`}
                  isScreen
                  isActiveSpeaker={speakerModeEnabled && activeSpeaker === screenSharer}
                />
              ) : (
                <VideoTile
                  stream={getCameraStream()}
                  label="No one is presenting"
                  isActiveSpeaker={speakerModeEnabled && activeSpeaker === socket.id}
                />
              )}
            </Box>

            <Box sx={{ display: "flex", gap: 2, overflowX: "auto", height: "200px" }}>
              {allCameraStreams
                .filter(([socketId]) => socketId !== screenSharer)
                .map(([socketId, stream]) => {
                  const participant = participants.find(p => p.socketId === socketId);
                  const userName = participant?.userName || `User ${socketId.slice(0, 4)}`;
                  
                  return (
                    <Box key={socketId} sx={{ position: "relative" }}>
                      <VideoTile 
                        stream={stream} 
                        label={userName} 
                        small
                        isActiveSpeaker={speakerModeEnabled && activeSpeaker === socketId}
                      />
                      {inConference && isAdminOrManager && socketId !== socket.id && (
                        <IconButton
                          size="small"
                          onClick={(e) => handleOpenAdminMenu(e, socketId)}
                          sx={{
                            position: "absolute",
                            top: 4,
                            right: 4,
                            background: "rgba(0,0,0,0.7)",
                            color: "white",
                            "&:hover": { background: "rgba(0,0,0,0.9)" },
                          }}
                        >
                          <MoreVertIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  );
                })}
            </Box>
          </>
        ) : layout === LAYOUT.SPEAKER ? (
          <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            {activeSpeaker && (
              <Box sx={{ flex: 2, minHeight: "60%" }}>
                {activeSpeaker === socket.id ? (
                  <VideoTile 
                    stream={getCameraStream()}
                    label="You (Speaking)"
                    isLocal
                    isActiveSpeaker={true}
                    large
                  >
                    {handRaised && <RaiseHandIndicator label="Your Hand is Raised" />}
                  </VideoTile>
                ) : (
                  allCameraStreams
                    .filter(([socketId]) => socketId === activeSpeaker)
                    .map(([socketId, stream]) => {
                      const participant = participants.find(p => p.socketId === socketId);
                      const userName = participant?.userName || `User ${socketId.slice(0, 4)}`;
                      
                      return (
                        <VideoTile 
                          key={socketId}
                          stream={stream} 
                          label={`${userName} (Speaking)`}
                          isActiveSpeaker={true}
                          large
                        />
                      );
                    })
                )}
              </Box>
            )}
            
            <Box sx={{ 
              flex: 1, 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 1
            }}>
              {activeSpeaker !== socket.id && (
                <Box sx={{ position: "relative" }}>
                  <VideoTile 
                    stream={getCameraStream()}
                    label="You"
                    isLocal
                    small
                    isActiveSpeaker={false}
                  />
                </Box>
              )}
              
              {allCameraStreams
                .filter(([socketId]) => socketId !== activeSpeaker)
                .map(([socketId, stream]) => {
                  const participant = participants.find(p => p.socketId === socketId);
                  const userName = participant?.userName || `User ${socketId.slice(0, 4)}`;
                  
                  return (
                    <Box key={socketId} sx={{ position: "relative" }}>
                      <VideoTile 
                        stream={stream} 
                        label={userName}
                        small
                        isActiveSpeaker={false}
                      />
                      
                      {inConference && isAdminOrManager && socketId !== socket.id && (
                        <IconButton
                          size="small"
                          onClick={(e) => handleOpenAdminMenu(e, socketId)}
                          sx={{
                            position: "absolute",
                            top: 4,
                            right: 4,
                            background: "rgba(0,0,0,0.7)",
                            color: "white",
                            "&:hover": { background: "rgba(0,0,0,0.9)" },
                          }}
                        >
                          <MoreVertIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  );
                })}
            </Box>
          </Box>
        ) : (
          <Box sx={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 2,
            overflow: "auto",
          }}>
            <Box sx={{ position: "relative" }}>
              <VideoTile 
                stream={getCameraStream()}
                label="You"
                isLocal
                isActiveSpeaker={speakerModeEnabled && activeSpeaker === socket.id}
              >
                {handRaised && <RaiseHandIndicator label="Your Hand is Raised" />}
              </VideoTile>
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
