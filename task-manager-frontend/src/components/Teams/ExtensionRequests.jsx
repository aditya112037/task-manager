// components/Teams/ExtensionRequests.jsx
import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  Stack,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Divider,
} from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import { teamTasksAPI } from "../../services/api";

const ExtensionRequests = ({ teamId, isAdminOrManager, onClose }) => {
  const [extensions, setExtensions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedTask, setSelectedTask] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    if (isAdminOrManager && teamId) {
      fetchPendingExtensions();
    }
  }, [teamId, isAdminOrManager]);

  const fetchPendingExtensions = async () => {
    try {
      setLoading(true);
      const response = await teamTasksAPI.getPendingExtensions(teamId);
      setExtensions(response.data);
    } catch (err) {
      console.error("Error fetching extensions:", err);
      setError("Failed to load extension requests");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (taskId) => {
    try {
      await teamTasksAPI.approveExtension(taskId);
      fetchPendingExtensions(); // Refresh list
      if (onClose) onClose();
    } catch (err) {
      console.error("Error approving extension:", err);
      setError("Failed to approve extension");
    }
  };

  const handleReject = async (taskId) => {
    try {
      await teamTasksAPI.rejectExtension(taskId);
      setSelectedTask(null);
      setRejectionReason("");
      fetchPendingExtensions(); // Refresh list
    } catch (err) {
      console.error("Error rejecting extension:", err);
      setError("Failed to reject extension");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "No date";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!isAdminOrManager) {
    return (
      <Alert severity="warning">
        You need to be an admin or manager to view extension requests.
      </Alert>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h6" fontWeight={600}>
          📝 Pending Extension Requests ({extensions.length})
        </Typography>
        <Button onClick={fetchPendingExtensions} size="small">
          Refresh
        </Button>
      </Box>

      {extensions.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: "center" }}>
          <AccessTimeIcon sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
          <Typography color="text.secondary">
            No pending extension requests
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={2}>
          {extensions.map((task) => (
            <Paper key={task._id} sx={{ p: 3, borderRadius: 2 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
                <Box>
                  <Typography variant="h6" fontWeight={600}>
                    {task.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Assigned to: {task.assignedTo?.name || "Unknown"}
                  </Typography>
                </Box>
                <Chip
                  label="Extension Pending"
                  color="warning"
                  icon={<AccessTimeIcon />}
                />
              </Box>

              <Divider sx={{ my: 2 }} />

              <Stack spacing={2}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Current Due Date
                  </Typography>
                  <Typography>
                    {formatDate(task.dueDate)} at {formatTime(task.dueDate)}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Requested New Due Date
                  </Typography>
                  <Typography>
                    {formatDate(task.extensionRequest.requestedDueDate)} at{" "}
                    {formatTime(task.extensionRequest.requestedDueDate)}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Reason for Extension
                  </Typography>
                  <Paper sx={{ p: 2, bgcolor: "background.default", mt: 1 }}>
                    <Typography>
                      {task.extensionRequest.reason || "No reason provided"}
                    </Typography>
                  </Paper>
                </Box>

                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Requested By
                  </Typography>
                  <Typography>
                    {task.assignedTo?.name || "Unknown"} •{" "}
                    {formatDate(task.extensionRequest.requestedAt)} at{" "}
                    {formatTime(task.extensionRequest.requestedAt)}
                  </Typography>
                </Box>
              </Stack>

              <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<CheckCircleIcon />}
                  onClick={() => handleApprove(task._id)}
                  sx={{ flex: 1 }}
                >
                  Approve Extension
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<CancelIcon />}
                  onClick={() => setSelectedTask(task)}
                  sx={{ flex: 1 }}
                >
                  Reject Request
                </Button>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}

      {/* Rejection Dialog */}
      <Dialog open={Boolean(selectedTask)} onClose={() => setSelectedTask(null)}>
        <DialogTitle>Reject Extension Request</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Are you sure you want to reject the extension request for "
            {selectedTask?.title}"?
          </Typography>
          <TextField
            label="Optional: Add rejection reason"
            multiline
            rows={3}
            fullWidth
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Explain why the extension was rejected..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedTask(null)}>Cancel</Button>
          <Button
            onClick={() => handleReject(selectedTask._id)}
            color="error"
            variant="contained"
          >
            Reject Extension
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ExtensionRequests;