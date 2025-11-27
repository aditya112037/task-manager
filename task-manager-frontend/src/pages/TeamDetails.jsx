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
import { teamTasksAPI, teamsAPI } from "../services/teamsAPI";

import TeamTaskItem from "../components/Teams/TeamTaskItem";
import TeamTaskForm from "../components/Teams/TeamTaskForm";

export default function TeamDetails() {
  const { teamId } = useParams();

  const [tab, setTab] = useState(2); // start on "Tasks"
  const [teamTasks, setTeamTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(true);

  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const isAdmin = true; // TEMP until roles implemented

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

  const deleteTeamTask = async (taskId) => {
    try {
      await teamTasksAPI.deleteTask(taskId);
      setTeamTasks(teamTasks.filter(t => t._id !== taskId));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      {/* TEAM HEADER */}
      <Paper sx={{ p: 3, borderRadius: 3, mb: 3, boxShadow: "0 4px 15px rgba(0,0,0,0.08)" }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar sx={{ width: 70, height: 70, bgcolor: "primary.main", fontSize: 28 }}>
            T
          </Avatar>

          <Box>
            <Typography variant="h5" fontWeight={700}>
              Team Name
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Team description here...
            </Typography>
          </Box>
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Tabs value={tab} onChange={(e, newVal) => setTab(newVal)}>
          <Tab label="Overview" />
          <Tab label="Members" />
          <Tab label="Tasks" />
          <Tab label="Settings" />
        </Tabs>
      </Paper>
      {tab === 1 && (
  <Paper sx={{ p: 3, borderRadius: 3 }}>
    <Typography variant="h6" fontWeight={700}>Members</Typography>

    {team.members?.map((m) => (
      <Box
        key={m.user._id}
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          p: 2,
          my: 1,
          borderRadius: 2,
          bgcolor: "#f7f7f7"
        }}
      >
        <Box>
          <Typography fontWeight={600}>{m.user.name}</Typography>
          <Typography variant="body2" color="text.secondary">
            {m.user.email}
          </Typography>
        </Box>

        <Chip
          label={m.role}
          color={m.role === "admin" ? "primary" : "default"}
        />
      </Box>
    ))}

    <Divider sx={{ my: 2 }} />

    <Typography fontWeight={600} sx={{ mb: 1 }}>
      Invite Link
    </Typography>

    <Box
      sx={{
        p: 2,
        bgcolor: "#eee",
        borderRadius: 2,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}
    >
      <Typography variant="body2">
        {`${window.location.origin}/join/${team.inviteCode}`}
      </Typography>

      <Button
        variant="contained"
        sx={{ borderRadius: 2 }}
        onClick={() => {
          navigator.clipboard.writeText(
            `${window.location.origin}/join/${team.inviteCode}`
          );
          alert("Invite link copied!");
        }}
      >
        Copy
      </Button>
    </Box>
  </Paper>
)}

      {/* ---- TASKS TAB ---- */}
      {tab === 2 && (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
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

          {/* FORM POPUP */}
          {showTaskForm && (
            <TeamTaskForm
              teamId={teamId}
              task={editingTask}
              onClose={() => setShowTaskForm(false)}
              onSuccess={() => {
                setShowTaskForm(false);
                fetchTeamTasks();
              }}
            />
          )}
        </Paper>
      )}
    </Box>
  );
}
