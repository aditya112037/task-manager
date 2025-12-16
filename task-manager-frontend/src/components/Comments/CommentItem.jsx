import {
  Avatar,
  Box,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import ReplyIcon from "@mui/icons-material/Reply";
import EditIcon from "@mui/icons-material/Edit";
import FlagIcon from "@mui/icons-material/Flag";
import { useState } from "react";
import { useTheme } from "@mui/material/styles";

export default function CommentItem({ comment, myRole, onDelete, onReply, onEdit }) {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === "dark";
  const [anchorEl, setAnchorEl] = useState(null);
  const menuOpen = Boolean(anchorEl);

  // ✅ CORRECT: Use comment.type (backend: "comment" | "system")
  const canDelete = ["admin", "manager"].includes(myRole) && comment.type === "comment";
  const canEdit = comment.author?._id === localStorage.getItem("userId") || ["admin", "manager"].includes(myRole);

  // ✅ SAFE: Use optional chaining to prevent crashes
  const authorName = comment.author?.name || comment.user?.name || "Unknown User";
  const authorPhoto = comment.author?.photo || comment.user?.photo;
  const content = comment.content || comment.text || "";

  // Format time
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const handleMenuClick = (event) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleDelete = () => {
    handleMenuClose();
    if (window.confirm("Are you sure you want to delete this comment?")) {
      onDelete(comment._id);
    }
  };

  const handleReply = () => {
    handleMenuClose();
    onReply && onReply(comment);
  };

  const handleEdit = () => {
    handleMenuClose();
    onEdit && onEdit(comment);
  };

  return (
    <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
      {/* Avatar with status indicator */}
      <Box sx={{ position: "relative" }}>
        <Avatar
          src={authorPhoto}
          sx={{
            width: 40,
            height: 40,
            border: `2px solid ${isDarkMode ? theme.palette.grey[800] : theme.palette.grey[200]}`,
            boxShadow: isDarkMode ? "0 2px 8px rgba(0,0,0,0.3)" : "0 2px 8px rgba(0,0,0,0.1)",
          }}
        >
          {authorName[0]?.toUpperCase()}
        </Avatar>
        {comment.author?.role === "admin" && (
          <Box
            sx={{
              position: "absolute",
              bottom: -2,
              right: -2,
              width: 14,
              height: 14,
              backgroundColor: theme.palette.primary.main,
              borderRadius: "50%",
              border: `2px solid ${isDarkMode ? theme.palette.grey[900] : "white"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Box
              component="span"
              sx={{
                fontSize: "8px",
                color: "white",
                fontWeight: "bold",
              }}
            >
              A
            </Box>
          </Box>
        )}
      </Box>

      {/* Comment Content */}
      <Box sx={{ flex: 1, position: "relative" }}>
        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: 3,
            backgroundColor: isDarkMode ? "rgba(50, 50, 50, 0.7)" : "grey.50",
            border: `1px solid ${isDarkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.08)"}`,
            position: "relative",
            transition: "all 0.2s ease",
            "&:hover": {
              backgroundColor: isDarkMode ? "rgba(60, 60, 60, 0.9)" : "grey.100",
              borderColor: isDarkMode ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.12)",
            },
          }}
        >
          {/* Header with name and time */}
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
            <Box>
              <Typography
                fontWeight={600}
                variant="body2"
                sx={{
                  color: isDarkMode ? "rgba(255, 255, 255, 0.95)" : "text.primary",
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                {authorName}
                {comment.author?.role === "admin" && (
                  <Box
                    sx={{
                      fontSize: "0.7rem",
                      backgroundColor: theme.palette.primary.main,
                      color: "white",
                      px: 1,
                      py: 0.25,
                      borderRadius: 1,
                    }}
                  >
                    Admin
                  </Box>
                )}
              </Typography>
              {comment.createdAt && (
                <Tooltip title={new Date(comment.createdAt).toLocaleString()}>
                  <Typography
                    variant="caption"
                    sx={{
                      color: isDarkMode ? "rgba(255, 255, 255, 0.5)" : "text.disabled",
                      fontSize: "0.7rem",
                    }}
                  >
                    {formatTime(comment.createdAt)}
                  </Typography>
                </Tooltip>
              )}
            </Box>

            {/* Action Menu Button */}
            <IconButton
              size="small"
              onClick={handleMenuClick}
              sx={{
                color: isDarkMode ? "rgba(255, 255, 255, 0.5)" : "text.secondary",
                "&:hover": {
                  color: isDarkMode ? "rgba(255, 255, 255, 0.8)" : "text.primary",
                  backgroundColor: isDarkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.04)",
                },
              }}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
          </Box>

          {/* Comment Text */}
          <Typography
            variant="body2"
            sx={{
              color: isDarkMode ? "rgba(255, 255, 255, 0.9)" : "text.secondary",
              lineHeight: 1.5,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {content}
          </Typography>

          {/* Edited indicator */}
          {comment.edited && (
            <Typography
              variant="caption"
              sx={{
                color: isDarkMode ? "rgba(255, 255, 255, 0.4)" : "text.disabled",
                fontSize: "0.7rem",
                display: "block",
                mt: 1,
                fontStyle: "italic",
              }}
            >
              (edited)
            </Typography>
          )}
        </Paper>

        {/* Reply button (optional) */}
        {onReply && (
          <IconButton
            size="small"
            onClick={handleReply}
            sx={{
              mt: 0.5,
              ml: 1,
              fontSize: "0.75rem",
              color: isDarkMode ? "rgba(255, 255, 255, 0.6)" : "text.secondary",
              "&:hover": {
                color: theme.palette.primary.main,
              },
            }}
          >
            <ReplyIcon fontSize="small" sx={{ mr: 0.5 }} />
            Reply
          </IconButton>
        )}
      </Box>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={handleMenuClose}
        onClick={(e) => e.stopPropagation()}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        PaperProps={{
          sx: {
            backgroundColor: isDarkMode ? "rgba(40, 40, 40, 0.95)" : "background.paper",
            border: `1px solid ${isDarkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.08)"}`,
            borderRadius: 2,
            minWidth: 180,
          },
        }}
      >
        {canEdit && (
          <MenuItem onClick={handleEdit}>
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Edit</ListItemText>
          </MenuItem>
        )}

        {onReply && (
          <MenuItem onClick={handleReply}>
            <ListItemIcon>
              <ReplyIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Reply</ListItemText>
          </MenuItem>
        )}

        {canDelete && (
          <MenuItem onClick={handleDelete} sx={{ color: "error.main" }}>
            <ListItemIcon sx={{ color: "error.main" }}>
              <DeleteIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Delete</ListItemText>
          </MenuItem>
        )}

        <MenuItem onClick={handleMenuClose}>
          <ListItemIcon>
            <FlagIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Report</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
}