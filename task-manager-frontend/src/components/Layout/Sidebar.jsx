import React, { useEffect, useMemo, useState } from "react";
import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  IconButton,
  Box,
  Typography,
  useTheme,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
} from "@mui/material";

import MenuIcon from "@mui/icons-material/Menu";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import DashboardIcon from "@mui/icons-material/Dashboard";
import GroupIcon from "@mui/icons-material/Group";
import InstallDesktopIcon from "@mui/icons-material/InstallDesktop";

import { Link, useLocation } from "react-router-dom";

const INSTALL_DISMISSED_KEY = "installCtaDismissed";

const Sidebar = ({ open, toggleSidebar, isMobile = false }) => {
  const location = useLocation();
  const theme = useTheme();

  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installDismissed, setInstallDismissed] = useState(false);
  const [installHelpOpen, setInstallHelpOpen] = useState(false);

  const widthOpen = 240;
  const widthClosed = 64;
  const drawerWidth = isMobile ? widthOpen : open ? widthOpen : widthClosed;
  const showLabel = isMobile || open;

  const platform = useMemo(() => {
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua);
    const isAndroid = /android/.test(ua);
    return { isIOS, isAndroid };
  }, []);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
    setIsInstalled(Boolean(standalone));
    setInstallDismissed(localStorage.getItem(INSTALL_DISMISSED_KEY) === "true");

    const onBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
    };

    const onInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
      setInstallHelpOpen(false);
      localStorage.removeItem(INSTALL_DISMISSED_KEY);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismissInstallCta = () => {
    localStorage.setItem(INSTALL_DISMISSED_KEY, "true");
    setInstallDismissed(true);
    setInstallHelpOpen(false);
  };

  const onInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      setDeferredPrompt(null);

      if (choice?.outcome === "accepted") return;
      dismissInstallCta();
      return;
    }

    setInstallHelpOpen(true);
  };

  const onHelpClose = () => {
    dismissInstallCta();
  };

  const openShareSheet = async () => {
    if (!navigator.share) return;
    try {
      await navigator.share({
        title: "Task Suite",
        text: "Install Task Suite",
        url: window.location.href,
      });
    } catch {
      // user cancelled share sheet
    }
  };

  const copyCurrentLink = async () => {
    if (!navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      // clipboard unavailable
    }
  };

  const canShowInstall = !isInstalled && !installDismissed;

  return (
    <>
      <Drawer
        variant={isMobile ? "temporary" : "permanent"}
        open={isMobile ? open : true}
        onClose={toggleSidebar}
        ModalProps={{ keepMounted: true }}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          whiteSpace: "nowrap",
          boxSizing: "border-box",
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            background: theme.palette.sidebar.background,
            color: theme.palette.sidebar.text,
            border: "none",
            overflowX: "hidden",
            transition: theme.transitions.create("width", {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
            borderRight: `1px solid ${theme.palette.divider}`,
            boxShadow: "24px 0 48px rgba(0,0,0,0.15)",
            position: "fixed",
            left: 0,
            top: 0,
            bottom: 0,
          },
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <Toolbar
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: showLabel ? "space-between" : "center",
              px: 1,
              minHeight: "68px !important",
            }}
          >
            {showLabel && (
              <Box sx={{ pl: 1.2 }}>
                <Typography variant="subtitle2" sx={{ color: "sidebar.text", opacity: 0.75 }}>
                  Workspace
                </Typography>
                <Typography variant="body2" sx={{ color: "sidebar.text", letterSpacing: 0.5, fontWeight: 700 }}>
                  Task Manager
                </Typography>
              </Box>
            )}
            <IconButton
              onClick={toggleSidebar}
              sx={{
                color: theme.palette.sidebar.text,
                "&:hover": {
                  backgroundColor: theme.palette.sidebar.hover,
                }
              }}
            >
              {open ? <ChevronLeftIcon /> : <MenuIcon />}
            </IconButton>
          </Toolbar>

          <List sx={{ px: 1, flexGrow: 1 }}>
            <ListItemButton
              component={Link}
              to="/app"
              onClick={isMobile ? toggleSidebar : undefined}
              selected={location.pathname === "/app"}
              sx={{
                color: theme.palette.sidebar.text,
                borderRadius: 2,
                mb: 1,
                justifyContent: showLabel ? "initial" : "center",
                px: showLabel ? 2 : 1,
                minHeight: 50,
                "&.Mui-selected": {
                  backgroundColor: theme.palette.sidebar.active || theme.palette.sidebar.hover,
                  "&:hover": {
                    backgroundColor: theme.palette.sidebar.active || theme.palette.sidebar.hover,
                  }
                },
                "&:hover": {
                  backgroundColor: theme.palette.sidebar.hover,
                }
              }}
            >
              <ListItemIcon
                sx={{
                  color: theme.palette.sidebar.text,
                  minWidth: 0,
                  mr: showLabel ? 2 : "auto",
                  justifyContent: "center",
                }}
              >
                <DashboardIcon />
              </ListItemIcon>
              {showLabel && (
                <ListItemText
                  primary="Dashboard"
                  sx={{ opacity: showLabel ? 1 : 0 }}
                />
              )}
            </ListItemButton>

            <ListItemButton
              component={Link}
              to="/teams"
              onClick={isMobile ? toggleSidebar : undefined}
              selected={location.pathname.startsWith("/teams")}
              sx={{
                color: theme.palette.sidebar.text,
                borderRadius: 2,
                mb: 1,
                justifyContent: showLabel ? "initial" : "center",
                px: showLabel ? 2 : 1,
                minHeight: 50,
                "&.Mui-selected": {
                  backgroundColor: theme.palette.sidebar.active || theme.palette.sidebar.hover,
                  "&:hover": {
                    backgroundColor: theme.palette.sidebar.active || theme.palette.sidebar.hover,
                  }
                },
                "&:hover": {
                  backgroundColor: theme.palette.sidebar.hover,
                }
              }}
            >
              <ListItemIcon
                sx={{
                  color: theme.palette.sidebar.text,
                  minWidth: 0,
                  mr: showLabel ? 2 : "auto",
                  justifyContent: "center",
                }}
              >
                <GroupIcon />
              </ListItemIcon>
              {showLabel && (
                <ListItemText
                  primary="Teams"
                  sx={{ opacity: showLabel ? 1 : 0 }}
                />
              )}
            </ListItemButton>
          </List>

          {canShowInstall && (
            <Box sx={{ p: 1.2, pb: isMobile ? 2 : 1.5 }}>
              <Button
                fullWidth
                variant="outlined"
                size="small"
                startIcon={<InstallDesktopIcon />}
                onClick={onInstallClick}
                sx={{
                  color: theme.palette.sidebar.text,
                  borderColor: "rgba(255,255,255,0.26)",
                  justifyContent: showLabel ? "flex-start" : "center",
                  minWidth: 0,
                  px: showLabel ? 1.5 : 0.8,
                  "&:hover": {
                    borderColor: "rgba(255,255,255,0.42)",
                    backgroundColor: "rgba(255,255,255,0.1)",
                  }
                }}
              >
                {showLabel ? "Install App" : ""}
              </Button>
            </Box>
          )}
        </Box>
      </Drawer>

      <Dialog open={installHelpOpen} onClose={onHelpClose} fullWidth maxWidth="xs">
        <DialogTitle>Install Task Suite</DialogTitle>
        <DialogContent dividers>
          {platform.isIOS ? (
            <Stack spacing={1.2}>
              <Typography variant="body2">iPhone/iPad requires manual install:</Typography>
              <Typography variant="body2">1. Tap the Share icon in Safari.</Typography>
              <Typography variant="body2">2. Select "Add to Home Screen".</Typography>
              <Typography variant="body2">3. Tap "Add".</Typography>
            </Stack>
          ) : platform.isAndroid ? (
            <Stack spacing={1.2}>
              <Typography variant="body2">If prompt did not appear:</Typography>
              <Typography variant="body2">1. Open browser menu.</Typography>
              <Typography variant="body2">2. Tap "Install app" or "Add to Home screen".</Typography>
              <Typography variant="body2">3. Confirm install.</Typography>
            </Stack>
          ) : (
            <Stack spacing={1.2}>
              <Typography variant="body2">Desktop install steps:</Typography>
              <Typography variant="body2">1. Open browser menu (top-right).</Typography>
              <Typography variant="body2">2. Click "Install Task Suite" or "Install app".</Typography>
              <Typography variant="body2">3. Confirm install.</Typography>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1.5, gap: 1 }}>
          {platform.isIOS && navigator.share && (
            <Button onClick={openShareSheet}>Open Share Sheet</Button>
          )}
          <Button onClick={copyCurrentLink}>Copy Link</Button>
          <Button variant="contained" onClick={onHelpClose}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Sidebar;
