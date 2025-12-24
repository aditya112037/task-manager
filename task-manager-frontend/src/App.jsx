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

  useEffect(() => {
    if (!user?._id) return;

    let socket;

    import("./services/socket")
      .then(({ initSocket, getSocket, connectSocket }) => {
        initSocket(user._id);
        socket = getSocket();

        if (!socket) return;

        connectSocket();

        // 🔴 TASKS INVALIDATION
        socket.on("invalidate:tasks", ({ teamId }) => {
          window.dispatchEvent(
            new CustomEvent("invalidate:tasks", { detail: { teamId } })
          );
        });

        // 🔴 TEAMS / ROLES INVALIDATION
        socket.on("invalidate:team", ({ teamId }) => {
          window.dispatchEvent(
            new CustomEvent("invalidate:teams", { detail: { teamId } })
          );
        });

        // 🔴 COMMENTS INVALIDATION
        socket.on("invalidate:comments", ({ taskId }) => {
          window.dispatchEvent(
            new CustomEvent("invalidate:comments", { detail: { taskId } })
          );
        });

        // 🔵 CONNECTION LOGGING (UX ONLY)
        socket.on("connect", () => {
          console.log("✅ Socket connected");
        });

        socket.on("disconnect", (reason) => {
          console.log("❌ Socket disconnected:", reason);
        });

        socket.on("connect_error", (err) => {
          console.error("⚠️ Socket connection error:", err);
        });
      })
      .catch((err) => {
        console.error("Failed to initialize socket:", err);
      });

    return () => {
      if (socket) {
        socket.off("invalidate:tasks");
        socket.off("invalidate:team");
        socket.off("invalidate:comments");
      }
    };
  }, [user]);

  return null;
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