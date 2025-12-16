import React, { useMemo, useState, useEffect } from "react";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/Layout/Layout";

import Login from "./components/Auth/Login";
import Register from "./components/Auth/Register";
import OAuthSuccess from "./components/Auth/OAuthSuccess";
import Dashboard from "./pages/Dashboard";

import TeamsHome from "./pages/TeamsHome";
import TeamDetails from "./pages/TeamDetails";
import CreateTeam from "./pages/CreateTeam";
import JoinTeam from "./pages/JoinTeam";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  return user ? children : <Navigate to="/login" />;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  return !user ? children : <Navigate to="/" />;
};

function AppContent() {
  const { user } = useAuth();
  
  // Initialize socket connection and set up comment listeners
  useEffect(() => {
    if (!user?._id) return;
    
    // Dynamically import socket service to avoid SSR issues
    import("./services/socket").then(socketModule => {
      const { initSocket, getSocket } = socketModule;
      
      // Initialize socket
      initSocket(user._id);
      const socket = getSocket();
      
      if (!socket) {
        console.error("Socket not initialized");
        return;
      }

      // Listen for comment events from backend
      socket.on("commentCreated", ({ taskId, comment }) => {
        console.log("commentCreated event received:", taskId, comment);
        
        // Dispatch event that TaskComments.jsx will listen for
        window.dispatchEvent(
          new CustomEvent("comment:refresh", {
            detail: { taskId }
          })
        );
        
        // Also dispatch specific comment for instant UI update
        window.dispatchEvent(
          new CustomEvent("comment:new", {
            detail: { taskId, comment }
          })
        );
      });
      
      // Listen for comment deleted events
      socket.on("commentDeleted", ({ taskId, commentId }) => {
        console.log("commentDeleted event received:", taskId, commentId);
        
        window.dispatchEvent(
          new CustomEvent("comment:delete", {
            detail: { taskId, commentId }
          })
        );
      });

      // Handle socket connection events
      socket.on("connect", () => {
        console.log("Socket connected");
      });

      socket.on("disconnect", () => {
        console.log("Socket disconnected");
      });

      socket.on("connect_error", (error) => {
        console.error("Socket connection error:", error);
      });
    }).catch(err => {
      console.error("Failed to load socket module:", err);
    });

    // Cleanup function
    return () => {
      // Cleanup will be handled by the socket service's disconnectSocket
    };
  }, [user]);

  return null; // This component doesn't render anything
}

function App() {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("darkMode");
    if (saved) setDarkMode(saved === "true");
  }, []);

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem("darkMode", next);
  };

  // ⭐ FULL Dark Mode Theme
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: darkMode ? "dark" : "light",
          background: {
            default: darkMode ? "#121212" : "#f5f5f5",
            paper: darkMode ? "#1E1E1E" : "#ffffff",
          },
          sidebar: {
            main: darkMode ? "#1E1E1E" : "#1976d2",
            hover: darkMode ? "#2d2d2d" : "#1565c0",
            text: darkMode ? "#ffffff" : "#ffffff",
          },
          header: {
            main: darkMode ? "#1F1F1F" : "#1976d2",
          },
        },
        components: {
          MuiCssBaseline: {
            styleOverrides: {
              body: {
                backgroundColor: darkMode ? "#121212" : "#f5f5f5",
                transition: "background-color 0.3s ease",
              },
            },
          },
        },
      }),
    [darkMode]
  );

  return (
    <AuthProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        
        {/* Socket Setup Component - runs after auth is initialized */}
        <AppContent />

        <Router>
          <Routes>
            {/* LOGIN / REGISTER - NO SIDEBAR */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicRoute>
                  <Register />
                </PublicRoute>
              }
            />
            <Route path="/oauth-success" element={<OAuthSuccess />} />

            <Route
              path="/join-team"
              element={
                <ProtectedRoute>
                  <Layout toggleDarkMode={toggleDarkMode} darkMode={darkMode}>
                    <JoinTeam />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route path="/join/:inviteCode" element={<JoinTeam />} />

            {/* PROTECTED ROUTES WITH LAYOUT */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout toggleDarkMode={toggleDarkMode} darkMode={darkMode}>
                    <Dashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/teams"
              element={
                <ProtectedRoute>
                  <Layout toggleDarkMode={toggleDarkMode} darkMode={darkMode}>
                    <TeamsHome />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/teams/create"
              element={
                <ProtectedRoute>
                  <Layout toggleDarkMode={toggleDarkMode} darkMode={darkMode}>
                    <CreateTeam />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/teams/:teamId"
              element={
                <ProtectedRoute>
                  <Layout toggleDarkMode={toggleDarkMode} darkMode={darkMode}>
                    <TeamDetails />
                  </Layout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;