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

const TeamTaskItem = ({ task, onEdit, onDelete }) => {
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

  const formatDate = (date) => {
    if (!date) return "No due date";
    return new Date(date).toLocaleDateString();
  };

  return (
    <Card
      sx={{
        mb: 2,
        borderRadius: 3,
        padding: 1,
        boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
        transition: "0.25s",
        "&:hover": { boxShadow: "0 6px 20px rgba(0,0,0,0.12)" },
      }}
    >
      <CardContent>
        {/* HEADER */}
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
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
          />
        </Stack>
      </CardContent>
    </Card>
  );
};

export default TeamTaskItem;
