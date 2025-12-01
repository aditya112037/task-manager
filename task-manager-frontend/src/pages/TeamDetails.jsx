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
  Chip,
} from "@mui/material";

import { useParams } from "react-router-dom";
import { teamsAPI, teamTasksAPI } from "../services/api";
import TeamTaskItem from "../components/Teams/TeamTaskItem";
import TeamTaskForm from "../components/Teams/TeamTaskForm";
import { useAuth } from "../context/AuthContext";

export default function TeamDetails() {
  const { teamId } = useParams();
  const { user } = useAuth();

  const [tab, setTab] = useState(0);
  const [team, setTeam] = useState(null);
  const [loadingTeam, setLoadingTeam] = useState(true);

  const [teamTasks, setTeamTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // Real Admin Check — user MUST match team.admin (works whether admin is populated or just id)
  const isAdmin =
    !!team &&
    ((team.admin && team.admin._id && team.admin._id === user?._id) ||
      (team.admin && String(team.admin) === String(user?._id)));

  // -------- FETCH TEAM --------
  const fetchTeam = async () => {
    setLoadingTeam(true);
    try {
      const res = await teamsAPI.getTeam(teamId);
      setTeam(res.data);
    } catch (err) {
      console.error("Team load error:", err);
    } finally {
      setLoadingTeam(false);
    }
  };

  // -------- FETCH TEAM TASKS --------
  const fetchTeamTasks = async () => {
    setLoadingTasks(true);
    try {
      const res = await teamTasksAPI.getTasks(teamId);
      setTeamTasks(res.data);
    } catch (err) {
      console.error("Task load error:", err);
    } finally {
      setLoadingTasks(false);
    }
  };

  useEffect(() => {
    fetchTeam();
    fetchTeamTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  if (loadingTeam) return <Typography>Loading team...</Typography>;
  if (!team) return <Typography>Team not found.</Typography>;

  const inviteURL = `${window.location.origin}/join/${team._id}`;

  return (
    <Box sx={{ px: 2, pt: { xs: 10, sm: 8 } }}>
      {/* HEADER */}
      <Paper
        sx={{
          p: 3,
          borderRadius: 3,
          mb: 3,
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar
            sx={{
              width: 70,
              height: 70,
              bgcolor: team.color || "primary.main",
              fontSize: 28,
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

        <Tabs value={tab} onChange={(e, v) => setTab(v)}>
          <Tab label="Overview" />
          <Tab label="Members" />
          <Tab label="Tasks" />
          <Tab label="Settings" />
        </Tabs>
      </Paper>

      {/* OVERVIEW */}
      {tab === 0 && (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={700}>
            Overview
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            Team statistics and analytics will appear here soon.
          </Typography>

          <Button
            variant="outlined"
            sx={{ mt: 3 }}
            onClick={() => navigator.clipboard.writeText(inviteURL)}
          >
            Copy Invite Link
          </Button>
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
              key={m.user._id || m.user}
              label={m.user?.name ?? (m.userName || "User")}
              sx={{ mt: 1, mr: 1 }}
              color={m.role === "admin" ? "primary" : "default"}
            />
          ))}
        </Paper>
      )}

      {/* TASKS */}
      {tab === 2 && (
  <Paper sx={{ p: 3, borderRadius: 3, mt: 2 }}>
    <Typography variant="h6" fontWeight={700}>
      Team Tasks
    </Typography>

    {isAdmin && (
      <Button
        variant="contained"
        sx={{ mt: 2, mb: 2, borderRadius: 2 }}
        onClick={() => {
          setEditingTask(null);
          setShowTaskForm(true);
        }}
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
        <TeamTaskItem
          key={task._id}
          task={task}
          isAdmin={isAdmin}
          onEdit={() => {
            setEditingTask(task);
            setShowTaskForm(true);
          }}
          onDelete={async () => {
            try {
              await teamTasksAPI.deleteTask(task._id);
              await fetchTeamTasks();
            } catch (err) {
              console.error("Delete task error:", err);
            }
          }}
          onStatusChange={async (taskId, newStatus) => {
            try {
              await teamTasksAPI.updateTask(taskId, { status: newStatus });
              await fetchTeamTasks();
            } catch (err) {
              console.error("Status update error:", err);
            }
          }}
        />
      ))
    )}

    {showTaskForm && (
      <TeamTaskForm
        open={showTaskForm}
        task={editingTask}
        onCancel={() => setShowTaskForm(false)}
        onSubmit={async (formData) => {
          try {
            if (editingTask) {
              // UPDATE ROUTE FIXED
              await teamTasksAPI.updateTask(editingTask._id, formData);
            } else {
              await teamTasksAPI.createTask(teamId, formData);
            }

            await fetchTeamTasks();
            setShowTaskForm(false);
            setEditingTask(null);
          } catch (err) {
            console.error("Task save error:", err);
          }
        }}
      />
    )}
  </Paper>
)}


      {/* SETTINGS */}
      {tab === 3 && (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={700}>
            Settings
          </Typography>

          <Typography variant="subtitle1" sx={{ mt: 2 }}>
            Invite Members
          </Typography>

          <Box
            sx={{
              mt: 1,
              p: 2,
              borderRadius: 2,
              border: "1px solid rgba(255,255,255,0.15)",
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Typography sx={{ flexGrow: 1 }}>{inviteURL}</Typography>

            <Button
              variant="contained"
              onClick={() => navigator.clipboard.writeText(inviteURL)}
            >
              Copy Link
            </Button>
          </Box>
        </Paper>
      )}
    </Box>
  );
}
