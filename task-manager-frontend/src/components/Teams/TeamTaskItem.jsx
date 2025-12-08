// src/components/Teams/TeamTaskItem.jsx
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
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import EventBusyIcon from "@mui/icons-material/EventBusy";
import EventIcon from "@mui/icons-material/Event";
import GoogleIcon from "@mui/icons-material/Google";
import ScheduleIcon from "@mui/icons-material/Schedule";
import { useTheme } from "@mui/material/styles";
import ExtensionRequestModal from "./ExtensionRequestModal"; // relative path: if different, adjust

export default function TeamTaskItem({
  task,
  canEdit,
  onEdit,
  onDelete,
  onStatusChange,
  onQuickComplete,
  currentUserId,
  isAdminOrManager = false, // passed from parent when available
}) {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState(null);
  const [openExtensionModal, setOpenExtensionModal] = useState(false);

  const priorityColors = { high: "error", medium: "warning", low: "success" };
  const statusColors = { todo: "default", "in-progress": "info", completed: "success" };

  const isAssignedToMe = task.assignedTo?._id === currentUserId;

  // Extension request helpers
  const ext = task.extensionRequest || {};
  const hasPendingRequest = ext.requested && ext.status === "pending";
  const hasApproved = ext.status === "approved";
  const hasRejected = ext.status === "rejected";

  const getDueDateStatus = () => {
    if (!task.dueDate) return { status: "no-due-date", color: "text.secondary", message: "No due date" };
    if (task.status === "completed") return { status: "completed", color: "success.main", message: "Completed" };
    const now = new Date(); const dueDate = new Date(task.dueDate);
    const timeDiff = dueDate.getTime() - now.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    if (daysDiff < 0) return { status: "overdue", color: "error.main", message: `Overdue by ${Math.abs(daysDiff)} day${Math.abs(daysDiff) === 1 ? '' : 's'}` };
    if (daysDiff === 0) return { status: "due-today", color: "warning.main", message: "Due today!" };
    if (daysDiff <= 2) return { status: "due-soon", color: "warning.light", message: `Due in ${daysDiff} day${daysDiff === 1 ? '' : 's'}` };
    return { status: "future", color: "text.secondary", message: `Due in ${daysDiff} days` };
  };

  const dueDateStatus = getDueDateStatus();

  const formatDate = (dateString) => {
    if (!dateString) return "No due date";
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";
    return date.toLocaleDateString();
  };

  const handleMenuOpen = (e) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const getICSUrl = () => {
    const baseUrl = process.env.REACT_APP_API_URL || window.location.origin;
    return `${baseUrl}/api/ics/${task._id}`;
  };

  return (
    <>
      <Card sx={{ mb: 2, borderRadius: 3, p: 1, borderLeft: `5px solid ${task.color || theme.palette.primary.main}` }}>
        {dueDateStatus.status === "overdue" && task.status !== "completed" && (
          <Alert severity="error" sx={{ mb: 2 }}>{dueDateStatus.message}</Alert>
        )}
        {dueDateStatus.status === "due-today" && task.status !== "completed" && (
          <Alert severity="warning" sx={{ mb: 2 }}>{dueDateStatus.message}</Alert>
        )}

        <CardContent>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" fontWeight={700}>
                <span style={{ marginRight: 8 }}>{task.icon || "📋"}</span>
                {task.title}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
                {task.createdBy && <Typography variant="caption" color="text.secondary">Created by: {task.createdBy.name || task.createdBy}</Typography>}
                {task.assignedTo && <Typography variant="caption" color="text.secondary">Assigned to: {task.assignedTo.name || task.assignedTo}</Typography>}
                {/* Show extension badge quickly in small text */}
                {ext.requested && (
                  <Chip
                    label={ext.status === "pending" ? "Extension: Pending" : ext.status === "approved" ? "Extension: Approved" : "Extension: Rejected"}
                    size="small"
                    variant={ext.status === "approved" ? "filled" : "outlined"}
                    color={ext.status === "approved" ? "success" : ext.status === "rejected" ? "error" : "warning"}
                    sx={{ ml: 1 }}
                  />
                )}
              </Stack>
            </Box>

            <Box>
              <IconButton size="small" onClick={handleMenuOpen} sx={{ mr: 1 }}>
                <MoreVertIcon />
              </IconButton>

              {canEdit && (
                <>
                  <IconButton color="primary" onClick={() => onEdit && onEdit(task)} size="small" sx={{ mr: 1 }}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton color="error" onClick={() => onDelete && onDelete(task._id)} size="small">
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </>
              )}
            </Box>
          </Box>

          {task.description && <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{task.description}</Typography>}

          <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
            <Chip label={task.priority} color={priorityColors[task.priority] || "default"} size="small" />
            <Chip label={task.status?.replace("-", " ") || "todo"} color={statusColors[task.status] || "default"} size="small" />
            <Chip icon={<AccessTimeIcon />} label={`${formatDate(task.dueDate)} • ${dueDateStatus.message}`} variant="outlined" size="small" />
            {task.team && typeof task.team === "object" && <Chip label={`👥 ${task.team.name}`} size="small" />}
          </Stack>

          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            <Button variant="contained" startIcon={<EventIcon />} onClick={() => window.open(getICSUrl(), "_blank")}>Add to Calendar</Button>
            <Button variant="outlined" startIcon={<GoogleIcon />} href={task.dueDate ? (function(){
              const s = new Date(task.dueDate); const e = new Date(s.getTime() + 30*60*1000);
              const f = d => d.toISOString().replace(/[-:]/g,"").replace(/\.\d+Z$/,"Z");
              return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(task.title)}&details=${encodeURIComponent(task.description||"")}&dates=${f(s)}/${f(e)}`;
            })() : "#"} target="_blank" disabled={!task.dueDate}>Google Calendar</Button>
          </Stack>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
            <Stack direction="row" spacing={1}>
              <Chip label="To Do" clickable variant={task.status === "todo" ? "filled" : "outlined"} onClick={() => onStatusChange && onStatusChange(task._id, "todo")} />
              <Chip label="In Progress" clickable variant={task.status === "in-progress" ? "filled" : "outlined"} onClick={() => onStatusChange && onStatusChange(task._id, "in-progress")} />
              <Chip label="Completed" clickable variant={task.status === "completed" ? "filled" : "outlined"} onClick={() => onStatusChange && onStatusChange(task._id, "completed")} />
            </Stack>

            <Box sx={{ display: "flex", gap: 1 }}>
              {task.status !== "completed" && isAssignedToMe && (
                <Button variant="contained" color="success" onClick={() => onQuickComplete && onQuickComplete(task._id)}>Mark Complete</Button>
              )}

              {/* Extension controls */}
              {isAssignedToMe && !ext.requested && (
                <Button variant="outlined" onClick={() => setOpenExtensionModal(true)}>Request Extension</Button>
              )}

              {isAssignedToMe && hasPendingRequest && (
                <Button variant="outlined" disabled>Extension Pending</Button>
              )}

              {/* Admin quick link: opens TeamDetails where approval UI exists */}
              {isAdminOrManager && hasPendingRequest && (
                <Button variant="contained" color="primary" onClick={() => window.location.href = `/teams/${task.team?._id || task.team}`}>Review Request</Button>
              )}
            </Box>
          </Box>

          {/* show full extension details if present */}
          {ext.requested && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary">Extension request by {ext.requestedBy?.name || "user"} • {ext.requestedAt ? new Date(ext.requestedAt).toLocaleString() : ""}</Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>{ext.reason}</Typography>
              {ext.requestedDueDate && <Typography variant="caption" color="text.secondary">Requested new due date: {new Date(ext.requestedDueDate).toLocaleDateString()}</Typography>}
            </Box>
          )}
        </CardContent>

        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
          {task.status !== "completed" && isAssignedToMe && (
            <MenuItem onClick={() => { onQuickComplete && onQuickComplete(task._id); handleMenuClose(); }}>
              <CheckCircleIcon fontSize="small" sx={{ mr: 1 }} /> Mark as Complete
            </MenuItem>
          )}
          <MenuItem onClick={() => { window.open(getICSUrl(), "_blank"); handleMenuClose(); }}>
            <ScheduleIcon fontSize="small" sx={{ mr: 1 }} /> Download Calendar File
          </MenuItem>
          {task.dueDate && (
            <MenuItem onClick={() => { window.open("#", "_blank"); handleMenuClose(); }}>
              <GoogleIcon fontSize="small" sx={{ mr: 1 }} /> Add to Google Calendar
            </MenuItem>
          )}
          {canEdit && (
            <MenuItem onClick={() => { onEdit && onEdit(task); handleMenuClose(); }}>
              <EditIcon fontSize="small" sx={{ mr: 1 }} /> Edit Task
            </MenuItem>
          )}
        </Menu>
      </Card>

      <ExtensionRequestModal
        open={openExtensionModal}
        onClose={() => setOpenExtensionModal(false)}
        task={task}
        onSubmitted={() => window.location.reload()} // simple refresh — you can replace with a smarter refresh callback
      />
    </>
  );
}
