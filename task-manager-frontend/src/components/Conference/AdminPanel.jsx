import { Box, IconButton, Tooltip } from "@mui/material";
import MicOffIcon from "@mui/icons-material/MicOff";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import PanToolIcon from "@mui/icons-material/PanTool";

export default function AdminPanel({
  participantSocketId,
  onMute,
  onCameraOff,
  onLowerHand,
}) {
  return (
    <Box sx={{ display: "flex", gap: 1 }}>
      <Tooltip title="Lower hand">
        <IconButton size="small" onClick={onLowerHand}>
          <PanToolIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Tooltip title="Mute user">
        <IconButton size="small" onClick={onMute}>
          <MicOffIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Tooltip title="Turn off camera">
        <IconButton size="small" onClick={onCameraOff}>
          <VideocamOffIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );
}
