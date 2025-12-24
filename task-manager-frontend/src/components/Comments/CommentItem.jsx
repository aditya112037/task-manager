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
import { useState, useMemo } from "react";
import { useTheme } from "@mui/material/styles";
import { useAuth } from "../../context/AuthContext";

/* ------------------ helpers ------------------ */
const resolveId = (v) => (typeof v === "object" ? v?._id : v);

export default function CommentItem({
  comment,
  myRole,
  onDelete,
  onReply,
  onEdit,
}) {
  const theme = useTheme();
  const { user } = useAuth();
  const isDarkMode = theme.palette.mode === "dark";

  const [anchorEl, setAnchorEl] = useState(null);
  const menuOpen = Boolean(anchorEl);

  /* ------------------ identity ------------------ */
  const currentUserId = resolveId(user?._id);
  const authorId = resolveId(comment.author);

  const isOwner = currentUserId && authorId === currentUserId;
  const isAdminOrManager = ["admin", "manager"].includes(myRole);

  /* ------------------ permissions ------------------ */
  const canEdit = isOwner || isAdminOrManager;
  const canDelete =
    isAdminOrManager && comment.type === "comment";

  /* ------------------ safe data ------------------ */
  const authorName =
    comment.author?.name ||
    comment.user?.name ||
    "Unknown User";

  const authorPhoto =
    comment.author?.photo ||
    comment.user?.photo ||
    null;

  const content =
    comment.content ||
    comment.text ||
    "";

  /* ------------------ time formatting ------------------ */
  const formatTime = (timestamp) => {
    if (!timestamp) return "";
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

    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
  };

  /* ------------------ menu handlers ------------------ */
  const openMenu = (e) => {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
  };

  const closeMenu = () => setAnchorEl(null);

  const handleDelete = () => {
    closeMenu();
    if (window.confirm("Delete this comment?")) {
      onDelete(comment._id);
    }
  };

  const handleEdit = () => {
    closeMenu();
    onEdit && onEdit(comment);
  };

  const handleReply = () => {
    closeMenu();
    onReply && onReply(comment);
  };

  return (
    <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
      {/* Avatar */}
      <Avatar
        src={authorPhoto}
        sx={{
          width: 40,
          height: 40,
          border: `2px solid ${
            isDarkMode ? theme.palette.grey[800] : theme.palette.grey[200]
          }`,
        }}
      >
        {authorName[0]?.toUpperCase()}
      </Avatar>

      {/* Content */}
      <Box sx={{ flex: 1 }}>
        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: 3,
            backgroundColor: isDarkMode
              ? "rgba(50,50,50,0.7)"
              : "grey.50",
            border: `1px solid ${
              isDarkMode
                ? "rgba(255,255,255,0.1)"
                : "rgba(0,0,0,0.08)"
            }`,
          }}
        >
          {/* Header */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              mb: 1,
            }}
          >
            <Box>
              <Typography fontWeight={600} variant="body2">
                {authorName}
                {isAdminOrManager && (
                  <Box
                    component="span"
                    sx={{
                      ml: 1,
                      fontSize: "0.65rem",
                      px: 0.75,
                      py: 0.25,
                      borderRadius: 1,
                      backgroundColor: theme.palette.primary.main,
                      color: "white",
                    }}
                  >
                    {myRole.toUpperCase()}
                  </Box>
                )}
              </Typography>

              {comment.createdAt && (
                <Tooltip
                  title={new Date(comment.createdAt).toLocaleString()}
                >
                  <Typography
                    variant="caption"
                    color="text.disabled"
                  >
                    {formatTime(comment.createdAt)}
                  </Typography>
                </Tooltip>
              )}
            </Box>

            <IconButton size="small" onClick={openMenu}>
              <MoreVertIcon fontSize="small" />
            </IconButton>
          </Box>

          {/* Text */}
          <Typography
            variant="body2"
            sx={{
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {content}
          </Typography>

          {comment.edited && (
            <Typography
              variant="caption"
              sx={{ display: "block", mt: 1, fontStyle: "italic" }}
            >
              (edited)
            </Typography>
          )}
        </Paper>

        {/* Reply */}
        {onReply && (
          <IconButton size="small" onClick={handleReply}>
            <ReplyIcon fontSize="small" />
          </IconButton>
        )}
      </Box>

      {/* Menu */}
      <Menu
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={closeMenu}
        onClick={(e) => e.stopPropagation()}
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

        <MenuItem onClick={closeMenu}>
          <ListItemIcon>
            <FlagIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Report</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
}
