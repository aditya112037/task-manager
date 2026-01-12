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
  children
}) {
  const internalRef = useRef();
  const videoElementRef = videoRef || internalRef;

  useEffect(() => {
    if (stream && videoElementRef.current) {
      videoElementRef.current.srcObject = stream;
    }
  }, [stream, videoElementRef]);

  // Determine video size and styling
  const getSizeStyles = () => {
    if (large) {
      return {
        height: "100%",
        minHeight: "400px",
      };
    }
    if (small) {
      return {
        height: "180px",
        width: "240px",
      };
    }
    return {
      height: "100%",
      minHeight: "240px",
    };
  };

  // Get border styling based on state
  const getBorderStyles = () => {
    if (isScreen) {
      return {
        border: "3px solid #9c27b0",
        boxShadow: "0 0 20px rgba(156, 39, 176, 0.4)",
      };
    }
    if (isActiveSpeaker) {
      return {
        border: "3px solid #00e676",
        boxShadow: "0 0 25px rgba(0, 230, 118, 0.4)",
      };
    }
    if (isLocal) {
      return {
        border: "2px solid #2196f3",
      };
    }
    return {
      border: "1px solid #333",
    };
  };

  return (
    <Box
      sx={{
        position: "relative",
        background: "#111",
        borderRadius: 2,
        overflow: "hidden",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        transform: isActiveSpeaker ? "scale(1.02)" : "scale(1)",
        ...getBorderStyles(),
        ...getSizeStyles(),
        "&:hover": {
          boxShadow: isActiveSpeaker 
            ? "0 0 30px rgba(0, 230, 118, 0.6)"
            : "0 0 15px rgba(33, 150, 243, 0.3)",
        },
      }}
    >
      <video
        ref={videoElementRef}
        autoPlay
        playsInline
        muted={isLocal}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
        }}
      />

      {/* SPEAKER INDICATOR */}
      {isActiveSpeaker && (
        <Box
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            background: "#00e676",
            color: "#000",
            padding: "4px 8px",
            borderRadius: 4,
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            animation: "pulse 2s infinite",
            "@keyframes pulse": {
              "0%": { opacity: 1 },
              "50%": { opacity: 0.7 },
              "100%": { opacity: 1 },
            },
          }}
        >
          <VolumeUpIcon sx={{ fontSize: 16 }} />
          <Typography
            sx={{
              fontSize: "0.7rem",
              fontWeight: "bold",
              lineHeight: 1,
            }}
          >
            SPEAKING
          </Typography>
        </Box>
      )}

      {/* LABEL */}
      <Box
        sx={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          background: "linear-gradient(transparent, rgba(0,0,0,0.8))",
          padding: 1,
          paddingTop: 3,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography
            sx={{
              color: "white",
              fontSize: small ? "0.75rem" : "0.875rem",
              fontWeight: isActiveSpeaker ? "bold" : "normal",
              textShadow: "1px 1px 2px rgba(0,0,0,0.8)",
            }}
          >
            {label}
            {isLocal && " (You)"}
          </Typography>
          
          {/* ADDITIONAL STATUS CHIPS */}
          {isScreen && (
            <Chip
              label="Screen"
              size="small"
              sx={{
                background: "#9c27b0",
                color: "white",
                fontSize: "0.6rem",
                height: "20px",
              }}
            />
          )}
          
          {isLocal && !isActiveSpeaker && (
            <Chip
              label="You"
              size="small"
              sx={{
                background: "#2196f3",
                color: "white",
                fontSize: "0.6rem",
                height: "20px",
              }}
            />
          )}
        </Box>
      </Box>

      {/* ADDITIONAL CHILDREN (like raise hand indicator) */}
      {children && (
        <Box sx={{ position: "absolute", top: 8, left: 8 }}>
          {children}
        </Box>
      )}

      {/* AUDIO VISUALIZER (Optional for active speaker) */}
      {isActiveSpeaker && (
        <Box
          sx={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "4px",
            background: "linear-gradient(90deg, #00e676, #00c853, #00e676)",
            animation: "wave 2s infinite linear",
            "@keyframes wave": {
              "0%": { backgroundPosition: "0% 50%" },
              "100%": { backgroundPosition: "200% 50%" },
            },
          }}
        />
      )}
    </Box>
  );
}