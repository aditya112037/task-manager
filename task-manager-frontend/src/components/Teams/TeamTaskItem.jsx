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

export default function TeamTaskItem({ task, isAdmin, onEdit, onDelete }) {
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
    <Card
      sx={{
        mb: 2,
        borderRadius: 3,
        padding: 1,
        boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
        transition: "0.25s",
        background: (theme) => theme.palette.background.paper,
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

        {/* PROGRESS (non-admin can change status) */}
        <Stack direction="row" spacing={1}>
          <Chip
            label="To Do"
            clickable
            color={task.status === "todo" ? "primary" : "default"}
            variant={task.status === "todo" ? "filled" : "outlined"}
          />

          <Chip
            label="In Progress"
            clickable
            color={task.status === "in-progress" ? "info" : "default"}
            variant={task.status === "in-progress" ? "filled" : "outlined"}
          />

          <Chip
            label="Completed"
            clickable
            color={task.status === "completed" ? "success" : "default"}
            variant={task.status === "completed" ? "filled" : "outlined"}
          />
        </Stack>
      </CardContent>
    </Card>
  );
}
