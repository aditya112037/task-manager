import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { 
  Box, 
  Typography, 
  IconButton, 
  Tooltip, 
  Menu, 
  MenuItem, 
  ListItemIcon,
  Divider,
  Chip,
  Snackbar,
  Alert
} from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import PanToolIcon from "@mui/icons-material/PanTool";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import HandshakeIcon from "@mui/icons-material/Handshake";
import PersonRemoveIcon from "@mui/icons-material/PersonRemove";
import GroupsIcon from "@mui/icons-material/Groups";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import MicExternalOnIcon from "@mui/icons-material/MicExternalOn";
import { 
  raiseHand, 
  lowerHand, 
  cleanupConference,
  joinConference,
} from "../services/conferenceSocket";
import RaiseHandIndicator from "../components/Conference/RaiseHandIndicator";
import ParticipantsPanel from "../components/Conference/ParticipantsPanel";
import CallEndIcon from "@mui/icons-material/CallEnd";
import MicIcon from "@mui/icons-material/Mic";
import ScreenShareIcon from "@mui/icons-material/ScreenShare";
import StopScreenShareIcon from "@mui/icons-material/StopScreenShare";
import ClearAllIcon from "@mui/icons-material/ClearAll";
import PersonIcon from "@mui/icons-material/Person";
import PresentToAllIcon from "@mui/icons-material/PresentToAll";
import { getSocket } from "../services/socket";
import {
  createPeer,
  removePeer,
  startAudio,
  stopAudio,
  startCamera,
  stopCamera,
  startScreen,
  stopScreen,
  syncPeerTracks,
  getCameraStream,
  getScreenStream,
  getPeerIds,
  getAudioStream,
} from "../services/webrtc";
import VideoTile from "../components/Conference/VideoTile";
import { useAuth } from "../context/AuthContext";

const LAYOUT = {
  GRID: "grid",
  PRESENTATION: "presentation",
  SPEAKER: "speaker",
};

export default function ConferenceRoom() {
  const { conferenceId } = useParams();
  const navigate = useNavigate();
  const socket = getSocket();
  const { user: currentUser } = useAuth();
  const audioElsRef = useRef({});
  const [adminMenuAnchor, setAdminMenuAnchor] = useState(null);
  const [selectedParticipantId, setSelectedParticipantId] = useState(null);
  const [participantsPanelOpen, setParticipantsPanelOpen] = useState(true);

  const remoteStreamsRef = useRef({});
  const [, forceRender] = useState(0);// { socketId: { camera?: MediaStream, screen?: MediaStream } }
  const [layout, setLayout] = useState(LAYOUT.GRID);
  const [screenSharer, setScreenSharer] = useState(null); // socketId of who's sharing screen
  const [raisedHands, setRaisedHands] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [handRaised, setHandRaised] = useState(false);
  const [micOn, setMicOn] = useState(() => !!getAudioStream());
  const [camOn, setCamOn] = useState(false);  
  const camOnRef = useRef(camOn);
  const [sharingScreen, setSharingScreen] = useState(false);
  const [activeSpeaker, setActiveSpeaker] = useState(null);
  const [speakerModeEnabled, setSpeakerModeEnabled] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: "", severity: "info" });

  const [micLevel, setMicLevel] = useState(0);
  const mountedRef = useRef(true);
  const hasJoinedRef = useRef(false);
  const conferenceEndedRef = useRef(false);

const myParticipant = useMemo(() => {
  if (!socket?.id || !participants.length) return null;
  return participants.find(p => p.socketId === socket.id);
}, [participants, socket?.id]);


const isAdminOrManager = Boolean(
  myParticipant && (myParticipant.role === "admin" || myParticipant.role === "manager")
);


  const showNotification = useCallback((message, severity = "info") => {
    setNotification({ open: true, message, severity });
  }, []);

  const leaveAndCleanupLocal = useCallback(() => {
    stopCamera();
    stopAudio();
    if (sharingScreen) {
      stopScreen();
    }
    socket.emit("conference:leave");
    cleanupConference();
    navigate(-1);
  }, [socket, navigate, sharingScreen]);

  const handleConferenceEnded = useCallback(() => {
    if (conferenceEndedRef.current) return;
    
    conferenceEndedRef.current = true;
    hasJoinedRef.current = false;
    cleanupConference();
    showNotification("Conference has ended", "info");
    navigate("/teams");
  }, [navigate, showNotification]);

const handleToggleMic = useCallback(async () => {
  if (speakerModeEnabled && activeSpeaker !== socket.id && !isAdminOrManager) {
    showNotification("Only the active speaker can unmute", "warning");
    return;
  }

  try {
    if (getAudioStream()) {
      stopAudio();
      setMicOn(false);
    } else {
      await startAudio();
      getPeerIds().forEach(syncPeerTracks);
      setMicOn(true);
    }

    socket.emit("conference:media-update", {
      conferenceId,
      micOn: !getAudioStream(),
      camOn,
    });
  } catch (err) {
    console.error(err);
    showNotification("Microphone error", "error");
  }
}, [
  speakerModeEnabled,
  activeSpeaker,
  isAdminOrManager,
  camOn,
  conferenceId,
  socket,
  showNotification,
]);


const handleToggleCam = useCallback(async () => {
  try {
    if (camOn) {
      stopCamera();
      setCamOn(false);
    } else {
      const stream = await startCamera();
      if (!stream) return;
      // Sync tracks with all peers
      getPeerIds().forEach(syncPeerTracks);
      setCamOn(true);
    }
    
    socket.emit("conference:media-update", {
      conferenceId,
      camOn: !camOn,
      micOn,
    });
  } catch (error) {
    console.error("Failed to toggle camera:", error);
    showNotification("Failed to toggle camera", "error");
  }
}, [camOn, micOn, conferenceId, socket, showNotification]);

  const handleRaiseHand = useCallback(() => {
    if (!handRaised) {
      raiseHand();
    } else {
      lowerHand();
    }
    setHandRaised(v => !v);
  }, [handRaised]);

  const handleScreenShare = useCallback(async () => {
    try {
      if (!sharingScreen) {
        await startScreen();
        
        // ✅ ISSUE 3: Sync with all peers, not just streams
        getPeerIds().forEach(syncPeerTracks);
        
        // ✅ ISSUE 5: Notify server about screen share
        socket.emit("conference:screen-share", { 
          active: true,
          conferenceId 
        });
        
        setSharingScreen(true);
        setLayout(LAYOUT.PRESENTATION);
      } else {
        stopScreen();
        
        // ✅ ISSUE 5: Notify server about screen share stop
        socket.emit("conference:screen-share", { 
          active: false,
          conferenceId 
        });
        
        setSharingScreen(false);
        setScreenSharer(null);
        setLayout(LAYOUT.GRID);
      }
    } catch (error) {
      console.error("Screen share error:", error);
      showNotification("Screen share failed", "error");
    }
  }, [sharingScreen, socket, conferenceId, showNotification]);

  useEffect(() => {
  forceRender(v => v + 1);
}, [micOn, camOn, sharingScreen]);


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
        // ✅ Join conference FIRST (Zoom-style)
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
      if (hasJoinedRef.current && !conferenceEndedRef.current) {
        console.log("Component unmounting, cleaning up conference");
        cleanupConference();
      }
    };
  }, [conferenceId, socket, navigate, showNotification]);

  useEffect(() => {
    micOnRef.current = micOn;
    camOnRef.current = camOn;
  }, [micOn, camOn]);

useEffect(() => {
  Object.entries(remoteStreamsRef.current).forEach(([socketId, streams]) => {
    if (!streams?.audio) return;

    if (!audioElsRef.current[socketId]) {
      const audioEl = document.createElement("audio");
      audioEl.autoplay = true;
      audioEl.playsInline = true;
      audioEl.srcObject = streams.audio;
      document.body.appendChild(audioEl);
      audioElsRef.current[socketId] = audioEl;
    }
  });
}, [participants.length]);

 
useEffect(() => {
  if (!micOn || !getAudioStream()) {
    setMicLevel(0);
    return;
  }

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
}, [micOn]);


  // ✅ ISSUE 2: Updated remote stream handler
  useEffect(() => {
const handler = (e) => {
  const { socketId, kind, stream } = e.detail;

  const existing = remoteStreamsRef.current[socketId] || {};
  existing[kind] = stream;

  remoteStreamsRef.current[socketId] = existing;

  // force a light re-render (NO streams in state)
  forceRender(v => v + 1);
};

    window.addEventListener("webrtc:remote-stream", handler);
    return () => window.removeEventListener("webrtc:remote-stream", handler);
  }, []);

  const handleUserJoined = useCallback(
    async ({ socketId }) => {
      if (!mountedRef.current) return;

      console.log("User joined, creating offer for:", socketId);

      // 🚫 DO NOT offer to yourself
      if (socketId === socket.id) return;

      // ✅ Only if I was already in the room
      if (!hasJoinedRef.current) return;

      // 1️⃣ Create peer
      const pc = createPeer(socketId, socket);

      // ✅ Sync tracks with this peer
      syncPeerTracks(socketId);

      // 2️⃣ Create offer
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
        console.error("Offer creation failed:", err);
      }
    },
    [socket]
  );



  const handleOffer = useCallback(
    async ({ from, offer }) => {
      if (!mountedRef.current) return;

      console.log("Received offer from:", from);

      const pc = createPeer(from, socket);

      try {
        await pc.setRemoteDescription(offer);
        
        // ✅ Sync tracks with this peer
        syncPeerTracks(from);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit("conference:answer", {
          to: from,
          answer,
        });

        console.log("Answer sent to:", from);
      } catch (err) {
        console.error("Error handling offer:", err);
      }
    },
    [socket]
  );

  const handleAnswer = useCallback(async ({ from, answer }) => {
    if (!mountedRef.current) return;
    
    console.log("Received answer from:", from);
    
    const pc = createPeer(from, socket);
    try {
      await pc.setRemoteDescription(answer);
    } catch (error) {
      console.error("Error handling answer:", error);
    }
  }, [socket]);

  const handleIceCandidate = useCallback(({ from, candidate }) => {
    if (!mountedRef.current) return;
    
    const pc = createPeer(from, socket);
    try {
      pc.addIceCandidate(candidate);
    } catch (error) {
      console.error("Error adding ICE candidate:", error);
    }
  }, [socket]);

  const handleUserLeft = useCallback(({ socketId, userId }) => {
    if (!mountedRef.current) return;
    
    console.log("User left:", socketId);
    
    removePeer(socketId);
    delete remoteStreamsRef.current[socketId];
    forceRender(v => v + 1);
    
    if (screenSharer === socketId) {
      setScreenSharer(null);
      setLayout(LAYOUT.GRID);
    }
    
    if (activeSpeaker === socketId) {
      console.log("Active speaker left, clearing speaker");
      setActiveSpeaker(null);
    }

    const audioEl = audioElsRef.current[socketId];
if (audioEl) {
  audioEl.srcObject = null;
  audioEl.remove();
  delete audioElsRef.current[socketId];
}
  }, [activeSpeaker, screenSharer]);

  // ✅ ISSUE 5: Handle screen share updates from others
  const handleScreenShareUpdate = useCallback(({ socketId, active }) => {
    if (!mountedRef.current) return;
    
    console.log("Screen share update:", socketId, active);
    
    if (active) {
      setScreenSharer(socketId);
      setLayout(LAYOUT.PRESENTATION);
    } else {
      if (screenSharer === socketId) {
        setScreenSharer(null);
        setLayout(LAYOUT.GRID);
      }
    }
  }, [screenSharer]);

  useEffect(() => {
    mountedRef.current = true;
    const mounted = () => mountedRef.current;

    const handleParticipantsUpdate = ({ participants }) => {
      if (!mounted()) return;
      setParticipants(participants || []);
    };

    const handleHandsUpdated = ({ raisedHands }) => {
      if (!mounted()) return;
      setRaisedHands(raisedHands);
    };

    const handleActiveSpeakerUpdate = ({ socketId }) => {
      if (!mounted()) return;
      console.log("Active speaker updated:", socketId);
      setActiveSpeaker(socketId);
      
      if (socketId === socket.id) {
        showNotification("You are now the active speaker", "success");
      }
    };

    const handleSpeakerModeToggled = ({ enabled }) => {
      if (!mounted()) return;
      console.log("Speaker mode toggled:", enabled);
      setSpeakerModeEnabled(enabled);
      
      if (!enabled) {
        setActiveSpeaker(null);
      }
      
      showNotification(`Speaker mode ${enabled ? "enabled" : "disabled"}`, "info");
    };

    const handleSpeakerAssigned = ({ socketId }) => {
      if (!mounted()) return;
      console.log("Speaker assigned by admin:", socketId);
      setActiveSpeaker(socketId);
      
      if (socketId === socket.id) {
        showNotification("You have been assigned as speaker by admin", "success");
      }
    };

const handleForceMute = () => {
  stopAudio();
  setMicOn(false);

  socket.emit("conference:media-update", {
    conferenceId,
    micOn: false,
  });

  showNotification("Admin muted your microphone", "warning");
};


    const handleForceCameraOff = () => {
      if (!mounted()) return;
      console.log("Admin turned off camera");
      stopCamera();
      setCamOn(false);
      showNotification("Admin has turned off your camera", "warning");
    };

    const handleRemovedByAdmin = () => {
      if (!mounted()) return;
      console.log("Removed by admin");
      leaveAndCleanupLocal();
      showNotification("You have been removed from the conference by the admin", "error");
    };

    // Setup socket listeners
    socket.on("conference:user-joined", handleUserJoined);
    socket.on("conference:offer", handleOffer);
    socket.on("conference:answer", handleAnswer);
    socket.on("conference:ice-candidate", handleIceCandidate);
    socket.on("conference:user-left", handleUserLeft);
    socket.on("conference:participants", handleParticipantsUpdate);
    socket.on("conference:hands-updated", handleHandsUpdated);
    socket.on("conference:ended", handleConferenceEnded);
    socket.on("conference:active-speaker", handleActiveSpeakerUpdate);
    socket.on("conference:speaker-mode-toggled", handleSpeakerModeToggled);
    socket.on("conference:speaker-assigned", handleSpeakerAssigned);
    socket.on("conference:force-mute", handleForceMute);
    socket.on("conference:force-camera-off", handleForceCameraOff);
    socket.on("conference:removed-by-admin", handleRemovedByAdmin);
    socket.on("conference:screen-share-update", handleScreenShareUpdate);
    
    return () => {
      mountedRef.current = false;      
      
      socket.off("conference:user-joined", handleUserJoined);
      socket.off("conference:offer", handleOffer);
      socket.off("conference:answer", handleAnswer);
      socket.off("conference:ice-candidate", handleIceCandidate);
      socket.off("conference:user-left", handleUserLeft);
      socket.off("conference:participants", handleParticipantsUpdate);
      socket.off("conference:hands-updated", handleHandsUpdated);
      socket.off("conference:ended", handleConferenceEnded);
      socket.off("conference:active-speaker", handleActiveSpeakerUpdate);
      socket.off("conference:speaker-mode-toggled", handleSpeakerModeToggled);
      socket.off("conference:speaker-assigned", handleSpeakerAssigned);
      socket.off("conference:force-mute", handleForceMute);
      socket.off("conference:force-camera-off", handleForceCameraOff);
      socket.off("conference:removed-by-admin", handleRemovedByAdmin);
      socket.off("conference:screen-share-update", handleScreenShareUpdate);
    };
  }, [
    conferenceId, 
    currentUser, 
    socket, 
    showNotification, 
    leaveAndCleanupLocal, 
    handleConferenceEnded,
    handleUserJoined, 
    handleOffer, 
    handleAnswer, 
    handleIceCandidate, 
    handleUserLeft,
    handleScreenShareUpdate,
  ]);
  
useEffect(() => {
  // Cleanup audio elements when participants change
  return () => {
    Object.values(audioElsRef.current).forEach(audioEl => {
      if (audioEl && audioEl.parentNode) {
        audioEl.srcObject = null;
        audioEl.remove();
      }
    });
    audioElsRef.current = {};
  };
}, []);

  // Admin override effect for speaker mode
  useEffect(() => {
    if (!speakerModeEnabled || !activeSpeaker || !myParticipant) return;
    
    const shouldSpeak = activeSpeaker === socket.id || isAdminOrManager;
    
    if (shouldSpeak && !micOn) {
      startAudio().then(() => setMicOn(true)).catch(console.error);
    } else if (!shouldSpeak && getAudioStream()) {
      stopAudio();
      setMicOn(false);
    }
  }, [activeSpeaker, speakerModeEnabled, myParticipant, socket.id, isAdminOrManager, micOn]);

  const handleAdminAction = useCallback((action, targetSocketId) => {
    const socket = getSocket();

    if (!socket || !socket.connected) {
      console.warn("Socket not connected, admin action blocked");
      return;
    }

    socket.emit("conference:admin-action", {
      action,
      targetSocketId,
      conferenceId,
    });
  }, [conferenceId]);

  const handleClearAllHands = useCallback(() => {
    const socket = getSocket();
    if (!socket || !socket.connected) return;

    socket.emit("conference:admin-action", {
      action: "clear-hands",
      conferenceId,
    });
  }, [conferenceId]);

  const handleOpenAdminMenu = useCallback((event, participantId) => {
    setAdminMenuAnchor(event.currentTarget);
    setSelectedParticipantId(participantId);
  }, []);

  const handleCloseAdminMenu = useCallback(() => {
    setAdminMenuAnchor(null);
    setSelectedParticipantId(null);
  }, []);

  const toggleParticipantsPanel = useCallback(() => {
    setParticipantsPanelOpen(!participantsPanelOpen);
  }, [participantsPanelOpen]);

  const toggleSpeakerMode = useCallback(() => {
    const newMode = !speakerModeEnabled;
    setSpeakerModeEnabled(newMode);
    
    if (!newMode) {
      setActiveSpeaker(null);
      if (!micOn) {
        startAudio().then(() => setMicOn(true)).catch(console.error);
      }
    }
    
    socket.emit("conference:toggle-speaker-mode", {
      conferenceId,
      enabled: newMode,
    });
    
    showNotification(`Speaker mode ${newMode ? "enabled" : "disabled"}`, "info");
  }, [speakerModeEnabled, micOn, conferenceId, socket, showNotification]);

  const setAsSpeaker = useCallback((socketId) => {
    socket.emit("conference:set-speaker", {
      conferenceId,
      targetSocketId: socketId,
    });
    setActiveSpeaker(socketId);
    showNotification(`Set as active speaker`, "success");
  }, [conferenceId, socket, showNotification]);

  const clearSpeaker = useCallback(() => {
    setActiveSpeaker(null);
    socket.emit("conference:clear-speaker", { conferenceId });
    showNotification("Speaker cleared", "info");
  }, [conferenceId, socket, showNotification]);

  const toggleLayout = useCallback((newLayout) => {
    setLayout(newLayout);
  }, []);

const allCameraStreams = Object.entries(remoteStreamsRef.current)
  .map(([socketId, streams]) => [socketId, streams?.camera])
  .filter(([, cameraStream]) => cameraStream instanceof MediaStream);

  // Helper to get screen stream if available
  const getRemoteScreenStream = (socketId) => {
    return remoteStreamsRef.current[socketId]?.screen;
  };

  const activeSpeakerParticipant = participants.find(p => p.socketId === activeSpeaker);
  const activeSpeakerName = activeSpeakerParticipant?.userName || 
    (activeSpeaker === socket.id ? "You" : `User ${activeSpeaker?.slice(0, 4)}`);

  const participantsLoaded = Array.isArray(participants);
  const inConference = Boolean(conferenceId);

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

            {allCameraStreams.map(([socketId, stream]) => {
              const participant = participants.find(p => p.socketId === socketId);
              const userName = participant?.userName || `User ${socketId.slice(0, 4)}`;
              const isHandRaised = raisedHands.includes(socketId);
              
              return (
                <Box key={socketId} sx={{ position: "relative" }}>
                  <VideoTile 
                    stream={stream} 
                    label={userName}
                    isActiveSpeaker={speakerModeEnabled && activeSpeaker === socketId}
                  >
                    {isHandRaised && <RaiseHandIndicator label="Hand Raised" />}
                  </VideoTile>
                  
                  {inConference && isAdminOrManager && socketId !== socket.id && (
                    <>
                      <IconButton
                        size="small"
                        onClick={(e) => handleOpenAdminMenu(e, socketId)}
                        sx={{
                          position: "absolute",
                          top: 8,
                          right: 8,
                          background: "rgba(0,0,0,0.7)",
                          color: "white",
                          "&:hover": { background: "rgba(0,0,0,0.9)" },
                        }}
                      >
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                      
                      {isHandRaised && isAdminOrManager && (
                        <IconButton
                          size="small"
                          onClick={() => handleAdminAction("lower-hand", socketId)}
                          sx={{
                            position: "absolute",
                            top: 40,
                            right: 8,
                            background: "rgba(255, 152, 0, 0.8)",
                            color: "white",
                            "&:hover": { background: "rgba(255, 152, 0, 1)" },
                          }}
                          title="Lower Hand"
                        >
                          <HandshakeIcon fontSize="small" />
                        </IconButton>
                      )}
                      
                      {speakerModeEnabled && (
                        <IconButton
                          size="small"
                          onClick={() => setAsSpeaker(socketId)}
                          sx={{
                            position: "absolute",
                            top: 72,
                            right: 8,
                            background: "rgba(0, 230, 118, 0.8)",
                            color: "black",
                            "&:hover": { background: "rgba(0, 230, 118, 1)" },
                          }}
                          title="Set as Speaker"
                        >
                          <VolumeUpIcon fontSize="small" />
                        </IconButton>
                      )}
                    </>
                  )}
                </Box>
              );
            })}
          </Box>
        )}

        <Box sx={{
          display: "flex",
          justifyContent: "center",
          gap: 2,
          mt: 2,
          pt: 2,
          borderTop: "1px solid #333",
        }}>
          <Tooltip title={micOn ? "Mute Microphone" : "Unmute Microphone"}>
            <span>
              <IconButton
                onClick={handleToggleMic}
                disabled={speakerModeEnabled && activeSpeaker !== socket.id && !isAdminOrManager}
                sx={{
                  position: "relative",
                  backgroundColor: "#1e1e1e",
                  color: micOn
                    ? `rgba(0, 230, 118, ${Math.min(micLevel / 60, 1)})`
                    : "#9e9e9e",
                  border:
                    micOn && micLevel > 12
                      ? "1px solid #00e676"
                      : "1px solid #444",
                  boxShadow:
                    micOn && micLevel > 15
                      ? "0 0 14px rgba(0, 230, 118, 0.8)"
                      : "none",
                  transition: "all 0.12s ease-out",
                  "&:hover": { backgroundColor: "#2a2a2a" },
                  "&.Mui-disabled": {
                    backgroundColor: "#222",
                    color: "#555",
                    boxShadow: "none",
                  },
                }}
              >
                <MicIcon />

                {!micOn && (
                  <Box
                    sx={{
                      position: "absolute",
                      width: "140%",
                      height: 2,
                      background: "#ff5252",
                      transform: "rotate(-45deg)",
                    }}
                  />
                )}
              </IconButton>
            </span>
          </Tooltip>

          <Tooltip title={camOn ? "Turn Camera Off" : "Turn Camera On"}>
            <IconButton
              onClick={handleToggleCam}
              sx={{
                background: camOn ? "#1565c0" : "#424242",
                color: "white",
                "&:hover": {
                  background: camOn ? "#0d47a1" : "#303030",
                },
              }}
            >
              {camOn ? <VideocamIcon /> : <VideocamOffIcon />}
            </IconButton>
          </Tooltip>

          <Tooltip title={sharingScreen ? "Stop Screen Share" : "Start Screen Share"}>
            <IconButton
              onClick={handleScreenShare}
              sx={{
                background: sharingScreen ? "#6a1b9a" : "#424242",
                color: "white",
                "&:hover": {
                  background: sharingScreen ? "#4a148c" : "#303030",
                },
              }}
            >
              {sharingScreen ? <StopScreenShareIcon /> : <ScreenShareIcon />}
            </IconButton>
          </Tooltip>

          <Tooltip title={handRaised ? "Lower Hand" : "Raise Hand"}>
            <IconButton
              onClick={handleRaiseHand}
              sx={{
                background: handRaised ? "#f9a825" : "#424242",
                color: "white",
                "&:hover": {
                  background: handRaised ? "#f57f17" : "#303030",
                },
              }}
            >
              <PanToolIcon />
            </IconButton>
          </Tooltip>

          {inConference && isAdminOrManager && speakerModeEnabled && (
            <>
              <Tooltip title="Clear Speaker">
                <IconButton
                  onClick={clearSpeaker}
                  sx={{
                    background: "#ff4444",
                    color: "white",
                    "&:hover": { background: "#cc0000" },
                  }}
                >
                  <ClearAllIcon />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Set Yourself as Speaker">
                <IconButton
                  onClick={() => setAsSpeaker(socket.id)}
                  sx={{
                    background: "#00e676",
                    color: "black",
                    "&:hover": { background: "#00c853" },
                  }}
                >
                  <MicExternalOnIcon />
                </IconButton>
              </Tooltip>
            </>
          )}
          <Tooltip title={isAdminOrManager ? "End Conference" : "Leave Conference"}>
            <IconButton
              onClick={() => {
                if (isAdminOrManager) {
                  socket.emit("conference:end", { conferenceId });
                } else {
                  leaveAndCleanupLocal();
                }
              }}
              sx={{
                background: "#d32f2f",
                color: "white",
                "&:hover": { background: "#c62828" },
              }}
            >
              <CallEndIcon />
            </IconButton>
          </Tooltip>
        </Box>

        <Box sx={{ mt: 1, display: "flex", justifyContent: "center", alignItems: "center", gap: 1 }}>
          <Typography color="#aaa" variant="caption">
            Participants: {participants.length}
          </Typography>
          <Typography color="#aaa" variant="caption">
            • Hands Raised: {raisedHands.length}
          </Typography>
          {speakerModeEnabled && (
            <Typography color="#00e676" variant="caption" ml={1}>
              • Speaker Mode
            </Typography>
          )}
          {inConference && isAdminOrManager && (
            <Typography color="#4caf50" variant="caption" ml={1}>
              • Admin Mode
            </Typography>
          )}
          {!micOn && !camOn && (
            <Typography color="#ff9800" variant="caption" ml={1}>
              • Media Disabled
            </Typography>
          )}
          {screenSharer && (
            <Typography color="#9c27b0" variant="caption" ml={1}>
              • Screen Sharing
            </Typography>
          )}
        </Box>
      </Box>

      {participantsPanelOpen && (
        <ParticipantsPanel
          participants={participants}
          raisedHands={raisedHands}
          isAdminOrManager={participantsLoaded && isAdminOrManager}
          onAdminAction={handleAdminAction}
          currentUserId={socket.id}
          onClose={() => setParticipantsPanelOpen(false)}
          speakerModeEnabled={speakerModeEnabled}
          activeSpeaker={activeSpeaker}
          onSetSpeaker={setAsSpeaker}
          onToggleSpeakerMode={toggleSpeakerMode}
        />
      )}

      <Menu
        anchorEl={adminMenuAnchor}
        open={Boolean(adminMenuAnchor)}
        onClose={handleCloseAdminMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem onClick={() => {
          handleAdminAction("mute", selectedParticipantId);
          handleCloseAdminMenu();
        }}>
          <ListItemIcon>
            <VolumeOffIcon fontSize="small" />
          </ListItemIcon>
          Force Mute
        </MenuItem>
        
        <MenuItem onClick={() => {
          handleAdminAction("camera-off", selectedParticipantId);
          handleCloseAdminMenu();
        }}>
          <ListItemIcon>
            <VideocamOffIcon fontSize="small" />
          </ListItemIcon>
          Turn Camera Off
        </MenuItem>
        
        {speakerModeEnabled && (
          <MenuItem onClick={() => {
            setAsSpeaker(selectedParticipantId);
            handleCloseAdminMenu();
          }}>
            <ListItemIcon>
              <VolumeUpIcon fontSize="small" color="success" />
            </ListItemIcon>
            <Typography color="success.main">Set as Speaker</Typography>
          </MenuItem>
        )}
        
        <MenuItem onClick={() => {
          handleAdminAction("lower-hand", selectedParticipantId);
          handleCloseAdminMenu();
        }}>
          <ListItemIcon>
            <HandshakeIcon fontSize="small" />
          </ListItemIcon>
          Lower Hand
        </MenuItem>
        
        <Divider />
        
        <MenuItem onClick={() => {
          handleAdminAction("remove-from-conference", selectedParticipantId);
          handleCloseAdminMenu();
        }}>
          <ListItemIcon>
            <PersonRemoveIcon fontSize="small" color="error" />
          </ListItemIcon>
          <Typography color="error">Remove from Conference</Typography>
        </MenuItem>
      </Menu>

      <Snackbar
        open={notification.open}
        autoHideDuration={4000}
        onClose={() => setNotification({ ...notification, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setNotification({ ...notification, open: false })} 
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}