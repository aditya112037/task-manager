import React, { useState, useEffect, useRef } from "react";
import { Box, useTheme } from "@mui/material";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useAuth } from "../../context/AuthContext";

// 🔌 Socket helpers
import { getSocket } from "../../services/socket";

const Layout = ({ children, toggleDarkMode, darkMode }) => {
  const { user } = useAuth();
  const theme = useTheme();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const socketRef = useRef(null);

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

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

    socket.on("invalidate:tasks", onTasksInvalidate);
    socket.on("invalidate:comments", onCommentsInvalidate);
    socket.on("invalidate:teams", onTeamsInvalidate);

    return () => {
      socket.off("invalidate:tasks", onTasksInvalidate);
      socket.off("invalidate:comments", onCommentsInvalidate);
      socket.off("invalidate:teams", onTeamsInvalidate);
    };
  }, [user?._id]);

  /* =====================================================
     LAYOUT UI
     ===================================================== */
  return (
    <Box sx={{ display: "flex", height: "100vh" }}>
      {/* Sidebar */}
      <Sidebar open={sidebarOpen} toggleSidebar={toggleSidebar} />

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minHeight: "100vh",
          backgroundColor: theme.palette.background.default,
          transition: theme.transitions.create("margin", {
            easing: theme.transitions.easing.easeInOut,
            duration: theme.transitions.duration.standard,
          }),
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <Header
          toggleDarkMode={toggleDarkMode}
          darkMode={darkMode}
          sidebarOpen={sidebarOpen}
          toggleSidebar={toggleSidebar}
        />

        {/* Page Content */}
        <Box sx={{ p: 2 }}>{children}</Box>
      </Box>
    </Box>
  );
};

export default Layout;