import { Typography, Box, alpha } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import UpdateIcon from "@mui/icons-material/Update";
import AssignmentIcon from "@mui/icons-material/Assignment";
import ScheduleIcon from "@mui/icons-material/Schedule";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import ThumbDownIcon from "@mui/icons-material/ThumbDown";
import CommentIcon from "@mui/icons-material/Comment";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

export default function SystemComment({ comment }) {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === "dark";

  // ✅ CRITICAL GUARD: Prevent crash if comment is undefined
  if (!comment || !comment.action) {
    console.warn("Invalid system comment:", comment);
    return null;
  }

  // ✅ Extract data with fallbacks
  const { action, meta = {}, createdAt, content, text } = comment;
  
  // ✅ Support both backend and mock data
  const displayText = content || text || "";
  const timestamp = createdAt ? new Date(createdAt) : null;

  // ✅ Generate user-friendly message based on action
  const getSystemMessage = () => {
    switch (action) {
      case "task_created":
        return `Task "${meta.title}" was created`;
      
      case "status_changed":
        return `Status changed from ${meta.from || 'unknown'} to ${meta.to || 'unknown'}`;
      
      case "assigned":
        return meta.to 
          ? `Task was assigned to user ${meta.to}`
          : "Task assignment was updated";
      
      case "extension_requested":
        return `Extension requested: ${meta.reason || 'No reason provided'}`;
      
      case "extension_approved":
        return "Extension request was approved";
      
      case "extension_rejected":
        return "Extension request was rejected";
      
      case "comment_created":
        return "A comment was added";
      
      case "task_updated":
        return "Task was updated";
      
      case "task_deleted":
        return "Task was deleted";
      
      default:
        return displayText || `System action: ${action}`;
    }
  };

  // ✅ Get icon and color for each action type
  const getActionConfig = () => {
    const configs = {
      task_created: {
        icon: <TaskAltIcon fontSize="inherit" />,
        color: theme.palette.success.main,
        bgColor: isDarkMode 
          ? alpha(theme.palette.success.main, 0.15)
          : alpha(theme.palette.success.main, 0.08),
        borderColor: isDarkMode 
          ? alpha(theme.palette.success.main, 0.3)
          : alpha(theme.palette.success.main, 0.2),
      },
      status_changed: {
        icon: <UpdateIcon fontSize="inherit" />,
        color: theme.palette.info.main,
        bgColor: isDarkMode 
          ? alpha(theme.palette.info.main, 0.15)
          : alpha(theme.palette.info.main, 0.08),
        borderColor: isDarkMode 
          ? alpha(theme.palette.info.main, 0.3)
          : alpha(theme.palette.info.main, 0.2),
      },
      assigned: {
        icon: <AssignmentIcon fontSize="inherit" />,
        color: theme.palette.warning.main,
        bgColor: isDarkMode 
          ? alpha(theme.palette.warning.main, 0.15)
          : alpha(theme.palette.warning.main, 0.08),
        borderColor: isDarkMode 
          ? alpha(theme.palette.warning.main, 0.3)
          : alpha(theme.palette.warning.main, 0.2),
      },
      extension_requested: {
        icon: <ScheduleIcon fontSize="inherit" />,
        color: theme.palette.primary.main,
        bgColor: isDarkMode 
          ? alpha(theme.palette.primary.main, 0.15)
          : alpha(theme.palette.primary.main, 0.08),
        borderColor: isDarkMode 
          ? alpha(theme.palette.primary.main, 0.3)
          : alpha(theme.palette.primary.main, 0.2),
      },
      extension_approved: {
        icon: <ThumbUpIcon fontSize="inherit" />,
        color: theme.palette.success.main,
        bgColor: isDarkMode 
          ? alpha(theme.palette.success.main, 0.15)
          : alpha(theme.palette.success.main, 0.08),
        borderColor: isDarkMode 
          ? alpha(theme.palette.success.main, 0.3)
          : alpha(theme.palette.success.main, 0.2),
      },
      extension_rejected: {
        icon: <ThumbDownIcon fontSize="inherit" />,
        color: theme.palette.error.main,
        bgColor: isDarkMode 
          ? alpha(theme.palette.error.main, 0.15)
          : alpha(theme.palette.error.main, 0.08),
        borderColor: isDarkMode 
          ? alpha(theme.palette.error.main, 0.3)
          : alpha(theme.palette.error.main, 0.2),
      },
      comment_created: {
        icon: <CommentIcon fontSize="inherit" />,
        color: theme.palette.secondary.main,
        bgColor: isDarkMode 
          ? alpha(theme.palette.secondary.main, 0.15)
          : alpha(theme.palette.secondary.main, 0.08),
        borderColor: isDarkMode 
          ? alpha(theme.palette.secondary.main, 0.3)
          : alpha(theme.palette.secondary.main, 0.2),
      },
      task_updated: {
        icon: <EditIcon fontSize="inherit" />,
        color: theme.palette.info.main,
        bgColor: isDarkMode 
          ? alpha(theme.palette.info.main, 0.15)
          : alpha(theme.palette.info.main, 0.08),
        borderColor: isDarkMode 
          ? alpha(theme.palette.info.main, 0.3)
          : alpha(theme.palette.info.main, 0.2),
      },
      task_deleted: {
        icon: <DeleteIcon fontSize="inherit" />,
        color: theme.palette.error.main,
        bgColor: isDarkMode 
          ? alpha(theme.palette.error.main, 0.15)
          : alpha(theme.palette.error.main, 0.08),
        borderColor: isDarkMode 
          ? alpha(theme.palette.error.main, 0.3)
          : alpha(theme.palette.error.main, 0.2),
      },
    };

    return configs[action] || {
      icon: null,
      color: isDarkMode ? theme.palette.text.secondary : theme.palette.text.disabled,
      bgColor: isDarkMode 
        ? alpha(theme.palette.common.white, 0.05)
        : alpha(theme.palette.common.black, 0.03),
      borderColor: isDarkMode 
        ? alpha(theme.palette.divider, 0.3)
        : alpha(theme.palette.divider, 0.5),
    };
  };

  const message = getSystemMessage();
  const config = getActionConfig();

  // Format time (relative or absolute)
  const formatTime = (date) => {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        my: 2,
        position: "relative",
        
      }}
    >
      <Box
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 1,
          px: 2,
          py: 1,
          borderRadius: 3,
          backgroundColor: config.bgColor,
          border: `1px solid ${config.borderColor}`,
          position: "relative",
          zIndex: 1,
          maxWidth: "90%",
          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          "&:hover": {
            transform: "translateY(-1px)",
            boxShadow: isDarkMode 
              ? `0 4px 12px ${alpha(config.color, 0.2)}`
              : `0 4px 12px ${alpha(config.color, 0.15)}`,
          },
        }}
      >
        {/* Icon */}
        {config.icon && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.9rem",
              color: config.color,
              opacity: 0.9,
            }}
          >
            {config.icon}
          </Box>
        )}

        {/* Message */}
        <Typography
          variant="caption"
          sx={{
            color: config.color,
            fontWeight: 500,
            fontSize: "0.75rem",
            lineHeight: 1.2,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: "100%",
          }}
        >
          {message}
        </Typography>

        {/* Timestamp */}
        {timestamp && (
          <Typography
            component="span"
            variant="caption"
            sx={{
              ml: 1,
              color: isDarkMode 
                ? alpha(theme.palette.common.white, 0.5)
                : alpha(theme.palette.common.black, 0.45),
              fontSize: "0.7rem",
              fontWeight: 400,
              flexShrink: 0,
            }}
          >
            {formatTime(timestamp)}
          </Typography>
        )}

        {/* Decorative dot */}
        <Box
          sx={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            backgroundColor: config.color,
            opacity: 0.6,
            ml: 0.5,
            flexShrink: 0,
          }}
        />
      </Box>
    </Box>
  );
}