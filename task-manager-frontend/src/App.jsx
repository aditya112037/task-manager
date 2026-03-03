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
import JournalHub from "./pages/JournalHub";
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

const THEME_PRESETS = {
  light: {
    label: "Light",
    palette: {
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
      page: {
        backgroundColor: "#f5f3ee",
        backgroundImage:
          "radial-gradient(circle at 8% 8%, rgba(15, 118, 110, 0.16), transparent 34%), radial-gradient(circle at 90% -6%, rgba(176, 137, 104, 0.16), transparent 28%), linear-gradient(180deg, #f8f5ef 0%, #f5f3ee 100%)",
        selection: "rgba(15, 118, 110, 0.24)",
      },
    },
  },
  dark: {
    label: "Dark",
    palette: {
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
      page: {
        backgroundColor: "#070d14",
        backgroundImage:
          "radial-gradient(circle at 12% 16%, rgba(65, 179, 164, 0.16), transparent 34%), radial-gradient(circle at 84% 0%, rgba(201, 162, 127, 0.14), transparent 30%), linear-gradient(180deg, #060b12 0%, #070d14 100%)",
        selection: "rgba(65, 179, 164, 0.35)",
      },
    },
  },
  ocean: {
    label: "Ocean",
    palette: {
      mode: "dark",
      primary: { main: "#33b5e5", light: "#79d4f4", dark: "#0b78a5", contrastText: "#04131a" },
      secondary: { main: "#90caf9", light: "#b8e2ff", dark: "#4f9bcb", contrastText: "#081219" },
      background: { default: "#041522", paper: "rgba(10, 30, 45, 0.84)" },
      text: { primary: "#e7f7ff", secondary: "#9ec2d6" },
      divider: "rgba(130, 190, 220, 0.2)",
      sidebar: {
        background: "linear-gradient(195deg, #03111c 0%, #041928 100%)",
        hover: "rgba(51, 181, 229, 0.22)",
        active: "rgba(51, 181, 229, 0.34)",
        text: "#dff4ff",
      },
      header: { background: "rgba(4, 24, 36, 0.9)" },
      page: {
        backgroundColor: "#041522",
        backgroundImage:
          "radial-gradient(circle at 12% 10%, rgba(59, 210, 255, 0.2), transparent 34%), radial-gradient(circle at 88% 0%, rgba(144, 202, 249, 0.16), transparent 32%), linear-gradient(180deg, #02111c 0%, #041522 100%)",
        selection: "rgba(51, 181, 229, 0.38)",
      },
    },
  },
  forest: {
    label: "Forest",
    palette: {
      mode: "light",
      primary: { main: "#2f6b4f", light: "#5f8f73", dark: "#1e4d37", contrastText: "#f3fbf6" },
      secondary: { main: "#b7894f", light: "#d5aa75", dark: "#8a6639", contrastText: "#1f160d" },
      background: { default: "#eef4ec", paper: "rgba(255, 255, 255, 0.87)" },
      text: { primary: "#1d2a21", secondary: "#536456" },
      divider: "rgba(38, 67, 50, 0.16)",
      sidebar: {
        background: "linear-gradient(195deg, #1d3327 0%, #13251c 100%)",
        hover: "rgba(183, 137, 79, 0.2)",
        active: "rgba(183, 137, 79, 0.3)",
        text: "#f0eadf",
      },
      header: { background: "rgba(20, 43, 31, 0.9)" },
      page: {
        backgroundColor: "#eef4ec",
        backgroundImage:
          "radial-gradient(circle at 10% 14%, rgba(47, 107, 79, 0.16), transparent 34%), radial-gradient(circle at 86% -8%, rgba(183, 137, 79, 0.16), transparent 28%), linear-gradient(180deg, #f4f8f1 0%, #eef4ec 100%)",
        selection: "rgba(47, 107, 79, 0.24)",
      },
    },
  },
  sunset: {
    label: "Sunset",
    palette: {
      mode: "light",
      primary: { main: "#e76f24", light: "#f29a62", dark: "#b84d14", contrastText: "#fff7ef" },
      secondary: { main: "#0f8b8d", light: "#45aeb0", dark: "#0b6264", contrastText: "#edfdfd" },
      background: { default: "#fff2dd", paper: "rgba(255, 255, 255, 0.88)" },
      text: { primary: "#3c2714", secondary: "#6d5642" },
      divider: "rgba(184, 77, 20, 0.2)",
      sidebar: {
        background: "linear-gradient(198deg, #7a2e12 0%, #5b250f 52%, #3e1d12 100%)",
        hover: "rgba(242, 154, 98, 0.24)",
        active: "rgba(242, 154, 98, 0.36)",
        text: "#fff3e7",
      },
      header: { background: "rgba(92, 40, 19, 0.9)" },
      page: {
        backgroundColor: "#fff2dd",
        backgroundImage:
          "radial-gradient(circle at 12% 14%, rgba(242, 154, 98, 0.24), transparent 34%), radial-gradient(circle at 88% -4%, rgba(15, 139, 141, 0.18), transparent 30%), linear-gradient(180deg, #fff7e9 0%, #ffedd2 100%)",
        selection: "rgba(231, 111, 36, 0.26)",
      },
    },
  },
  "midnight-neon": {
    label: "Midnight Neon",
    palette: {
      mode: "dark",
      primary: { main: "#3de8ff", light: "#7cf0ff", dark: "#00a9c4", contrastText: "#031019" },
      secondary: { main: "#ff4fd8", light: "#ff8ee7", dark: "#ba1da0", contrastText: "#1a0415" },
      background: { default: "#070514", paper: "rgba(20, 15, 46, 0.84)" },
      text: { primary: "#f4f1ff", secondary: "#b7b0d8" },
      divider: "rgba(148, 141, 205, 0.25)",
      sidebar: {
        background: "linear-gradient(200deg, #07040f 0%, #0f0a26 60%, #130d33 100%)",
        hover: "rgba(61, 232, 255, 0.22)",
        active: "rgba(255, 79, 216, 0.3)",
        text: "#f6f2ff",
      },
      header: { background: "rgba(13, 9, 32, 0.9)" },
      page: {
        backgroundColor: "#070514",
        backgroundImage:
          "radial-gradient(circle at 14% 16%, rgba(61, 232, 255, 0.22), transparent 34%), radial-gradient(circle at 85% 2%, rgba(255, 79, 216, 0.2), transparent 32%), linear-gradient(180deg, #060311 0%, #070514 100%)",
        selection: "rgba(61, 232, 255, 0.4)",
      },
    },
  },
  "cherry-blossom": {
    label: "Cherry Blossom",
    palette: {
      mode: "light",
      primary: { main: "#c04d7a", light: "#df8bb0", dark: "#98345c", contrastText: "#fff2f8" },
      secondary: { main: "#5f88b3", light: "#8eb0d2", dark: "#406488", contrastText: "#f3f8ff" },
      background: { default: "#fff5f8", paper: "rgba(255, 255, 255, 0.88)" },
      text: { primary: "#3b2230", secondary: "#6e5060" },
      divider: "rgba(192, 77, 122, 0.18)",
      sidebar: {
        background: "linear-gradient(197deg, #4d2740 0%, #38263e 62%, #26243d 100%)",
        hover: "rgba(223, 139, 176, 0.24)",
        active: "rgba(223, 139, 176, 0.34)",
        text: "#fff2f7",
      },
      header: { background: "rgba(69, 35, 59, 0.9)" },
      page: {
        backgroundColor: "#fff5f8",
        backgroundImage:
          "radial-gradient(circle at 10% 12%, rgba(223, 139, 176, 0.24), transparent 34%), radial-gradient(circle at 88% -4%, rgba(95, 136, 179, 0.18), transparent 28%), linear-gradient(180deg, #fff9fb 0%, #fff4f7 100%)",
        selection: "rgba(192, 77, 122, 0.25)",
      },
    },
  },
};

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
  const [themeMode, setThemeMode] = useState("light");

  useEffect(() => {
    const savedTheme = localStorage.getItem("appTheme");
    if (savedTheme && THEME_PRESETS[savedTheme]) {
      setThemeMode(savedTheme);
      return;
    }

    const savedDarkMode = localStorage.getItem("darkMode");
    if (savedDarkMode) {
      setThemeMode(savedDarkMode === "true" ? "dark" : "light");
    }
  }, []);

  const handleThemeChange = (nextTheme) => {
    if (!THEME_PRESETS[nextTheme]) return;
    setThemeMode(nextTheme);
    localStorage.setItem("appTheme", nextTheme);
    localStorage.setItem("darkMode", THEME_PRESETS[nextTheme].palette.mode === "dark");
  };

  const theme = useMemo(
    () => {
      const activeTheme = THEME_PRESETS[themeMode] || THEME_PRESETS.light;
      const activePalette = activeTheme.palette;
      const containedPrimaryGradient = `linear-gradient(135deg, ${activePalette.primary.main} 0%, ${activePalette.primary.dark} 100%)`;
      const containedSecondaryGradient = `linear-gradient(135deg, ${activePalette.secondary.main} 0%, ${activePalette.secondary.dark} 100%)`;
      const tabsGradient = `linear-gradient(90deg, ${activePalette.primary.main} 0%, ${activePalette.secondary.main} 100%)`;

      return createTheme({
        palette: activePalette,
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
                backgroundColor: activePalette.page.backgroundColor,
                backgroundImage: activePalette.page.backgroundImage,
                backgroundAttachment: "scroll",
                "@media (pointer: fine)": {
                  backgroundAttachment: "fixed",
                },
                transition: "background-color 0.35s ease, color 0.35s ease",
              },
              "::selection": {
                backgroundColor: activePalette.page.selection,
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
              containedPrimary: { background: containedPrimaryGradient },
              containedSecondary: { background: containedSecondaryGradient },
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
                background: tabsGradient,
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
    [themeMode]
  );

  const themeOptions = useMemo(
    () =>
      Object.entries(THEME_PRESETS).map(([value, config]) => ({
        value,
        label: config.label,
      })),
    []
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
                <Layout themeMode={themeMode} setThemeMode={handleThemeChange} themeOptions={themeOptions}>
                  <JoinTeam />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route path="/join/:inviteCode" element={<JoinTeam />} />
          <Route path="/" element={<LandingPage />} />
          <Route
            path="/features"
            element={
              <ProtectedRoute>
                <Layout themeMode={themeMode} setThemeMode={handleThemeChange} themeOptions={themeOptions}>
                  <FeaturesPage embedded />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/pricing"
            element={
              <ProtectedRoute>
                <Layout themeMode={themeMode} setThemeMode={handleThemeChange} themeOptions={themeOptions}>
                  <PricingPage embedded />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/about"
            element={
              <ProtectedRoute>
                <Layout themeMode={themeMode} setThemeMode={handleThemeChange} themeOptions={themeOptions}>
                  <AboutPage embedded />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/contact"
            element={
              <ProtectedRoute>
                <Layout themeMode={themeMode} setThemeMode={handleThemeChange} themeOptions={themeOptions}>
                  <ContactPage embedded />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/privacy"
            element={
              <ProtectedRoute>
                <Layout themeMode={themeMode} setThemeMode={handleThemeChange} themeOptions={themeOptions}>
                  <PrivacyPage embedded />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/terms"
            element={
              <ProtectedRoute>
                <Layout themeMode={themeMode} setThemeMode={handleThemeChange} themeOptions={themeOptions}>
                  <TermsPage embedded />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/security"
            element={
              <ProtectedRoute>
                <Layout themeMode={themeMode} setThemeMode={handleThemeChange} themeOptions={themeOptions}>
                  <SecurityPage embedded />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/blog"
            element={
              <ProtectedRoute>
                <Layout themeMode={themeMode} setThemeMode={handleThemeChange} themeOptions={themeOptions}>
                  <BlogPage embedded />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <Layout themeMode={themeMode} setThemeMode={handleThemeChange} themeOptions={themeOptions}>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/teams"
            element={
              <ProtectedRoute>
                <Layout themeMode={themeMode} setThemeMode={handleThemeChange} themeOptions={themeOptions}>
                  <TeamsHome />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/teams/create"
            element={
              <ProtectedRoute>
                <Layout themeMode={themeMode} setThemeMode={handleThemeChange} themeOptions={themeOptions}>
                  <CreateTeam />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/teams/:teamId"
            element={
              <ProtectedRoute>
                <Layout themeMode={themeMode} setThemeMode={handleThemeChange} themeOptions={themeOptions}>
                  <TeamDetails />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Layout themeMode={themeMode} setThemeMode={handleThemeChange} themeOptions={themeOptions}>
                  <Profile />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/insights"
            element={
              <ProtectedRoute>
                <Layout themeMode={themeMode} setThemeMode={handleThemeChange} themeOptions={themeOptions}>
                  <JournalHub />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route path="/journal" element={<Navigate to="/insights" replace />} />
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
