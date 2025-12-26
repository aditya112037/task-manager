// src/pages/Dashboard.jsx - Fully Fixed Version
import React, { useEffect, useState, useCallback, useMemo } from "react";
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

  const [tab, setTab] = useState(0);
  const [teams, setTeams] = useState([]);
  const [teamTasks, setTeamTasks] = useState([]);
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

  // ✅ CRITICAL FIX: Single source of truth - fetch ALL tasks at once
  const fetchAllTeamTasks = useCallback(async () => {
    if (teams.length === 0) {
      setTeamTasks([]);
      setAssignedTasks([]);
      setLoading(s => ({ ...s, teamTasks: false, assigned: false }));
      return;
    }
    
    setLoading(s => ({ ...s, teamTasks: true, assigned: true }));
    setError(e => ({ ...e, teamTasks: null, assigned: null }));

    try {
      // Fetch all team tasks in parallel
      const results = await Promise.all(
        teams.map(async (team) => {
          try {
            const res = await teamTasksAPI.getTeamTasks(team._id);
            if (Array.isArray(res.data)) {
              // ✅ Attach full team object to each task
              return res.data.map(task => ({
                ...task,
                team: team  // This ensures task.team has name, color, etc.
              }));
            }
            return [];
          } catch (err) {
            console.warn(`Failed to load tasks for team ${team._id}:`, err);
            return [];
          }
        })
      );

      // Flatten all results into a single array
      const allTasks = results.flat();
      setTeamTasks(allTasks);

      // ✅ Calculate assigned tasks from the same source
      const mine = allTasks.filter(
        task => String(task.assignedTo?._id || task.assignedTo) === String(user?._id)
      );
      setAssignedTasks(mine);

    } catch (err) {
      console.error("fetchAllTeamTasks error:", err);
      setError(e => ({ ...e, teamTasks: "Failed to load team tasks", assigned: "Failed to load assigned tasks" }));
    } finally {
      setLoading(s => ({ ...s, teamTasks: false, assigned: false }));
    }
  }, [teams, user]);

  // ✅ CRITICAL FIX: Helper function to get role in a team (no race conditions)
  const getMyRoleInTeam = useCallback(
    (teamId) => {
      const team = teams.find(t => String(t._id) === String(teamId));
      if (!team || !user) return null;
      
      const member = team.members?.find(m => {
        const uid = m.user?._id || m.user;
        return String(uid) === String(user._id);
      });
      
      return member?.role || null;
    },
    [teams, user]
  );

  // Derive teamTasksByTeam from teamTasks
  const teamTasksByTeam = useMemo(() => {
    const grouped = {};
    teamTasks.forEach(t => {
      // ✅ FIXED: Handle both populated team object and team ID string
      const teamId = t.team?._id || t.team;
      const teamName = t.team?.name || teams.find(team => team._id === teamId)?.name || "Unknown Team";
      const teamColor = t.team?.color || teams.find(team => team._id === teamId)?.color;
      const teamIcon = t.team?.icon || teams.find(team => team._id === teamId)?.icon;
      
      if (!teamId) return;
      
      if (!grouped[teamId]) {
        grouped[teamId] = {
          id: teamId,
          name: teamName,
          icon: teamIcon,
          color: teamColor,
          tasks: []
        };
      }
      grouped[teamId].tasks.push(t);
    });
    return grouped;
  }, [teamTasks, teams]);

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

  // ✅ CRITICAL FIX: Unified invalidation listeners
  useEffect(() => {
    const onTasksInvalidate = () => {
      console.log("🔄 Dashboard: invalidate:tasks received");
      // Refresh everything when tasks change
      fetchTeams().then(() => {
        // After teams are fetched, fetch all tasks
        if (teams.length > 0) {
          fetchAllTeamTasks();
        }
      });
    };

    const onTeamsInvalidate = () => {
      console.log("🔄 Dashboard: invalidate:teams received");
      // Refresh everything when teams change
      fetchTeams().then(() => {
        // After teams are fetched, fetch all tasks
        if (teams.length > 0) {
          fetchAllTeamTasks();
        }
      });
    };

    window.addEventListener("invalidate:tasks", onTasksInvalidate);
    window.addEventListener("invalidate:teams", onTeamsInvalidate);

    return () => {
      window.removeEventListener("invalidate:tasks", onTasksInvalidate);
      window.removeEventListener("invalidate:teams", onTeamsInvalidate);
    };
  }, [fetchAllTeamTasks, fetchTeams]);

  // Fixed handlers - no refetch after mutations
  const handleStatusChange = async (taskId, status) => {
    try {
      await teamTasksAPI.updateTask(taskId, { status });
      // Socket event will handle UI update via invalidate:tasks
      showSnack("Task status updated", "success");
    } catch (err) {
      console.error("handleStatusChange:", err);
      showSnack(err.response?.data?.message || "Failed to update task", "error");
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("Delete this task?")) return;
    try {
      await teamTasksAPI.deleteTask(taskId);
      // Socket event will handle UI update via invalidate:tasks
      showSnack("Task deleted", "success");
    } catch (err) {
      console.error("handleDeleteTask:", err);
      showSnack(err.response?.data?.message || "Failed to delete", "error");
    }
  };

  const handleQuickComplete = async (taskId) => {
    try {
      await teamTasksAPI.updateTask(taskId, { status: "completed" });
      // Socket event will handle UI update via invalidate:tasks
      showSnack("Task completed", "success");
    } catch (err) {
      console.error("handleQuickComplete:", err);
      showSnack(err.response?.data?.message || "Failed to complete", "error");
    }
  };

  const handleEditTask = (task) => {
    const teamId = task.team?._id || task.team;
    if (teamId) window.location.href = `/teams/${teamId}`;
  };

  // Manual refresh function - use only when needed
  const handleRefresh = () => {
    Promise.all([fetchTeams(), fetchAllTeamTasks()])
      .then(() => showSnack("Data refreshed", "success"))
      .catch(() => showSnack("Failed to refresh data", "error"));
  };

  // Assigned stats for UI
  const assignedStats = useMemo(() => {
    return {
      total: assignedTasks.length,
      todo: assignedTasks.filter((t) => t.status === "todo").length,
      inProgress: assignedTasks.filter((t) => t.status === "in-progress").length,
      completed: assignedTasks.filter((t) => t.status === "completed").length,
      overdue: assignedTasks.filter((t) => {
        if (!t.dueDate || t.status === "completed") return false;
        return new Date(t.dueDate) < new Date();
      }).length,
    };
  }, [assignedTasks]);

  // initial loads
  useEffect(() => {
    (async () => {
      await fetchTeams();
    })();
  }, [fetchTeams]);

  // when teams loaded (or user changes), fetch all tasks
  useEffect(() => {
    if (teams.length > 0) {
      fetchAllTeamTasks();
    } else {
      // Reset if no teams
      setTeamTasks([]);
      setAssignedTasks([]);
      setLoading(s => ({ ...s, teamTasks: false, assigned: false }));
    }
  }, [teams.length, fetchAllTeamTasks]);

  // small loader component
  const Loader = () => (
    <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
      <CircularProgress />
    </Box>
  );

  return (
    <Container maxWidth="xl" sx={{ 
      pt: { xs: 10, sm: 8 },
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

      {/* Refresh button for manual sync only */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
        <Button
          variant="outlined"
          size="small"
          onClick={handleRefresh}
          disabled={loading.teams || loading.teamTasks || loading.assigned}
        >
          Refresh Data
        </Button>
      </Box>

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
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                {assignedStats.overdue > 0 && (
                  <Chip 
                    label={`${assignedStats.overdue} overdue`} 
                    color="error" 
                    size="small"
                  />
                )}
                
              </Box>
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
                  currentUserId={user?._id}
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
            <Box>
              <Paper sx={{ p: 2, mb: 3, borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Live updates enabled for all teams you're a member of
                </Typography>
                
              </Paper>
              
              {Object.values(teamTasksByTeam)
                .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
                .map((g) => {
                  // ✅ CRITICAL FIX: Use the helper function instead of inline calculation
                  const role = getMyRoleInTeam(g.id);
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
                              {g.tasks.length} task{g.tasks.length > 1 ? 's' : ''} • {role ? `Your role: ${role}` : 'Member'} • Live Updates
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
                            currentUserId={user?._id}
                            isAdminOrManager={canEdit}
                            onEdit={() => handleEditTask(task)}
                            onDelete={() => handleDeleteTask(task._id)}
                            onStatusChange={(id, s) => handleStatusChange(id, s)}
                            onQuickComplete={() => handleQuickComplete(task._id)}
                          />
                        ))}
                      </Box>
                    </Paper>
                  );
                })}
            </Box>
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
                // ✅ CRITICAL FIX: Use the helper function
                const userRole = getMyRoleInTeam(t._id);
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