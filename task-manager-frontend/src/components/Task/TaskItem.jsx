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
  Button
} from "@mui/material";

import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import EventIcon from "@mui/icons-material/Event";
import GoogleIcon from "@mui/icons-material/Google";

const TaskItem = ({ task, onEdit, onDelete, onUpdate }) => {
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

  // -------------------------------------------------------
  //  GOOGLE CALENDAR URL (CORRECTED — with end time)
  // -------------------------------------------------------
  const startDate = new Date(task.dueDate);

  const endDate = new Date(startDate.getTime() + 30 * 60 * 1000); // +30min

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
        boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
        transition: "0.25s",
        background: "#ffffff",
        "&:hover": { boxShadow: "0 6px 20px rgba(0,0,0,0.12)" },
      }}
    >
      <CardContent>
        
        {/* HEADER */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            mb: 1,
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {task.title}
          </Typography>

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
        </Box>

        {/* DESCRIPTION */}
        {task.description && (
          <Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>
            {task.description}
          </Typography>
        )}

        {/* METADATA */}
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
          />
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
              window.location.href =
                `${process.env.REACT_APP_API_URL}/api/ics/${task._id}`;
            }}
          >
            Add to Calendar (.ics)
          </Button>

          <Button
            variant="outlined"
            color="primary"
            startIcon={<GoogleIcon />}
            sx={{
              textTransform: "none",
              borderRadius: 2,
              px: 2,
            }}
            href={googleCalendarURL}
            target="_blank"
          >
            Add to Google Calendar
          </Button>
        </Stack>

        {/* STATUS BUTTONS */}
        <Stack direction="row" spacing={1}>
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
