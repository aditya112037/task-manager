// ConferenceRoom.jsx
import React, { useEffect, useRef, useState, useMemo, useContext } from "react";
import { 
  Box, 
  Typography, 
  IconButton, 
  Tooltip, 
  Menu, 
  MenuItem, 
  ListItemIcon,
  Divider,
  Paper,
  Chip,
  Snackbar,
  Alert
} from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import PanToolIcon from "@mui/icons-material/PanTool";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import HandshakeIcon from "@mui/icons-material/Handshake";
import PersonRemoveIcon from "@mui/icons-material/PersonRemove";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import GroupsIcon from "@mui/icons-material/Groups";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import MicExternalOnIcon from "@mui/icons-material/MicExternalOn";
import { raiseHand, lowerHand, adminAction } from "../services/conferenceSocket";
import RaiseHandIndicator from "../components/Conference/RaiseHandIndicator";
import ParticipantsPanel from "../components/Conference/ParticipantsPanel";
import CallEndIcon from "@mui/icons-material/CallEnd";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import VideocamIcon from "@mui/icons-material/Videocam";
import ScreenShareIcon from "@mui/icons-material/ScreenShare";
import StopScreenShareIcon from "@mui/icons-material/StopScreenShare";
import ClearAllIcon from "@mui/icons-material/ClearAll";
import PersonIcon from "@mui/icons-material/Person";
import PresentToAllIcon from "@mui/icons-material/PresentToAll";

import { getSocket, joinConferenceRoom } from "../services/socket";
import {
  initMedia,
  joinConference,
  leaveConference,
} from "../services/conferenceSocket";

import {
  createPeer,
  removePeer,
  setLocalStream,
  toggleAudio,
  toggleVideo,
  startScreenShare,
  stopScreenShare,
  startSpeakerDetection,
  stopSpeakerDetection,
} from "../services/webrtc";

import VideoTile from "../components/Conference/VideoTile";
import { useAuth } from "../context/AuthContext";

/* ----------------------------------------------------
   CONSTANTS
---------------------------------------------------- */
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

  const localVideoRef = useRef(null);
  const [adminMenuAnchor, setAdminMenuAnchor] = useState(null);
  const [selectedParticipantId, setSelectedParticipantId] = useState(null);
  const [participantsPanelOpen, setParticipantsPanelOpen] = useState(true);

  const [remoteStreams, setRemoteStreams] = useState({});
  const [layout, setLayout] = useState(LAYOUT.GRID);
  const [screenSharer, setScreenSharer] = useState(null);
  const [raisedHands, setRaisedHands] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [handRaised, setHandRaised] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [sharingScreen, setSharingScreen] = useState(false);
  const [localStream, setLocalStreamState] = useState(null);
  const [isAdminOrManager, setIsAdminOrManager] = useState(false);
  const [conferenceData, setConferenceData] = useState(null);
  
  // SPEAKER MODE STATE
  const [activeSpeaker, setActiveSpeaker] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakerModeEnabled, setSpeakerModeEnabled] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: "", severity: "info" });

  /* ----------------------------------------------------
     🚨 CRITICAL: JOIN CONFERENCE ROOM ON MOUNT
  ---------------------------------------------------- */
  useEffect(() => {
    if (!conferenceId) return;
    
    console.log("🚀 Joining conference room:", conferenceId);
    joinConferenceRoom(conferenceId);
    
    return () => {
      console.log("👋 Leaving conference room:", conferenceId);
      if (socket) {
        socket.emit("conference:leave", { conferenceId });
      }
    };
  }, [conferenceId, socket]);

  /* ----------------------------------------------------
     SHOW NOTIFICATION
  ---------------------------------------------------- */
  const showNotification = (message, severity = "info") => {
    setNotification({ open: true, message, severity });
  };

  /* ----------------------------------------------------
     🛡 STEP 7 — AUTO-MUTE WITH ADMIN ENFORCEMENT
  ---------------------------------------------------- */
  useEffect(() => {
    if (!localStream || !speakerModeEnabled) return;
    
    const audioTracks = localStream.getAudioTracks();
    if (audioTracks.length === 0) return;
    
    const shouldSpeak = activeSpeaker === socket.id;
    
    // ADMIN OVERRIDE ENFORCEMENT:
    // 1. If I'm not the active speaker → mute (no exceptions)
    // 2. If I am the active speaker → unmute
    // 3. This overrides any local mic button state
    
    audioTracks.forEach(track => {
      if (shouldSpeak && !track.enabled) {
        // Admin says I should speak, but my track is disabled
        track.enabled = true;
        setMicOn(true);
        console.log("Admin override: Unmuting because I'm the speaker");
      } else if (!shouldSpeak && track.enabled) {
        // I'm not the speaker, but my track is enabled
        track.enabled = false;
        setMicOn(false);
        console.log("Admin override: Muting because I'm not the speaker");
      }
    });
  }, [activeSpeaker, speakerModeEnabled, localStream, socket.id]);

  /* ----------------------------------------------------
     🧪 STEP 6 — SPEAKER DETECTION WITH OWNERSHIP RULES
  ---------------------------------------------------- */
  useEffect(() => {
    if (!localStream || !speakerModeEnabled) return;
    
    const cleanup = startSpeakerDetection(localStream, (speaking) => {
      if (!speakerModeEnabled) return;
      
      if (!speaking) {
        // Always emit when stopping speaking
        socket.emit("conference:speaking", {
          conferenceId,
          speaking: false,
        });
        setIsSpeaking(false);
        return;
      }
      
      // SPEAKER OWNERSHIP RULE:
      // Only emit "I'm speaking" if:
      // 1. There's no active speaker currently, OR
      // 2. I am already the active speaker
      const canTakeOverSpeaker = !activeSpeaker || activeSpeaker === socket.id;
      
      if (canTakeOverSpeaker) {
        setIsSpeaking(true);
        socket.emit("conference:speaking", {
          conferenceId,
          speaking: true,
        });
      } else {
        // I'm speaking, but someone else is the current speaker
        // This prevents audio chaos and flickering
        console.log("Not taking over speaker - ", activeSpeaker, "is speaking");
      }
    });
    
    return cleanup;
  }, [localStream, speakerModeEnabled, conferenceId, socket, activeSpeaker]);

  /* ----------------------------------------------------
     INIT MEDIA + CONFERENCE
  ---------------------------------------------------- */
  useEffect(() => {
    let mounted = true;

    const start = async () => {
      try {
        // First, ensure socket is connected
        if (!socket || !socket.connected) {
          console.warn("Socket not connected, waiting...");
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          if (!socket || !socket.connected) {
            showNotification("Connection issue. Please refresh.", "error");
            return;
          }
        }

        const stream = await initMedia();
        if (!mounted) return;

        setLocalStream(stream);
        setLocalStreamState(stream);
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Get conference data
        const confData = await fetchConferenceData(conferenceId);
        setConferenceData(confData);
        
        // Check if current user is admin/manager
        if (confData && currentUser) {
          const isCreator = confData.createdBy === currentUser._id;
          setIsAdminOrManager(isCreator);
        }

        joinConference(conferenceId, confData);
      } catch (error) {
        console.error("Failed to initialize media:", error);
        showNotification("Failed to initialize media", "error");
      }
    };

    start();

    /* ---------------- SIGNALING HANDLERS ---------------- */
    const handleUserJoined = async ({ userId, userName, socketId }) => {
      const pc = createPeer(userId, socket);

      pc.ontrack = (e) => {
        if (!mounted) return;
        setRemoteStreams((prev) => ({
          ...prev,
          [socketId]: e.streams[0],
        }));
      };

      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("conference:offer", { to: socketId, offer });
      } catch (error) {
        console.error("Error creating offer:", error);
      }
    };

    const handleOffer = async ({ from, offer }) => {
      const pc = createPeer(from, socket);

      pc.ontrack = (e) => {
        if (!mounted) return;
        setRemoteStreams((prev) => ({
          ...prev,
          [from]: e.streams[0],
        }));
      };

      try {
        await pc.setRemoteDescription(offer);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("conference:answer", { to: from, answer });
      } catch (error) {
        console.error("Error handling offer:", error);
      }
    };

    const handleAnswer = async ({ from, answer }) => {
      const pc = createPeer(from, socket);
      try {
        await pc.setRemoteDescription(answer);
      } catch (error) {
        console.error("Error handling answer:", error);
      }
    };

    const handleIceCandidate = ({ from, candidate }) => {
      const pc = createPeer(from, socket);
      try {
        pc.addIceCandidate(candidate);
      } catch (error) {
        console.error("Error adding ICE candidate:", error);
      }
    };

    const handleUserLeft = ({ userId, socketId }) => {
      if (!mounted) return;
      removePeer(userId);
      setRemoteStreams((prev) => {
        const copy = { ...prev };
        delete copy[socketId];
        return copy;
      });
      
      // 🧠 STEP 8 — FAILSAFE: Clear active speaker if they left
      if (activeSpeaker === socketId) {
        console.log("Active speaker left, clearing speaker");
        setActiveSpeaker(null);
      }
    };

    /* ---------------- PARTICIPANT & HAND HANDLERS ---------------- */
    const handleParticipantsUpdate = ({ users }) => {
      if (!mounted) return;
      setParticipants(users);
    };

    const handleHandsUpdated = ({ raisedHands }) => {
      if (!mounted) return;
      setRaisedHands(raisedHands);
    };

    const handleConferenceEnded = () => {
      handleLeave();
    };

    /* ---------------- 🧱 STEP 5 — SPEAKER MODE HANDLERS ---------------- */
    const handleActiveSpeakerUpdate = ({ socketId }) => {
      if (!mounted) return;
      console.log("Active speaker updated:", socketId);
      setActiveSpeaker(socketId);
      
      if (socketId === socket.id) {
        showNotification("You are now the active speaker", "success");
      }
    };

    const handleSpeakerModeToggled = ({ enabled }) => {
      if (!mounted) return;
      console.log("Speaker mode toggled:", enabled);
      setSpeakerModeEnabled(enabled);
      
      // Clear speaker when mode is disabled
      if (!enabled) {
        setActiveSpeaker(null);
      }
      
      showNotification(`Speaker mode ${enabled ? "enabled" : "disabled"}`, "info");
    };

    const handleSpeakerAssigned = ({ socketId }) => {
      if (!mounted) return;
      console.log("Speaker assigned by admin:", socketId);
      setActiveSpeaker(socketId);
      
      if (socketId === socket.id) {
        showNotification("You have been assigned as speaker by admin", "success");
      }
    };

    /* ---------------- 🧠 STEP 8 — USER LEFT HANDLER ---------------- */
    const handleUserLeftEvent = ({ socketId }) => {
      if (!mounted) return;
      
      // Clear active speaker if they left
      if (activeSpeaker === socketId) {
        console.log("Active speaker left via user-left event");
        setActiveSpeaker(null);
      }
    };

    /* ---------------- ADMIN ACTION LISTENERS ---------------- */
    const handleForceMute = () => {
      console.log("Admin forced mute");
      toggleAudio(false);
      setMicOn(false);
      showNotification("Admin has muted your microphone", "warning");
    };

    const handleForceCameraOff = () => {
      console.log("Admin turned off camera");
      toggleVideo(false);
      setCamOn(false);
      showNotification("Admin has turned off your camera", "warning");
    };

    const handleRemovedByAdmin = () => {
      console.log("Removed by admin");
      handleLeave();
      showNotification("You have been removed from the conference by the admin", "error");
    };

    // Setup event listeners
    socket.on("conference:user-joined", handleUserJoined);
    socket.on("conference:offer", handleOffer);
    socket.on("conference:answer", handleAnswer);
    socket.on("conference:ice-candidate", handleIceCandidate);
    socket.on("conference:user-left", handleUserLeft);
    socket.on("conference:participants", handleParticipantsUpdate);
    socket.on("conference:hands-updated", handleHandsUpdated);
    socket.on("conference:ended", handleConferenceEnded);
    
    // 🧱 STEP 5 — Speaker mode listeners
    socket.on("conference:active-speaker", handleActiveSpeakerUpdate);
    socket.on("conference:speaker-mode-toggled", handleSpeakerModeToggled);
    socket.on("conference:speaker-assigned", handleSpeakerAssigned);
    
    // 🧠 STEP 8 — Additional user left listener
    socket.on("conference:user-left", handleUserLeftEvent);
    
    // Admin action listeners
    socket.on("conference:force-mute", handleForceMute);
    socket.on("conference:force-camera-off", handleForceCameraOff);
    socket.on("conference:removed-by-admin", handleRemovedByAdmin);

    return () => {
      mounted = false;
      leaveConference(conferenceId);
      stopSpeakerDetection();
      
      // Clean up all listeners
      socket.off("conference:user-joined", handleUserJoined);
      socket.off("conference:offer", handleOffer);
      socket.off("conference:answer", handleAnswer);
      socket.off("conference:ice-candidate", handleIceCandidate);
      socket.off("conference:user-left", handleUserLeft);
      socket.off("conference:participants", handleParticipantsUpdate);
      socket.off("conference:hands-updated", handleHandsUpdated);
      socket.off("conference:ended", handleConferenceEnded);
      
      // 🧱 STEP 5 — Clean up speaker mode listeners
      socket.off("conference:active-speaker", handleActiveSpeakerUpdate);
      socket.off("conference:speaker-mode-toggled", handleSpeakerModeToggled);
      socket.off("conference:speaker-assigned", handleSpeakerAssigned);
      
      // 🧠 STEP 8 — Clean up additional user left listener
      socket.off("conference:user-left", handleUserLeftEvent);
      
      // Clean up admin listeners
      socket.off("conference:force-mute", handleForceMute);
      socket.off("conference:force-camera-off", handleForceCameraOff);
      socket.off("conference:removed-by-admin", handleRemovedByAdmin);
    };
  }, [conferenceId, socket, currentUser]);

  /* ----------------------------------------------------
     HELPER FUNCTIONS
  ---------------------------------------------------- */
  const fetchConferenceData = async (confId) => {
    try {
      const response = await fetch(`/api/conferences/${confId}`);
      if (!response.ok) throw new Error("Failed to fetch conference data");
      return await response.json();
    } catch (error) {
      console.error("Error fetching conference data:", error);
      return null;
    }
  };

  const handleAdminAction = (action, targetSocketId) => {
    adminAction({
      action,
      targetSocketId,
      conferenceId,
      userId: currentUser._id,
    });
  };

  const handleClearAllHands = () => {
    adminAction({
      action: "clear-hands",
      conferenceId,
      userId: currentUser._id,
    });
  };

  const handleOpenAdminMenu = (event, participantId) => {
    setAdminMenuAnchor(event.currentTarget);
    setSelectedParticipantId(participantId);
  };

  const handleCloseAdminMenu = () => {
    setAdminMenuAnchor(null);
    setSelectedParticipantId(null);
  };

  const toggleParticipantsPanel = () => {
    setParticipantsPanelOpen(!participantsPanelOpen);
  };

  /* ----------------------------------------------------
     SPEAKER MODE FUNCTIONS
  ---------------------------------------------------- */
  const toggleSpeakerMode = () => {
    const newMode = !speakerModeEnabled;
    setSpeakerModeEnabled(newMode);
    
    if (!newMode) {
      setActiveSpeaker(null);
      // Re-enable all mics when speaker mode is disabled
      if (localStream) {
        localStream.getAudioTracks().forEach(track => {
          if (!track.enabled) {
            track.enabled = true;
            setMicOn(true);
          }
        });
      }
    }
    
    socket.emit("conference:toggle-speaker-mode", {
      conferenceId,
      enabled: newMode,
    });
    
    showNotification(`Speaker mode ${newMode ? "enabled" : "disabled"}`, "info");
  };

  const setAsSpeaker = (socketId) => {
    socket.emit("conference:set-speaker", {
      conferenceId,
      targetSocketId: socketId,
    });
    setActiveSpeaker(socketId);
    showNotification(`Set as active speaker`, "success");
  };

  const clearSpeaker = () => {
    setActiveSpeaker(null);
    socket.emit("conference:clear-speaker", { conferenceId });
    showNotification("Speaker cleared", "info");
  };

  const toggleLayout = (newLayout) => {
    setLayout(newLayout);
  };

  /* ----------------------------------------------------
     DERIVED DATA
  ---------------------------------------------------- */
  const allCameraStreams = useMemo(() => {
    return Object.entries(remoteStreams).filter(([socketId, stream]) => stream);
  }, [remoteStreams]);

  const currentParticipant = participants.find(p => p.userId === currentUser?._id);
  const socketId = socket.id;

  // Get current active speaker's participant info
  const activeSpeakerParticipant = participants.find(p => p.socketId === activeSpeaker);
  const activeSpeakerName = activeSpeakerParticipant?.userName || 
    (activeSpeaker === socket.id ? "You" : `User ${activeSpeaker?.slice(0, 4)}`);

  /* ----------------------------------------------------
     CONTROLS
  ---------------------------------------------------- */
  const handleLeave = () => {
    // Emit leave event
    if (socket) {
      socket.emit("conference:leave", { conferenceId });
    }
    
    leaveConference(conferenceId);
    stopSpeakerDetection();
    
    // Stop all tracks
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    
    // Clear remote streams
    setRemoteStreams({});
    
    navigate(-1);
  };

  const handleToggleMic = () => {
    // SPEAKER MODE RESTRICTION:
    if (speakerModeEnabled && activeSpeaker !== socket.id) {
      showNotification("Only the active speaker can unmute in speaker mode", "warning");
      return;
    }
    
    toggleAudio(!micOn);
    setMicOn((v) => !v);
  };

  const handleRaiseHand = () => {
    if (!handRaised) {
      raiseHand(conferenceId);
    } else {
      lowerHand(conferenceId);
    }
    setHandRaised(v => !v);
  };

  const handleToggleCam = () => {
    toggleVideo(!camOn);
    setCamOn((v) => !v);
  };

  const handleScreenShare = async () => {
    try {
      if (!sharingScreen) {
        await startScreenShare(localVideoRef);
        setLayout(LAYOUT.PRESENTATION);
        setScreenSharer("me");
      } else {
        await stopScreenShare(localVideoRef);
        setLayout(LAYOUT.GRID);
        setScreenSharer(null);
      }
      setSharingScreen((v) => !v);
    } catch (error) {
      console.error("Screen share error:", error);
      showNotification("Screen share failed", "error");
    }
  };

  /* ----------------------------------------------------
     RENDER
  ---------------------------------------------------- */
  return (
    <Box sx={{ display: "flex", height: "100vh", background: "#000" }}>
      {/* MAIN VIDEO AREA */}
      <Box sx={{ 
        flex: 1, 
        display: "flex", 
        flexDirection: "column",
        p: 2 
      }}>
        {/* HEADER */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Typography color="white" fontWeight={600}>
            Conference Room: {conferenceId}
            {isAdminOrManager && (
              <Typography component="span" color="#4caf50" fontSize="0.8rem" ml={1}>
                (Admin)
              </Typography>
            )}
          </Typography>
          
          <Box sx={{ display: "flex", gap: 1 }}>
            {/* LAYOUT CONTROLS */}
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
            
            {/* SPEAKER MODE TOGGLE */}
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
            
            {isAdminOrManager && raisedHands.length > 0 && (
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

        {/* SPEAKER MODE STATUS */}
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
                {isAdminOrManager && (
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

        {/* ===================== VIDEO AREA ===================== */}
        {layout === LAYOUT.PRESENTATION ? (
          // PRESENTATION LAYOUT (Screen share)
          <>
            <Box sx={{ flex: 1, mb: 2 }}>
              <VideoTile
                videoRef={localVideoRef}
                label={screenSharer === "me" ? "You (Presenting)" : "Presenter"}
                isScreen
                isActiveSpeaker={speakerModeEnabled && activeSpeaker === socket.id}
              />
            </Box>

            <Box sx={{ display: "flex", gap: 2, overflowX: "auto", height: "200px" }}>
              {allCameraStreams.map(([socketId, stream]) => {
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
                    {isAdminOrManager && socketId !== socket.id && (
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
          // SPEAKER LAYOUT (Large active speaker + small others)
          <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            {/* MAIN SPEAKER VIEW */}
            {activeSpeaker && (
              <Box sx={{ flex: 2, minHeight: "60%" }}>
                {activeSpeaker === socket.id ? (
                  <VideoTile 
                    videoRef={localVideoRef} 
                    label="You (Speaking)"
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
            
            {/* OTHER PARTICIPANTS (GRID) */}
            <Box sx={{ 
              flex: 1, 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 1
            }}>
              {/* Local video (if not active speaker) */}
              {activeSpeaker !== socket.id && (
                <Box sx={{ position: "relative" }}>
                  <VideoTile 
                    videoRef={localVideoRef} 
                    label="You"
                    small
                    isActiveSpeaker={false}
                  />
                </Box>
              )}
              
              {/* Remote videos (excluding active speaker) */}
              {allCameraStreams
                .filter(([socketId]) => socketId !== activeSpeaker)
                .map(([socketId, stream]) => {
                  const participant = participants.find(p => p.socketId === socketId);
                  const userName = participant?.userName || `User ${socketId.slice(0, 4)}`;
                  const isHandRaised = raisedHands.includes(socketId);
                  
                  return (
                    <Box key={socketId} sx={{ position: "relative" }}>
                      <VideoTile 
                        stream={stream} 
                        label={userName}
                        small
                        isActiveSpeaker={false}
                      />
                      
                      {isAdminOrManager && socketId !== socket.id && (
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
          // GRID LAYOUT (Default)
          <Box sx={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 2,
            overflow: "auto",
          }}>
            {/* LOCAL VIDEO */}
            <Box sx={{ position: "relative" }}>
              <VideoTile 
                videoRef={localVideoRef} 
                label="You"
                isLocal
                isActiveSpeaker={speakerModeEnabled && activeSpeaker === socket.id}
              >
                {handRaised && <RaiseHandIndicator label="Your Hand is Raised" />}
              </VideoTile>
            </Box>

            {/* REMOTE VIDEOS */}
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
                  
                  {/* ADMIN CONTROLS */}
                  {isAdminOrManager && socketId !== socket.id && (
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
                      
                      {/* SET AS SPEAKER OPTION */}
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

        {/* ===================== CONTROLS BAR ===================== */}
        <Box sx={{
          display: "flex",
          justifyContent: "center",
          gap: 2,
          mt: 2,
          pt: 2,
          borderTop: "1px solid #333",
        }}>
          {/* MIC CONTROL */}
          <Tooltip title={micOn ? "Mute Microphone" : "Unmute Microphone"}>
            <span>
              <IconButton
                onClick={handleToggleMic}
                disabled={speakerModeEnabled && activeSpeaker !== socket.id}
                sx={{
                  background: micOn ? "#2e7d32" : "#424242",
                  color: "white",
                  "&:hover": {
                    background: micOn ? "#1b5e20" : "#303030",
                  },
                  "&.Mui-disabled": {
                    background: "#333",
                    color: "#666",
                  },
                }}
              >
                {micOn ? <MicIcon /> : <MicOffIcon />}
              </IconButton>
            </span>
          </Tooltip>

          {/* CAMERA CONTROL */}
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

          {/* SCREEN SHARE */}
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

          {/* RAISE HAND */}
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

          {/* SPEAKER MODE CONTROLS */}
          {isAdminOrManager && speakerModeEnabled && (
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

          {/* LEAVE CONFERENCE */}
          <Tooltip title="Leave Conference">
            <IconButton
              onClick={handleLeave}
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

        {/* STATUS BAR */}
        <Box sx={{ mt: 1, display: "flex", justifyContent: "center", alignItems: "center", gap: 1 }}>
          <Typography color="#aaa" variant="caption">
            Participants: {participants.length || allCameraStreams.length + 1}
          </Typography>
          <Typography color="#aaa" variant="caption">
            • Hands Raised: {raisedHands.length}
          </Typography>
          {speakerModeEnabled && (
            <Typography color="#00e676" variant="caption" ml={1}>
              • Speaker Mode
            </Typography>
          )}
          {isAdminOrManager && (
            <Typography color="#4caf50" variant="caption" ml={1}>
              • Admin Mode
            </Typography>
          )}
        </Box>
      </Box>

      {/* PARTICIPANTS PANEL */}
      {participantsPanelOpen && (
        <ParticipantsPanel
          participants={participants}
          raisedHands={raisedHands}
          isAdminOrManager={isAdminOrManager}
          onAdminAction={handleAdminAction}
          currentUserId={currentUser?._id}
          onClose={() => setParticipantsPanelOpen(false)}
          // Pass speaker mode props
          speakerModeEnabled={speakerModeEnabled}
          activeSpeaker={activeSpeaker}
          onSetSpeaker={setAsSpeaker}
          onToggleSpeakerMode={toggleSpeakerMode}
        />
      )}

      {/* ADMIN MENU */}
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

      {/* NOTIFICATION SNACKBAR */}
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