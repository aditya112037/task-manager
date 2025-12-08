/** PATCHED Dashboard.jsx
 *  - Uses GET /api/team-tasks/my/all
 *  - Shows names for createdBy / assignedTo
 *  - Groups tasks by team
 *  - Assigned-to-me tab fixed
 *  - Team Tasks tab fixed
 *  - Refresh callbacks included
 */

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

  const [teamTasks, setTeamTasks] = useState([]); // all tasks returned by GET /my/all
  const [assignedTasks, setAssignedTasks] = useState([]); // tasks assigned to me across teams
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

  // Helper: show snackbar
  const showSnackbar = (msg, type = "success") => {
    setSnackbar({ open: true, message: msg, severity: type });
  };

  // Fetch teams (user's teams)
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

  // Fetch all team tasks via new backend route (GET /api/team-tasks/my/all)
  const fetchTeamTasks = useCallback(async () => {
    setLoading((s) => ({ ...s, teamTasks: true }));
    setError(null);
    try {
      const res = await teamTasksAPI.getMyTeamTasks(); // expects populated createdBy/assignedTo/team
      const tasks = res.data || [];
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

  // Fetch assigned tasks (per-team call)
  const fetchAssignedTasks = useCallback(async () => {
    setLoading((s) => ({ ...s, assignedTasks: true }));
    try {
      // If we already have an endpoint that returns assigned-to-me across all teams,
      // replace this loop with that single call.
      let all = [];
      if (!teams || teams.length === 0) {
        // If no teams, try to load teams first
        await fetchTeams();
      }

      for (const team of teams) {
        try {
          const res = await teamTasksAPI.getMyAssignedTasks(team._id);
          if (Array.isArray(res.data)) all = all.concat(res.data);
        } catch (err) {
          // skip errors for individual teams but log them
          console.warn(`Failed to fetch assigned tasks for team ${team._id}`, err);
        }
      }

      // sort: tasks with due date first (nearest)
      all.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      });

      setAssignedTasks(all);
    } catch (err) {
      console.error("Error loading assigned tasks:", err);
      showSnackbar("Failed to load assigned tasks", "error");
    } finally {
      setLoading((s) => ({ ...s, assignedTasks: false }));
    }
  }, [teams, fetchTeams]);

  // Group tasks by team helper (handles partial population)
  const groupTasksByTeam = (tasks) => {
    const grouped = {};
    tasks.forEach((task) => {
      if (!task.team) return;
      const teamObj = typeof task.team === "object" ? task.team : { _id: String(task.team), name: "Team" };
      const teamId = teamObj._id || teamObj;
      if (!grouped[teamId]) {
        grouped[teamId] = {
          id: teamId,
          name: teamObj.name || "Unknown Team",
          color: teamObj.color || "#4CAF50",
          icon: teamObj.icon || "👥",
          tasks: [],
        };
      }
      grouped[teamId].tasks.push(task);
    });

    // Sort tasks inside each team by due date
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

  // Returns role for current user in team (admin/manager/member)
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

  // Callback to refresh everything (used after create/update/delete)
  const refreshAll = async () => {
    await Promise.allSettled([fetchTeams(), fetchTeamTasks(), fetchAssignedTasks()]);
  };

  // Effect: initial load
  useEffect(() => {
    // load teams, tasks, assigned tasks
    (async () => {
      await fetchTeams();
    })();
  }, [fetchTeams]);

  // Once teams are loaded, load assigned tasks and team tasks
  useEffect(() => {
    fetchTeamTasks();
    fetchAssignedTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teams.length]); // re-run when teams change length (user join/leave)

  // Assigned-to-me stats
  const assignedStats = {
    total: assignedTasks.length,
    todo: assignedTasks.filter((t) => t.status === "todo").length,
    inProgress: assignedTasks.filter((t) => t.status === "in-progress").length,
    completed: assignedTasks.filter((t) => t.status === "completed").length,
    overdue: assignedTasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "completed").length,
  };

  // --- Task actions (call backend and refresh)
  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await teamTasksAPI.updateTask(taskId, { status: newStatus });
      showSnackbar("Task updated", "success");
      fetchTeamTasks();
      fetchAssignedTasks();
    } catch (err) {
      console.error("Error updating task status:", err);
      showSnackbar(err.response?.data?.message || "Failed to update task", "error");
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    try {
      await teamTasksAPI.deleteTask(taskId);
      showSnackbar("Task deleted", "success");
      fetchTeamTasks();
      fetchAssignedTasks();
    } catch (err) {
      console.error("Error deleting task:", err);
      showSnackbar(err.response?.data?.message || "Failed to delete task", "error");
    }
  };

  const handleQuickComplete = async (taskId) => {
    try {
      await teamTasksAPI.quickComplete(taskId);
      showSnackbar("Task marked complete", "success");
      fetchTeamTasks();
      fetchAssignedTasks();
    } catch (err) {
      console.error("Quick complete error:", err);
      showSnackbar(err.response?.data?.message || "Failed to complete task", "error");
    }
  };

  // Render loading center
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

      {/* --- Tab 0: Personal tasks (existing TaskList component) --- */}
      {tab === 0 && <TaskList onRefresh={refreshAll} />}

      {/* --- Tab 1: Assigned to me --- */}
      {tab === 1 && (
        <Box>
          {loading.assignedTasks ? (
            renderLoader()
          ) : (
            <>
              <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6">📋 Tasks Assigned to You</Typography>
                <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                  <Chip label={`Total: ${assignedStats.total}`} />
                  <Chip label={`To Do: ${assignedStats.todo}`} color="warning" />
                  <Chip label={`In Progress: ${assignedStats.inProgress}`} color="info" />
                  <Chip label={`Completed: ${assignedStats.completed}`} color="success" />
                </Stack>
              </Paper>

              {assignedTasks.length === 0 ? (
                <Paper sx={{ p: 4, textAlign: "center" }}>
                  <Typography color="text.secondary">No tasks assigned to you yet.</Typography>
                </Paper>
              ) : (
                assignedTasks.map((task) => (
                  <TeamTaskItem
                    key={task._id}
                    task={task}
                    canEdit={true}
                    onStatusChange={handleStatusChange}
                    onDelete={() => handleDeleteTask(task._id)}
                    onQuickComplete={() => handleQuickComplete(task._id)}
                    showExtension
                    onActionComplete={() => {
                      // child can call this after local actions
                      fetchTeamTasks();
                      fetchAssignedTasks();
                    }}
                  />
                ))
              )}
            </>
          )}
        </Box>
      )}

      {/* --- Tab 2: Team tasks --- */}
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
            </Paper>
          ) : (
            Object.values(teamTasksByTeam)
              // sort teams alphabetically for a nicer UI
              .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
              .map((teamGroup) => {
                const role = getUserRoleInTeam(teamGroup.id);
                return (
                  <Paper key={teamGroup.id} sx={{ mb: 3 }}>
                    <Box sx={{ p: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Box>
                        <Typography variant="h6">
                          {teamGroup.icon} {teamGroup.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {teamGroup.tasks.length} task{teamGroup.tasks.length > 1 ? "s" : ""}
                        </Typography>
                      </Box>
                      <Box>
                        <Button variant="outlined" size="small" onClick={() => (window.location.href = `/teams/${teamGroup.id}`)}>
                          View Team
                        </Button>
                      </Box>
                    </Box>

                    <Box sx={{ p: 2 }}>
                      {teamGroup.tasks.map((task) => {
                        // Determine if user can edit: admin/manager OR assigned to user
                        const canEdit = ["admin", "manager"].includes(role) || (task.assignedTo && (String(task.assignedTo._id || task.assignedTo) === String(user?._id)));
                        return (
                          <TeamTaskItem
                            key={task._id}
                            task={task}
                            canEdit={canEdit}
                            onStatusChange={handleStatusChange}
                            onDelete={() => handleDeleteTask(task._id)}
                            onQuickComplete={() => handleQuickComplete(task._id)}
                            showExtension
                            onActionComplete={() => {
                              fetchTeamTasks();
                              fetchAssignedTasks();
                            }}
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

      {/* --- Tab 3: My Teams --- */}
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
            teams.map((t) => (
              <Grid item key={t._id} xs={12} sm={6} md={4}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6">{t.icon || "👥"} {t.name}</Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Members: {t.members?.length || 0}
                  </Typography>
                  <Button
                    fullWidth
                    sx={{ mt: 2 }}
                    variant="outlined"
                    onClick={() => (window.location.href = `/teams/${t._id}`)}
                  >
                    Open Team
                  </Button>
                </Paper>
              </Grid>
            ))
          )}
        </Grid>
      )}
    </Container>
  );
};

export default Dashboard;
