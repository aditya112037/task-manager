// components/Notifications/NotificationCenter.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  Badge,
  IconButton,
  Popover,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Typography,
  Box,
  Button,
  useTheme,
} from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningIcon from "@mui/icons-material/Warning";
import ErrorIcon from "@mui/icons-material/Error";
import InfoIcon from "@mui/icons-material/Info";
import api from "../../services/api";
import { registerForPushNotifications } from "../../services/pushNotifications";
import { getSocket } from "../../services/socket";

const NotificationCenter = () => {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [enablingPush, setEnablingPush] = useState(false);
  const [testingPush, setTestingPush] = useState(false);
  const [pushStatus, setPushStatus] = useState("");

  const open = Boolean(anchorEl);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/notifications");
      setNotifications(response.data.notifications);
      setUnreadCount(response.data.unreadCount);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onNotificationsChanged = () => {
      fetchNotifications();
    };

    socket.on("notifications:changed", onNotificationsChanged);
    return () => {
      socket.off("notifications:changed", onNotificationsChanged);
    };
  }, [fetchNotifications]);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const removeNotification = async (notificationId) => {
    try {
      await api.delete(`/api/notifications/${notificationId}`);
      fetchNotifications();
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const clearAllNotifications = async () => {
    try {
      await api.delete("/api/notifications");
      fetchNotifications();
    } catch (error) {
      console.error("Error clearing notifications:", error);
    }
  };

  const openNotificationTarget = (notification) => {
    const teamId = notification?.relatedTeam?._id || notification?.relatedTeam;
    if (teamId) {
      window.location.href = `/teams/${teamId}`;
      return;
    }
    // Fallback: no related resource, just close popover.
    handleClose();
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "task_assigned":
        return <InfoIcon color="primary" />;
      case "task_due_soon":
        return <WarningIcon color="warning" />;
      case "task_overdue":
        return <ErrorIcon color="error" />;
      case "extension_approved":
        return <CheckCircleIcon color="success" />;
      default:
        return <InfoIcon color="action" />;
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleEnablePush = async () => {
    try {
      setEnablingPush(true);
      setPushStatus("");
      const result = await registerForPushNotifications({ askPermission: true });
      if (result?.ok) {
        setPushStatus("Push enabled.");
      } else if (result?.reason === "denied") {
        setPushStatus("Push blocked in browser settings.");
      } else if (result?.reason === "permission_not_granted") {
        setPushStatus("Permission not granted.");
      } else if (result?.reason === "unsupported") {
        setPushStatus("Push is not supported on this context/device.");
      } else {
        setPushStatus("Push setup incomplete.");
      }
    } catch (error) {
      setPushStatus("Failed to enable push.");
    } finally {
      setEnablingPush(false);
    }
  };

  const handleTestPush = async () => {
    try {
      setTestingPush(true);
      setPushStatus("");
      await api.post("/api/notifications/test-push", {
        title: "Test Push",
        message: "If you see this as a popup, push is working.",
        url: "/",
      });
      setPushStatus("Test push requested. Check for popup.");
      fetchNotifications();
    } catch (error) {
      setPushStatus("Test push failed.");
    } finally {
      setTestingPush(false);
    }
  };

  return (
    <>
      <IconButton
        color="inherit"
        onClick={handleClick}
        sx={{
          position: 'relative',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
          },
        }}
      >
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            width: { xs: "calc(100vw - 24px)", sm: 360 },
            maxWidth: "100vw",
            maxHeight: 500,
            mt: 1,
            boxShadow: theme.shadows[3],
            border: `1px solid ${theme.palette.divider}`,
          },
        }}
      >
        <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Notifications</Typography>
            {unreadCount > 0 && (
              <Button size="small" onClick={clearAllNotifications}>
                Clear all
              </Button>
            )}
          </Box>
          {typeof Notification !== "undefined" && Notification.permission !== "granted" && (
            <Box sx={{ mt: 1 }}>
              <Button
                size="small"
                variant="outlined"
                onClick={handleEnablePush}
                disabled={enablingPush}
              >
                {enablingPush ? "Enabling..." : "Enable Push"}
              </Button>
              {pushStatus && (
                <Typography variant="caption" sx={{ display: "block", mt: 0.5 }}>
                  {pushStatus}
                </Typography>
              )}
            </Box>
          )}
          <Box sx={{ mt: 1 }}>
            <Button
              size="small"
              variant="text"
              onClick={handleTestPush}
              disabled={testingPush}
            >
              {testingPush ? "Testing..." : "Test Push"}
            </Button>
          </Box>
        </Box>

        <List sx={{ p: 0 }}>
          {loading ? (
            <ListItem>
              <ListItemText primary="Loading notifications..." />
            </ListItem>
          ) : notifications.length === 0 ? (
            <ListItem>
              <ListItemText 
                primary="No notifications"
                secondary="You're all caught up!"
              />
            </ListItem>
          ) : (
            notifications.map((notification) => (
              <ListItem
                key={notification._id}
                disablePadding
                sx={{
                  bgcolor: notification.read ? "transparent" : "action.hover",
                  borderBottom: `1px solid ${theme.palette.divider}`,
                }}
              >
                <ListItemButton
                  onClick={async () => {
                    await removeNotification(notification._id);
                    openNotificationTarget(notification);
                  }}
                  sx={{
                    "&:hover": { bgcolor: "action.selected" },
                    alignItems: "flex-start",
                  }}
                >
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: "transparent" }}>
                    {getNotificationIcon(notification.type)}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography variant="subtitle2" sx={{ fontWeight: notification.read ? 400 : 600 }}>
                      {notification.title}
                    </Typography>
                  }
                  secondary={
                    <>
                      <Typography variant="body2" color="text.primary">
                        {notification.message}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatTime(notification.createdAt)}
                      </Typography>
                    </>
                  }
                />
                {!notification.read && (
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: 'primary.main',
                      ml: 1,
                    }}
                  />
                )}
                </ListItemButton>
              </ListItem>
            ))
          )}
        </List>
      </Popover>
    </>
  );
};

export default NotificationCenter;
