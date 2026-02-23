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
import Profile from "./pages/Profile";
import {
  LandingPage,
  FeaturesPage,
  PricingPage,
  AboutPage,
  ContactPage,
  PrivacyPage,
  TermsPage,
  SecurityPage,
  BlogPage,
} from "./pages/public/MarketingPages";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  return user ? children : <Navigate to="/login" />;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  return !user ? children : <Navigate to="/app" />;
};

function AppContent() {
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

  const theme = useMemo(
    () => {
      const lightPalette = {
        mode: "light",
        primary: { main: "#0f766e", light: "#39a99b", dark: "#0b4f4a", contrastText: "#f5f7f6" },
        secondary: { main: "#b08968", light: "#d0a784", dark: "#7a5d45", contrastText: "#111827" },
        background: { default: "#f5f3ee", paper: "rgba(255, 255, 255, 0.84)" },
        text: { primary: "#172029", secondary: "#4c5965" },
        divider: "rgba(12, 28, 38, 0.14)",
        sidebar: {
          background: "linear-gradient(195deg, #102234 0%, #08141f 100%)",
          hover: "rgba(208, 167, 132, 0.18)",
          active: "rgba(208, 167, 132, 0.24)",
          text: "#f4eee6",
        },
        header: { background: "rgba(7, 20, 32, 0.88)" },
      };

      const darkPalette = {
        mode: "dark",
        primary: { main: "#41b3a4", light: "#6dcfc3", dark: "#2f8379", contrastText: "#081b19" },
        secondary: { main: "#c9a27f", light: "#e0c1a7", dark: "#8f6e52", contrastText: "#141210" },
        background: { default: "#070d14", paper: "rgba(14, 24, 35, 0.82)" },
        text: { primary: "#e9ecef", secondary: "#a8b4bf" },
        divider: "rgba(210, 222, 233, 0.16)",
        sidebar: {
          background: "linear-gradient(200deg, #08131d 0%, #040a11 100%)",
          hover: "rgba(201, 162, 127, 0.16)",
          active: "rgba(201, 162, 127, 0.24)",
          text: "#f4eadf",
        },
        header: { background: "rgba(4, 10, 16, 0.88)" },
      };

      return createTheme({
        palette: darkMode ? darkPalette : lightPalette,
        shape: { borderRadius: 14 },
        typography: {
          fontFamily: '"Manrope", "Avenir Next", "Segoe UI", sans-serif',
          h1: { fontFamily: '"Cormorant Garamond", serif', fontWeight: 700, letterSpacing: 0.3 },
          h2: { fontFamily: '"Cormorant Garamond", serif', fontWeight: 700, letterSpacing: 0.25 },
          h3: { fontFamily: '"Cormorant Garamond", serif', fontWeight: 700, letterSpacing: 0.2 },
          h4: { fontFamily: '"Cormorant Garamond", serif', fontWeight: 700, letterSpacing: 0.16 },
          h5: { fontFamily: '"Cormorant Garamond", serif', fontWeight: 700, letterSpacing: 0.12 },
          h6: { fontFamily: '"Cormorant Garamond", serif', fontWeight: 700, letterSpacing: 0.1 },
          button: { fontWeight: 700, letterSpacing: 0.4, textTransform: "none" },
          subtitle1: { letterSpacing: 0.22 },
          subtitle2: { letterSpacing: 0.18 },
        },
        shadows: [
          "none",
          "0 10px 28px rgba(6, 16, 24, 0.12)",
          "0 12px 30px rgba(6, 16, 24, 0.14)",
          "0 14px 32px rgba(6, 16, 24, 0.16)",
          "0 16px 34px rgba(6, 16, 24, 0.17)",
          "0 18px 38px rgba(6, 16, 24, 0.18)",
          "0 20px 40px rgba(6, 16, 24, 0.2)",
          "0 22px 44px rgba(6, 16, 24, 0.22)",
          "0 24px 46px rgba(6, 16, 24, 0.24)",
          "0 26px 50px rgba(6, 16, 24, 0.25)",
          "0 28px 52px rgba(6, 16, 24, 0.26)",
          "0 30px 56px rgba(6, 16, 24, 0.28)",
          "0 32px 58px rgba(6, 16, 24, 0.29)",
          "0 34px 62px rgba(6, 16, 24, 0.3)",
          "0 36px 64px rgba(6, 16, 24, 0.31)",
          "0 38px 66px rgba(6, 16, 24, 0.33)",
          "0 40px 70px rgba(6, 16, 24, 0.35)",
          "0 42px 74px rgba(6, 16, 24, 0.36)",
          "0 44px 78px rgba(6, 16, 24, 0.38)",
          "0 46px 82px rgba(6, 16, 24, 0.4)",
          "0 48px 86px rgba(6, 16, 24, 0.42)",
          "0 50px 90px rgba(6, 16, 24, 0.44)",
          "0 52px 94px rgba(6, 16, 24, 0.46)",
          "0 54px 98px rgba(6, 16, 24, 0.48)",
          "0 56px 102px rgba(6, 16, 24, 0.5)",
        ],
        components: {
          MuiCssBaseline: {
            styleOverrides: {
              body: {
                backgroundColor: darkMode ? "#070d14" : "#f5f3ee",
                backgroundImage: darkMode
                  ? "radial-gradient(circle at 12% 16%, rgba(65, 179, 164, 0.16), transparent 34%), radial-gradient(circle at 84% 0%, rgba(201, 162, 127, 0.14), transparent 30%), linear-gradient(180deg, #060b12 0%, #070d14 100%)"
                  : "radial-gradient(circle at 8% 8%, rgba(15, 118, 110, 0.16), transparent 34%), radial-gradient(circle at 90% -6%, rgba(176, 137, 104, 0.16), transparent 28%), linear-gradient(180deg, #f8f5ef 0%, #f5f3ee 100%)",
                backgroundAttachment: "scroll",
                "@media (pointer: fine)": {
                  backgroundAttachment: "fixed",
                },
                transition: "background-color 0.35s ease, color 0.35s ease",
              },
              "::selection": {
                backgroundColor: darkMode ? "rgba(65, 179, 164, 0.35)" : "rgba(15, 118, 110, 0.24)",
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: ({ theme }) => ({
                backgroundImage: "none",
                backdropFilter: "blur(10px)",
                border: `1px solid ${theme.palette.divider}`,
              }),
            },
          },
          MuiCard: {
            styleOverrides: {
              root: ({ theme }) => ({
                backgroundColor: theme.palette.background.paper,
                border: `1px solid ${theme.palette.divider}`,
                boxShadow: theme.shadows[3],
              }),
            },
          },
          MuiAppBar: {
            styleOverrides: {
              root: ({ theme }) => ({
                boxShadow: "none",
                borderBottom: `1px solid ${theme.palette.divider}`,
                backdropFilter: "blur(14px)",
              }),
            },
          },
          MuiButton: {
            styleOverrides: {
              root: ({ theme }) => ({
                borderRadius: 12,
                paddingInline: 18,
                boxShadow: "none",
                "&:hover": { boxShadow: "none" },
                transition: "transform 0.18s ease, filter 0.2s ease, background-color 0.2s ease",
                "&:active": { transform: "translateY(1px)" },
                "&:hover:not(:disabled)": { filter: "brightness(1.04)" },
                "&.MuiButton-outlined": { borderColor: theme.palette.divider },
              }),
              containedPrimary: {
                background: "linear-gradient(135deg, #0f766e 0%, #145f58 100%)",
              },
              containedSecondary: {
                background: "linear-gradient(135deg, #b08968 0%, #8b694d 100%)",
              },
            },
          },
          MuiOutlinedInput: {
            styleOverrides: {
              root: ({ theme }) => ({
                borderRadius: 12,
                backgroundColor:
                  theme.palette.mode === "dark" ? "rgba(12, 21, 30, 0.58)" : "rgba(255, 255, 255, 0.62)",
              }),
            },
          },
          MuiTabs: {
            styleOverrides: {
              indicator: ({ theme }) => ({
                height: 3,
                borderRadius: 3,
                background:
                  theme.palette.mode === "dark"
                    ? "linear-gradient(90deg, #41b3a4 0%, #c9a27f 100%)"
                    : "linear-gradient(90deg, #0f766e 0%, #b08968 100%)",
              }),
            },
          },
          MuiTab: {
            styleOverrides: {
              root: ({ theme }) => ({
                opacity: 0.8,
                minHeight: 50,
                fontWeight: 700,
                color: theme.palette.text.secondary,
                "&.Mui-selected": { opacity: 1, color: theme.palette.text.primary },
              }),
            },
          },
          MuiChip: {
            styleOverrides: {
              root: ({ theme }) => ({
                borderRadius: 10,
                backdropFilter: "blur(8px)",
                borderColor: theme.palette.divider,
              }),
            },
          },
          MuiDrawer: {
            defaultProps: {
              ModalProps: {
                keepMounted: true,
                disableScrollLock: true,
              },
            },
            styleOverrides: {
              paper: ({ theme }) => ({
                background: theme.palette.sidebar.background,
                borderRight: `1px solid ${theme.palette.divider}`,
              }),
            },
          },
          MuiDialog: {
            defaultProps: {
              keepMounted: true,
              disableScrollLock: true,
            },
          },
          MuiPopover: {
            defaultProps: {
              disableScrollLock: true,
            },
          },
          MuiMenu: {
            defaultProps: {
              keepMounted: true,
              disableScrollLock: true,
            },
          },
        },
      });
    },
    [darkMode]
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
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
          <Route
            path="/"
            element={<LandingPage />}
          />
          <Route
            path="/features"
            element={
              <ProtectedRoute>
                <Layout toggleDarkMode={toggleDarkMode} darkMode={darkMode}>
                  <FeaturesPage embedded />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/pricing"
            element={
              <ProtectedRoute>
                <Layout toggleDarkMode={toggleDarkMode} darkMode={darkMode}>
                  <PricingPage embedded />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/about"
            element={
              <ProtectedRoute>
                <Layout toggleDarkMode={toggleDarkMode} darkMode={darkMode}>
                  <AboutPage embedded />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/contact"
            element={
              <ProtectedRoute>
                <Layout toggleDarkMode={toggleDarkMode} darkMode={darkMode}>
                  <ContactPage embedded />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/privacy"
            element={
              <ProtectedRoute>
                <Layout toggleDarkMode={toggleDarkMode} darkMode={darkMode}>
                  <PrivacyPage embedded />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/terms"
            element={
              <ProtectedRoute>
                <Layout toggleDarkMode={toggleDarkMode} darkMode={darkMode}>
                  <TermsPage embedded />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/security"
            element={
              <ProtectedRoute>
                <Layout toggleDarkMode={toggleDarkMode} darkMode={darkMode}>
                  <SecurityPage embedded />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/blog"
            element={
              <ProtectedRoute>
                <Layout toggleDarkMode={toggleDarkMode} darkMode={darkMode}>
                  <BlogPage embedded />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/app"
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
            path="/profile"
            element={
              <ProtectedRoute>
                <Layout toggleDarkMode={toggleDarkMode} darkMode={darkMode}>
                  <Profile />
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
