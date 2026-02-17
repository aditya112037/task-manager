import React, { useState, useEffect } from "react";
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
  onSubmitted,
}) {
  const [reason, setReason] = useState("");
  const [requestedDueDate, setRequestedDueDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /* ---------------------------------------------------
     RESET & PREFILL ON OPEN
  --------------------------------------------------- */
  useEffect(() => {
    if (!open || !task) return;

    setReason(task.extensionRequest?.reason || "");

    const baseDate =
      task.extensionRequest?.requestedDueDate || task.dueDate;

    setRequestedDueDate(
      baseDate ? new Date(baseDate).toISOString().slice(0, 10) : ""
    );

    setError(null);
  }, [open, task]);

  /* ---------------------------------------------------
     CLEAN CLOSE
  --------------------------------------------------- */
  const handleClose = () => {
    if (loading) return;
    setReason("");
    setRequestedDueDate("");
    setError(null);
    onClose();
  };

  /* ---------------------------------------------------
     SUBMIT
  --------------------------------------------------- */
  const handleSubmit = async () => {
    if (!reason.trim() || !requestedDueDate) {
      setError("Please provide a reason and a requested due date.");
      return;
    }

    if (task?.dueDate) {
      const current = new Date(task.dueDate);
      const requested = new Date(requestedDueDate);

      if (requested <= current) {
        setError("Requested due date must be later than the current due date.");
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const requestPayload = {
        reason,
        requestedDueDate: new Date(requestedDueDate).toISOString(),
      };

      if (onSubmitted) {
        await onSubmitted(task._id, requestPayload);
      } else {
        await teamTasksAPI.requestExtension(task._id, requestPayload);
      }

      handleClose();
    } catch (err) {
      console.error("Extension request error:", err);
      setError(err.response?.data?.message || "Failed to submit request");
    } finally {
      setLoading(false);
    }
  };

  const hasPending =
    task?.extensionRequest?.requested &&
    task?.extensionRequest?.status === "pending";

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Request Extension</DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="subtitle2">Task</Typography>
          <Typography variant="body1" fontWeight={600}>
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
            disabled={loading || hasPending}
          />

          <TextField
            label="Requested new due date"
            type="date"
            value={requestedDueDate}
            onChange={(e) => setRequestedDueDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
            required
            disabled={loading || hasPending}
          />

          {hasPending && (
            <Alert severity="info">
              You already have a pending extension request for this task.
            </Alert>
          )}

          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || hasPending}
        >
          {loading ? "Submitting..." : "Submit Request"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
