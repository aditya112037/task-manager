import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  MenuItem,
  Stack,
  Typography,
} from "@mui/material";
import EventNoteIcon from "@mui/icons-material/EventNote";
import LowPriorityIcon from "@mui/icons-material/LowPriority";
import PriorityHighIcon from "@mui/icons-material/PriorityHigh";
import LabelImportantIcon from "@mui/icons-material/LabelImportant";

const priorityOptions = [
  { value: "low", label: "Low", icon: <LowPriorityIcon fontSize="small" /> },
  { value: "medium", label: "Medium", icon: <LabelImportantIcon fontSize="small" /> },
  { value: "high", label: "High", icon: <PriorityHighIcon fontSize="small" /> },
];

const TaskForm = ({ task, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium",
    status: "todo",
    dueDate: "",
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || "",
        description: task.description || "",
        priority: task.priority || "medium",
        status: task.status || "todo",
        // convert ISO to datetime-local if available
        dueDate: task.dueDate
          ? new Date(task.dueDate).toISOString().slice(0, 16) // yyyy-MM-ddTHH:mm
          : "",
      });
    } else {
      // reset when creating new
      setFormData({
        title: "",
        description: "",
        priority: "medium",
        status: "todo",
        dueDate: "",
      });
    }
    setErrors({});
  }, [task]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((s) => ({ ...s, [name]: value }));
  };

  const handlePriorityClick = (value) => {
    setFormData((s) => ({ ...s, priority: value }));
  };

  const validate = () => {
    const err = {};
    if (!formData.title || formData.title.trim().length < 1) {
      err.title = "Title is required";
    }
    // optional: if dueDate provided, ensure valid date
    if (formData.dueDate && isNaN(new Date(formData.dueDate).getTime())) {
      err.dueDate = "Please provide a valid date/time";
    }
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setSubmitting(true);

    // Convert datetime-local -> ISO (if present)
    const payload = {
      ...formData,
      dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : null,
    };

    try {
      await onSubmit(payload);
    } catch (err) {
      // keep simple: show a field-level error if backend returns validation
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={true}
      onClose={onCancel}
      fullWidth
      maxWidth="sm"
      sx={{
        "& .MuiDialog-paper": {
          borderRadius: 3,
          p: 0,
        },
      }}
    >
      <DialogTitle sx={{ fontWeight: 800, display: "flex", alignItems: "center", gap: 1 }}>
        <EventNoteIcon color="primary" />
        <span>{task ? "Edit Task" : "Create New Task"}</span>
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 0.5 }}>
          {/* Title */}
          <TextField
            label="Title *"
            name="title"
            required
            fullWidth
            value={formData.title}
            onChange={handleChange}
            error={!!errors.title}
            helperText={errors.title}
            autoFocus
          />

          {/* Description */}
          <TextField
            label="Description"
            name="description"
            multiline
            rows={3}
            fullWidth
            value={formData.description}
            onChange={handleChange}
          />

          {/* Priority pills */}
          <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
            <Typography variant="body2" sx={{ minWidth: 88, color: "text.secondary" }}>
              Priority
            </Typography>
            <Stack direction="row" spacing={1}>
              {priorityOptions.map((p) => {
                const active = formData.priority === p.value;
                return (
                  <Button
                    key={p.value}
                    onClick={() => handlePriorityClick(p.value)}
                    size="small"
                    variant={active ? "contained" : "outlined"}
                    color={active ? "primary" : "inherit"}
                    startIcon={p.icon}
                    sx={{
                      textTransform: "none",
                      borderRadius: 2,
                      px: 1.5,
                    }}
                  >
                    {p.label}
                  </Button>
                );
              })}
            </Stack>
          </Box>

          {/* Status + Due Date row */}
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <TextField
              select
              label="Status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              sx={{ minWidth: 160, flex: 1 }}
            >
              <MenuItem value="todo">To Do</MenuItem>
              <MenuItem value="in-progress">In Progress</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
            </TextField>

            <TextField
              label="Due (optional)"
              type="datetime-local"
              name="dueDate"
              value={formData.dueDate}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 220, flex: 1 }}
              error={!!errors.dueDate}
              helperText={errors.dueDate}
            />
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, display: "flex", gap: 1 }}>
        <Button
          onClick={onCancel}
          color="inherit"
          variant="outlined"
          sx={{ textTransform: "none", borderRadius: 2 }}
        >
          Cancel
        </Button>

        <Button
          onClick={handleSubmit}
          variant="contained"
          sx={{ textTransform: "none", borderRadius: 2 }}
          disabled={submitting}
        >
          {submitting ? "Saving..." : task ? "Update Task" : "Create Task"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TaskForm;
