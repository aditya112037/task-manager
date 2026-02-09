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
    const videoEl = ref.current;
    if (!videoEl) return;

    // 🚫 HARD GUARD — NEVER CRASH RENDER TREE
    if (!(stream instanceof MediaStream)) {
      if (videoEl.srcObject) {
        videoEl.srcObject = null;
      }
      return;
    }

    // ✅ Only assign if different (prevents flicker + errors)
    if (videoEl.srcObject !== stream) {
      videoEl.srcObject = stream;
    }

    const tryPlay = async () => {
      try {
        await videoEl.play();
      } catch (err) {
        // Autoplay restrictions are NORMAL — ignore safely
        console.debug("VideoTile autoplay blocked:", err?.message);
      }
    };

    tryPlay();

    return () => {
      // Cleanup ONLY for internally owned refs
      if (ref === internalRef && videoEl) {
        videoEl.srcObject = null;
      }
    };
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

  const hasValidStream = stream instanceof MediaStream;

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
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          backgroundColor: "#000",
          display: hasValidStream ? "block" : "none",
        }}
      />

      {/* Placeholder when no video */}
      {!hasValidStream && (
        <Box
          sx={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#111",
          }}
        >
          <Typography color="#666" variant="body2">
            {isLocal ? "Camera Off" : "No Video"}
          </Typography>
        </Box>
      )}

      {/* Active speaker badge */}
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
            zIndex: 2,
          }}
        >
          <VolumeUpIcon sx={{ fontSize: 14 }} />
          <Typography fontSize="0.7rem" fontWeight="bold" color="#000">
            SPEAKING
          </Typography>
        </Box>
      )}

      {/* Bottom gradient + label */}
      <Box
        sx={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          p: 1,
          background: "linear-gradient(transparent, rgba(0,0,0,0.8))",
          zIndex: 1,
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
            sx={{
              ml: 1,
              background: "#9c27b0",
              color: "#fff",
              fontSize: "0.7rem",
              height: 20,
            }}
          />
        )}
      </Box>

      {children && (
        <Box
          sx={{
            position: "absolute",
            top: 8,
            left: 8,
            zIndex: 2,
          }}
        >
          {children}
        </Box>
      )}
    </Box>
  );
}
