import { Box, IconButton, Tooltip } from "@mui/material";
import MicOffIcon from "@mui/icons-material/MicOff";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import PanToolIcon from "@mui/icons-material/PanTool";

export default function AdminPanel({
  onMute,
  onCameraOff,
  onLowerHand,
}) {
  return (
    <Box sx={{ display: "flex", gap: 1 }}>
      <Tooltip title="Lower hand">
        <span>
          <IconButton
            size="small"
            onClick={onLowerHand}
            disabled={!onLowerHand}
          >
            <PanToolIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title="Mute user">
        <span>
          <IconButton
            size="small"
            onClick={onMute}
            disabled={!onMute}
          >
            <MicOffIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title="Turn off camera">
        <span>
          <IconButton
            size="small"
            onClick={onCameraOff}
            disabled={!onCameraOff}
          >
            <VideocamOffIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
}
