// src/components/Teams/ExtensionRequestModal.jsx
import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
  Typography,
  Alert,
} from "@mui/material";
import { teamTasksAPI } from "../../services/api";

export default function ExtensionRequestModal({
  open,
  onClose,
  task,
  onSubmitted, // callback to refresh parent list
}) {
  const [reason, setReason] = useState("");
  const [requestedDueDate, setRequestedDueDate] = useState(
    task?.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : ""
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  React.useEffect(() => {
    if (open && task) {
      setReason(task.extensionRequest?.reason || "");
      setRequestedDueDate(
        (task.extensionRequest?.requestedDueDate && new Date(task.extensionRequest.requestedDueDate).toISOString().slice(0,10)) ||
        (task?.dueDate ? new Date(task.dueDate).toISOString().slice(0,10) : "")
      );
      setError(null);
    }
  }, [open, task]);

  const handleSubmit = async () => {
    if (!reason || !requestedDueDate) {
      setError("Please provide a reason and requested due date.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await teamTasksAPI.requestExtension(task._id, {
        reason,
        requestedDueDate: new Date(requestedDueDate).toISOString(),
      });
      onSubmitted && onSubmitted();
      onClose();
    } catch (err) {
      console.error("Request extension error:", err);
      setError(err.response?.data?.message || "Failed to submit request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Request Extension</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="subtitle2">Task</Typography>
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            {task?.title}
          </Typography>

          <TextField
            label="Reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            multiline
            rows={4}
            fullWidth
            required
          />

          <TextField
            label="Requested new due date"
            type="date"
            value={requestedDueDate}
            onChange={(e) => setRequestedDueDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
            required
          />

          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading}>
          {loading ? "Submitting..." : "Submit Request"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
