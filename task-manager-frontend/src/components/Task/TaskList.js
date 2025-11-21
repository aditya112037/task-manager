import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Grid,
  CircularProgress,
  Fab,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { tasksAPI } from "../../services/api";
import TaskForm from "./TaskForm";
import TaskItem from "./TaskItem";

const TaskList = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await tasksAPI.getTasks();
      setTasks(response.data);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (taskData) => {
    try {
      const response = await tasksAPI.createTask(taskData);
      setTasks([response.data, ...tasks]);
      setShowForm(false);
    } catch (error) {
      console.error("Error creating task:", error);
    }
  };

  const handleUpdateTask = async (id, taskData) => {
    try {
      const response = await tasksAPI.updateTask(id, taskData);
      setTasks(tasks.map((t) => (t._id === id ? response.data : t)));
      setEditingTask(null);
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const handleDeleteTask = async (id) => {
    if (window.confirm("Are you sure you want to delete this task?")) {
      try {
        await tasksAPI.deleteTask(id);
        setTasks(tasks.filter((t) => t._id !== id));
      } catch (error) {
        console.error("Error deleting task:", error);
      }
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "60vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <CircularProgress size={42} />
      </Box>
    );
  }

  return (
    <Box sx={{ pt: 2 }}>
      {/* HEADER */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h5" fontWeight={700}>
          My Tasks
        </Typography>

        <Button
          variant="contained"
          sx={{ borderRadius: 2, textTransform: "none" }}
          onClick={() => setShowForm(true)}
        >
          Add New Task
        </Button>
      </Box>

      {/* CREATE FORM */}
      {showForm && (
        <TaskForm
          onSubmit={handleCreateTask}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* EDIT FORM */}
      {editingTask && (
        <TaskForm
          task={editingTask}
          onSubmit={(taskData) =>
            handleUpdateTask(editingTask._id, taskData)
          }
          onCancel={() => setEditingTask(null)}
        />
      )}

      {/* TASK GRID */}
      {tasks.length > 0 ? (
        <Grid container spacing={2}>
          {tasks.map((task) => (
            <Grid item xs={12} sm={6} md={6} key={task._id}>
              <TaskItem
                task={task}
                onEdit={setEditingTask}
                onDelete={handleDeleteTask}
                onUpdate={handleUpdateTask}
              />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Box sx={{ textAlign: "center", mt: 10 }}>
          <Typography variant="h6" color="text.secondary">
            No tasks yet.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Create your first task!
          </Typography>
        </Box>
      )}

      {/* Floating Add Button (mobile friendly) */}
      <Fab
        color="primary"
        sx={{ position: "fixed", bottom: 24, right: 24 }}
        onClick={() => setShowForm(true)}
      >
        <AddIcon />
      </Fab>
    </Box>
  );
};

export default TaskList;
