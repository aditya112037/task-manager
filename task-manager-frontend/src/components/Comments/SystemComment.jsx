import { Typography, Box } from "@mui/material";

export default function SystemComment({ text }) {
  return (
    <Box sx={{ textAlign: "center", my: 1 }}>
      <Typography
        variant="caption"
        sx={{
          color: "text.secondary",
          fontStyle: "italic",
        }}
      >
        {text}
      </Typography>
    </Box>
  );
}
