import React, { useState, useEffect, useRef } from "react";
import { Box } from "@mui/material";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useAuth } from "../../context/AuthContext";

// 🔌 Socket helpers
import {
  initSocket,
  getSocket,
  connectSocket,
} from "../../services/socket";

const Layout = ({ children, toggleDarkMode, darkMode }) => {
  const { user } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const socketRef = useRef(null);

  const sidebarWidthOpen = 240;
  const sidebarWidthClosed = 64;

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  /* =====================================================
     SOCKET SETUP (SINGLE SOURCE OF TRUTH)
     ===================================================== */
  useEffect(() => {
    if (!user?._id) return;

    // 1️⃣ Init + connect socket ONCE per login
    initSocket(user._id);
    const socket = getSocket();
    socketRef.current = socket;

    if (!socket.connected) {
      connectSocket();
    }

    /* ---------------- TASKS ---------------- */
    socket.on("taskUpdated", ({ teamId }) => {
      window.dispatchEvent(
        new CustomEvent("invalidate:tasks", { detail: { teamId } })
      );
    });

    socket.on("taskDeleted", ({ teamId }) => {
      window.dispatchEvent(
        new CustomEvent("invalidate:tasks", { detail: { teamId } })
      );
    });

    /* ---------------- TEAMS / ROLES ---------------- */
    socket.on("memberUpdated", ({ teamId }) => {
      window.dispatchEvent(
        new CustomEvent("invalidate:teams", { detail: { teamId } })
      );
    });

    socket.on("teamUpdated", ({ teamId }) => {
      window.dispatchEvent(
        new CustomEvent("invalidate:teams", { detail: { teamId } })
      );
    });

    /* ---------------- COMMENTS ---------------- */
    socket.on("commentCreated", ({ taskId }) => {
      window.dispatchEvent(
        new CustomEvent("invalidate:comments", { detail: { taskId } })
      );
    });

    socket.on("commentDeleted", ({ taskId }) => {
      window.dispatchEvent(
        new CustomEvent("invalidate:comments", { detail: { taskId } })
      );
    });

    /* ---------------- EXTENSIONS ---------------- */
    socket.on("extensionUpdated", ({ teamId }) => {
      window.dispatchEvent(
        new CustomEvent("invalidate:extensions", { detail: { teamId } })
      );
    });

    /* ---------------- CONNECTION LOGS ---------------- */
    socket.on("connect", () => {
      console.log("✅ Socket connected");
    });

    socket.on("disconnect", (reason) => {
      console.warn("❌ Socket disconnected:", reason);
    });

    socket.on("connect_error", (err) => {
      console.error("⚠️ Socket error:", err.message);
    });

    /* ---------------- CLEANUP (NO DISCONNECT) ---------------- */
    return () => {
      if (!socket) return;

      socket.off("taskUpdated");
      socket.off("taskDeleted");
      socket.off("memberUpdated");
      socket.off("teamUpdated");
      socket.off("commentCreated");
      socket.off("commentDeleted");
      socket.off("extensionUpdated");
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
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
          backgroundColor: (theme) => theme.palette.background.default,
          width: `calc(100% - ${
            sidebarOpen ? sidebarWidthOpen : sidebarWidthClosed
          }px)`,
          marginLeft: `${sidebarOpen ? sidebarWidthOpen : sidebarWidthClosed}px`,
          transition: (theme) =>
            theme.transitions.create(["width", "margin"], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
          overflowY: "auto",
          minHeight: "100vh",
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
