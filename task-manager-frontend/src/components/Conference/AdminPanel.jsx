import { Box, IconButton, Tooltip } from "@mui/material";
import MicOffIcon from "@mui/icons-material/MicOff";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import PanToolIcon from "@mui/icons-material/PanTool";
import PersonRemoveIcon from "@mui/icons-material/PersonRemove";
import RecordVoiceOverIcon from "@mui/icons-material/RecordVoiceOver";

export default function AdminPanel({
  onMute,
  onCameraOff,
  onLowerHand,
  onRemove,
  onSetSpeaker,
}) {
  return (
    <Box sx={{ display: "flex", gap: 0.25 }}>
      <Tooltip title="Lower hand">
        <span>
          <IconButton size="small" onClick={onLowerHand} disabled={!onLowerHand}>
            <PanToolIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title="Mute participant">
        <span>
          <IconButton size="small" onClick={onMute} disabled={!onMute}>
            <MicOffIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title="Turn camera off">
        <span>
          <IconButton size="small" onClick={onCameraOff} disabled={!onCameraOff}>
            <VideocamOffIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title="Set as speaker">
        <span>
          <IconButton size="small" onClick={onSetSpeaker} disabled={!onSetSpeaker}>
            <RecordVoiceOverIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title="Remove from conference">
        <span>
          <IconButton size="small" onClick={onRemove} disabled={!onRemove}>
            <PersonRemoveIcon fontSize="small" color="error" />
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
}
