import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Avatar,
  Tabs,
  Tab,
  Paper,
  Divider,
  Stack,
  Button,
} from "@mui/material";
import { useParams } from "react-router-dom";
import TeamTaskItem from "../components/Teams/TeamTaskItem";
import TeamTaskForm from "../components/Teams/TeamTaskForm";
import { teamTasksAPI } from "../services/teamsAPI";
import { useAuth } from "../context/AuthContext";

export default function TeamDetails() {
  const { teamId } = useParams();
  const { user } = useAuth();

  // TEMP — later replace with proper role check
  const isAdmin = true;

  // ---- STATE ----
  const [tab, setTab] = useState(0);
  const [teamTasks, setTeamTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // ---- LOAD TEAM TASKS ----
  useEffect(() => {
    fetchTeamTasks();
  }, []);

  const fetchTeamTasks = async () => {
    try {
      const res = await teamTasksAPI.getTasks(teamId);
      setTeamTasks(res.data);
    } catch (err) {
      console.error(err);
    }
    setLoadingTasks(false);
  };

  const deleteTeamTask = async (id) => {
    try {
      await teamTasksAPI.deleteTask(id);
      setTeamTasks(teamTasks.filter((t) => t._id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateTask = async (data) => {
    try {
      const res = await teamTasksAPI.createTask(teamId, data);
      setTeamTasks([res.data, ...teamTasks]);
      setShowTaskForm(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateTask = async (id, data) => {
    try {
      const res = await teamTasksAPI.updateTask(id, data);
      setTeamTasks(teamTasks.map((t) => (t._id === id ? res.data : t)));
      setEditingTask(null);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      {/* TEAM HEADER */}
      <Paper
        sx={{
          p: 3,
          borderRadius: 3,
          mb: 3,
          boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar
            sx={{ width: 70, height: 70, bgcolor: "primary.main", fontSize: 28 }}
          >
            T
          </Avatar>

          <Box>
            <Typography variant="h5" fontWeight={700}>
              Team Name (placeholder)
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Team description (placeholder)
            </Typography>
          </Box>
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Tabs
          value={tab}
          onChange={(e, v) => setTab(v)}
          sx={{ mb: 1 }}
        >
          <Tab label="Overview" />
          <Tab label="Members" />
          <Tab label="Tasks" />
          <Tab label="Settings" />
        </Tabs>
      </Paper>

      {/* ---- TAB CONTENT ---- */}

      {tab === 0 && (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={700}>
            Overview
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            Team stats, deadlines, activity etc.
          </Typography>
        </Paper>
      )}

      {tab === 1 && (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={700}>
            Members
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            Members list will appear here.
          </Typography>
        </Paper>
      )}

      {tab === 2 && (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={700}>
            Team Tasks
          </Typography>

          {isAdmin && (
            <Button
              variant="contained"
              sx={{ mt: 2, mb: 2, borderRadius: 2 }}
              onClick={() => setShowTaskForm(true)}
            >
              Create Task
            </Button>
          )}

          {loadingTasks ? (
            <Typography>Loading tasks...</Typography>
          ) : (
            teamTasks.map((task) => (
              <TeamTaskItem
                key={task._id}
                task={task}
                onEdit={setEditingTask}
                onDelete={deleteTeamTask}
              />
            ))
          )}
        </Paper>
      )}

      {tab === 3 && (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={700}>
            Settings
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            Rename team, change icon, manage roles, delete team.
          </Typography>
        </Paper>
      )}

      {/* FORMS */}
      {showTaskForm && (
        <TeamTaskForm
          onSubmit={handleCreateTask}
          onCancel={() => setShowTaskForm(false)}
        />
      )}

      {editingTask && (
        <TeamTaskForm
          task={editingTask}
          onSubmit={(data) => handleUpdateTask(editingTask._id, data)}
          onCancel={() => setEditingTask(null)}
        />
      )}
    </Box>
  );
}
