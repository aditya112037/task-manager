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
import EventIcon from "@mui/icons-material/Event";
import GoogleIcon from "@mui/icons-material/Google";

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

  // FIXED: Add Google Calendar URL generation
  const getGoogleCalendarURL = () => {
    if (!task.dueDate) return "#";
    
    const startDate = new Date(task.dueDate);
    const endDate = new Date(startDate.getTime() + 30 * 60 * 1000); // 30 minutes later

    const formatForGoogle = (date) => {
      return date.toISOString()
        .replace(/[-:]/g, "")
        .replace(/\.\d+Z$/, "Z");
    };

    return `https://calendar.google.com/calendar/render?action=TEMPLATE` +
      `&text=${encodeURIComponent(task.title)}` +
      `&details=${encodeURIComponent(task.description || "")}` +
      `&dates=${formatForGoogle(startDate)}/${formatForGoogle(endDate)}`;
  };

  // FIXED: Add ICS download URL
  const getICSUrl = () => {
    return `${process.env.REACT_APP_API_URL}/api/ics/${task._id}`;
  };

  return (
    <Card sx={{ 
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
    }}>
      <CardContent>

        {/* HEADER */}
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
          <Typography variant="h6" fontWeight={700} color={theme.palette.text.primary}>
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
          <Typography variant="body2" sx={{ mb: 2, color: theme.palette.text.secondary }}>
            {task.description}
          </Typography>
        )}

        {/* TAGS */}
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <Chip 
            label={task.priority} 
            color={priorityColors[task.priority]} 
            size="small" 
            sx={{ textTransform: "capitalize" }}
          />
          <Chip 
            label={task.status.replace("-", " ")} 
            color={statusColors[task.status]} 
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
                theme.palette.mode === "dark"
                  ? "rgba(255,255,255,0.3)"
                  : "rgba(0,0,0,0.3)",
            }}
          />
        </Stack>

         {/* CALENDAR BUTTONS - FIXED */}
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
              // FIXED: Use the ICS URL function
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
              borderColor:
                theme.palette.mode === "dark"
                  ? "rgba(255,255,255,0.4)"
                  : undefined,
            }}
            href={getGoogleCalendarURL()}
            target="_blank"
            rel="noopener noreferrer"
            disabled={!task.dueDate} // Disable if no due date
          >
            Add to Google Calendar
          </Button>
        </Stack>

        {/* STATUS CHANGE BUTTONS */}
        <Stack direction="row" spacing={1}>
          <Chip 
            label="To Do" 
            clickable 
            variant={task.status === "todo" ? "filled" : "outlined"}
            color={task.status === "todo" ? "primary" : "default"} 
            onClick={() => onStatusChange(task._id, "todo")} 
          />
          <Chip 
            label="In Progress" 
            clickable 
            variant={task.status === "in-progress" ? "filled" : "outlined"}
            color={task.status === "in-progress" ? "info" : "default"} 
            onClick={() => onStatusChange(task._id, "in-progress")} 
          />
          <Chip 
            label="Completed" 
            clickable 
            variant={task.status === "completed" ? "filled" : "outlined"}
            color={task.status === "completed" ? "success" : "default"} 
            onClick={() => onStatusChange(task._id, "completed")} 
          />
        </Stack>

      </CardContent>
    </Card>
  );
}