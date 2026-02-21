import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Divider,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Snackbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import CallEndIcon from "@mui/icons-material/CallEnd";
import ClearAllIcon from "@mui/icons-material/ClearAll";
import GroupsIcon from "@mui/icons-material/Groups";
import HandshakeIcon from "@mui/icons-material/Handshake";
import MicExternalOnIcon from "@mui/icons-material/MicExternalOn";
import MicIcon from "@mui/icons-material/Mic";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import PanToolIcon from "@mui/icons-material/PanTool";
import PersonIcon from "@mui/icons-material/Person";
import PersonRemoveIcon from "@mui/icons-material/PersonRemove";
import PresentToAllIcon from "@mui/icons-material/PresentToAll";
import ScreenShareIcon from "@mui/icons-material/ScreenShare";
import StopScreenShareIcon from "@mui/icons-material/StopScreenShare";
import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import RaiseHandIndicator from "../components/Conference/RaiseHandIndicator";
import ParticipantsPanel from "../components/Conference/ParticipantsPanel";
import VideoTile from "../components/Conference/VideoTile";
import { useAuth } from "../context/AuthContext";
import {
  cleanupConference,
  joinConference,
  lowerHand,
  raiseHand,
  sendSpeakingStatus,
} from "../services/conferenceSocket";
import { getSocket } from "../services/socket";
import {
  cleanupWebRTC,
  createOffer,
  getAudioStream,
  getCameraStream,
  getScreenStream,
  handleAnswer as handleWebRTCAnswer,
  handleIceCandidate as handleWebRTCIceCandidate,
  handleOffer as handleWebRTCOffer,
  removePeer,
  setMicEnabled,
  startAudio,
  startCamera,
  startScreen,
  stopCamera,
  stopScreen,
} from "../services/webrtc";

const LAYOUT = {
  GRID: "grid",
  PRESENTATION: "presentation",
  SPEAKER: "speaker",
};

const getParticipantName = (participant) => {
  if (!participant) return "Participant";
  return participant.name || participant.userName || "Participant";
};

function RemoteAudioPlayer({ stream }) {
  const audioRef = useRef(null);
  const streamIdRef = useRef(null);
  const fadeTimerRef = useRef(null);
  const unmuteTimerRef = useRef(null);

  useEffect(() => {
    const element = audioRef.current;
    if (!element) return;

    if (fadeTimerRef.current) {
      clearInterval(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }
    if (unmuteTimerRef.current) {
      clearTimeout(unmuteTimerRef.current);
      unmuteTimerRef.current = null;
    }

    if (stream) {
      if (element.srcObject !== stream) {
        element.srcObject = stream;
      }

      const streamId =
        stream.id || stream.getAudioTracks?.()[0]?.id || `${Date.now()}`;
      const isNewStream = streamIdRef.current !== streamId;
      streamIdRef.current = streamId;

      if (isNewStream) {
        element.muted = true;
        element.volume = 0;
      } else {
        element.muted = false;
        element.volume = 0.85;
      }

      element.play().catch(() => {});

      if (isNewStream) {
        unmuteTimerRef.current = setTimeout(() => {
          element.muted = false;
          let step = 0;
          const maxSteps = 8;
          fadeTimerRef.current = setInterval(() => {
            step += 1;
            element.volume = Math.min(0.85, (0.85 * step) / maxSteps);
            if (step >= maxSteps && fadeTimerRef.current) {
              clearInterval(fadeTimerRef.current);
              fadeTimerRef.current = null;
            }
          }, 80);
        }, 300);
      }

      return;
    }

    element.srcObject = null;
    streamIdRef.current = null;
    element.muted = true;
    element.volume = 0;
  }, [stream]);

  useEffect(
    () => () => {
      if (fadeTimerRef.current) clearInterval(fadeTimerRef.current);
      if (unmuteTimerRef.current) clearTimeout(unmuteTimerRef.current);
    },
    []
  );

  return <audio ref={audioRef} autoPlay playsInline />;
}

export default function ConferenceRoom() {
  const { conferenceId } = useParams();
  const routerLocation = useLocation();
  const locationTeamId = routerLocation.state?.teamId || null;
  const navigate = useNavigate();
  const socket = getSocket();
  const { user: currentUser } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [layout, setLayout] = useState(LAYOUT.GRID);
  const [participantsPanelOpen, setParticipantsPanelOpen] = useState(true);
  const [participants, setParticipants] = useState([]);
  const [raisedHands, setRaisedHands] = useState([]);
  const [remoteMedia, setRemoteMedia] = useState({});

  const [handRaised, setHandRaised] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [sharingScreen, setSharingScreen] = useState(false);
  const [screenSharer, setScreenSharer] = useState(null);

  const [speakerModeEnabled, setSpeakerModeEnabled] = useState(false);
  const [activeSpeaker, setActiveSpeaker] = useState(null);
  const [micLevel, setMicLevel] = useState(0);

  const [adminMenuAnchor, setAdminMenuAnchor] = useState(null);
  const [selectedParticipantId, setSelectedParticipantId] = useState(null);

  const [notification, setNotification] = useState({
    open: false,
    message: "",
    severity: "info",
  });
  const [conferenceTeamId, setConferenceTeamId] = useState(
    () => locationTeamId
  );

  const joinedRef = useRef(false);
  const endedRef = useRef(false);
  const isEndingRef = useRef(false);
  const speakingRef = useRef(false);
  const micLevelRef = useRef(0);
  const lastMicUiUpdateRef = useRef(0);
  const hasCleanedUpRef = useRef(false);
  const endFallbackTimerRef = useRef(null);
  const lastNonPresentationLayoutRef = useRef(LAYOUT.GRID);

  const showNotification = useCallback((message, severity = "info") => {
    setNotification({ open: true, message, severity });
  }, []);

  const mySocketId = socket?.id || null;

  const emitMediaUpdate = useCallback(
    (nextMic, nextCam) => {
      if (!socket || !conferenceId) return;
      socket.emit("conference:media-update", {
        conferenceId,
        micOn: Boolean(nextMic),
        camOn: Boolean(nextCam),
      });
    },
    [conferenceId, socket]
  );

  const participantsWithFallback = useMemo(() => {
    if (!mySocketId || !currentUser) return participants;

    const hasMe = participants.some((p) => p.socketId === mySocketId);
    if (hasMe) return participants;

    if (participants.length > 0) return participants;

    return [
      {
        socketId: mySocketId,
        userId: currentUser._id,
        name: currentUser.name,
        role: "admin",
        micOn,
        camOn,
      },
    ];
  }, [participants, mySocketId, currentUser, micOn, camOn]);

  const myParticipant = useMemo(() => {
    if (!mySocketId) return null;
    return participantsWithFallback.find((p) => p.socketId === mySocketId) || null;
  }, [participantsWithFallback, mySocketId]);

  const isAdminOrManager =
    myParticipant?.role === "admin" || myParticipant?.role === "manager";

  const remoteParticipants = useMemo(
    () => participantsWithFallback.filter((p) => p.socketId !== mySocketId),
    [participantsWithFallback, mySocketId]
  );

  const remoteAudioEntries = useMemo(
    () => Object.entries(remoteMedia).filter(([, media]) => media?.audioStream),
    [remoteMedia]
  );

  const performLocalTeardown = useCallback(async () => {
    if (hasCleanedUpRef.current) return;
    hasCleanedUpRef.current = true;

    if (endFallbackTimerRef.current) {
      clearTimeout(endFallbackTimerRef.current);
      endFallbackTimerRef.current = null;
    }

    cleanupConference();
    await cleanupWebRTC();
    setRemoteMedia({});
  }, []);

  const leaveConferenceLocally = useCallback(
    async (navigateBack = true) => {
      await performLocalTeardown();

      if (navigateBack) {
        navigate(-1);
      }
    },
    [navigate, performLocalTeardown]
  );

  const handleConferenceEnded = useCallback(async (payload = {}) => {
    if (endedRef.current) return;
    endedRef.current = true;
    isEndingRef.current = false;
    if (endFallbackTimerRef.current) {
      clearTimeout(endFallbackTimerRef.current);
      endFallbackTimerRef.current = null;
    }
    showNotification("Conference has ended", "info");
    const resolvedTeamId = payload?.teamId || conferenceTeamId;
    navigate(resolvedTeamId ? `/teams/${resolvedTeamId}` : "/teams");

    performLocalTeardown().catch((error) => {
      console.error("Conference teardown after end failed", error);
    });
  }, [conferenceTeamId, navigate, performLocalTeardown, showNotification]);

  const handleEndConference = useCallback(() => {
    if (!isAdminOrManager) {
      leaveConferenceLocally();
      return;
    }

    if (!socket || !conferenceId || isEndingRef.current) return;
    isEndingRef.current = true;
    endedRef.current = true;
    socket.emit("conference:end", { conferenceId });

    if (endFallbackTimerRef.current) {
      clearTimeout(endFallbackTimerRef.current);
    }
    const resolvedTeamId = conferenceTeamId || locationTeamId;
    navigate(resolvedTeamId ? `/teams/${resolvedTeamId}` : "/teams");
    performLocalTeardown().catch((error) => {
      console.error("Conference teardown after local end failed", error);
    });
  }, [conferenceId, conferenceTeamId, isAdminOrManager, leaveConferenceLocally, locationTeamId, navigate, performLocalTeardown, socket]);

  const handleToggleMic = useCallback(async () => {
    try {
      if (!getAudioStream()) {
        await startAudio();
      }

      const nextMic = !micOn;
      const enabled = await setMicEnabled(nextMic);
      setMicOn(Boolean(enabled));
      emitMediaUpdate(Boolean(enabled), camOn);
    } catch (error) {
      console.error("Microphone toggle failed", error);
      showNotification("Microphone access failed", "error");
    }
  }, [camOn, emitMediaUpdate, micOn, showNotification]);

  const handleToggleCam = useCallback(async () => {
    try {
      const nextCam = !camOn;

      if (nextCam) {
        await startCamera();
      } else {
        await stopCamera();
      }

      setCamOn(nextCam);
      emitMediaUpdate(micOn, nextCam);
    } catch (error) {
      console.error("Camera toggle failed", error);
      showNotification("Camera access failed", "error");
    }
  }, [camOn, emitMediaUpdate, micOn, showNotification]);

  const handleScreenShare = useCallback(async () => {
    try {
      if (!sharingScreen) {
        if (layout !== LAYOUT.PRESENTATION) {
          lastNonPresentationLayoutRef.current = layout;
        }
        await startScreen();
        setSharingScreen(true);
        setScreenSharer(mySocketId);
        setLayout(LAYOUT.PRESENTATION);
      } else {
        await stopScreen();
        setSharingScreen(false);
        if (screenSharer === mySocketId) {
          setScreenSharer(null);
        }
        setLayout((prev) =>
          prev === LAYOUT.PRESENTATION
            ? lastNonPresentationLayoutRef.current || LAYOUT.GRID
            : prev
        );
      }
    } catch (error) {
      console.error("Screen share toggle failed", error);
      showNotification("Screen share failed", "error");
    }
  }, [layout, mySocketId, screenSharer, sharingScreen, showNotification]);

  const handleRaiseHand = useCallback(() => {
    if (handRaised) {
      lowerHand();
    } else {
      raiseHand();
    }

    setHandRaised((prev) => !prev);
  }, [handRaised]);

  const handleAdminAction = useCallback(
    (action, targetSocketId) => {
      if (!socket || !conferenceId) return;
      socket.emit("conference:admin-action", {
        conferenceId,
        action,
        targetSocketId,
      });
    },
    [conferenceId, socket]
  );

  const toggleSpeakerMode = useCallback(() => {
    if (!socket || !conferenceId) return;

    const next = !speakerModeEnabled;
    setSpeakerModeEnabled(next);

    if (!next) {
      setActiveSpeaker(null);
      sendSpeakingStatus(false);
      speakingRef.current = false;
    }

    socket.emit("conference:toggle-speaker-mode", {
      conferenceId,
      enabled: next,
    });
  }, [conferenceId, socket, speakerModeEnabled]);

  const setAsSpeaker = useCallback(
    (targetSocketId) => {
      if (!socket || !conferenceId || !targetSocketId) return;

      socket.emit("conference:set-speaker", {
        conferenceId,
        targetSocketId,
      });
    },
    [conferenceId, socket]
  );

  const clearSpeaker = useCallback(() => {
    if (!socket || !conferenceId) return;

    socket.emit("conference:clear-speaker", { conferenceId });
    setActiveSpeaker(null);
  }, [conferenceId, socket]);

  const handleOpenAdminMenu = useCallback((event, participantId) => {
    setAdminMenuAnchor(event.currentTarget);
    setSelectedParticipantId(participantId);
  }, []);

  const handleCloseAdminMenu = useCallback(() => {
    setAdminMenuAnchor(null);
    setSelectedParticipantId(null);
  }, []);

  useEffect(
    () => () => {
      if (endFallbackTimerRef.current) {
        clearTimeout(endFallbackTimerRef.current);
        endFallbackTimerRef.current = null;
      }
    },
    []
  );

  useEffect(() => {
    setParticipantsPanelOpen(!isMobile);
  }, [isMobile]);

  useEffect(() => {
    if (!conferenceId) {
      showNotification("Conference ID is missing", "error");
      navigate("/teams");
      return;
    }

    if (!socket) {
      showNotification("Socket is not initialized", "error");
      navigate("/teams");
      return;
    }

    if (joinedRef.current) return;
    joinedRef.current = true;

    const join = async () => {
      if (!socket.connected) {
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            socket.off("connect", onConnect);
            reject(new Error("Socket connection timeout"));
          }, 5000);

          const onConnect = () => {
            clearTimeout(timeout);
            socket.off("connect", onConnect);
            resolve();
          };

          socket.on("connect", onConnect);
        }).catch((error) => {
          showNotification(error.message, "error");
          navigate("/teams");
        });
      }

      const joined = joinConference(conferenceId);
      if (!joined) {
        console.warn("Conference join request skipped by lock state");
      }

      // Conference starts with mic and camera off by default.
      setMicOn(false);
      setCamOn(false);
      emitMediaUpdate(false, false);
    };

    join();

    return () => {
      performLocalTeardown();
    };
  }, [conferenceId, emitMediaUpdate, navigate, performLocalTeardown, showNotification, socket]);

  useEffect(() => {
    if (!socket || !conferenceId) return;

    const onRemoteMedia = (event) => {
      const { socketId, audioStream, cameraStream, screenStream } = event.detail || {};
      if (!socketId) return;
      if (socketId === mySocketId) return;

      setRemoteMedia((prev) => ({
        ...prev,
        [socketId]: {
          audioStream: audioStream || null,
          cameraStream: cameraStream || null,
          screenStream: screenStream || null,
        },
      }));

      if (screenStream) {
        setScreenSharer(socketId);
      }
    };

    const onLocalScreenShare = (event) => {
      const active = Boolean(event.detail?.active);
      setSharingScreen(active);
      if (socket && conferenceId) {
        socket.emit("conference:screen-share-update", {
          conferenceId,
          active,
        });
      }

      if (active) {
        if (mySocketId) {
          setScreenSharer(mySocketId);
        }
        setLayout(LAYOUT.PRESENTATION);
        return;
      }

      setScreenSharer((prev) => (prev === mySocketId ? null : prev));
      setLayout((prev) =>
        prev === LAYOUT.PRESENTATION
          ? lastNonPresentationLayoutRef.current || LAYOUT.GRID
          : prev
      );
    };

    const onScreenShareUpdate = ({ socketId, active }) => {
      if (!socketId || socketId === mySocketId) return;

      if (active) {
        setScreenSharer(socketId);
        setLayout(LAYOUT.PRESENTATION);
        return;
      }

      setScreenSharer((prev) => (prev === socketId ? null : prev));
      setLayout((prev) =>
        prev === LAYOUT.PRESENTATION
          ? lastNonPresentationLayoutRef.current || LAYOUT.GRID
          : prev
      );
    };

    const onLocalAudioEnded = () => {
      setMicOn(false);
      emitMediaUpdate(false, camOn);
      showNotification("Microphone disconnected", "warning");
    };

    const onUserJoined = async ({ socketId }) => {
      if (!socketId || socketId === socket.id) return;
      await createOffer(socketId, socket);
    };

    const onOffer = async (payload) => {
      await handleWebRTCOffer(payload, socket);
    };

    const onAnswer = async (payload) => {
      await handleWebRTCAnswer(payload);
    };

    const onIceCandidate = async (payload) => {
      await handleWebRTCIceCandidate(payload);
    };

    const onUserLeft = ({ socketId }) => {
      removePeer(socketId);

      setRemoteMedia((prev) => {
        const copy = { ...prev };
        delete copy[socketId];
        return copy;
      });

      setActiveSpeaker((prev) => (prev === socketId ? null : prev));
      setScreenSharer((prev) => (prev === socketId ? null : prev));
    };

    const onParticipants = ({ participants: nextParticipants = [] }) => {
      setParticipants(nextParticipants);
    };

    const onConferenceState = ({ conference }) => {
      if (conference?.teamId) {
        setConferenceTeamId(conference.teamId);
      }
    };

    const onHandsUpdated = ({ raisedHands: nextRaisedHands = [] }) => {
      setRaisedHands(nextRaisedHands);
      setHandRaised(Boolean(mySocketId && nextRaisedHands.includes(mySocketId)));
    };

    const onMediaUpdate = ({ socketId, micOn: nextMicOn, camOn: nextCamOn }) => {
      setParticipants((prev) =>
        prev.map((participant) =>
          participant.socketId === socketId
            ? { ...participant, micOn: nextMicOn, camOn: nextCamOn }
            : participant
        )
      );
    };

    const onSpeakerModeToggled = ({ enabled }) => {
      setSpeakerModeEnabled(Boolean(enabled));
      if (!enabled) {
        setActiveSpeaker(null);
      }
    };

    const onActiveSpeaker = ({ socketId }) => {
      setActiveSpeaker(socketId || null);
    };

    const onSpeakerAssigned = ({ socketId }) => {
      setActiveSpeaker(socketId || null);
    };

    const onForceMute = async () => {
      await setMicEnabled(false);
      setMicOn(false);
      emitMediaUpdate(false, camOn);
      showNotification("Admin muted your microphone", "warning");
    };

    const onForceCameraOff = async () => {
      await stopCamera();
      setCamOn(false);
      emitMediaUpdate(micOn, false);
      showNotification("Admin turned off your camera", "warning");
    };

    const onRemovedByAdmin = async () => {
      showNotification("You were removed from the conference", "error");
      await leaveConferenceLocally();
    };

    const onConferenceError = ({ message }) => {
      if (!message) return;

      if (message.toLowerCase().includes("ended")) {
        handleConferenceEnded();
        return;
      }

      showNotification(message, "error");
    };

    window.addEventListener("webrtc:remote-media", onRemoteMedia);
    window.addEventListener("webrtc:local-screen-share", onLocalScreenShare);
    window.addEventListener("webrtc:local-audio-ended", onLocalAudioEnded);

    socket.on("conference:user-joined", onUserJoined);
    socket.on("conference:offer", onOffer);
    socket.on("conference:answer", onAnswer);
    socket.on("conference:ice-candidate", onIceCandidate);
    socket.on("conference:user-left", onUserLeft);
    socket.on("conference:participants", onParticipants);
    socket.on("conference:state", onConferenceState);
    socket.on("conference:hands-updated", onHandsUpdated);
    socket.on("conference:media-update", onMediaUpdate);
    socket.on("conference:active-speaker", onActiveSpeaker);
    socket.on("conference:speaker-mode-toggled", onSpeakerModeToggled);
    socket.on("conference:speaker-assigned", onSpeakerAssigned);
    socket.on("conference:force-mute", onForceMute);
    socket.on("conference:force-camera-off", onForceCameraOff);
    socket.on("conference:removed-by-admin", onRemovedByAdmin);
    socket.on("conference:screen-share-update", onScreenShareUpdate);
    socket.on("conference:ended", handleConferenceEnded);
    socket.on("conference:error", onConferenceError);

    return () => {
      window.removeEventListener("webrtc:remote-media", onRemoteMedia);
      window.removeEventListener("webrtc:local-screen-share", onLocalScreenShare);
      window.removeEventListener("webrtc:local-audio-ended", onLocalAudioEnded);

      socket.off("conference:user-joined", onUserJoined);
      socket.off("conference:offer", onOffer);
      socket.off("conference:answer", onAnswer);
      socket.off("conference:ice-candidate", onIceCandidate);
      socket.off("conference:user-left", onUserLeft);
      socket.off("conference:participants", onParticipants);
      socket.off("conference:state", onConferenceState);
      socket.off("conference:hands-updated", onHandsUpdated);
      socket.off("conference:media-update", onMediaUpdate);
      socket.off("conference:active-speaker", onActiveSpeaker);
      socket.off("conference:speaker-mode-toggled", onSpeakerModeToggled);
      socket.off("conference:speaker-assigned", onSpeakerAssigned);
      socket.off("conference:force-mute", onForceMute);
      socket.off("conference:force-camera-off", onForceCameraOff);
      socket.off("conference:removed-by-admin", onRemovedByAdmin);
      socket.off("conference:screen-share-update", onScreenShareUpdate);
      socket.off("conference:ended", handleConferenceEnded);
      socket.off("conference:error", onConferenceError);
    };
  }, [camOn, conferenceId, emitMediaUpdate, handleConferenceEnded, leaveConferenceLocally, micOn, mySocketId, showNotification, socket]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const hasScreen = Boolean(getScreenStream());
      setSharingScreen((prev) => (prev === hasScreen ? prev : hasScreen));

      if (hasScreen && mySocketId) {
        setScreenSharer((prev) => (prev === mySocketId ? prev : mySocketId));
      } else if (!hasScreen) {
        setScreenSharer((prev) => (prev === mySocketId ? null : prev));
      }
    }, 1200);

    return () => window.clearInterval(interval);
  }, [mySocketId]);

  useEffect(() => {
    if (!micOn) {
      if (speakingRef.current && speakerModeEnabled) {
        sendSpeakingStatus(false);
      }
      speakingRef.current = false;
      micLevelRef.current = 0;
      lastMicUiUpdateRef.current = 0;
      setMicLevel(0);
      return;
    }

    const stream = getAudioStream();
    if (!stream) return;

    let rafId = null;
    let analyser;
    let source;
    let audioContext;

    const evaluate = () => {
      const data = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(data);

      const avg = data.reduce((sum, value) => sum + value, 0) / data.length;
      const smooth = avg * 0.25 + micLevelRef.current * 0.75;
      micLevelRef.current = smooth;

      const speakingNow = smooth > 5;
      if (speakerModeEnabled && speakingNow !== speakingRef.current) {
        speakingRef.current = speakingNow;
        sendSpeakingStatus(speakingNow);
      }

      const now = performance.now();
      if (now - lastMicUiUpdateRef.current >= 120) {
        lastMicUiUpdateRef.current = now;
        setMicLevel((prev) => (Math.abs(prev - smooth) < 1 ? prev : smooth));
      }

      rafId = window.requestAnimationFrame(evaluate);
    };

    try {
      audioContext = new window.AudioContext();
      if (audioContext.state === "suspended") {
        audioContext.resume().catch(() => {});
      }
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;

      source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      rafId = window.requestAnimationFrame(evaluate);
    } catch (error) {
      console.error("Speaker detection failed", error);
    }

    return () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }

      if (source) {
        source.disconnect();
      }

      if (analyser) {
        analyser.disconnect();
      }

      if (audioContext) {
        audioContext.close();
      }
    };
  }, [micOn, speakerModeEnabled]);

  const remoteTileItems = useMemo(
    () =>
      remoteParticipants.map((participant) => ({
        participant,
        media: remoteMedia[participant.socketId] || {},
      })),
    [remoteMedia, remoteParticipants]
  );

  const presenterTile = useMemo(() => {
    if (screenSharer === mySocketId && getScreenStream()) {
      return {
        stream: getScreenStream(),
        label: "You",
        isLocal: true,
        isScreen: true,
      };
    }

    if (screenSharer && remoteMedia[screenSharer]?.screenStream) {
      const presenter = participantsWithFallback.find((p) => p.socketId === screenSharer);
      return {
        stream: remoteMedia[screenSharer].screenStream,
        label: getParticipantName(presenter),
        isLocal: false,
        isScreen: true,
      };
    }

    if (screenSharer && remoteMedia[screenSharer]?.cameraStream) {
      const presenter = participantsWithFallback.find((p) => p.socketId === screenSharer);
      return {
        stream: remoteMedia[screenSharer].cameraStream,
        label: getParticipantName(presenter),
        isLocal: false,
        isScreen: true,
      };
    }

    return {
      stream: getCameraStream(),
      label: "No one is presenting",
      isLocal: true,
      isScreen: false,
    };
  }, [mySocketId, participantsWithFallback, remoteMedia, screenSharer]);

  const tileCount = remoteParticipants.length + 1;
  const minGridWidth = isMobile ? 150 : 220;
  const gridColumns = `repeat(${Math.min(4, Math.max(1, Math.ceil(Math.sqrt(tileCount))))}, minmax(${minGridWidth}px, 1fr))`;

  const footerParticipantsCount = participantsWithFallback.length;

  return (
    <Box sx={{ display: "flex", height: "100dvh", background: "#000" }}>
      {remoteAudioEntries.map(([socketId, media]) => (
        <RemoteAudioPlayer key={`remote-audio-${socketId}`} stream={media.audioStream} />
      ))}

      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          p: { xs: 1, sm: 2 },
          minWidth: 0,
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 1 }}>
          <Typography color="white" fontWeight={600}>
            Conference Room
            {isAdminOrManager && (
              <Typography component="span" color="#4caf50" fontSize="0.8rem" ml={1}>
                (Admin)
              </Typography>
            )}
          </Typography>

          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Tooltip title="Grid layout">
              <IconButton
                onClick={() => {
                  lastNonPresentationLayoutRef.current = LAYOUT.GRID;
                  setLayout(LAYOUT.GRID);
                }}
                sx={{
                  background: layout === LAYOUT.GRID ? "#1976d2" : "#303030",
                  color: "white",
                }}
              >
                <GroupsIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="Speaker layout">
              <IconButton
                onClick={() => {
                  lastNonPresentationLayoutRef.current = LAYOUT.SPEAKER;
                  setLayout(LAYOUT.SPEAKER);
                }}
                sx={{
                  background: layout === LAYOUT.SPEAKER ? "#1976d2" : "#303030",
                  color: "white",
                }}
              >
                <PresentToAllIcon />
              </IconButton>
            </Tooltip>

            {isAdminOrManager && (
              <Tooltip title={speakerModeEnabled ? "Disable speaker mode" : "Enable speaker mode"}>
                <IconButton
                  onClick={toggleSpeakerMode}
                  sx={{
                    background: speakerModeEnabled ? "#00e676" : "#303030",
                    color: speakerModeEnabled ? "#000" : "white",
                  }}
                >
                  <VolumeUpIcon />
                </IconButton>
              </Tooltip>
            )}

            {isAdminOrManager && raisedHands.length > 0 && (
              <Tooltip title="Clear all raised hands">
                <IconButton
                  onClick={() => handleAdminAction("clear-hands")}
                  sx={{ background: "#ff9800", color: "white" }}
                >
                  <ClearAllIcon />
                </IconButton>
              </Tooltip>
            )}

            <Tooltip title={participantsPanelOpen ? "Hide participants" : "Show participants"}>
              <IconButton
                onClick={() => setParticipantsPanelOpen((prev) => !prev)}
                sx={{
                  background: participantsPanelOpen ? "#1976d2" : "#303030",
                  color: "white",
                }}
              >
                <PersonIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {speakerModeEnabled && (
          <Box
            sx={{
              mb: 2,
              p: 1,
              border: "1px solid rgba(0, 230, 118, 0.35)",
              borderRadius: 1,
              background: "rgba(0, 230, 118, 0.12)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 1,
            }}
          >
            <Typography color="#00e676" fontWeight={600}>
              Speaker Mode: {activeSpeaker ? getParticipantName(participantsWithFallback.find((p) => p.socketId === activeSpeaker)) : "Waiting"}
            </Typography>
            {isAdminOrManager && activeSpeaker && (
              <IconButton size="small" onClick={clearSpeaker} sx={{ color: "#ff5252" }}>
                <ClearAllIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
        )}

        {layout === LAYOUT.PRESENTATION && (
          <>
            <Box sx={{ flex: 1, mb: 2, minHeight: 0 }}>
              <VideoTile
                stream={presenterTile.stream}
                label={presenterTile.label}
                isLocal={presenterTile.isLocal}
                isScreen={presenterTile.isScreen}
                isActiveSpeaker={speakerModeEnabled && activeSpeaker === (screenSharer || mySocketId)}
              />
            </Box>

            <Box sx={{ display: "flex", gap: 1.25, overflowX: "auto", pb: 1 }}>
              <Box sx={{ width: { xs: 180, sm: 240 }, flexShrink: 0 }}>
                <VideoTile
                  stream={getCameraStream()}
                  label="You"
                  isLocal
                  small
                  isActiveSpeaker={speakerModeEnabled && activeSpeaker === mySocketId}
                >
                  {handRaised && <RaiseHandIndicator label="Hand Raised" />}
                </VideoTile>
              </Box>

              {remoteTileItems
                .filter(({ participant }) => participant.socketId !== screenSharer)
                .map(({ participant, media }) => (
                  <Box key={participant.socketId} sx={{ width: { xs: 180, sm: 240 }, flexShrink: 0, position: "relative" }}>
                    <VideoTile
                      stream={media.cameraStream}
                      label={getParticipantName(participant)}
                      small
                      isActiveSpeaker={speakerModeEnabled && activeSpeaker === participant.socketId}
                    >
                      {raisedHands.includes(participant.socketId) && <RaiseHandIndicator label="Hand Raised" />}
                    </VideoTile>

                    {isAdminOrManager && (
                      <IconButton
                        size="small"
                        onClick={(event) => handleOpenAdminMenu(event, participant.socketId)}
                        sx={{
                          position: "absolute",
                          top: 4,
                          right: 4,
                          background: "rgba(0,0,0,0.7)",
                          color: "white",
                        }}
                      >
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                ))}
            </Box>
          </>
        )}

        {layout === LAYOUT.SPEAKER && (
          <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 1.5, minHeight: 0 }}>
            <Box sx={{ flex: 2, minHeight: 0 }}>
              {activeSpeaker === mySocketId ? (
                <VideoTile
                  stream={getCameraStream()}
                  label="You"
                  isLocal
                  large
                  isActiveSpeaker
                >
                  {handRaised && <RaiseHandIndicator label="Hand Raised" />}
                </VideoTile>
              ) : (
                <VideoTile
                  stream={remoteMedia[activeSpeaker]?.cameraStream || null}
                  label={getParticipantName(participantsWithFallback.find((p) => p.socketId === activeSpeaker))}
                  large
                  isActiveSpeaker={Boolean(activeSpeaker)}
                />
              )}
            </Box>

            <Box
              sx={{
                flex: 1,
                display: "grid",
                gridTemplateColumns: {
                  xs: "repeat(auto-fit, minmax(140px, 1fr))",
                  sm: "repeat(auto-fit, minmax(180px, 1fr))",
                },
                gap: 1,
                minHeight: 180,
              }}
            >
              {activeSpeaker !== mySocketId && (
                <VideoTile
                  stream={getCameraStream()}
                  label="You"
                  isLocal
                  small
                  isActiveSpeaker={false}
                />
              )}

              {remoteTileItems
                .filter(({ participant }) => participant.socketId !== activeSpeaker)
                .map(({ participant, media }) => (
                  <Box key={participant.socketId} sx={{ position: "relative" }}>
                    <VideoTile
                      stream={media.cameraStream}
                      label={getParticipantName(participant)}
                      small
                    />

                    {isAdminOrManager && (
                      <IconButton
                        size="small"
                        onClick={(event) => handleOpenAdminMenu(event, participant.socketId)}
                        sx={{
                          position: "absolute",
                          top: 4,
                          right: 4,
                          background: "rgba(0,0,0,0.7)",
                          color: "white",
                        }}
                      >
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                ))}
            </Box>
          </Box>
        )}

        {layout === LAYOUT.GRID && (
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              display: "grid",
              gridTemplateColumns: gridColumns,
              gap: 1.5,
              overflow: "auto",
              alignContent: "start",
            }}
          >
            <VideoTile
              stream={getCameraStream()}
              label="You"
              isLocal
              isActiveSpeaker={speakerModeEnabled && activeSpeaker === mySocketId}
            >
              {handRaised && <RaiseHandIndicator label="Hand Raised" />}
            </VideoTile>

            {remoteTileItems.map(({ participant, media }) => (
              <Box key={participant.socketId} sx={{ position: "relative" }}>
                <VideoTile
                  stream={media.cameraStream}
                  label={getParticipantName(participant)}
                  isActiveSpeaker={speakerModeEnabled && activeSpeaker === participant.socketId}
                >
                  {raisedHands.includes(participant.socketId) && <RaiseHandIndicator label="Hand Raised" />}
                </VideoTile>

                {isAdminOrManager && (
                  <IconButton
                    size="small"
                    onClick={(event) => handleOpenAdminMenu(event, participant.socketId)}
                    sx={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      background: "rgba(0,0,0,0.7)",
                      color: "white",
                    }}
                  >
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>
            ))}
          </Box>
        )}

        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            flexWrap: "wrap",
            gap: 1.25,
            mt: 2,
            pt: 2,
            borderTop: "1px solid #333",
          }}
        >
          <Tooltip title={micOn ? "Mute microphone" : "Unmute microphone"}>
            <span>
              <IconButton
                onClick={handleToggleMic}
                sx={{
                  position: "relative",
                  backgroundColor: "#1e1e1e",
                  color: micOn ? `rgba(0, 230, 118, ${Math.min(micLevel / 60, 1)})` : "#9e9e9e",
                  border: micOn && micLevel > 12 ? "1px solid #00e676" : "1px solid #444",
                  boxShadow: micOn && micLevel > 15 ? "0 0 12px rgba(0, 230, 118, 0.75)" : "none",
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

          <Tooltip title={camOn ? "Turn camera off" : "Turn camera on"}>
            <IconButton
              onClick={handleToggleCam}
              sx={{ background: camOn ? "#1565c0" : "#424242", color: "white" }}
            >
              {camOn ? <VideocamIcon /> : <VideocamOffIcon />}
            </IconButton>
          </Tooltip>

          <Tooltip title={sharingScreen ? "Stop screen share" : "Start screen share"}>
            <IconButton
              onClick={handleScreenShare}
              sx={{ background: sharingScreen ? "#6a1b9a" : "#424242", color: "white" }}
            >
              {sharingScreen ? <StopScreenShareIcon /> : <ScreenShareIcon />}
            </IconButton>
          </Tooltip>

          <Tooltip title={handRaised ? "Lower hand" : "Raise hand"}>
            <IconButton
              onClick={handleRaiseHand}
              sx={{ background: handRaised ? "#f9a825" : "#424242", color: "white" }}
            >
              <PanToolIcon />
            </IconButton>
          </Tooltip>

          {isAdminOrManager && speakerModeEnabled && (
            <>
              <Tooltip title="Clear speaker">
                <IconButton onClick={clearSpeaker} sx={{ background: "#ff4444", color: "white" }}>
                  <ClearAllIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title="Set yourself as speaker">
                <IconButton onClick={() => setAsSpeaker(mySocketId)} sx={{ background: "#00e676", color: "#000" }}>
                  <MicExternalOnIcon />
                </IconButton>
              </Tooltip>
            </>
          )}

          <Tooltip title={isAdminOrManager ? "End conference" : "Leave conference"}>
            <IconButton
              onClick={handleEndConference}
              sx={{ background: "#d32f2f", color: "white" }}
            >
              <CallEndIcon />
            </IconButton>
          </Tooltip>
        </Box>

        <Box sx={{ mt: 1, display: "flex", justifyContent: "center", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          <Typography color="#aaa" variant="caption">
            Participants: {footerParticipantsCount}
          </Typography>
          <Typography color="#aaa" variant="caption">
            Hands Raised: {raisedHands.length}
          </Typography>
          {speakerModeEnabled && (
            <Typography color="#00e676" variant="caption">
              Speaker Mode
            </Typography>
          )}
          {isAdminOrManager && (
            <Typography color="#4caf50" variant="caption">
              Admin Mode
            </Typography>
          )}
          {sharingScreen && (
            <Typography color="#9c27b0" variant="caption">
              Screen Sharing
            </Typography>
          )}
        </Box>
      </Box>

      {participantsPanelOpen && (
        <ParticipantsPanel
          participants={participantsWithFallback}
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

      <Menu
        anchorEl={adminMenuAnchor}
        open={Boolean(adminMenuAnchor)}
        onClose={handleCloseAdminMenu}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuItem
          onClick={() => {
            handleAdminAction("mute", selectedParticipantId);
            handleCloseAdminMenu();
          }}
        >
          <ListItemIcon>
            <VolumeOffIcon fontSize="small" />
          </ListItemIcon>
          Force Mute
        </MenuItem>

        <MenuItem
          onClick={() => {
            handleAdminAction("camera-off", selectedParticipantId);
            handleCloseAdminMenu();
          }}
        >
          <ListItemIcon>
            <VideocamOffIcon fontSize="small" />
          </ListItemIcon>
          Turn Camera Off
        </MenuItem>

        {speakerModeEnabled && (
          <MenuItem
            onClick={() => {
              setAsSpeaker(selectedParticipantId);
              handleCloseAdminMenu();
            }}
          >
            <ListItemIcon>
              <VolumeUpIcon fontSize="small" color="success" />
            </ListItemIcon>
            <Typography color="success.main">Set as Speaker</Typography>
          </MenuItem>
        )}

        <MenuItem
          onClick={() => {
            handleAdminAction("lower-hand", selectedParticipantId);
            handleCloseAdminMenu();
          }}
        >
          <ListItemIcon>
            <HandshakeIcon fontSize="small" />
          </ListItemIcon>
          Lower Hand
        </MenuItem>

        <Divider />

        <MenuItem
          onClick={() => {
            handleAdminAction("remove-from-conference", selectedParticipantId);
            handleCloseAdminMenu();
          }}
        >
          <ListItemIcon>
            <PersonRemoveIcon fontSize="small" color="error" />
          </ListItemIcon>
          <Typography color="error">Remove from Conference</Typography>
        </MenuItem>
      </Menu>

      <Snackbar
        open={notification.open}
        autoHideDuration={4000}
        onClose={() => setNotification((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setNotification((prev) => ({ ...prev, open: false }))}
          severity={notification.severity}
          sx={{ width: "100%" }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
