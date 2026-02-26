import React from "react";
import {
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  Box,
  Stack,
  Tooltip,
  Button,
  Checkbox,
  LinearProgress,
  Divider,
} from "@mui/material";

import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import EventIcon from "@mui/icons-material/Event";
import GoogleIcon from "@mui/icons-material/Google";

import { useTheme } from "@mui/material/styles";

const TaskItem = ({ task, onEdit, onDelete, onUpdate }) => {
  const theme = useTheme();

  const priorityColors = {
    high: "error",
    medium: "warning",
    low: "success",
  };

  const statusColors = {
    "todo": "default",
    "in-progress": "info",
    "completed": "success",
  };

  const handleSubtaskToggle = (subtaskId, completed) => {
    const nextSubtasks = (task.subtasks || []).map((item) =>
      item._id === subtaskId
        ? {
            ...item,
            completed,
            completedAt: completed ? new Date().toISOString() : null,
          }
        : item
    );
    onUpdate(task._id, { subtasks: nextSubtasks });
  };

  const formatDate = (dateString) => {
    if (!dateString) return "No due date";
    return new Date(dateString).toLocaleDateString();
  };

  // GOOGLE Calendar Link Fix
  const hasDueDate = Boolean(task.dueDate);
  const startDate = hasDueDate ? new Date(task.dueDate) : null;
  const endDate = hasDueDate ? new Date(startDate.getTime() + 30 * 60 * 1000) : null;

  const fmt = (d) =>
    d.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");

  const googleCalendarURL =
    hasDueDate
      ? `https://calendar.google.com/calendar/render?action=TEMPLATE` +
        `&text=${encodeURIComponent(task.title)}` +
        `&details=${encodeURIComponent(task.description || "")}` +
        `&dates=${fmt(startDate)}/${fmt(endDate)}`
      : "#";

  const totalSubtasks = task.progress?.totalSubtasks ?? task.subtasks?.length ?? 0;
  const completedSubtasks =
    task.progress?.completedSubtasks ??
    (task.subtasks || []).filter((item) => item.completed).length;
  const fallbackPercentageFromStatus =
    task.status === "completed" ? 100 : task.status === "in-progress" ? 50 : 0;
  const percentage = Number.isFinite(Number(task.progress?.percentage))
    ? Math.min(100, Math.max(0, Math.round(Number(task.progress?.percentage))))
    : totalSubtasks
      ? Math.round((completedSubtasks / totalSubtasks) * 100)
      : fallbackPercentageFromStatus;
  const derivedStatus =
    percentage >= 100 ? "completed" : percentage > 0 ? "in-progress" : "todo";
  const formatStatusLabel = (value) =>
    value === "todo" ? "To Do" : value === "in-progress" ? "In Progress" : "Completed";
  const subtaskStatusLabel = (completed) => (completed ? "Completed" : "To Do");
  const subtaskStatusColor = (completed) => (completed ? "success" : "default");

  return (
    <Card
      sx={{
        mb: 2,
        borderRadius: 3,
        padding: 1,
        backgroundColor: theme.palette.background.paper,
        transition: "0.2s",

        // ✨ Soft shadows for light mode, subtle shadows for dark mode
        boxShadow:
          theme.palette.mode === "dark"
            ? "0 0 10px rgba(0,0,0,0.4)"
            : "0 4px 15px rgba(0,0,0,0.08)",

        "&:hover": {
          boxShadow:
            theme.palette.mode === "dark"
              ? "0 0 14px rgba(0,0,0,0.55)"
              : "0 6px 20px rgba(0,0,0,0.12)",
        },
      }}
    >
      <CardContent>
        {/* HEADER */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", sm: "center" },
            flexDirection: { xs: "column", sm: "row" },
            gap: 1,
            mb: 1,
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                color: theme.palette.text.primary,
              }}
            >
              {task.title}
            </Typography>
            <Chip
              label={formatStatusLabel(derivedStatus)}
              color={statusColors[derivedStatus]}
              size="small"
            />
          </Stack>

          <Box sx={{ alignSelf: { xs: "flex-end", sm: "auto" } }}>
            <Tooltip title="Edit">
              <IconButton color="primary" onClick={() => onEdit(task)}>
                <EditIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="Delete">
              <IconButton color="error" onClick={() => onDelete(task._id)}>
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* DESCRIPTION */}
        {task.description && (
          <Typography
            variant="body2"
            sx={{ mb: 2, color: theme.palette.text.secondary }}
          >
            {task.description}
          </Typography>
        )}

        {/* METADATA */}
        <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: "wrap", rowGap: 1 }}>
          {/* Priority */}
          <Chip
            label={task.priority}
            color={priorityColors[task.priority]}
            size="small"
            sx={{ textTransform: "capitalize" }}
          />

          {/* Date */}
          <Chip
            label={`📅 ${formatDate(task.dueDate)}`}
            variant="outlined"
            size="small"
            sx={{
              color: theme.palette.text.primary,
              borderColor:
                theme.palette.mode === "dark"
                  ? "rgba(255,255,255,0.3)"
                  : "rgba(0,0,0,0.3)",
            }}
          />
        </Stack>

        {/* CALENDAR BUTTONS */}
        <Stack direction="row" spacing={2} sx={{ mb: 2, flexWrap: "wrap", rowGap: 1 }}>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<EventIcon />}
            sx={{
              textTransform: "none",
              borderRadius: 2,
              px: 2,
              width: { xs: "100%", sm: "auto" },
            }}
            onClick={() => {
              window.location.href = `${process.env.REACT_APP_API_URL}/api/ics/${task._id}`;
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
              borderColor:
                theme.palette.mode === "dark"
                  ? "rgba(255,255,255,0.4)"
                  : undefined,
            }}
            href={googleCalendarURL}
            target="_blank"
            disabled={!hasDueDate}
          >
            Add to Google Calendar
          </Button>
        </Stack>

        {totalSubtasks > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
              Checkpoints ({completedSubtasks}/{totalSubtasks})
            </Typography>
            <LinearProgress variant="determinate" value={percentage} sx={{ mb: 1.5, height: 8, borderRadius: 10 }} />
            <Stack spacing={0.5}>
              {(task.subtasks || []).map((item, index) => (
                <Box key={item._id || `subtask-${index}`} sx={{ display: "flex", alignItems: "center" }}>
                  <Checkbox
                    checked={Boolean(item.completed)}
                    onChange={(e) => handleSubtaskToggle(item._id, e.target.checked)}
                    size="small"
                  />
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    <Typography
                      variant="body2"
                      sx={{
                        color: item.completed ? "text.secondary" : "text.primary",
                      }}
                    >
                      {item.title}
                    </Typography>
                    <Chip
                      label={subtaskStatusLabel(Boolean(item.completed))}
                      color={subtaskStatusColor(Boolean(item.completed))}
                      size="small"
                      variant="outlined"
                    />
                  </Stack>
                </Box>
              ))}
            </Stack>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default TaskItem;
