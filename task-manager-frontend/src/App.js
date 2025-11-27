import React, { useMemo, useState, useEffect } from "react";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/Layout/Layout";
import Login from "./components/Auth/Login";
import Register from "./components/Auth/Register";
import OAuthSuccess from "./components/Auth/OAuthSuccess";

import Dashboard from "./pages/Dashboard";
import TaskList from "./components/Task/TaskList";
import TeamsHome from "./pages/TeamsHome";
import TeamDetails from "./pages/TeamDetails";
import CreateTeam from "./pages/CreateTeam";
import JoinTeam from "./pages/JoinTeam";

import "./App.css";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  return user ? children : <Navigate to="/login" />;
};

const App = () => {
  const [darkMode, setDarkMode] = useState(false);

  // Load theme preference
  useEffect(() => {
    const saved = localStorage.getItem("darkMode");
    if (saved) setDarkMode(saved === "true");
  }, []);

  // Save theme preference
  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem("darkMode", newMode);
  };

  // Create theme
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: darkMode ? "dark" : "light",
          primary: {
            main: "#1976d2",
          },
        },
      }),
    [darkMode]
  );

  return (
    <AuthProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline /> {/* Enables global dark mode styling */}
        <Router>
          <Routes>
            <Route
              path="/login"
              element={
                <Layout toggleDarkMode={toggleDarkMode} darkMode={darkMode}>
                  <Login />
                </Layout>
              }
            />

            <Route
              path="/register"
              element={
                <Layout toggleDarkMode={toggleDarkMode} darkMode={darkMode}>
                  <Register />
                </Layout>
              }
            />

            <Route path="/oauth-success" element={<OAuthSuccess />} />

            <Route
              path="/join/:inviteCode"
              element={
                <Layout toggleDarkMode={toggleDarkMode} darkMode={darkMode}>
                  <JoinTeam />
                </Layout>
              }
            />

            {/* Protected Routes */}
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
};

export default App;
