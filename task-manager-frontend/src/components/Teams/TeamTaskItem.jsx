import React, { useState } from "react";
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
  Menu,
  MenuItem,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import EventBusyIcon from "@mui/icons-material/EventBusy";
import ScheduleIcon from "@mui/icons-material/Schedule";
import { useTheme } from "@mui/material/styles";
import EventIcon from "@mui/icons-material/Event";
import GoogleIcon from "@mui/icons-material/Google";

export default function TeamTaskItem({ 
  task, 
  canEdit, 
  onEdit, 
  onDelete, 
  onStatusChange,
  onRequestExtension,
  onQuickComplete
}) {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState(null);
  const [extensionDialogOpen, setExtensionDialogOpen] = useState(false);
  const [extensionReason, setExtensionReason] = useState("");
  const [requestedDueDate, setRequestedDueDate] = useState("");

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

  // Calculate due date status
  const getDueDateStatus = () => {
    if (!task.dueDate) return { status: "no-due-date", color: "text.secondary", message: "No due date" };
    
    if (task.status === "completed") {
      return { status: "completed", color: "success.main", message: "Completed" };
    }
    
    const now = new Date();
    const dueDate = new Date(task.dueDate);
    const timeDiff = dueDate.getTime() - now.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    if (daysDiff < 0) {
      return { 
        status: "overdue", 
        color: "error.main",
        message: `Overdue by ${Math.abs(daysDiff)} day${Math.abs(daysDiff) === 1 ? '' : 's'}`
      };
    } else if (daysDiff === 0) {
      return { 
        status: "due-today", 
        color: "warning.main",
        message: "Due today!"
      };
    } else if (daysDiff <= 2) {
      return { 
        status: "due-soon", 
        color: "warning.light",
        message: `Due in ${daysDiff} day${daysDiff === 1 ? '' : 's'}`
      };
    } else {
      return { 
        status: "future", 
        color: "text.secondary",
        message: `Due in ${daysDiff} days`
      };
    }
  };

  const dueDateStatus = getDueDateStatus();

  const formatDate = (dateString) => {
    if (!dateString) return "No due date";
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return "Tomorrow";
    } else {
      return date.toLocaleDateString("en-US", {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleExtensionRequest = () => {
    handleMenuClose();
    setExtensionDialogOpen(true);
    // Set default extension date to current due date + 3 days
    if (task.dueDate) {
      const currentDueDate = new Date(task.dueDate);
      const newDueDate = new Date(currentDueDate);
      newDueDate.setDate(newDueDate.getDate() + 3);
      setRequestedDueDate(newDueDate.toISOString().split('T')[0]);
    }
  };

  const submitExtensionRequest = () => {
    if (!extensionReason.trim()) {
      alert("Please provide a reason for the extension");
      return;
    }
    
    if (onRequestExtension) {
      onRequestExtension(task._id, extensionReason, requestedDueDate);
    }
    
    setExtensionDialogOpen(false);
    setExtensionReason("");
    setRequestedDueDate("");
  };

  const handleQuickComplete = () => {
    if (window.confirm("Mark this task as complete?")) {
      if (onQuickComplete) {
        onQuickComplete(task._id);
      }
      handleMenuClose();
    }
  };

  const getGoogleCalendarURL = () => {
    if (!task.dueDate) return "#";
    
    const startDate = new Date(task.dueDate);
    const endDate = new Date(startDate.getTime() + 30 * 60 * 1000);

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

  const getICSUrl = () => {
    return `${process.env.REACT_APP_API_URL}/api/ics/${task._id}`;
  };

  // Check if user is assigned to this task
  const isAssignedToMe = task.assignedTo?._id === task.currentUserId;

  return (
    <Card sx={{ 
      mb: 2, 
      borderRadius: 3, 
      p: 1,
      backgroundColor: theme.palette.background.paper,
      borderLeft: `5px solid ${task.color || "#4CAF50"}`,
      transition: "0.2s",
      boxShadow: theme.palette.mode === "dark"
        ? "0 0 10px rgba(0,0,0,0.4)"
        : "0 4px 15px rgba(0,0,0,0.08)",
      "&:hover": {
        boxShadow: theme.palette.mode === "dark"
          ? "0 0 14px rgba(0,0,0,0.55)"
          : "0 6px 20px rgba(0,0,0,0.12)",
      },
    }}>
      {/* Due Date Warning Banner */}
      {dueDateStatus.status === "overdue" && task.status !== "completed" && (
        <Alert 
          severity="error" 
          icon={<EventBusyIcon />}
          sx={{ 
            mb: 2, 
            borderRadius: 2,
            '& .MuiAlert-icon': { fontSize: 20 }
          }}
        >
          <Typography variant="body2" fontWeight={600}>
            ⚠️ {dueDateStatus.message}
          </Typography>
        </Alert>
      )}

      {dueDateStatus.status === "due-today" && task.status !== "completed" && (
        <Alert 
          severity="warning"
          icon={<AccessTimeIcon />}
          sx={{ 
            mb: 2, 
            borderRadius: 2,
            bgcolor: 'warning.light',
            color: 'warning.contrastText',
          }}
        >
          <Typography variant="body2" fontWeight={600}>
            ⏰ {dueDateStatus.message}
          </Typography>
        </Alert>
      )}

      <CardContent>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" fontWeight={700} color={theme.palette.text.primary}>
              <span style={{ marginRight: 8 }}>{task.icon || "📋"}</span>
              {task.title}
            </Typography>
            
            {/* Extension Request Status */}
            {task.extensionRequest?.requested && (
              <Chip
                label={`Extension ${task.extensionRequest.status}`}
                size="small"
                color={task.extensionRequest.status === "pending" ? "warning" : 
                       task.extensionRequest.status === "approved" ? "success" : "error"}
                variant="outlined"
                sx={{ mt: 0.5, mr: 1 }}
                icon={<ScheduleIcon />}
              />
            )}
            
            <Stack direction="row" spacing={2} sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
              {task.createdBy && (
                <Typography variant="caption" color="text.secondary">
                  Created by: {typeof task.createdBy === 'object' ? task.createdBy.name : task.createdBy}
                </Typography>
              )}
              {task.assignedTo && (
                <Typography variant="caption" color="text.secondary">
                  Assigned to: {typeof task.assignedTo === 'object' ? task.assignedTo.name : task.assignedTo}
                </Typography>
              )}
            </Stack>
          </Box>

          <Box>
            <Tooltip title="More actions">
              <IconButton 
                size="small" 
                onClick={handleMenuOpen}
                sx={{ mr: 1 }}
              >
                <MoreVertIcon />
              </IconButton>
            </Tooltip>

            {canEdit && (
              <>
                <Tooltip title="Edit">
                  <IconButton 
                    color="primary" 
                    onClick={() => onEdit(task)}
                    size="small"
                    sx={{ mr: 1 }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Delete">
                  <IconButton 
                    color="error" 
                    onClick={() => onDelete(task._id)}
                    size="small"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </>
            )}
          </Box>
        </Box>

        {task.description && (
          <Typography 
            variant="body2" 
            sx={{ 
              mb: 2, 
              color: theme.palette.text.secondary,
              whiteSpace: 'pre-line'
            }}
          >
            {task.description}
          </Typography>
        )}

        <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
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
            icon={<AccessTimeIcon />}
            label={`${formatDate(task.dueDate)} • ${dueDateStatus.message}`}
            variant="outlined"
            size="small"
            sx={{
              color: dueDateStatus.color,
              borderColor: dueDateStatus.color,
              fontWeight: dueDateStatus.status === "overdue" ? 600 : 400,
            }}
          />
          
          {task.team && typeof task.team === 'object' && (
            <Chip 
              label={`👥 ${task.team.name}`} 
              variant="outlined"
              size="small"
              sx={{
                bgcolor: task.team.color || 'primary.main',
                color: 'white',
              }}
            />
          )}
        </Stack>

        <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<EventIcon />}
            sx={{
              textTransform: "none",
              borderRadius: 2,
              px: 2,
              flex: 1,
            }}
            onClick={() => {
              window.location.href = getICSUrl();
            }}
          >
            Add to Calendar
          </Button>

          <Button
            variant="outlined"
            color="primary"
            startIcon={<GoogleIcon />}
            sx={{
              textTransform: "none",
              borderRadius: 2,
              px: 2,
              flex: 1,
              borderColor: theme.palette.mode === "dark"
                ? "rgba(255,255,255,0.4)"
                : undefined,
            }}
            href={getGoogleCalendarURL()}
            target="_blank"
            rel="noopener noreferrer"
            disabled={!task.dueDate}
          >
            Google Calendar
          </Button>
        </Stack>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
            <Chip 
              label="To Do" 
              clickable 
              variant={task.status === "todo" ? "filled" : "outlined"}
              color={task.status === "todo" ? "primary" : "default"} 
              onClick={() => onStatusChange(task._id, "todo")}
              size="small"
            />
            <Chip 
              label="In Progress" 
              clickable 
              variant={task.status === "in-progress" ? "filled" : "outlined"}
              color={task.status === "in-progress" ? "info" : "default"} 
              onClick={() => onStatusChange(task._id, "in-progress")}
              size="small"
            />
            <Chip 
              label="Completed" 
              clickable 
              variant={task.status === "completed" ? "filled" : "outlined"}
              color={task.status === "completed" ? "success" : "default"} 
              onClick={() => onStatusChange(task._id, "completed")}
              size="small"
            />
          </Stack>

          {task.status !== "completed" && isAssignedToMe && (
            <Button
              size="small"
              variant="contained"
              color="success"
              startIcon={<CheckCircleIcon />}
              onClick={handleQuickComplete}
              sx={{
                textTransform: 'none',
                borderRadius: 2,
              }}
            >
              Mark Complete
            </Button>
          )}
        </Box>
      </CardContent>

      {/* More Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {isAssignedToMe && !task.extensionRequest?.requested && (
          <MenuItem onClick={handleExtensionRequest}>
            <ScheduleIcon fontSize="small" sx={{ mr: 1 }} />
            Request Extension
          </MenuItem>
        )}
        
        {task.status !== "completed" && isAssignedToMe && (
          <MenuItem onClick={handleQuickComplete}>
            <CheckCircleIcon fontSize="small" sx={{ mr: 1 }} />
            Mark as Complete
          </MenuItem>
        )}
        
        <MenuItem onClick={() => window.open(getICSUrl(), '_blank')}>
          <EventIcon fontSize="small" sx={{ mr: 1 }} />
          Download Calendar File
        </MenuItem>
        
        {task.dueDate && (
          <MenuItem onClick={() => window.open(getGoogleCalendarURL(), '_blank')}>
            <GoogleIcon fontSize="small" sx={{ mr: 1 }} />
            Add to Google Calendar
          </MenuItem>
        )}
        
        {canEdit && (
          <MenuItem onClick={() => { onEdit(task); handleMenuClose(); }}>
            <EditIcon fontSize="small" sx={{ mr: 1 }} />
            Edit Task
          </MenuItem>
        )}
      </Menu>

      {/* Extension Request Dialog */}
      <Dialog open={extensionDialogOpen} onClose={() => setExtensionDialogOpen(false)}>
        <DialogTitle>Request Extension</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 300 }}>
            <TextField
              label="Reason for extension"
              multiline
              rows={3}
              value={extensionReason}
              onChange={(e) => setExtensionReason(e.target.value)}
              fullWidth
              required
            />
            
            {task.dueDate && (
              <TextField
                label="New Due Date"
                type="date"
                value={requestedDueDate}
                onChange={(e) => setRequestedDueDate(e.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExtensionDialogOpen(false)}>Cancel</Button>
          <Button onClick={submitExtensionRequest} variant="contained" color="primary">
            Submit Request
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}