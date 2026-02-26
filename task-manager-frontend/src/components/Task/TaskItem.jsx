import React from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  IconButton,
  LinearProgress,
  Slider,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import EventIcon from "@mui/icons-material/Event";
import GoogleIcon from "@mui/icons-material/Google";
import { useTheme } from "@mui/material/styles";

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

const statusColor = {
  todo: "default",
  "in-progress": "info",
  completed: "success",
};

const subtaskPercentage = (item) =>
  clampPercentage(item?.progressPercentage ?? (item?.completed ? 100 : 0));

const TaskItem = ({ task, onEdit, onDelete, onUpdate }) => {
  const theme = useTheme();

  const priorityColors = {
    high: "error",
    medium: "warning",
    low: "success",
  };

  const subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
  const totalSubtasks = subtasks.length;
  const subtaskPercentages = subtasks.map((item) => subtaskPercentage(item));
  const completedSubtasks = subtaskPercentages.filter((value) => value >= 100).length;
  const subtaskAverage =
    totalSubtasks > 0
      ? Math.round(subtaskPercentages.reduce((sum, value) => sum + value, 0) / totalSubtasks)
      : 0;

  const taskPercentage = Number.isFinite(Number(task.progress?.percentage))
    ? clampPercentage(task.progress.percentage)
    : totalSubtasks > 0
      ? subtaskAverage
      : percentageFromStatus(task.status);
  const taskStatus = statusFromPercentage(taskPercentage);

  const lockedSubtaskCount = subtaskPercentages.filter((value) => value >= 100).length;
  const minTaskPercentage =
    totalSubtasks > 0 ? Math.ceil((lockedSubtaskCount * 100) / totalSubtasks) : 0;

  const hasDueDate = Boolean(task.dueDate);
  const startDate = hasDueDate ? new Date(task.dueDate) : null;
  const endDate = hasDueDate ? new Date(startDate.getTime() + 30 * 60 * 1000) : null;
  const fmt = (d) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const googleCalendarURL = hasDueDate
    ? `https://calendar.google.com/calendar/render?action=TEMPLATE` +
      `&text=${encodeURIComponent(task.title)}` +
      `&details=${encodeURIComponent(task.description || "")}` +
      `&dates=${fmt(startDate)}/${fmt(endDate)}`
    : "#";

  const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : "No due date");

  const handleTaskProgressCommit = (_, value) => {
    const requested = clampPercentage(Array.isArray(value) ? value[0] : value);

    if (totalSubtasks === 0) {
      if (taskPercentage >= 100 && requested < 100) return;
      onUpdate(task._id, { progress: { percentage: requested } });
      return;
    }

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
        };
      }
      const nextValue = clampPercentage(base + (remainder > 0 ? 1 : 0));
      if (remainder > 0) remainder -= 1;
      const isCompleted = nextValue >= 100;
      return {
        ...item,
        progressPercentage: nextValue,
        completed: isCompleted,
        completedAt: isCompleted ? item.completedAt || new Date().toISOString() : null,
      };
    });

    onUpdate(task._id, { subtasks: nextSubtasks });
  };

  const handleSubtaskProgressCommit = (subtaskId, value) => {
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
      };
    });
    onUpdate(task._id, { subtasks: nextSubtasks });
  };

  return (
    <Card
      sx={{
        mb: 2,
        borderRadius: 3,
        p: 1,
        backgroundColor: theme.palette.background.paper,
        transition: "0.2s",
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
            <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
              {task.title}
            </Typography>
            <Chip label={statusLabel(taskStatus)} color={statusColor[taskStatus]} size="small" />
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

        {task.description && (
          <Typography variant="body2" sx={{ mb: 2, color: theme.palette.text.secondary }}>
            {task.description}
          </Typography>
        )}

        <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: "wrap", rowGap: 1 }}>
          <Chip
            label={task.priority}
            color={priorityColors[task.priority]}
            size="small"
            sx={{ textTransform: "capitalize" }}
          />
          <Chip
            label={`📅 ${formatDate(task.dueDate)}`}
            variant="outlined"
            size="small"
            sx={{
              color: theme.palette.text.primary,
              borderColor:
                theme.palette.mode === "dark" ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)",
            }}
          />
        </Stack>

        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
            Task Progress: {taskPercentage}%
          </Typography>
          <Slider
            value={taskPercentage}
            min={minTaskPercentage}
            max={100}
            step={1}
            valueLabelDisplay="auto"
            onChangeCommitted={handleTaskProgressCommit}
            disabled={taskPercentage >= 100}
          />
        </Box>

        <Stack direction="row" spacing={2} sx={{ mb: 2, flexWrap: "wrap", rowGap: 1 }}>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<EventIcon />}
            sx={{ textTransform: "none", borderRadius: 2, px: 2, width: { xs: "100%", sm: "auto" } }}
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
              borderColor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.4)" : undefined,
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
            <LinearProgress
              variant="determinate"
              value={taskPercentage}
              sx={{ mb: 1.5, height: 8, borderRadius: 10 }}
            />
            <Stack spacing={1}>
              {subtasks.map((item, index) => {
                const current = subtaskPercentage(item);
                const itemStatus = statusFromPercentage(current);
                return (
                  <Box key={item._id || `subtask-${index}`} sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
                    <Box sx={{ flex: 1 }}>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <Typography
                          variant="body2"
                          sx={{ color: current >= 100 ? "text.secondary" : "text.primary" }}
                        >
                          {item.title}
                        </Typography>
                        <Chip
                          label={statusLabel(itemStatus)}
                          color={statusColor[itemStatus]}
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
                          handleSubtaskProgressCommit(item._id, value)
                        }
                        disabled={current >= 100}
                      />
                    </Box>
                  </Box>
                );
              })}
            </Stack>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default TaskItem;
