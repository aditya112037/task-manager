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
  Badge,
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

  // All tasks that backend returned for this user (admin or member)
  const [teamTasks, setTeamTasks] = useState([]);
  // Tasks assigned to me (derived)
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

  const handleTabChange = (_, newValue) => setTab(newValue);

  const showSnackbar = (msg, severity = "success") =>
    setSnackbar({ open: true, message: msg, severity });

  // --- Fetch teams (user's teams)
  const fetchTeams = useCallback(async () => {
    setLoading((s) => ({ ...s, teams: true }));
    try {
      const res = await teamsAPI.getTeams();
      setTeams(res.data || []);
    } catch (err) {
      console.error("Error loading teams:", err);
      showSnackbar("Failed to load teams", "error");
    } finally {
      setLoading((s) => ({ ...s, teams: false }));
    }
  }, []);

  // --- Fetch all team tasks user can see (new route)
  const fetchTeamTasks = useCallback(async () => {
    setLoading((s) => ({ ...s, teamTasks: true }));
    setError(null);
    try {
      const res = await teamTasksAPI.getMyTeamTasks(); // GET /api/team-tasks/my/all
      const tasks = Array.isArray(res.data) ? res.data : [];
      setTeamTasks(tasks);

      const grouped = groupTasksByTeam(tasks);
      setTeamTasksByTeam(grouped);
    } catch (err) {
      console.error("Error loading team tasks:", err);
      setError("Failed to load team tasks. Please try again.");
    } finally {
      setLoading((s) => ({ ...s, teamTasks: false }));
    }
  }, []);

  // --- Derive tasks assigned to current user
  const deriveAssignedTasks = useCallback(() => {
    setLoading((s) => ({ ...s, assignedTasks: true }));
    try {
      const assigned = teamTasks.filter((t) => {
        if (!t.assignedTo) return false;
        // assignedTo may be an object or string id
        const assigneeId = typeof t.assignedTo === "object" ? (t.assignedTo._id || t.assignedTo) : t.assignedTo;
        return String(assigneeId) === String(user?._id);
      });
      // sort by nearest due date
      assigned.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      });
      setAssignedTasks(assigned);
    } catch (err) {
      console.error("Error deriving assigned tasks:", err);
    } finally {
      setLoading((s) => ({ ...s, assignedTasks: false }));
    }
  }, [teamTasks, user]);

  // --- Group tasks by team helper
  const groupTasksByTeam = (tasks) => {
    const grouped = {};
    tasks.forEach((task) => {
      if (!task.team) return;
      const teamObj = typeof task.team === "object" ? task.team : { _id: String(task.team), name: "Team" };
      const id = teamObj._id || teamObj;
      if (!grouped[id]) {
        grouped[id] = {
          id,
          name: teamObj.name || "Unknown Team",
          color: teamObj.color || "#4CAF50",
          icon: teamObj.icon || "👥",
          tasks: [],
        };
      }
      grouped[id].tasks.push(task);
    });

    // sort tasks in each group by due date
    Object.values(grouped).forEach((g) => {
      g.tasks.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      });
    });

    return grouped;
  };

  // --- Return current user's role in a given team
  const getUserRoleInTeam = (teamId) => {
    const t = teams.find((x) => String(x._id) === String(teamId));
    if (!t) return "member";
    const mem = t.members?.find((m) => {
      if (!m) return false;
      if (typeof m.user === "object") return String(m.user._id) === String(user?._id);
      return String(m.user) === String(user?._id);
    });
    return mem?.role || "member";
  };

  // --- Task actions
  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await teamTasksAPI.updateTask(taskId, { status: newStatus });
      showSnackbar("Task updated", "success");
      fetchTeamTasks();
      deriveAssignedTasks();
    } catch (err) {
      console.error("Error updating task:", err);
      showSnackbar(err.response?.data?.message || "Failed to update task", "error");
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    try {
      await teamTasksAPI.deleteTask(taskId);
      showSnackbar("Task deleted", "success");
      fetchTeamTasks();
      deriveAssignedTasks();
    } catch (err) {
      console.error("Delete task error:", err);
      showSnackbar(err.response?.data?.message || "Failed to delete task", "error");
    }
  };

  const handleEditTask = (task) => {
    // navigate to team page (original UX)
    const teamId = task.team?._id || task.team;
    if (teamId) window.location.href = `/teams/${teamId}`;
  };

  const handleQuickComplete = async (taskId) => {
    try {
      await teamTasksAPI.updateTask(taskId, { status: "completed" });
      showSnackbar("Task marked as complete", "success");
      fetchTeamTasks();
      deriveAssignedTasks();
    } catch (err) {
      console.error("Quick complete error:", err);
      showSnackbar(err.response?.data?.message || "Failed to complete task", "error");
    }
  };

  // Assigned stats (colored boxes)
  const assignedStats = {
    total: assignedTasks.length,
    todo: assignedTasks.filter((t) => t.status === "todo").length,
    inProgress: assignedTasks.filter((t) => t.status === "in-progress").length,
    completed: assignedTasks.filter((t) => t.status === "completed").length,
    overdue: assignedTasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "completed").length,
  };

  // Refresh everything when needed
  const refreshAll = async () => {
    await Promise.allSettled([fetchTeams(), fetchTeamTasks()]);
  };

  // Initial load
  useEffect(() => {
    (async () => {
      await fetchTeams();
    })();
  }, [fetchTeams]);

  // load tasks once teams loaded (or re-run if teams change)
  useEffect(() => {
    fetchTeamTasks();
    // fetch assigned tasks derived from teamTasks after fetchTeamTasks finishes
    // We'll watch teamTasks state in the next effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teams.length]);

  // derive assigned tasks whenever teamTasks or user changes
  useEffect(() => {
    deriveAssignedTasks();
  }, [teamTasks, deriveAssignedTasks]);

  // small loader
  const renderLoader = () => (
    <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
      <CircularProgress />
    </Box>
  );

  return (
    <Container maxWidth="lg" sx={{ pt: 2, pb: 6 }}>
      {/* Snackbar */}
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

      <Typography variant="h4" sx={{ mb: 2 }}>
        Dashboard
      </Typography>

      <Paper sx={{ mb: 3, p: 1 }}>
        <Tabs value={tab} onChange={handleTabChange} variant="fullWidth">
          <Tab icon={<TaskIcon />} label="My Tasks" iconPosition="start" />
          <Tab
            icon={
              <Badge badgeContent={assignedStats.total} color="primary">
                <AssignmentIcon />
              </Badge>
            }
            label="Assigned to Me"
            iconPosition="start"
          />
          <Tab icon={<GroupIcon />} label="Team Tasks" iconPosition="start" />
          <Tab icon={<GroupIcon />} label="My Teams" iconPosition="start" />
        </Tabs>
      </Paper>

      {/* TAB 0: My personal tasks (existing component) */}
      {tab === 0 && <TaskList onRefresh={refreshAll} />}

      {/* TAB 1: Assigned to me */}
      {tab === 1 && (
        <Box>
          {loading.assignedTasks ? (
            renderLoader()
          ) : (
            <>
              {/* Summary colored boxes (A - you asked for these) */}
              <Paper sx={{ p: 2, mb: 3 }}>
                <Typography variant="h6">📋 Tasks Assigned to You</Typography>
                <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                  <Chip label={`Total: ${assignedStats.total}`} />
                  <Chip label={`To Do: ${assignedStats.todo}`} color="warning" />
                  <Chip label={`In Progress: ${assignedStats.inProgress}`} color="info" />
                  <Chip label={`Completed: ${assignedStats.completed}`} color="success" />
                </Stack>
              </Paper>

              {/* Colored stat boxes similar to your original design */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} sm={3}>
                  <Paper sx={{ p: 2, textAlign: "center", bgcolor: assignedStats.overdue > 0 ? "error.light" : "primary.light", color: assignedStats.overdue > 0 ? "error.contrastText" : "primary.contrastText" }}>
                    <Typography variant="h5">{assignedStats.total}</Typography>
                    <Typography variant="body2">Total</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Paper sx={{ p: 2, textAlign: "center", bgcolor: "warning.light", color: "warning.contrastText" }}>
                    <Typography variant="h5">{assignedStats.todo}</Typography>
                    <Typography variant="body2">To Do</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Paper sx={{ p: 2, textAlign: "center", bgcolor: "info.light", color: "info.contrastText" }}>
                    <Typography variant="h5">{assignedStats.inProgress}</Typography>
                    <Typography variant="body2">In Progress</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Paper sx={{ p: 2, textAlign: "center", bgcolor: "success.light", color: "success.contrastText" }}>
                    <Typography variant="h5">{assignedStats.completed}</Typography>
                    <Typography variant="body2">Completed</Typography>
                  </Paper>
                </Grid>
              </Grid>

              {/* If no assigned tasks — friendly empty state */}
              {assignedTasks.length === 0 ? (
                <Paper elevation={1} sx={{ textAlign: "center", p: 4 }}>
                  <AssignmentIcon sx={{ fontSize: 60, color: theme.palette.text.secondary, mb: 2 }} />
                  <Typography variant="h6" sx={{ color: theme.palette.text.secondary, mb: 2 }}>
                    No tasks assigned to you yet
                  </Typography>
                  <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb: 3 }}>
                    Team admins will assign tasks to you here. Check back later!
                  </Typography>
                  <Button variant="contained" startIcon={<GroupIcon />} onClick={() => setTab(2)}>
                    Browse Team Tasks
                  </Button>
                </Paper>
              ) : (
                <Box>
                  {/* Group by priority or show list — original asked to keep stat boxes and team style, not priority sections explicitly */}
                  {/* We'll render assigned tasks grouped by priority visually separated */}
                  {/* High */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" fontWeight={600} sx={{ mb: 2, color: "error.main" }}>
                      🔥 High Priority ({assignedTasks.filter((t) => t.priority === "high").length})
                    </Typography>
                    {assignedTasks.filter((t) => t.priority === "high").map((task) => (
                      <TeamTaskItem
                        key={task._id}
                        task={task}
                        canEdit={true}
                        onEdit={() => handleEditTask(task)}
                        onDelete={() => handleDeleteTask(task._id)}
                        onStatusChange={(id, status) => handleStatusChange(id, status)}
                        onQuickComplete={() => handleQuickComplete(task._id)}
                        showExtension
                      />
                    ))}
                  </Box>

                  {/* Medium */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" fontWeight={600} sx={{ mb: 2, color: "warning.main" }}>
                      ⚡ Medium Priority ({assignedTasks.filter((t) => t.priority === "medium").length})
                    </Typography>
                    {assignedTasks.filter((t) => t.priority === "medium").map((task) => (
                      <TeamTaskItem
                        key={task._id}
                        task={task}
                        canEdit={true}
                        onEdit={() => handleEditTask(task)}
                        onDelete={() => handleDeleteTask(task._id)}
                        onStatusChange={(id, status) => handleStatusChange(id, status)}
                        onQuickComplete={() => handleQuickComplete(task._id)}
                        showExtension
                      />
                    ))}
                  </Box>

                  {/* Low */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" fontWeight={600} sx={{ mb: 2, color: "success.main" }}>
                      🌱 Low Priority ({assignedTasks.filter((t) => t.priority === "low").length})
                    </Typography>
                    {assignedTasks.filter((t) => t.priority === "low").map((task) => (
                      <TeamTaskItem
                        key={task._id}
                        task={task}
                        canEdit={true}
                        onEdit={() => handleEditTask(task)}
                        onDelete={() => handleDeleteTask(task._id)}
                        onStatusChange={(id, status) => handleStatusChange(id, status)}
                        onQuickComplete={() => handleQuickComplete(task._id)}
                        showExtension
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </>
          )}
        </Box>
      )}

      {/* TAB 2: Team Tasks (grouped UI like original) */}
      {tab === 2 && (
        <Box>
          {loading.teamTasks ? (
            renderLoader()
          ) : error ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          ) : Object.keys(teamTasksByTeam).length === 0 ? (
            <Paper sx={{ p: 3, textAlign: "center" }}>
              <Typography color="text.secondary">No team tasks found.</Typography>
              <Button sx={{ mt: 2 }} variant="contained" onClick={() => (window.location.href = "/teams")}>
                Join or Create a Team
              </Button>
            </Paper>
          ) : (
            Object.values(teamTasksByTeam)
              .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
              .map((teamGroup) => {
                const role = getUserRoleInTeam(teamGroup.id);
                const canEditTeam = ["admin", "manager"].includes(role);

                return (
                  <Paper key={teamGroup.id} sx={{ mb: 3, borderRadius: 2, overflow: "hidden" }}>
                    {/* Team header */}
                    <Box
                      sx={{
                        p: 2,
                        bgcolor: teamGroup.color + "20",
                        borderBottom: `1px solid ${theme.palette.divider}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: "50%",
                            bgcolor: teamGroup.color,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "1.2rem",
                            color: "#fff",
                          }}
                        >
                          {teamGroup.icon}
                        </Box>
                        <Box>
                          <Typography variant="h6" fontWeight={600}>
                            {teamGroup.name}
                          </Typography>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="body2" color="text.secondary">
                              {teamGroup.tasks.length} task{teamGroup.tasks.length > 1 ? "s" : ""}
                            </Typography>
                            <Chip label={role} size="small" color={role === "admin" ? "primary" : "default"} />
                            {teamGroup.tasks.some((t) => {
                              const assigneeId = t.assignedTo ? (typeof t.assignedTo === "object" ? (t.assignedTo._id || t.assignedTo) : t.assignedTo) : null;
                              return String(assigneeId) === String(user?._id);
                            }) && (
                              <Chip
                                label={`${teamGroup.tasks.filter((t) => {
                                  const assigneeId = t.assignedTo ? (typeof t.assignedTo === "object" ? (t.assignedTo._id || t.assignedTo) : t.assignedTo) : null;
                                  return String(assigneeId) === String(user?._id);
                                }).length} assigned to you`}
                                color="primary"
                                variant="outlined"
                                size="small"
                              />
                            )}
                          </Stack>
                        </Box>
                      </Box>

                      <Button variant="outlined" size="small" onClick={() => (window.location.href = `/teams/${teamGroup.id}`)}>
                        View Team
                      </Button>
                    </Box>

                    {/* Team tasks */}
                    <Box sx={{ p: 2 }}>
                      {teamGroup.tasks.map((task) => {
                        const assigneeId = task.assignedTo ? (typeof task.assignedTo === "object" ? (task.assignedTo._id || task.assignedTo) : task.assignedTo) : null;
                        const canEdit = canEditTeam || String(assigneeId) === String(user?._id);

                        return (
                          <TeamTaskItem
                            key={task._id}
                            task={task}
                            canEdit={canEdit}
                            onEdit={() => handleEditTask(task)}
                            onDelete={() => handleDeleteTask(task._id)}
                            onStatusChange={(id, status) => handleStatusChange(id, status)}
                            onQuickComplete={() => handleQuickComplete(task._id)}
                            showExtension
                          />
                        );
                      })}
                    </Box>
                  </Paper>
                );
              })
          )}
        </Box>
      )}

      {/* TAB 3: My Teams (grid cards) */}
      {tab === 3 && (
        <Grid container spacing={2}>
          {loading.teams ? (
            <Grid item xs={12}>
              {renderLoader()}
            </Grid>
          ) : teams.length === 0 ? (
            <Grid item xs={12}>
              <Paper sx={{ p: 4, textAlign: "center" }}>
                <Typography color="text.secondary">You haven't joined any teams yet.</Typography>
                <Button sx={{ mt: 2 }} variant="contained" onClick={() => (window.location.href = "/teams")}>
                  Browse Teams
                </Button>
              </Paper>
            </Grid>
          ) : (
            teams.map((t) => {
              const userRole = getUserRoleInTeam(t._id);
              const assignedTasksCount = assignedTasks.filter((at) => {
                const teamId = at.team?._id || at.team;
                return String(teamId) === String(t._id);
              }).length;

              return (
                <Grid item key={t._id} xs={12} sm={6} md={4}>
                  <Paper
                    sx={{
                      p: 3,
                      borderRadius: 2,
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      cursor: "pointer",
                      transition: "transform 0.2s, box-shadow 0.2s",
                      "&:hover": { transform: "translateY(-4px)", boxShadow: theme.shadows[4] },
                    }}
                    onClick={() => (window.location.href = `/teams/${t._id}`)}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                      <Box sx={{ width: 50, height: 50, borderRadius: "50%", bgcolor: t.color || theme.palette.primary.main, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", mr: 2 }}>
                        {t.icon || "👥"}
                      </Box>
                      <Box>
                        <Typography variant="h6" fontWeight={600}>
                          {t.name}
                        </Typography>
                        <Chip label={userRole} size="small" color={userRole === "admin" ? "primary" : "default"} sx={{ mt: 0.5 }} />
                      </Box>
                    </Box>

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2, flexGrow: 1 }}>
                      {t.description || "No description"}
                    </Typography>

                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Stack direction="row" spacing={1}>
                        <Typography variant="body2">👥 {t.members?.length || 0}</Typography>
                        {assignedTasksCount > 0 && <Typography variant="body2" color="primary">📋 {assignedTasksCount}</Typography>}
                      </Stack>
                      <Typography variant="body2" color="primary">
                        View Team →
                      </Typography>
                    </Box>
                  </Paper>
                </Grid>
              );
            })
          )}
        </Grid>
      )}
    </Container>
  );
};

export default Dashboard;
