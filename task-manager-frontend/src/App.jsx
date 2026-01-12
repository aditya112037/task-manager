import React, { useMemo, useState, useEffect } from "react";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/Layout/Layout";
import ConferenceRoom from "./pages/ConferenceRoom";
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
            <Route
              path="/conference/:conferenceId"
              element={
                <ProtectedRoute>
                  <ConferenceRoom />
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