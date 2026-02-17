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

  const handleStatusChange = (newStatus) => {
    onUpdate(task._id, { status: newStatus });
  };

  const formatDate = (dateString) => {
    if (!dateString) return "No due date";
    return new Date(dateString).toLocaleDateString();
  };

  // GOOGLE Calendar Link Fix
  const startDate = new Date(task.dueDate);
  const endDate = new Date(startDate.getTime() + 30 * 60 * 1000);

  const fmt = (d) =>
    d.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");

  const googleCalendarURL =
    `https://calendar.google.com/calendar/render?action=TEMPLATE` +
    `&text=${encodeURIComponent(task.title)}` +
    `&details=${encodeURIComponent(task.description || "")}` +
    `&dates=${fmt(startDate)}/${fmt(endDate)}`;

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
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              color: theme.palette.text.primary,
            }}
          >
            {task.title}
          </Typography>

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

          {/* Status */}
          <Chip
            label={task.status.replace("-", " ")}
            color={statusColors[task.status]}
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
          >
            Add to Google Calendar
          </Button>
        </Stack>

        {/* STATUS BUTTONS */}
        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", rowGap: 1 }}>
          <Chip
            label="To Do"
            clickable
            color={task.status === "todo" ? "primary" : "default"}
            variant={task.status === "todo" ? "filled" : "outlined"}
            onClick={() => handleStatusChange("todo")}
          />

          <Chip
            label="In Progress"
            clickable
            color={task.status === "in-progress" ? "info" : "default"}
            variant={task.status === "in-progress" ? "filled" : "outlined"}
            onClick={() => handleStatusChange("in-progress")}
          />

          <Chip
            label="Completed"
            clickable
            color={task.status === "completed" ? "success" : "default"}
            variant={task.status === "completed" ? "filled" : "outlined"}
            onClick={() => handleStatusChange("completed")}
          />
        </Stack>
      </CardContent>
    </Card>
  );
};

export default TaskItem;
