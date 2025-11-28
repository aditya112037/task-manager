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
  Chip
} from "@mui/material";
import { useParams } from "react-router-dom";
import { teamsAPI, teamTasksAPI } from "../services/api";
import TeamTaskItem from "../components/Teams/TeamTaskItem";

export default function TeamDetails() {
  const { teamId } = useParams();

  // --- STATE ---
  const [tab, setTab] = useState(0);
  const [team, setTeam] = useState(null);
  const [loadingTeam, setLoadingTeam] = useState(true);

  const [teamTasks, setTeamTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // TEMP → replace later with real role from backend
  const isAdmin = true;

  // -------- FETCH TEAM --------
  const fetchTeam = async () => {
    try {
      const res = await teamsAPI.getTeam(teamId);
      setTeam(res.data);
    } catch (err) {
      console.error(err);
    }
    setLoadingTeam(false);
  };

  // -------- FETCH TASKS --------
  const fetchTeamTasks = async () => {
    try {
      const res = await teamTasksAPI.getTasks(teamId);
      setTeamTasks(res.data);
    } catch (err) {
      console.error(err);
    }
    setLoadingTasks(false);
  };

  useEffect(() => {
    fetchTeam();
    fetchTeamTasks();
  }, [teamId]);

  if (loadingTeam) return <Typography>Loading team...</Typography>;

  return (
    <Box sx={{ p: 2 }}>
      {/* ------- TEAM HEADER ------- */}
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
            sx={{
              width: 70,
              height: 70,
              bgcolor: team.color || "primary.main",
              fontSize: 28
            }}
          >
            {team.icon || "T"}
          </Avatar>

          <Box>
            <Typography variant="h5" fontWeight={700}>
              {team.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {team.description}
            </Typography>
          </Box>
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 1 }}>
          <Tab label="Overview" />
          <Tab label="Members" />
          <Tab label="Tasks" />
          <Tab label="Settings" />
        </Tabs>
      </Paper>

      {/* ------- TAB CONTENT ------- */}

      {/* OVERVIEW */}
      {tab === 0 && (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={700}>
            Overview
          </Typography>
          <Typography sx={{ mt: 1 }} color="text.secondary">
            Team stats coming soon.
          </Typography>
        </Paper>
      )}

      {/* MEMBERS */}
      {tab === 1 && (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={700}>
            Members
          </Typography>

          {team.members?.map((m) => (
            <Chip
              key={m.user._id}
              label={m.user.name}
              sx={{ mr: 1, mt: 1 }}
              color={m.role === "admin" ? "primary" : "default"}
            />
          ))}
        </Paper>
      )}

      {/* TASKS */}
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
          ) : teamTasks.length === 0 ? (
            <Typography>No team tasks yet.</Typography>
          ) : (
            teamTasks.map((task) => (
              <TeamTaskItem key={task._id} task={task} />
            ))
          )}
        </Paper>
      )}

      {/* SETTINGS */}
      {tab === 3 && (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={700}>
            Settings
          </Typography>
          <Typography sx={{ mt: 1 }} color="text.secondary">
            Rename team, manage roles — coming soon.
          </Typography>
        </Paper>
      )}
    </Box>
  );
}
