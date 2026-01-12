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
  Paper
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

import { getSocket } from "../services/socket";
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
} from "../services/webrtc";

import VideoTile from "../components/Conference/VideoTile";
import { useAuth } from "../context/AuthContext";

/* ----------------------------------------------------
   CONSTANTS
---------------------------------------------------- */
const LAYOUT = {
  GRID: "grid",
  PRESENTATION: "presentation",
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

  /* ----------------------------------------------------
     INIT MEDIA + CONFERENCE
  ---------------------------------------------------- */
  useEffect(() => {
    let mounted = true;

    const start = async () => {
      try {
        const stream = await initMedia();
        if (!mounted) return;

        setLocalStream(stream);
        setLocalStreamState(stream);
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Get conference data (you might need to fetch this from your API)
        const confData = await fetchConferenceData(conferenceId);
        setConferenceData(confData);
        
        // Check if current user is admin/manager
        if (confData && currentUser) {
          // Check if user is conference creator or has admin role
          const isCreator = confData.createdBy === currentUser._id;
          // You might want to add team-based admin checks here
          setIsAdminOrManager(isCreator);
        }

        joinConference(conferenceId, confData);
      } catch (error) {
        console.error("Failed to initialize media:", error);
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

    /* ---------------- ADMIN ACTION LISTENERS ---------------- */
    const handleForceMute = () => {
      console.log("Admin forced mute");
      toggleAudio(false);
      setMicOn(false);
      showNotification("Admin has muted your microphone");
    };

    const handleForceCameraOff = () => {
      console.log("Admin turned off camera");
      toggleVideo(false);
      setCamOn(false);
      showNotification("Admin has turned off your camera");
    };

    const handleRemovedByAdmin = () => {
      console.log("Removed by admin");
      handleLeave();
      showNotification("You have been removed from the conference by the admin");
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
    
    // Admin action listeners
    socket.on("conference:force-mute", handleForceMute);
    socket.on("conference:force-camera-off", handleForceCameraOff);
    socket.on("conference:removed-by-admin", handleRemovedByAdmin);

    return () => {
      mounted = false;
      leaveConference(conferenceId);
      
      // Clean up all listeners
      socket.off("conference:user-joined", handleUserJoined);
      socket.off("conference:offer", handleOffer);
      socket.off("conference:answer", handleAnswer);
      socket.off("conference:ice-candidate", handleIceCandidate);
      socket.off("conference:user-left", handleUserLeft);
      socket.off("conference:participants", handleParticipantsUpdate);
      socket.off("conference:hands-updated", handleHandsUpdated);
      socket.off("conference:ended", handleConferenceEnded);
      
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
      // You'll need to implement this based on your API
      const response = await fetch(`/api/conferences/${confId}`);
      if (!response.ok) throw new Error("Failed to fetch conference data");
      return await response.json();
    } catch (error) {
      console.error("Error fetching conference data:", error);
      return null;
    }
  };

  const showNotification = (message) => {
    // You can use a toast notification library or custom component
    console.log("Notification:", message);
    // Example: toast.success(message);
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
     DERIVED DATA
  ---------------------------------------------------- */
  const allCameraStreams = useMemo(() => {
    return Object.entries(remoteStreams).filter(([socketId, stream]) => stream);
  }, [remoteStreams]);

  const currentParticipant = participants.find(p => p.userId === currentUser?._id);
  const socketId = socket.id;

  /* ----------------------------------------------------
     CONTROLS
  ---------------------------------------------------- */
  const handleLeave = () => {
    leaveConference(conferenceId);
    
    // Stop all tracks
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    
    // Clear remote streams
    setRemoteStreams({});
    
    navigate(-1);
  };

  const handleToggleMic = () => {
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
            {isAdminOrManager && raisedHands.length > 0 && (
              <Tooltip title="Clear All Raised Hands">
                <IconButton
                  onClick={handleClearAllHands}
                  sx={{
                    background: "#ff9800",
                    color: "white",
                    "&:hover": {
                      background: "#f57c00",
                    },
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
                  "&:hover": {
                    background: participantsPanelOpen ? "#1976d2" : "#303030",
                  },
                }}
              >
                <GroupsIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* ===================== VIDEO AREA ===================== */}
        {layout === LAYOUT.PRESENTATION ? (
          <>
            {/* SCREEN SHARE / MAIN VIDEO */}
            <Box sx={{ flex: 1, mb: 2 }}>
              <VideoTile
                videoRef={localVideoRef}
                label={screenSharer === "me" ? "You (Presenting)" : "Presenter"}
                isScreen
              />
            </Box>

            {/* PARTICIPANT STRIP */}
            <Box
              sx={{
                display: "flex",
                gap: 2,
                overflowX: "auto",
                height: "200px",
              }}
            >
              {allCameraStreams.map(([socketId, stream]) => {
                const participant = participants.find(p => p.socketId === socketId);
                const userName = participant?.userName || `User ${socketId.slice(0, 4)}`;
                
                return (
                  <Box key={socketId} sx={{ position: "relative" }}>
                    <VideoTile 
                      stream={stream} 
                      label={userName} 
                      small 
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
                          "&:hover": {
                            background: "rgba(0,0,0,0.9)",
                          },
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
        ) : (
          /* ===================== GRID LAYOUT ===================== */
          <Box
            sx={{
              flex: 1,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 2,
              overflow: "auto",
            }}
          >
            {/* LOCAL VIDEO */}
            <Box sx={{ position: "relative" }}>
              <VideoTile 
                videoRef={localVideoRef} 
                label="You"
                isLocal
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
                  >
                    {isHandRaised && (
                      <RaiseHandIndicator label="Hand Raised" />
                    )}
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
                          "&:hover": {
                            background: "rgba(0,0,0,0.9)",
                          },
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
                            "&:hover": {
                              background: "rgba(255, 152, 0, 1)",
                            },
                          }}
                          title="Lower Hand"
                        >
                          <HandshakeIcon fontSize="small" />
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
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            gap: 2,
            mt: 2,
            pt: 2,
            borderTop: "1px solid #333",
          }}
        >
          <Tooltip title={micOn ? "Mute Microphone" : "Unmute Microphone"}>
            <IconButton
              onClick={handleToggleMic}
              sx={{
                background: micOn ? "#2e7d32" : "#424242",
                color: "white",
                "&:hover": {
                  background: micOn ? "#1b5e20" : "#303030",
                },
              }}
            >
              {micOn ? <MicIcon /> : <MicOffIcon />}
            </IconButton>
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

          <Tooltip title="Leave Conference">
            <IconButton
              onClick={handleLeave}
              sx={{
                background: "#d32f2f",
                color: "white",
                "&:hover": {
                  background: "#c62828",
                },
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
        />
      )}

      {/* ADMIN MENU */}
      <Menu
        anchorEl={adminMenuAnchor}
        open={Boolean(adminMenuAnchor)}
        onClose={handleCloseAdminMenu}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
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
    </Box>
  );
}