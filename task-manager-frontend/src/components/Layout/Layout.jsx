import React, { useState, useEffect, useRef } from "react";
import { Box, useTheme, useMediaQuery } from "@mui/material";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useAuth } from "../../context/AuthContext";

// 🔌 Socket helpers
import { getSocket } from "../../services/socket";

const Layout = ({ children, toggleDarkMode, darkMode }) => {
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const socketRef = useRef(null);

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  /* =====================================================
     SOCKET SETUP (SINGLE SOURCE OF TRUTH)
     ===================================================== */
  useEffect(() => {
    if (!user?._id) return;

    const socket = getSocket();
    if (!socket) return;

    socketRef.current = socket;

    // 🔁 TASKS
    const onTasksInvalidate = (payload) => {
      // ✅ FIX: Handle both payload formats
      const teamId = payload?.teamId ?? payload?.detail?.teamId;
      if (teamId) {
        window.dispatchEvent(
          new CustomEvent("invalidate:tasks", { detail: { teamId } })
        );
      }
    };

    // 💬 COMMENTS
    const onCommentsInvalidate = (payload) => {
      // ✅ FIX: Handle both payload formats
      const taskId = payload?.taskId ?? payload?.detail?.taskId;
      if (taskId) {
        window.dispatchEvent(
          new CustomEvent("invalidate:comments", { detail: { taskId } })
        );
      }
    };

    const onCommentCreated = (payload) => {
      const taskId = payload?.taskId ?? payload?.detail?.taskId;
      const comment = payload?.comment ?? payload?.detail?.comment;
      if (!taskId || !comment) return;

      window.dispatchEvent(
        new CustomEvent("comment:created", { detail: { taskId, comment } })
      );
    };

    const onCommentDeleted = (payload) => {
      const taskId = payload?.taskId ?? payload?.detail?.taskId;
      const commentId = payload?.commentId ?? payload?.detail?.commentId;
      if (!taskId || !commentId) return;

      window.dispatchEvent(
        new CustomEvent("comment:deleted", { detail: { taskId, commentId } })
      );
    };

    // 👥 TEAMS / ROLES
    const onTeamsInvalidate = (payload) => {
      // ✅ FIX: Handle both payload formats
      const teamId = payload?.teamId ?? payload?.detail?.teamId;
      if (teamId) {
        window.dispatchEvent(
          new CustomEvent("invalidate:teams", { detail: { teamId } })
        );
      }
    };

    const onExtensionsInvalidate = (payload) => {
      const teamId = payload?.teamId ?? payload?.detail?.teamId;
      if (teamId) {
        window.dispatchEvent(
          new CustomEvent("invalidate:extensions", { detail: { teamId } })
        );
      }
    };

    socket.on("invalidate:tasks", onTasksInvalidate);
    socket.on("invalidate:comments", onCommentsInvalidate);
    socket.on("invalidate:teams", onTeamsInvalidate);
    socket.on("invalidate:extensions", onExtensionsInvalidate);
    socket.on("comment:created", onCommentCreated);
    socket.on("comment:deleted", onCommentDeleted);

    return () => {
      socket.off("invalidate:tasks", onTasksInvalidate);
      socket.off("invalidate:comments", onCommentsInvalidate);
      socket.off("invalidate:teams", onTeamsInvalidate);
      socket.off("invalidate:extensions", onExtensionsInvalidate);
      socket.off("comment:created", onCommentCreated);
      socket.off("comment:deleted", onCommentDeleted);
    };
  }, [user?._id]);

  /* =====================================================
     LAYOUT UI
  ===================================================== */
  return (
    <Box sx={{ display: "flex", minHeight: "100dvh" }}>
      <Sidebar open={sidebarOpen} toggleSidebar={toggleSidebar} isMobile={isMobile} />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minHeight: "100vh",
          backgroundColor: "transparent",
          transition: theme.transitions.create("margin", {
            easing: theme.transitions.easing.easeInOut,
            duration: theme.transitions.duration.standard,
          }),
          overflowY: "auto",
        }}
      >
        <Header
          toggleDarkMode={toggleDarkMode}
          darkMode={darkMode}
          sidebarOpen={sidebarOpen}
          toggleSidebar={toggleSidebar}
          isMobile={isMobile}
        />

        <Box
          sx={{
            px: { xs: 1.5, sm: 2.5 },
            pb: 2.5,
            pt: "84px",
            maxWidth: "1680px",
            mx: "auto",
            width: "100%",
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;
