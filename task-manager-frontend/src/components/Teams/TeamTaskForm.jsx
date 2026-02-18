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
  Select,
  FormControl,
  InputLabel,
  InputAdornment,
} from "@mui/material";

export default function TeamTaskForm({ open, task, teamMembers, onCancel, onSubmit }) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium",
    status: "todo",
    dueDate: "",
    assignedTo: "",
    color: "#4CAF50",
    icon: "📋",
  });

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || "",
        description: task.description || "",
        priority: task.priority || "medium",
        status: task.status || "todo",
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : "",
        assignedTo: task.assignedTo?._id || "",
        color: task.color || "#4CAF50",
        icon: task.icon || "📋",
      });
    } else {
      setFormData({
        title: "",
        description: "",
        priority: "medium",
        status: "todo",
        dueDate: "",
        assignedTo: "",
        color: "#4CAF50",
        icon: "📋",
      });
    }
  }, [task]);

  const handleSubmit = () => {
    if (!formData.title.trim()) {
      alert("Title is required");
      return;
    }
    
    const submitData = {
      ...formData,
      dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : null,
      assignedTo: formData.assignedTo || null,
    };
    
    onSubmit(submitData);
  };

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth>
      <DialogTitle>
        {task ? "Edit Task" : "Create New Task"}
      </DialogTitle>
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
            <InputLabel>Status</InputLabel>
            <Select
              value={formData.status}
              label="Status"
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <MenuItem value="todo">To Do</MenuItem>
              <MenuItem value="in-progress">In Progress</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
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
                          borderRadius: '50%',
                          backgroundColor: formData.color,
                          border: '1px solid #ccc'
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
