import React, { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Collapse,
  Divider,
  IconButton,
  LinearProgress,
  Menu,
  MenuItem,
  Stack,
  Typography,
} from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import ChatBubbleIcon from "@mui/icons-material/ChatBubble";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import EventIcon from "@mui/icons-material/Event";
import GoogleIcon from "@mui/icons-material/Google";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { useTheme } from "@mui/material/styles";
import TaskComments from "../Comments/TaskComments";
import ExtensionRequestModal from "./ExtensionRequestModal";

const resolveId = (value) => (typeof value === "object" ? value?._id : value);

const resolveUserName = (value) => {
  if (!value) return "Team Tasks";
  if (typeof value === "object") return value.name || "User";
  return "User";
};

const clampPercentage = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.min(100, Math.max(0, Math.round(numeric)));
};

const percentageFromStatus = (status) => {
  if (status === "completed") return 100;
  if (status === "in-progress") return 50;
  return 0;
};

const statusFromPercentage = (percentage) => {
  if (percentage >= 100) return "completed";
  if (percentage > 0) return "in-progress";
  return "todo";
};

const statusLabel = (status) => {
  if (status === "todo") return "To Do";
  if (status === "in-progress") return "In Progress";
  return "Completed";
};

export default function TeamTaskItem({
  task,
  teamMembers = [],
  canEdit,
  onEdit,
  onDelete,
  onSubtasksChange,
  onExtensionRequested,
  currentUserId,
  isAdminOrManager = false,
}) {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState(null);
  const [openExtensionModal, setOpenExtensionModal] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const assignedUserId = resolveId(task.assignedTo);
  const myUserId = resolveId(currentUserId);
  const isAssignedToMe = assignedUserId === myUserId;
  const isUnassigned = !assignedUserId;
  const isTempTask = typeof task._id === "string" && task._id.startsWith("temp-");

  const canInteractWithTask = isAdminOrManager || isAssignedToMe || isUnassigned;
  const canDeleteTask = isAdminOrManager;
  const canViewComments = !isTempTask && canInteractWithTask;

  const totalSubtasks = task.progress?.totalSubtasks ?? task.subtasks?.length ?? 0;
  const completedSubtasks =
    task.progress?.completedSubtasks ??
    (task.subtasks || []).filter((item) => item.completed).length;
  const progressPercentage =
    Number.isFinite(Number(task.progress?.percentage))
      ? clampPercentage(task.progress?.percentage)
      : totalSubtasks > 0
        ? clampPercentage((completedSubtasks / totalSubtasks) * 100)
        : percentageFromStatus(task.status);
  const derivedStatus = statusFromPercentage(progressPercentage);

  const priorityColors = {
    high: "error",
    medium: "warning",
    low: "success",
  };
  const statusColors = {
    todo: "default",
    "in-progress": "info",
    completed: "success",
  };

  const dueStatus = useMemo(() => {
    if (!task.dueDate) return { color: "text.secondary", message: "No due date" };
    if (derivedStatus === "completed") return { color: "success.main", message: "Completed" };

    const now = new Date();
    const due = new Date(task.dueDate);
    const days = Math.ceil((due - now) / (1000 * 3600 * 24));

    if (days < 0) {
      return {
        color: "error.main",
        message: `Overdue by ${Math.abs(days)} day${Math.abs(days) !== 1 ? "s" : ""}`,
      };
    }
    if (days === 0) return { color: "warning.main", message: "Due today" };
    if (days <= 2) return { color: "warning.light", message: `Due in ${days} days` };
    return { color: "text.secondary", message: `Due in ${days} days` };
  }, [task.dueDate, derivedStatus]);

  const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : "");
  const getICSUrl = () => `${process.env.REACT_APP_API_URL}/api/ics/${task._id}`;
  const getGoogleUrl = () => {
    if (!task.dueDate) return "#";
    const start = new Date(task.dueDate);
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    const fmt = (d) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      task.title
    )}&details=${encodeURIComponent(task.description || "")}&dates=${fmt(start)}/${fmt(end)}`;
  };

  const openMenu = Boolean(anchorEl);
  const showMenu = canDeleteTask || canEdit;

  const canToggleSubtask = (subtask) =>
    isAdminOrManager || resolveId(subtask.assignedTo) === myUserId;

  const handleSubtaskToggle = (subtaskId, checked) => {
    if (typeof onSubtasksChange !== "function") return;
    const nextSubtasks = (task.subtasks || []).map((item) =>
      item._id === subtaskId
        ? {
            ...item,
            completed: checked,
            completedAt: checked ? new Date().toISOString() : null,
            completedBy: checked ? myUserId : null,
          }
        : item
    );
    onSubtasksChange(task._id, nextSubtasks);
  };

  return (
    <>
      <Card
        sx={{
          mb: 2,
          borderRadius: 3,
          borderLeft: `5px solid ${task.color || theme.palette.primary.main}`,
          opacity: canInteractWithTask ? 1 : 0.65,
        }}
      >
        {dueStatus.color === "error.main" && <Alert severity="error">{dueStatus.message}</Alert>}

        <CardContent>
          <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Typography variant="h6" fontWeight={700}>
                {task.icon || "Task"} {task.title}
              </Typography>
              <Chip label={statusLabel(derivedStatus)} color={statusColors[derivedStatus]} size="small" />
            </Stack>
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

          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
            Assigned to: {resolveUserName(task.assignedTo)}
          </Typography>

          <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: "wrap" }}>
            <Chip label={task.priority} color={priorityColors[task.priority]} size="small" />
            {task.needsAttention && (
              <Chip label="Needs attention" color="warning" size="small" variant="outlined" />
            )}
            <Chip
              icon={<AccessTimeIcon />}
              label={task.dueDate ? `${formatDate(task.dueDate)} • ${dueStatus.message}` : "No due date"}
              variant="outlined"
              size="small"
            />
          </Stack>

          <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: "wrap" }}>
            {isAssignedToMe && !task.extensionRequest?.requested && !isTempTask && (
              <Button size="small" variant="outlined" onClick={() => setOpenExtensionModal(true)}>
                Request Extension
              </Button>
            )}
            {canViewComments && (
              <Button
                size="small"
                variant="outlined"
                startIcon={showComments ? <ChatBubbleIcon /> : <ChatBubbleOutlineIcon />}
                onClick={() => setShowComments((v) => !v)}
              >
                {showComments ? "Hide Comments" : "Comments"}
              </Button>
            )}
          </Stack>

          {totalSubtasks > 0 && (
            <>
              <Divider sx={{ mt: 2 }} />
              <Typography variant="subtitle2" sx={{ mt: 1.5 }}>
                Checkpoints ({completedSubtasks}/{totalSubtasks})
              </Typography>
              <LinearProgress
                variant="determinate"
                value={progressPercentage}
                sx={{ mt: 1, mb: 1.5, height: 8, borderRadius: 10 }}
              />
              <Stack spacing={0.5}>
                {(task.subtasks || []).map((subtask, index) => (
                  <Box key={subtask._id || `subtask-${index}`} sx={{ display: "flex", alignItems: "center" }}>
                    <Checkbox
                      size="small"
                      checked={Boolean(subtask.completed)}
                      onChange={(e) => handleSubtaskToggle(subtask._id, e.target.checked)}
                      disabled={!canToggleSubtask(subtask)}
                    />
                    <Box>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <Typography
                          variant="body2"
                          sx={{
                            color: subtask.completed ? "text.secondary" : "text.primary",
                          }}
                        >
                          {subtask.title}
                        </Typography>
                        <Chip
                          label={statusLabel(subtask.completed ? "completed" : "todo")}
                          color={subtask.completed ? "success" : "default"}
                          size="small"
                          variant="outlined"
                        />
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        Assigned: {resolveUserName(subtask.assignedTo)}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Stack>
            </>
          )}

          <Stack direction="row" spacing={2} sx={{ mt: 2, mb: 1, flexWrap: "wrap", rowGap: 1 }}>
            <Button
              variant="contained"
              color="secondary"
              startIcon={<EventIcon />}
              sx={{ textTransform: "none", borderRadius: 2, px: 2, width: { xs: "100%", sm: "auto" } }}
              onClick={() => {
                window.location.href = getICSUrl();
              }}
            >
              Add to Calendar (Apple)
            </Button>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<GoogleIcon />}
              sx={{
                textTransform: "none",
                borderRadius: 2,
                px: 2,
                width: { xs: "100%", sm: "auto" },
                borderColor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.4)" : undefined,
              }}
              href={getGoogleUrl()}
              target="_blank"
              rel="noreferrer"
              disabled={!task.dueDate}
            >
              Add to Google Calendar
            </Button>
          </Stack>

          {canViewComments && (
            <Collapse in={showComments}>
              <Box sx={{ mt: 3, pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
                <TaskComments
                  taskId={task._id}
                  myRole={isAdminOrManager ? "admin" : "member"}
                  teamMembers={teamMembers}
                />
              </Box>
            </Collapse>
          )}
        </CardContent>

        <Menu anchorEl={anchorEl} open={openMenu} onClose={() => setAnchorEl(null)}>
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

      {!isTempTask && (
        <ExtensionRequestModal
          open={openExtensionModal}
          onClose={() => setOpenExtensionModal(false)}
          task={task}
          onSubmitted={onExtensionRequested}
        />
      )}
    </>
  );
}
