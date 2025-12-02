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
import { useTheme } from "@mui/material/styles";

export default function TeamTaskItem({ task, isAdmin, onEdit, onDelete, onStatusChange }) {
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

  const formatDate = (dateString) => {
    if (!dateString) return "No due date";
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Card sx={{ mb: 2, borderRadius: 3, p: 1 }}>
      <CardContent>

        {/* HEADER */}
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
          <Typography variant="h6" fontWeight={700}>
            {task.title}
          </Typography>

          {isAdmin && (
            <Box>
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
          )}
        </Box>

        {/* DESCRIPTION */}
        {task.description && (
          <Typography variant="body2" sx={{ mb: 2 }}>
            {task.description}
          </Typography>
        )}

        {/* TAGS */}
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <Chip label={task.priority} color={priorityColors[task.priority]} size="small" />
          <Chip label={task.status.replace("-", " ")} color={statusColors[task.status]} size="small" />
          <Chip label={`📅 ${formatDate(task.dueDate)}`} variant="outlined" size="small" />
        </Stack>

         {/* CALENDAR BUTTONS */}
        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<EventIcon />}
            sx={{
              textTransform: "none",
              borderRadius: 2,
              px: 2,
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

        {/* STATUS CHANGE BUTTONS */}
        <Stack direction="row" spacing={1}>
          <Chip label="To Do" clickable color={task.status === "todo" ? "primary" : "default"} onClick={() => onStatusChange(task._id, "todo")} />
          <Chip label="In Progress" clickable color={task.status === "in-progress" ? "info" : "default"} onClick={() => onStatusChange(task._id, "in-progress")} />
          <Chip label="Completed" clickable color={task.status === "completed" ? "success" : "default"} onClick={() => onStatusChange(task._id, "completed")} />
        </Stack>

      </CardContent>
    </Card>
  );
}

