import { Box, Typography } from "@mui/material";
import PanToolIcon from "@mui/icons-material/PanTool";

export default function RaiseHandIndicator({ label }) {
  return (
    <Box
      sx={{
        position: "absolute",
        top: 8,
        right: 8,
        background: "rgba(255,193,7,0.9)",
        borderRadius: 2,
        px: 1,
        py: 0.5,
        display: "flex",
        alignItems: "center",
        gap: 0.5,
        zIndex: 2,
      }}
    >
      <PanToolIcon fontSize="small" />
      <Typography fontSize="0.7rem" fontWeight={600}>
        {label}
      </Typography>
    </Box>
  );
}
