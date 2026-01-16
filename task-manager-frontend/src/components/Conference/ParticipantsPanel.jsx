import {
  Box,
  Typography,
  Stack,
  Tooltip,
  Avatar,
  Chip,
} from "@mui/material";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import PanToolIcon from "@mui/icons-material/PanTool";

import AdminPanel from "./AdminPanel";

export default function ParticipantsPanel({
  participants,
  raisedHands,
  isAdminOrManager,
  onAdminAction,
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
      <Typography fontWeight={600} mb={2}>
        Participants ({participants.length})
      </Typography>

      <Stack spacing={1.5}>
        {participants.map((p) => {
          const handRaised = raisedHands.includes(p.socketId);

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
                background: handRaised ? "#1c1c1c" : "transparent",
              }}
            >
              {/* USER */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Avatar sx={{ width: 32, height: 32 }}>
                  {p.name?.[0]?.toUpperCase()}
                </Avatar>

                <Box>
                  <Typography fontSize="0.85rem">
                    {p.name || "User"}
                  </Typography>

                  {p.role !== "member" && (
                    <Chip
                      size="small"
                      label={p.role}
                      color="primary"
                      sx={{ height: 18 }}
                    />
                  )}
                </Box>
              </Box>

              {/* STATUS + ADMIN */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                {handRaised && (
                  <Tooltip title="Hand raised">
                    <PanToolIcon
                      fontSize="small"
                      sx={{ color: "#ffca28" }}
                    />
                  </Tooltip>
                )}

                {p.micOn ? (
                  <MicIcon fontSize="small" />
                ) : (
                  <MicOffIcon fontSize="small" color="error" />
                )}

                {p.camOn ? (
                  <VideocamIcon fontSize="small" />
                ) : (
                  <VideocamOffIcon fontSize="small" color="error" />
                )}

                {isAdminOrManager && p.role === "member" && (
                  <AdminPanel
                    participantSocketId={p.socketId}
                    onLowerHand={() =>
                      onAdminAction("lower-hand", p.socketId)
                    }
                    onMute={() =>
                      onAdminAction("mute", p.socketId)
                    }
                    onCameraOff={() =>
                      onAdminAction("camera-off", p.socketId)
                    }
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
