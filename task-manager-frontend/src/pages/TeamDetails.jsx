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
  Button
} from "@mui/material";
import { useParams } from "react-router-dom";
import { teamTasksAPI } from "../services/api";

// TEMP placeholder until you make component
const TeamTaskItem = ({ task }) => (
  <Paper sx={{ p: 2, my: 1, borderRadius: 2 }}>
    <Typography fontWeight={600}>{task.title}</Typography>
    <Typography variant="body2">{task.description}</Typography>
  </Paper>
);

export default function TeamDetails() {
  const { teamId } = useParams();

  // ---- STATE ----
  const [tab, setTab] = useState(0);
  const [teamTasks, setTeamTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // TEMP: until roles implemented
  const isAdmin = true;

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
      setTeamTasks(teamTasks.filter(t => t._id !== id));
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
          boxShadow: "0 4px 15px rgba(0,0,0,0.08)"
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

        <Tabs value={tab} onChange={(e, newVal) => setTab(newVal)} sx={{ mb: 1 }}>
          <Tab label="Overview" />
          <Tab label="Members" />
          <Tab label="Tasks" />
          <Tab label="Settings" />
        </Tabs>
      </Paper>

      {/* ---- TAB CONTENT ---- */}

      {tab === 0 && (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={700}>Overview</Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            Team stats, deadlines, activity etc.
          </Typography>
        </Paper>
      )}

      {tab === 1 && (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={700}>Members</Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            List of members here.
          </Typography>
        </Paper>
      )}

      {tab === 2 && (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={700}>Team Tasks</Typography>

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
              <TeamTaskItem key={task._id} task={task} />
            ))
          )}
        </Paper>
      )}

      {tab === 3 && (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={700}>Settings</Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            Manage team settings, roles, etc.
          </Typography>
        </Paper>
      )}
    </Box>
  );
}

