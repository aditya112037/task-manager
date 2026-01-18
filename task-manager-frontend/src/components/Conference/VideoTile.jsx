import React, { useEffect, useRef } from "react";
import { Box, Typography, Chip } from "@mui/material";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";

export default function VideoTile({
  stream,
  videoRef,
  label,
  isLocal = false,
  isScreen = false,
  small = false,
  large = false,
  isActiveSpeaker = false,
  children,
}) {
  const internalRef = useRef(null);
  const ref = videoRef || internalRef;

  useEffect(() => {
    if (!ref.current) return;
    if (!stream) return;

    if (ref.current.srcObject !== stream) {
      ref.current.srcObject = stream;
    }

    const playSafe = async () => {
      try {
        await ref.current.play();
      } catch (_) {}
    };

    playSafe();
  }, [stream, ref]);

  const sizeStyles = large
    ? { height: "100%", minHeight: 400 }
    : small
    ? { height: 180, width: 240 }
    : { height: "100%", minHeight: 240 };

  const borderStyles = isScreen
    ? { border: "3px solid #9c27b0" }
    : isActiveSpeaker
    ? { border: "3px solid #00e676" }
    : isLocal
    ? { border: "2px solid #2196f3" }
    : { border: "1px solid #333" };

  return (
    <Box
      sx={{
        position: "relative",
        background: "#111",
        borderRadius: 2,
        overflow: "hidden",
        ...sizeStyles,
        ...borderStyles,
      }}
    >
      <video
        ref={ref}
        autoPlay
        playsInline
        muted={isLocal}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />

      {isActiveSpeaker && (
        <Box
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            background: "#00e676",
            px: 1,
            py: 0.5,
            borderRadius: 2,
            display: "flex",
            alignItems: "center",
            gap: 0.5,
          }}
        >
          <VolumeUpIcon sx={{ fontSize: 14 }} />
          <Typography fontSize="0.7rem" fontWeight="bold">
            SPEAKING
          </Typography>
        </Box>
      )}

      <Box
        sx={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          p: 1,
          background: "linear-gradient(transparent, rgba(0,0,0,0.8))",
        }}
      >
        <Typography
          sx={{
            color: "#fff",
            fontSize: small ? "0.75rem" : "0.85rem",
            fontWeight: isActiveSpeaker ? "bold" : "normal",
          }}
        >
          {label}
          {isLocal && " (You)"}
        </Typography>

        {isScreen && (
          <Chip
            label="Screen"
            size="small"
            sx={{ ml: 1, background: "#9c27b0", color: "#fff" }}
          />
        )}
      </Box>

      {children && (
        <Box sx={{ position: "absolute", top: 8, left: 8 }}>
          {children}
        </Box>
      )}
    </Box>
  );
}
