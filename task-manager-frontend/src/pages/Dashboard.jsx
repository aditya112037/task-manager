// src/pages/Dashboard.jsx
import React, { useEffect, useState, useCallback } from "react";
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
  Snackbar,
  Alert,
  Container,
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
  const openExtensionModal = (task) => {
  setSelectedTask(task);
  setExtensionModalOpen(true);
};
  const [tab, setTab] = useState(1); // default to Assigned tab (matches screenshot)
  const [teams, setTeams] = useState([]);
  const [teamTasks, setTeamTasks] = useState([]); // all tasks user can see (GET /my/all)
  const [teamTasksByTeam, setTeamTasksByTeam] = useState({});
  const [assignedTasks, setAssignedTasks] = useState([]);

  const [loading, setLoading] = useState({
    teams: true,
    teamTasks: true,
    assigned: true,
  });

  const [error, setError] = useState({
    teamTasks: null,
    assigned: null,
    teams: null,
  });

  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const handleTabChange = (_, v) => setTab(v);
  const showSnack = (msg, sev = "success") => setSnackbar({ open: true, message: msg, severity: sev });

  // fetch user's teams
  const fetchTeams = useCallback(async () => {
    setLoading((s) => ({ ...s, teams: true }));
    setError((e) => ({ ...e, teams: null }));
    try {
      const res = await teamsAPI.getTeams();
      setTeams(res.data || []);
    } catch (err) {
      console.error("fetchTeams:", err);
      setError((e) => ({ ...e, teams: "Failed to load teams" }));
    } finally {
      setLoading((s) => ({ ...s, teams: false }));
    }
  }, []);

  // fetch all team tasks via new backend route (GET /api/team-tasks/my/all)
  const fetchTeamTasks = useCallback(async () => {
  setLoading(s => ({ ...s, teamTasks: true }));

  try {
    let allTasks = [];

    for (const team of teams) {
      try {
        const res = await teamTasksAPI.getTeamTasks(team._id);
        if (Array.isArray(res.data)) allTasks = allTasks.concat(res.data);
      } catch (err) {
        console.warn(`Failed to load tasks for team ${team._id}`);
      }
    }

    setTeamTasks(allTasks);

    // group by team
    const grouped = {};
    allTasks.forEach(t => {
      const teamId = t.team?._id || t.team;
      if (!grouped[teamId]) {
        grouped[teamId] = {
          id: teamId,
          name: t.team.name,
          icon: t.team.icon,
          color: t.team.color,
          tasks: []
        };
      }
      grouped[teamId].tasks.push(t);
    });

    setTeamTasksByTeam(grouped);

  } finally {
    setLoading(s => ({ ...s, teamTasks: false }));
  }
}, [teams]);

  // fetch "assigned to me" tasks using dedicated endpoint (safer/reliable)
const fetchAssignedTasks = useCallback(async () => {
  setLoading(s => ({ ...s, assigned: true }));

  try {
    let assigned = [];

    for (const team of teams) {
      try {
        const res = await teamTasksAPI.getTeamTasks(team._id);
        const tasks = res.data || [];

        const mine = tasks.filter(
          t => String(t.assignedTo?._id || t.assignedTo) === String(user?._id)
        );

        assigned = assigned.concat(mine);
      } catch (err) {
        console.warn(`Failed assigned tasks for team ${team._id}`);
      }
    }

    setAssignedTasks(assigned);
  } finally {
    setLoading(s => ({ ...s, assigned: false }));
  }
}, [teams, user]);


  // helpers for task manipulation
  const handleStatusChange = async (taskId, status) => {
    try {
      await teamTasksAPI.updateTask(taskId, { status });
      showSnack("Task status updated", "success");
      await Promise.all([fetchTeamTasks(), fetchAssignedTasks()]);
    } catch (err) {
      console.error("handleStatusChange:", err);
      showSnack(err.response?.data?.message || "Failed to update task", "error");
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("Delete this task?")) return;
    try {
      await teamTasksAPI.deleteTask(taskId);
      showSnack("Task deleted", "success");
      await Promise.all([fetchTeamTasks(), fetchAssignedTasks()]);
    } catch (err) {
      console.error("handleDeleteTask:", err);
      showSnack(err.response?.data?.message || "Failed to delete", "error");
    }
  };

  const handleQuickComplete = async (taskId) => {
    try {
      await teamTasksAPI.updateTask(taskId, { status: "completed" });
      showSnack("Task completed", "success");
      await Promise.all([fetchTeamTasks(), fetchAssignedTasks()]);
    } catch (err) {
      console.error("handleQuickComplete:", err);
      showSnack(err.response?.data?.message || "Failed to complete", "error");
    }
  };

  const handleEditTask = (task) => {
    const teamId = task.team?._id || task.team;
    if (teamId) window.location.href = `/teams/${teamId}`;
  };

  // Assigned stats for UI
  const assignedStats = {
    total: assignedTasks.length,
    todo: assignedTasks.filter((t) => t.status === "todo").length,
    inProgress: assignedTasks.filter((t) => t.status === "in-progress").length,
    completed: assignedTasks.filter((t) => t.status === "completed").length,
    overdue: assignedTasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "completed").length,
  };

  // initial loads
  useEffect(() => {
    (async () => {
      await fetchTeams();
    })();
  }, [fetchTeams]);

  // when teams loaded (or user changes), fetch tasks
  useEffect(() => {
    fetchTeamTasks();
    fetchAssignedTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teams.length]);

  // small loader component
  const Loader = () => (
    <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
      <CircularProgress />
    </Box>
  );

  // UI styling: match screenshot with tab card, stat chips and big tiles
  return (
    <Container maxWidth="xl" sx={{ 
      pt: { xs: 10, sm: 8 }, // Add padding to avoid header collision
      pb: 6,
      minHeight: "100vh"
    }}>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3500}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Welcome message with user name */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={700} sx={{ mb: 1 }}>
          Welcome back, {user?.name || "User"}!
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Here's an overview of your tasks and teams
        </Typography>
      </Box>

      <Paper sx={{ mb: 3, p: 1, borderRadius: 2 }}>
        <Tabs 
          value={tab} 
          onChange={handleTabChange} 
          indicatorColor="primary" 
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label={
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 1 }}>
              <TaskIcon fontSize="small" />
              <Typography variant="body2" fontWeight={600}>MY TASKS</Typography>
            </Box>
          } />
          <Tab label={
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 1 }}>
              <AssignmentIcon fontSize="small" />
              <Typography variant="body2" fontWeight={600}>ASSIGNED TO ME</Typography>
            </Box>
          } />
          <Tab label={
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 1 }}>
              <GroupIcon fontSize="small" />
              <Typography variant="body2" fontWeight={600}>TEAM TASKS</Typography>
            </Box>
          } />
          <Tab label={
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 1 }}>
              <GroupIcon fontSize="small" />
              <Typography variant="body2" fontWeight={600}>MY TEAMS</Typography>
            </Box>
          } />
        </Tabs>
      </Paper>

      {/* TAB 0 - My Tasks (existing component) */}
      {tab === 0 && <TaskList />}

      {/* TAB 1 - Assigned To Me */}
      {tab === 1 && (
        <Box>
          <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography variant="h5" fontWeight={600}>
                Tasks Assigned to You
              </Typography>
              {assignedTasks.length > 0 && (
                <Chip 
                  label={`${assignedStats.overdue} overdue`} 
                  color="error" 
                  size="small"
                  sx={{ display: assignedStats.overdue > 0 ? 'flex' : 'none' }}
                />
              )}
            </Box>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
              <Chip label={`Total: ${assignedStats.total}`} variant="outlined" />
              <Chip label={`To Do: ${assignedStats.todo}`} color="warning" variant="outlined" />
              <Chip label={`In Progress: ${assignedStats.inProgress}`} color="info" variant="outlined" />
              <Chip label={`Completed: ${assignedStats.completed}`} color="success" variant="outlined" />
            </Stack>
          </Paper>

          {/* big colored statistic tiles */}
          <Grid container spacing={2} sx={{ mb: 4 }}>
            <Grid item xs={6} sm={3}>
              <Paper sx={{ 
                p: 3, 
                textAlign: "center", 
                bgcolor: "primary.light", 
                color: "primary.contrastText",
                borderRadius: 2,
                height: "100%"
              }}>
                <Typography variant="h3" fontWeight={700}>{assignedStats.total}</Typography>
                <Typography variant="body1" fontWeight={500}>Total</Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Paper sx={{ 
                p: 3, 
                textAlign: "center", 
                bgcolor: "warning.main", 
                color: "warning.contrastText",
                borderRadius: 2,
                height: "100%"
              }}>
                <Typography variant="h3" fontWeight={700}>{assignedStats.todo}</Typography>
                <Typography variant="body1" fontWeight={500}>To Do</Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Paper sx={{ 
                p: 3, 
                textAlign: "center", 
                bgcolor: "info.main", 
                color: "info.contrastText",
                borderRadius: 2,
                height: "100%"
              }}>
                <Typography variant="h3" fontWeight={700}>{assignedStats.inProgress}</Typography>
                <Typography variant="body1" fontWeight={500}>In Progress</Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Paper sx={{ 
                p: 3, 
                textAlign: "center", 
                bgcolor: "success.main", 
                color: "success.contrastText",
                borderRadius: 2,
                height: "100%"
              }}>
                <Typography variant="h3" fontWeight={700}>{assignedStats.completed}</Typography>
                <Typography variant="body1" fontWeight={500}>Completed</Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* list or empty state */}
          {loading.assigned ? (
            <Loader />
          ) : assignedTasks.length === 0 ? (
            <Paper sx={{ 
              p: 6, 
              textAlign: "center",
              borderRadius: 2,
              bgcolor: "background.default"
            }}>
              <AssignmentIcon sx={{ fontSize: 64, color: theme.palette.text.secondary, mb: 3, opacity: 0.5 }} />
              <Typography variant="h5" sx={{ color: theme.palette.text.secondary, mb: 2, fontWeight: 600 }}>
                No tasks assigned to you yet
              </Typography>
              <Typography variant="body1" sx={{ color: theme.palette.text.secondary, mb: 4, maxWidth: 500, mx: 'auto' }}>
                Team admins will assign tasks to you here. Check back later or browse team tasks to see what's available.
              </Typography>
              <Button 
                variant="contained" 
                size="large" 
                startIcon={<GroupIcon />} 
                onClick={() => setTab(2)}
                sx={{ borderRadius: 2, px: 4, py: 1.5 }}
              >
                BROWSE TEAM TASKS
              </Button>
            </Paper>
          ) : (
            <Box>
              {assignedTasks.map((task) => (
                <TeamTaskItem
                  key={task._id}
                  task={task}
                  canEdit={true}
                  showExtension={true}
                  onRequestExtension={() => openExtensionModal(task)}
                  onEdit={() => handleEditTask(task)}
                  onDelete={() => handleDeleteTask(task._id)}
                  onStatusChange={(id, s) => handleStatusChange(id, s)}
                  onQuickComplete={() => handleQuickComplete(task._id)}
                  
                />
              ))}
            </Box>
          )}

          {error.assigned && (
            <Alert severity="warning" sx={{ mt: 2, borderRadius: 2 }}>
              {error.assigned}
            </Alert>
          )}
        </Box>
      )}

      {/* TAB 2 - Team Tasks */}
      {tab === 2 && (
        <Box>
          {loading.teamTasks ? (
            <Loader />
          ) : error.teamTasks ? (
            <Alert severity="error" sx={{ borderRadius: 2 }}>{error.teamTasks}</Alert>
          ) : Object.keys(teamTasksByTeam).length === 0 ? (
            <Paper sx={{ 
              p: 6, 
              textAlign: "center",
              borderRadius: 2,
              bgcolor: "background.default"
            }}>
              <GroupIcon sx={{ fontSize: 64, color: theme.palette.text.secondary, mb: 3, opacity: 0.5 }} />
              <Typography variant="h5" sx={{ color: theme.palette.text.secondary, mb: 2, fontWeight: 600 }}>
                No team tasks found
              </Typography>
              <Typography variant="body1" sx={{ color: theme.palette.text.secondary, mb: 4, maxWidth: 500, mx: 'auto' }}>
                Join a team or create one to start collaborating on tasks with your team members.
              </Typography>
              <Button 
                sx={{ mt: 2 }} 
                variant="contained" 
                size="large"
                onClick={() => (window.location.href = "/teams")}
              >
                Join or Create a Team
              </Button>
            </Paper>
          ) : (
            Object.values(teamTasksByTeam)
              .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
              .map((g) => {
                // get user's role in that team (best-effort from teams list)
                const teamRecord = teams.find((t) => String(t._id) === String(g.id));
                const role = teamRecord?.members?.find((m) => {
                  const uid = typeof m.user === "object" ? (m.user._id || m.user) : m.user;
                  return String(uid) === String(user?._id);
                })?.role;
                const canEdit = ["admin", "manager"].includes(role);
                return (
                  <Paper key={g.id} sx={{ mb: 3, borderRadius: 2, overflow: 'hidden' }}>
                    <Box sx={{ 
                      p: 3, 
                      display: "flex", 
                      justifyContent: "space-between", 
                      alignItems: "center",
                      bgcolor: g.color ? `${g.color}20` : 'primary.light',
                      borderBottom: `1px solid ${theme.palette.divider}`
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ 
                          width: 50, 
                          height: 50, 
                          borderRadius: '50%', 
                          bgcolor: g.color || theme.palette.primary.main,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.5rem',
                          color: 'white'
                        }}>
                          {g.icon || "👥"}
                        </Box>
                        <Box>
                          <Typography variant="h6" fontWeight={700}>
                            {g.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {g.tasks.length} task{g.tasks.length > 1 ? 's' : ''} • {role ? `Your role: ${role}` : 'Member'}
                          </Typography>
                        </Box>
                      </Box>
                      <Button 
                        variant="contained" 
                        size="small" 
                        onClick={() => (window.location.href = `/teams/${g.id}`)}
                        sx={{ borderRadius: 2 }}
                      >
                        View Team
                      </Button>
                    </Box>

                    <Box sx={{ p: 3 }}>
                      {g.tasks.map((task) => (
                        <TeamTaskItem
                          key={task._id}
                          task={task}
                          canEdit={canEdit || String((task.assignedTo && (task.assignedTo._id || task.assignedTo))) === String(user?._id)}
                          onEdit={() => handleEditTask(task)}
                          onDelete={() => handleDeleteTask(task._id)}
                          onStatusChange={(id, s) => handleStatusChange(id, s)}
                          onQuickComplete={() => handleQuickComplete(task._id)}
                        />
                      ))}
                    </Box>
                  </Paper>
                );
              })
          )}
        </Box>
      )}

      {/* TAB 3 - My Teams */}
      {tab === 3 && (
        <Box>
          {loading.teams ? (
            <Loader />
          ) : teams.length === 0 ? (
            <Paper sx={{ 
              p: 6, 
              textAlign: "center",
              borderRadius: 2,
              bgcolor: "background.default"
            }}>
              <GroupIcon sx={{ fontSize: 64, color: theme.palette.text.secondary, mb: 3, opacity: 0.5 }} />
              <Typography variant="h5" sx={{ color: theme.palette.text.secondary, mb: 2, fontWeight: 600 }}>
                You haven't joined any teams yet
              </Typography>
              <Typography variant="body1" sx={{ color: theme.palette.text.secondary, mb: 4, maxWidth: 500, mx: 'auto' }}>
                Join a team to collaborate with others on tasks and projects.
              </Typography>
              <Button 
                sx={{ mt: 2 }} 
                variant="contained" 
                size="large"
                onClick={() => (window.location.href = "/teams")}
              >
                Browse Teams
              </Button>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {teams.map((t) => {
                const userRole = t.members?.find((m) => {
                  const uid = typeof m.user === "object" ? (m.user._id || m.user) : m.user;
                  return String(uid) === String(user?._id);
                })?.role;
                const assignedCount = assignedTasks.filter((a) => String(a.team?._id || a.team) === String(t._id)).length;
                return (
                  <Grid item xs={12} sm={6} md={4} key={t._id}>
                    <Paper
                      sx={{
                        p: 3,
                        borderRadius: 3,
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        cursor: "pointer",
                        transition: "transform 0.2s, box-shadow 0.2s",
                        border: `1px solid ${theme.palette.divider}`,
                        "&:hover": { 
                          transform: "translateY(-4px)", 
                          boxShadow: theme.shadows[8],
                          borderColor: t.color || theme.palette.primary.main
                        },
                      }}
                      onClick={() => (window.location.href = `/teams/${t._id}`)}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
                        <Box sx={{ 
                          width: 60, 
                          height: 60, 
                          borderRadius: "50%", 
                          bgcolor: t.color || theme.palette.primary.main, 
                          display: "flex", 
                          alignItems: "center", 
                          justifyContent: "center", 
                          fontSize: "1.8rem", 
                          mr: 2,
                          color: 'white'
                        }}>
                          {t.icon || "👥"}
                        </Box>
                        <Box>
                          <Typography variant="h6" fontWeight={700}>
                            {t.name}
                          </Typography>
                          <Chip 
                            label={userRole || "member"} 
                            size="small" 
                            color={userRole === "admin" ? "primary" : userRole === "manager" ? "secondary" : "default"} 
                            sx={{ mt: 0.5 }} 
                          />
                        </Box>
                      </Box>

                      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, flexGrow: 1 }}>
                        {t.description || "No description provided"}
                      </Typography>

                      <Box sx={{ 
                        display: "flex", 
                        justifyContent: "space-between", 
                        alignItems: "center",
                        pt: 2,
                        borderTop: `1px solid ${theme.palette.divider}`
                      }}>
                        <Stack direction="row" spacing={2}>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h6" fontWeight={700}>{t.members?.length || 0}</Typography>
                            <Typography variant="caption" color="text.secondary">Members</Typography>
                          </Box>
                          {assignedCount > 0 && (
                            <Box sx={{ textAlign: 'center' }}>
                              <Typography variant="h6" fontWeight={700} color="primary">{assignedCount}</Typography>
                              <Typography variant="caption" color="text.secondary">Your Tasks</Typography>
                            </Box>
                          )}
                        </Stack>
                        <Typography variant="body2" color="primary" sx={{ fontWeight: 600 }}>
                          View →
                        </Typography>
                      </Box>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Box>
      )}
    </Container>
  );
};

export default Dashboard;