import {
  Avatar,
  Box,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import PanToolIcon from "@mui/icons-material/PanTool";
import CloseIcon from "@mui/icons-material/Close";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import AdminPanel from "./AdminPanel";

const displayName = (participant) => participant?.name || participant?.userName || "Participant";

export default function ParticipantsPanel({
  participants = [],
  raisedHands = [],
  isAdminOrManager = false,
  onAdminAction,
  currentSocketId,
  onClose,
  speakerModeEnabled = false,
  activeSpeaker = null,
  onSetSpeaker,
}) {
  const orderedParticipants = [...participants].sort((a, b) => {
    if (a.socketId === currentSocketId) return -1;
    if (b.socketId === currentSocketId) return 1;
    return displayName(a).localeCompare(displayName(b));
  });

  return (
    <Box
      sx={{
        width: 300,
        background: "#111",
        color: "white",
        borderLeft: "1px solid #222",
        p: 2,
        overflowY: "auto",
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography fontWeight={600}>Participants ({participants.length})</Typography>
        {onClose && (
          <IconButton onClick={onClose} size="small" sx={{ color: "#aaa" }}>
            <CloseIcon />
          </IconButton>
        )}
      </Box>

      <Stack spacing={1.25}>
        {orderedParticipants.map((p) => {
          const isCurrentUser = p.socketId === currentSocketId;
          const handRaised = raisedHands.includes(p.socketId);
          const isActiveSpeaker = speakerModeEnabled && activeSpeaker === p.socketId;
          const roleLabel = p.role === "admin" || (isCurrentUser && participants.length === 1)
            ? "Host"
            : p.role === "manager"
              ? "Manager"
              : "Participant";

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
                    ? "rgba(255, 202, 40, 0.1)"
                    : "transparent",
                border: isActiveSpeaker
                  ? "1px solid rgba(0, 230, 118, 0.3)"
                  : "1px solid transparent",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0, flex: 1 }}>
                <Avatar sx={{ width: 32, height: 32, bgcolor: isCurrentUser ? "#1976d2" : "#333" }}>
                  {displayName(p)[0]?.toUpperCase() || "U"}
                </Avatar>

                <Box sx={{ minWidth: 0 }}>
                  <Typography fontSize="0.85rem" fontWeight={isCurrentUser ? 700 : 500} noWrap>
                    {displayName(p)} {isCurrentUser ? "(You)" : ""}
                  </Typography>
                  <Typography fontSize="0.7rem" color="#aaa">
                    {roleLabel}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                {isActiveSpeaker && (
                  <Tooltip title="Active speaker">
                    <VolumeUpIcon fontSize="small" sx={{ color: "#00e676" }} />
                  </Tooltip>
                )}

                {handRaised && (
                  <Tooltip title="Hand raised">
                    <PanToolIcon fontSize="small" sx={{ color: "#ffca28" }} />
                  </Tooltip>
                )}

                {Boolean(p.micOn) ? (
                  <MicIcon fontSize="small" sx={{ color: "#4caf50" }} />
                ) : (
                  <MicOffIcon fontSize="small" color="error" />
                )}

                {Boolean(p.camOn) ? (
                  <VideocamIcon fontSize="small" sx={{ color: "#2196f3" }} />
                ) : (
                  <VideocamOffIcon fontSize="small" color="error" />
                )}

                {isAdminOrManager && !isCurrentUser && (
                  <AdminPanel
                    onLowerHand={() => onAdminAction?.("lower-hand", p.socketId)}
                    onMute={() => onAdminAction?.("mute", p.socketId)}
                    onCameraOff={() => onAdminAction?.("camera-off", p.socketId)}
                    onRemove={() => onAdminAction?.("remove-from-conference", p.socketId)}
                    onSetSpeaker={speakerModeEnabled ? () => onSetSpeaker?.(p.socketId) : null}
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
