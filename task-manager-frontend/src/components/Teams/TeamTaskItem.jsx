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

export default function TeamTaskItem({
  task,
  canEdit = false,
  onEdit,
  onDelete,
  onStatusChange,
}) {
  const theme = useTheme();

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

  const formatDate = (dateString) => {
    if (!dateString) return "No due date";
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return String(dateString);
    }
  };

  return (
    <Card
      sx={{
        mb: 2,
        borderRadius: 3,
        padding: 1,
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
        {/* HEADER */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            mb: 1,
            alignItems: "center",
          }}
        >
          <Typography variant="h6" fontWeight={700}>
            {task.title}
          </Typography>

          {/* ADMIN CONTROLS */}
          {canEdit && (
            <Box>
              <Tooltip title="Edit">
                <IconButton
                  color="primary"
                  onClick={() => {
                    if (onEdit) onEdit(task);
                  }}
                  size="large"
                >
                  <EditIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title="Delete">
                <IconButton
                  color="error"
                  onClick={() => {
                    if (onDelete) onDelete(task._id);
                  }}
                  size="large"
                >
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

        {/* METADATA */}
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <Chip
            label={task.priority}
            color={priorityColors[task.priority] ?? "default"}
            size="small"
            sx={{ textTransform: "capitalize" }}
          />

          <Chip
            label={(task.status || "").replace("-", " ")}
            color={statusColors[task.status] ?? "default"}
            size="small"
            sx={{ textTransform: "capitalize" }}
          />

          <Chip
            label={`📅 ${formatDate(task.dueDate)}`}
            variant="outlined"
            size="small"
          />
        </Stack>

        {/* STATUS CHANGE BUTTONS */}
        <Stack direction="row" spacing={1}>
          <Button
            variant={task.status === "todo" ? "contained" : "outlined"}
            size="small"
            onClick={() => onStatusChange && onStatusChange(task._id, "todo")}
          >
            To Do
          </Button>

          <Button
            variant={task.status === "in-progress" ? "contained" : "outlined"}
            size="small"
            onClick={() =>
              onStatusChange && onStatusChange(task._id, "in-progress")
            }
          >
            In Progress
          </Button>

          <Button
            variant={task.status === "completed" ? "contained" : "outlined"}
            size="small"
            onClick={() =>
              onStatusChange && onStatusChange(task._id, "completed")
            }
          >
            Completed
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
