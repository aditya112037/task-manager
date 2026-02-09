import {
  Box,
  Typography,
  Stack,
  Tooltip,
  Avatar,
  IconButton,
} from "@mui/material";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import PanToolIcon from "@mui/icons-material/PanTool";
import CloseIcon from "@mui/icons-material/Close";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";

import AdminPanel from "./AdminPanel";



export default function ParticipantsPanel({
  participants = [],
  raisedHands = [],
  isAdminOrManager,
  onAdminAction,
  currentUserId,
  onClose,
  speakerModeEnabled,
  activeSpeaker,
  onSetSpeaker,
  onToggleSpeakerMode,
}) {
  return (
    <Box
      sx={{
        width: 280,
        background: "#111",
        color: "white",
        borderLeft: "1px solid #222",
        p: 2,
        overflowY: "auto",
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography fontWeight={600}>
          Participants ({participants.length})
        </Typography>
        {onClose && (
          <IconButton onClick={onClose} size="small" sx={{ color: "#aaa" }}>
            <CloseIcon />
          </IconButton>
        )}
      </Box>

      <Stack spacing={1.5}>
        {participants.map((p) => {
          const handRaised = raisedHands.includes(p.socketId);
          const isCurrentUser = p.userId === currentUserId;
          const roleLabel = p.role === "admin" ? "Host" : "Participant";
          // ✅ Use the correct property names with fallbacks
          const displayName = p.userName || p.name || "User";
          const micOn = p.socketId === currentUserId
  ? !!getAudioStream()
  : Boolean(p.micOn);
          const camOn = Boolean(p.camOn);
          const isActiveSpeaker = speakerModeEnabled && activeSpeaker === p.socketId;

          return (
            <Box
              key={p.socketId}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1,
                p: 1,
                borderRadius: 1,
                background: isActiveSpeaker 
                  ? "rgba(0, 230, 118, 0.15)" 
                  : handRaised 
                    ? "#1c1c1c" 
                    : "transparent",
                border: isActiveSpeaker 
                  ? "1px solid rgba(0, 230, 118, 0.3)" 
                  : "1px solid transparent",
              }}
            >
              {/* USER INFO */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flex: 1 }}>
                <Avatar sx={{ 
                  width: 32, 
                  height: 32,
                  bgcolor: isCurrentUser ? "#1976d2" : "#333",
                }}>
                  {displayName[0]?.toUpperCase() || "U"}
                </Avatar>

                <Box sx={{ flex: 1 }}>
                  <Typography fontSize="0.85rem" fontWeight={isCurrentUser ? 600 : 400}>
                    {displayName} {isCurrentUser && "(You)"}
                  </Typography>
                  <Typography fontSize="0.7rem" color="#aaa">
                    {roleLabel}
                  </Typography>
                </Box>
              </Box>

              {/* STATUS INDICATORS */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                {/* Active Speaker Indicator */}
                {isActiveSpeaker && (
                  <Tooltip title="Active Speaker">
                    <VolumeUpIcon fontSize="small" sx={{ color: "#00e676" }} />
                  </Tooltip>
                )}
                
                {/* Hand Raised Indicator */}
                {handRaised && (
                  <Tooltip title="Hand raised">
                    <PanToolIcon
                      fontSize="small"
                      sx={{ color: "#ffca28" }}
                    />
                  </Tooltip>
                )}

                {/* Mic Status */}
                {micOn ? (
                  <MicIcon fontSize="small" sx={{ color: "#4caf50" }} />
                ) : (
                  <MicOffIcon fontSize="small" color="error" />
                )}

                {/* Camera Status */}
                {camOn ? (
                  <VideocamIcon fontSize="small" sx={{ color: "#2196f3" }} />
                ) : (
                  <VideocamOffIcon fontSize="small" color="error" />
                )}

                {/* Admin Actions */}
                {isAdminOrManager && !isCurrentUser && (
                  <AdminPanel
                    participantSocketId={p.socketId}
                    onLowerHand={() => onAdminAction("lower-hand", p.socketId)}
                    onMute={() => onAdminAction("mute", p.socketId)}
                    onCameraOff={() => onAdminAction("camera-off", p.socketId)}
                    onSetSpeaker={() => onSetSpeaker && onSetSpeaker(p.socketId)}
                    speakerModeEnabled={speakerModeEnabled}
                  />
                )}
              </Box>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}