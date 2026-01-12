import React, { useEffect, useRef } from "react";
import { Box, Typography } from "@mui/material";

export default function VideoTile({ stream, videoRef, label }) {
  const internalRef = useRef();

  useEffect(() => {
    if (stream && internalRef.current) {
      internalRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <Box sx={{ position: "relative", background: "#111", borderRadius: 2 }}>
      <video
        ref={videoRef || internalRef}
        autoPlay
        playsInline
        muted={label === "You"}
        style={{ width: "100%", height: "100%", borderRadius: 8 }}
      />
      <Typography
        sx={{
          position: "absolute",
          bottom: 8,
          left: 8,
          color: "white",
          fontSize: 12,
        }}
      >
        {label}
      </Typography>
    </Box>
  );
}
