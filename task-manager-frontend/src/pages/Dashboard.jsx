/**  PATCHED DASHBOARD.JSX  
 *  Fixes:
 *  - Uses new backend route GET /api/team-tasks/my/all
 *  - Shows full user names (createdBy.name, assignedTo.name)
 *  - Group tasks by team correctly
 *  - Fix Assigned to Me tab
 *  - Fix Team Tasks tab
 *  - Add extension indicators
 */

import React, { useEffect, useState } from "react";
import {
  Box,
  Tabs,
  Tab,
  Typography,
  CircularProgress,
  Paper,
  useTheme,
  Button,
  Stack,
  Chip,
  Grid,
  Badge,
  Snackbar,
  Alert,
} from "@mui/material";
import GroupIcon from "@mui/icons-material/Group";
import AssignmentIcon from "@mui/icons-material/Assignment";
import TaskIcon from "@mui/icons-material/Task";
import TaskList from "../components/Task/TaskList";
import TeamTaskItem from "../components/Teams/TeamTaskItem";
import { teamTasksAPI, teamsAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";

const Dashboard = () => {
  const theme = useTheme();
  const { user } = useAuth();

  const [tab, setTab] = useState(0);

  const [teamTasks, setTeamTasks] = useState([]);
  const [assignedTasks, setAssignedTasks] = useState([]);

  const [teams, setTeams] = useState([]);
  const [teamTasksByTeam, setTeamTasksByTeam] = useState({});

  const [loading, setLoading] = useState({
    teamTasks: true,
    assignedTasks: true,
    teams: true,
  });

  const [error, setError] = useState(null);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const handleTabChange = (_, v) => setTab(v);

  // -----------------------------
  // LOAD TEAM MEMBERSHIP
  // -----------------------------
  useEffect(() => {
    fetchTeams();
  }, []);

  // -----------------------------
  // FETCH ALL TEAM TASKS (new route)
  // -----------------------------
  useEffect(() => {
    fetchTeamTasks();
  }, []);

  const fetchTeamTasks = async () => {
    setLoading((prev) => ({ ...prev, teamTasks: true }));
    try {
      const res = await teamTasksAPI.getMyTeamTasks(); // now uses GET /my/all
      setTeamTasks(res.data);

      const grouped = groupTasksByTeam(res.data);
      setTeamTasksByTeam(grouped);
    } catch (err) {
      console.error("Error loading team tasks:", err);
      setError("Failed to load team tasks.");
    } finally {
      setLoading((prev) => ({ ...prev, teamTasks: false }));
    }
  };

  // -----------------------------
  // FETCH ASSIGNED TASKS
  // -----------------------------
  useEffect(() => {
    fetchAssignedTasks();
  }, [teams]);

  const fetchAssignedTasks = async () => {
    setLoading((prev) => ({ ...prev, assignedTasks: true }));
    try {
      let all = [];

      for (const team of teams) {
        try {
          const res = await teamTasksAPI.getMyAssignedTasks(team._id);
          all = [...all, ...res.data];
        } catch (err) {}
      }

      // sort by nearest due
      all.sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      });

      setAssignedTasks(all);
    } catch (err) {
      console.error("Error loading assigned tasks:", err);
    } finally {
      setLoading((prev) => ({ ...prev, assignedTasks: false }));
    }
  };

  // -----------------------------
  // FETCH USER TEAMS
  // -----------------------------
  const fetchTeams = async () => {
    try {
      const res = await teamsAPI.getTeams();
      setTeams(res.data);
    } catch (err) {
      console.error("Error loading teams:", err);
    } finally {
      setLoading((prev) => ({ ...prev, teams: false }));
    }
  };

  // -----------------------------
  // GROUP TASKS BY TEAM
  // -----------------------------
  const groupTasksByTeam = (tasks) => {
    const grouped = {};

    tasks.forEach((task) => {
      if (task.team) {
        const teamId = task.team._id;
        if (!grouped[teamId]) {
          grouped[teamId] = {
            id: teamId,
            name: task.team.name,
            color: task.team.color,
            icon: task.team.icon,
            tasks: [],
          };
        }
        grouped[teamId].tasks.push(task);
      }
    });

    return grouped;
  };

  // -----------------------------
  // GET USER ROLE IN TEAM
  // -----------------------------
  const getUserRoleInTeam = (teamId) => {
    const team = teams.find((t) => t._id === teamId);
    if (!team) return "member";

    const member = team.members?.find(
      (m) => m.user?._id === user?._id || m.user === user?._id
    );
    return member?.role || "member";
  };

  // -----------------------------
  // SNACKBAR HELPER
  // -----------------------------
  const showSnackbar = (msg, type = "success") =>
    setSnackbar({ open: true, message: msg, severity: type });

  // -----------------------------
  // ASSIGNED TASK SUMMARY
  // -----------------------------
  const stats = {
    total: assignedTasks.length,
    todo: assignedTasks.filter((t) => t.status === "todo").length,
    inProgress: assignedTasks.filter((t) => t.status === "in-progress").length,
    completed: assignedTasks.filter((t) => t.status === "completed").length,
    overdue: assignedTasks.filter((t) => {
      if (!t.dueDate) return false;
      return new Date(t.dueDate) < new Date() && t.status !== "completed";
    }).length,
  };

  // -----------------------------
  // RENDER UI
  // -----------------------------
  return (
    <Box sx={{ pt: 1 }}>
      {/* SNACKBAR */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3500}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>

      <Typography variant="h4" sx={{ mb: 2 }}>
        Dashboard
      </Typography>

      {/* TABS */}
      <Paper sx={{ mb: 3, p: 1 }}>
        <Tabs value={tab} onChange={handleTabChange}>
          <Tab label="My Tasks" icon={<TaskIcon />} iconPosition="start" />

          <Tab
            icon={
              <Badge badgeContent={stats.total} color="primary">
                <AssignmentIcon />
              </Badge>
            }
            label="Assigned to Me"
            iconPosition="start"
          />

          <Tab
            label="Team Tasks"
            icon={<GroupIcon />}
            iconPosition="start"
          />

          <Tab
            label="My Teams"
            icon={<GroupIcon />}
            iconPosition="start"
          />
        </Tabs>
      </Paper>

      {/* TAB 0 — PERSONAL TASKS */}
      {tab === 0 && <TaskList />}

      {/* TAB 1 — ASSIGNED TO ME */}
      {tab === 1 && (
        <Box>
          {loading.assignedTasks ? (
            <CircularProgress />
          ) : (
            <>
              <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6">📋 Assigned to Me</Typography>
                <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                  <Chip label={`Total: ${stats.total}`} />
                  <Chip label={`To Do: ${stats.todo}`} color="warning" />
                  <Chip label={`In Progress: ${stats.inProgress}`} color="info" />
                  <Chip label={`Completed: ${stats.completed}`} color="success" />
                </Stack>
              </Paper>

              {assignedTasks.map((task) => (
                <TeamTaskItem key={task._id} task={task} showExtension />
              ))}
            </>
          )}
        </Box>
      )}

      {/* TAB 2 — TEAM TASKS */}
      {tab === 2 && (
        <Box>
          {loading.teamTasks ? (
            <CircularProgress />
          ) : (
            Object.values(teamTasksByTeam).map((team) => (
              <Paper key={team.id} sx={{ mb: 3 }}>
                <Box sx={{ p: 2 }}>
                  <Typography variant="h6">
                    {team.icon} {team.name}
                  </Typography>
                </Box>

                <Box sx={{ p: 2 }}>
                  {team.tasks.map((task) => (
                    <TeamTaskItem
                      key={task._id}
                      task={task}
                      canEdit
                      showExtension
                    />
                  ))}
                </Box>
              </Paper>
            ))
          )}
        </Box>
      )}

      {/* TAB 3 — MY TEAMS */}
      {tab === 3 && (
        <Grid container spacing={2}>
          {teams.map((team) => (
            <Grid item xs={12} sm={6} md={4} key={team._id}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6">{team.icon} {team.name}</Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Members: {team.members.length}
                </Typography>
                <Button
                  fullWidth
                  sx={{ mt: 2 }}
                  variant="outlined"
                  onClick={() =>
                    (window.location.href = `/teams/${team._id}`)
                  }
                >
                  Open Team
                </Button>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default Dashboard;
