import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  InputAdornment,
  Typography,
  IconButton,
  Stack,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";

export default function TeamTaskForm({ open, task, teamMembers, onCancel, onSubmit }) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium",
    dueDate: "",
    assignedTo: "",
    color: "#4CAF50",
    icon: "Task",
    subtasks: [],
  });

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || "",
        description: task.description || "",
        priority: task.priority || "medium",
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : "",
        assignedTo: task.assignedTo?._id || task.assignedTo || "",
        color: task.color || "#4CAF50",
        icon: task.icon || "Task",
        subtasks: Array.isArray(task.subtasks)
          ? task.subtasks.map((item) => ({
              _id: item._id,
              title: item.title || "",
              progressPercentage:
                Number.isFinite(Number(item.progressPercentage))
                  ? Math.min(100, Math.max(0, Math.round(Number(item.progressPercentage))))
                  : item.completed
                    ? 100
                    : 0,
              completed: Boolean(item.completed),
              assignedTo: item.assignedTo?._id || item.assignedTo || "",
              completedAt: item.completedAt || null,
              completedBy: item.completedBy?._id || item.completedBy || null,
            }))
          : [],
      });
      return;
    }

    setFormData({
      title: "",
      description: "",
      priority: "medium",
      dueDate: "",
      assignedTo: "",
      color: "#4CAF50",
      icon: "Task",
      subtasks: [],
    });
  }, [task]);

  const handleAddSubtask = () => {
    setFormData((prev) => ({
      ...prev,
      subtasks: [...prev.subtasks, { title: "", completed: false, assignedTo: "" }],
    }));
  };

  const handleRemoveSubtask = (index) => {
    setFormData((prev) => ({
      ...prev,
      subtasks: prev.subtasks.filter((_, i) => i !== index),
    }));
  };

  const handleSubtaskChange = (index, key, value) => {
    setFormData((prev) => ({
      ...prev,
      subtasks: prev.subtasks.map((item, i) =>
        i === index ? { ...item, [key]: value } : item
      ),
    }));
  };

  const handleSubmit = () => {
    if (!formData.title.trim()) {
      alert("Title is required");
      return;
    }

    const hasEmptySubtask = formData.subtasks.some((item) => !String(item.title || "").trim());
    if (hasEmptySubtask) {
      alert("Every subtask needs a title");
      return;
    }

    const submitData = {
      ...formData,
      dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : null,
      assignedTo: formData.assignedTo || null,
      subtasks: formData.subtasks
        .map((item) => ({
          _id: item._id,
          title: String(item.title || "").trim(),
          progressPercentage:
            Number.isFinite(Number(item.progressPercentage))
              ? Math.min(100, Math.max(0, Math.round(Number(item.progressPercentage))))
              : item.completed
                ? 100
                : 0,
          completed: Boolean(item.completed),
          assignedTo: item.assignedTo || null,
          completedAt: item.completed ? item.completedAt || new Date().toISOString() : null,
          completedBy: item.completed ? item.completedBy || null : null,
        }))
        .filter((item) => item.title),
    };

    onSubmit(submitData);
  };

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth>
      <DialogTitle>{task ? "Edit Task" : "Create New Task"}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
          <TextField
            label="Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            fullWidth
            required
          />

          <TextField
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            fullWidth
            multiline
            rows={3}
          />

          <FormControl fullWidth>
            <InputLabel>Priority</InputLabel>
            <Select
              value={formData.priority}
              label="Priority"
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
            >
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="high">High</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Assigned To</InputLabel>
            <Select
              value={formData.assignedTo}
              label="Assigned To"
              onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
            >
              <MenuItem value="">Team Tasks</MenuItem>
              {teamMembers.map((member) => (
                <MenuItem key={member.user._id} value={member.user._id}>
                  {member.user.name} ({member.role})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Due Date"
            type="date"
            value={formData.dueDate}
            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            fullWidth
            InputLabelProps={{ shrink: true }}
          />

          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <FormControl sx={{ flex: 1 }}>
              <TextField
                label="Color"
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Box
                        sx={{
                          width: 20,
                          height: 20,
                          borderRadius: "50%",
                          backgroundColor: formData.color,
                          border: "1px solid #ccc",
                        }}
                      />
                    </InputAdornment>
                  ),
                }}
              />
            </FormControl>

            <TextField
              label="Icon"
              value={formData.icon}
              onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
              sx={{ flex: 1, minWidth: { xs: "100%", sm: "auto" } }}
              helperText="Emoji or short text"
            />
          </Box>

          <Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Subtasks (Checkpoints)
              </Typography>
              <Button
                size="small"
                startIcon={<AddIcon />}
                sx={{ textTransform: "none" }}
                onClick={handleAddSubtask}
              >
                Add
              </Button>
            </Box>
            <Stack spacing={1}>
              {formData.subtasks.map((item, index) => (
                <Box
                  key={item._id || `subtask-${index}`}
                  sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}
                >
                  <TextField
                    label={`Subtask ${index + 1}`}
                    value={item.title}
                    onChange={(e) => handleSubtaskChange(index, "title", e.target.value)}
                    size="small"
                    sx={{ flex: 2, minWidth: 220 }}
                  />
                  <FormControl size="small" sx={{ flex: 1, minWidth: 180 }}>
                    <InputLabel>Assignee</InputLabel>
                    <Select
                      value={item.assignedTo || ""}
                      label="Assignee"
                      onChange={(e) => handleSubtaskChange(index, "assignedTo", e.target.value)}
                    >
                      <MenuItem value="">Unassigned</MenuItem>
                      {teamMembers.map((member) => (
                        <MenuItem key={member.user._id} value={member.user._id}>
                          {member.user.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <IconButton color="error" onClick={() => handleRemoveSubtask(index)}>
                    <DeleteIcon />
                  </IconButton>
                </Box>
              ))}
            </Stack>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained">
          {task ? "Update Task" : "Create Task"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
