// components/Teams/TeamTaskItem.jsx
import React, { useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  Box,
  Stack,
  Button,
  Menu,
  MenuItem,
  Alert,
  Collapse,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import GoogleIcon from "@mui/icons-material/Google";
import ScheduleIcon from "@mui/icons-material/Schedule";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import ChatBubbleIcon from "@mui/icons-material/ChatBubble";
import { useTheme } from "@mui/material/styles";
import ExtensionRequestModal from "./ExtensionRequestModal";
import TaskComments from "../Comments/TaskComments";

/* ------------------ helpers ------------------ */
const resolveId = (v) => (typeof v === "object" ? v?._id : v);

const resolveUserName = (u) => {
  if (!u) return "Unassigned";
  if (typeof u === "string") return "Assigned";
  if (typeof u === "object") return u.name || "Assigned";
  return "Assigned";
};

export default function TeamTaskItem({
  task,
  canEdit,
  onEdit,
  onDelete,
  onStatusChange,
  onQuickComplete,
  currentUserId,
  isAdminOrManager = false,
}) {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState(null);
  const [openExtensionModal, setOpenExtensionModal] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const priorityColors = { high: "error", medium: "warning", low: "success" };
  const statusColors = {
    todo: "default",
    "in-progress": "info",
    completed: "success",
  };

  const isAssignedToMe =
    resolveId(task.assignedTo) === resolveId(currentUserId);

  /* ------------------ PERMISSION RULES ------------------ */

  const isUnassigned = !task.assignedTo;

  const canCompleteTask =
    task.status !== "completed" &&
    (isAdminOrManager || isAssignedToMe || isUnassigned);

  const canDeleteTask = isAdminOrManager;

  /* ------------------ due date logic ------------------ */
  const getDueDateStatus = () => {
    if (!task.dueDate)
      return { color: "text.secondary", message: "No due date" };

    if (task.status === "completed")
      return { color: "success.main", message: "Completed" };

    const now = new Date();
    const due = new Date(task.dueDate);
    const days = Math.ceil((due - now) / (1000 * 3600 * 24));

    if (days < 0)
      return {
        color: "error.main",
        message: `Overdue by ${Math.abs(days)} day${Math.abs(days) !== 1 ? "s" : ""}`,
      };
    if (days === 0) return { color: "warning.main", message: "Due today" };
    if (days <= 2)
      return { color: "warning.light", message: `Due in ${days} days` };

    return { color: "text.secondary", message: `Due in ${days} days` };
  };

  const dueStatus = getDueDateStatus();

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString() : "No due date";

  const getICSUrl = () =>
    `${process.env.REACT_APP_API_URL}/api/ics/${task._id}`;

  const getGoogleUrl = () => {
    if (!task.dueDate) return "#";
    const s = new Date(task.dueDate);
    const e = new Date(s.getTime() + 30 * 60 * 1000);
    const f = (d) =>
      d.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      task.title
    )}&details=${encodeURIComponent(task.description || "")}&dates=${f(s)}/${f(e)}`;
  };

  const openMenu = Boolean(anchorEl);
  const showMenu = canCompleteTask || canDeleteTask || Boolean(task.dueDate);

  return (
    <>
      <Card
        sx={{
          mb: 2,
          borderRadius: 3,
          borderLeft: `5px solid ${task.color || theme.palette.primary.main}`,
        }}
      >
        {dueStatus.color === "error.main" && (
          <Alert severity="error">{dueStatus.message}</Alert>
        )}

        <CardContent>
          {/* header */}
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="h6" fontWeight={700}>
              {task.icon || "📋"} {task.title}
            </Typography>

            {showMenu && (
              <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)}>
                <MoreVertIcon />
              </IconButton>
            )}
          </Box>

          {task.description && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              {task.description}
            </Typography>
          )}

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 1, display: "block" }}
          >
            Assigned to: {resolveUserName(task.assignedTo)}
          </Typography>

          <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: "wrap" }}>
            <Chip label={task.priority} color={priorityColors[task.priority]} size="small" />
            <Chip label={task.status} color={statusColors[task.status]} size="small" />
            <Chip
              icon={<AccessTimeIcon />}
              label={`${formatDate(task.dueDate)} • ${dueStatus.message}`}
              variant="outlined"
              size="small"
            />
          </Stack>

          {/* ACTIONS */}
          <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: "wrap" }}>
            {canCompleteTask && (
              <Button
                size="small"
                color="success"
                variant="contained"
                onClick={() => onQuickComplete(task._id)}
              >
                Mark Complete
              </Button>
            )}

            {isAssignedToMe && !task.extensionRequest?.requested && (
              <Button
                size="small"
                variant="outlined"
                onClick={() => setOpenExtensionModal(true)}
              >
                Request Extension
              </Button>
            )}

            <Button
              size="small"
              variant="outlined"
              startIcon={showComments ? <ChatBubbleIcon /> : <ChatBubbleOutlineIcon />}
              onClick={() => setShowComments((v) => !v)}
            >
              {showComments ? "Hide Comments" : "Comments"}
            </Button>
          </Stack>

          <Collapse in={showComments}>
            <Box sx={{ mt: 3, pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
              <TaskComments
                taskId={task._id}
                myRole={isAdminOrManager ? "admin" : "member"}
              />
            </Box>
          </Collapse>
        </CardContent>

        {/* MENU */}
        <Menu anchorEl={anchorEl} open={openMenu} onClose={() => setAnchorEl(null)}>
          {canCompleteTask && (
            <MenuItem onClick={() => onQuickComplete(task._id)}>
              <CheckCircleIcon fontSize="small" sx={{ mr: 1 }} /> Complete
            </MenuItem>
          )}

          <MenuItem onClick={() => window.open(getICSUrl(), "_blank")}>
            <ScheduleIcon fontSize="small" sx={{ mr: 1 }} /> Download ICS
          </MenuItem>

          {task.dueDate && (
            <MenuItem onClick={() => window.open(getGoogleUrl(), "_blank")}>
              <GoogleIcon fontSize="small" sx={{ mr: 1 }} /> Google Calendar
            </MenuItem>
          )}

          {canEdit && (
            <MenuItem onClick={() => onEdit(task)}>
              <EditIcon fontSize="small" sx={{ mr: 1 }} /> Edit
            </MenuItem>
          )}

          {canDeleteTask && (
            <MenuItem onClick={() => onDelete(task._id)}>
              <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> Delete
            </MenuItem>
          )}
        </Menu>
      </Card>

      <ExtensionRequestModal
        open={openExtensionModal}
        onClose={() => setOpenExtensionModal(false)}
        task={task}
      />
    </>
  );
}
