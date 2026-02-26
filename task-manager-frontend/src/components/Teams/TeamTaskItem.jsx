import React, { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Collapse,
  Divider,
  IconButton,
  LinearProgress,
  Menu,
  MenuItem,
  Slider,
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

const statusColors = {
  todo: "default",
  "in-progress": "info",
  completed: "success",
};

const subtaskPercentage = (item) =>
  clampPercentage(item?.progressPercentage ?? (item?.completed ? 100 : 0));

export default function TeamTaskItem({
  task,
  teamMembers = [],
  canEdit,
  onEdit,
  onDelete,
  onSubtasksChange,
  onTaskProgressChange,
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

  const subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
  const totalSubtasks = subtasks.length;
  const subtaskPercentages = subtasks.map((item) => subtaskPercentage(item));
  const completedSubtasks = subtaskPercentages.filter((value) => value >= 100).length;
  const subtaskAverage =
    totalSubtasks > 0
      ? Math.round(subtaskPercentages.reduce((sum, value) => sum + value, 0) / totalSubtasks)
      : 0;

  const progressPercentage = Number.isFinite(Number(task.progress?.percentage))
    ? clampPercentage(task.progress.percentage)
    : totalSubtasks > 0
      ? subtaskAverage
      : percentageFromStatus(task.status);
  const derivedStatus = statusFromPercentage(progressPercentage);

  const lockedSubtaskCount = subtaskPercentages.filter((value) => value >= 100).length;
  const minTaskPercentage =
    totalSubtasks > 0 ? Math.ceil((lockedSubtaskCount * 100) / totalSubtasks) : 0;

  const priorityColors = {
    high: "error",
    medium: "warning",
    low: "success",
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

  const canMoveSubtask = (subtask) =>
    (isAdminOrManager || resolveId(subtask.assignedTo) === myUserId) &&
    subtaskPercentage(subtask) < 100;

  const handleTaskProgressCommit = (_, value) => {
    const requested = clampPercentage(Array.isArray(value) ? value[0] : value);

    if (totalSubtasks === 0) {
      if (progressPercentage >= 100 && requested < 100) return;
      if (typeof onTaskProgressChange === "function") {
        onTaskProgressChange(task._id, requested);
      }
      return;
    }

    if (typeof onSubtasksChange !== "function") return;
    const target = Math.max(minTaskPercentage, requested);

    const lockedSet = new Set();
    let lockedSum = 0;
    subtasks.forEach((item, index) => {
      const current = subtaskPercentage(item);
      if (current >= 100) {
        lockedSet.add(index);
        lockedSum += 100;
      }
    });

    const unlockedCount = totalSubtasks - lockedSet.size;
    if (unlockedCount <= 0) return;

    const targetSum = target * totalSubtasks;
    const remaining = Math.max(0, targetSum - lockedSum);
    const base = Math.floor(remaining / unlockedCount);
    let remainder = remaining - base * unlockedCount;

    const nextSubtasks = subtasks.map((item, index) => {
      if (lockedSet.has(index)) {
        return {
          ...item,
          progressPercentage: 100,
          completed: true,
          completedAt: item.completedAt || new Date().toISOString(),
          completedBy: item.completedBy || myUserId || null,
        };
      }
      const nextValue = clampPercentage(base + (remainder > 0 ? 1 : 0));
      if (remainder > 0) remainder -= 1;
      const completed = nextValue >= 100;
      return {
        ...item,
        progressPercentage: nextValue,
        completed,
        completedAt: completed ? item.completedAt || new Date().toISOString() : null,
        completedBy: completed ? item.completedBy || myUserId || null : null,
      };
    });

    onSubtasksChange(task._id, nextSubtasks);
  };

  const handleSubtaskProgressCommit = (subtaskId, value) => {
    if (typeof onSubtasksChange !== "function") return;
    const nextProgress = clampPercentage(Array.isArray(value) ? value[0] : value);

    const nextSubtasks = subtasks.map((item) => {
      if (item._id !== subtaskId) return item;
      const current = subtaskPercentage(item);
      if (current >= 100) return { ...item, progressPercentage: 100, completed: true };
      const completed = nextProgress >= 100;
      return {
        ...item,
        progressPercentage: nextProgress,
        completed,
        completedAt: completed ? item.completedAt || new Date().toISOString() : null,
        completedBy: completed ? item.completedBy || myUserId || null : null,
      };
    });

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

          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
              Task Progress: {progressPercentage}%
            </Typography>
            <Slider
              value={progressPercentage}
              min={minTaskPercentage}
              max={100}
              step={1}
              valueLabelDisplay="auto"
              onChangeCommitted={handleTaskProgressCommit}
              disabled={!canInteractWithTask || progressPercentage >= 100}
            />
          </Box>

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
                onClick={() => setShowComments((value) => !value)}
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
              <Stack spacing={1}>
                {subtasks.map((subtask, index) => {
                  const current = subtaskPercentage(subtask);
                  const subtaskStatus = statusFromPercentage(current);
                  return (
                    <Box key={subtask._id || `subtask-${index}`}>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <Typography
                          variant="body2"
                          sx={{ color: current >= 100 ? "text.secondary" : "text.primary" }}
                        >
                          {subtask.title}
                        </Typography>
                        <Chip
                          label={statusLabel(subtaskStatus)}
                          color={statusColors[subtaskStatus]}
                          size="small"
                          variant="outlined"
                        />
                      </Stack>
                      <Slider
                        size="small"
                        value={current}
                        min={0}
                        max={100}
                        step={1}
                        valueLabelDisplay="auto"
                        onChangeCommitted={(_, value) =>
                          handleSubtaskProgressCommit(subtask._id, value)
                        }
                        disabled={!canMoveSubtask(subtask)}
                      />
                      <Typography variant="caption" color="text.secondary">
                        Assigned: {resolveUserName(subtask.assignedTo)}
                      </Typography>
                    </Box>
                  );
                })}
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
