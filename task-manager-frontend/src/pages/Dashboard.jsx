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
} from "@mui/material";
import { Alert } from "@mui/material";
import GroupIcon from "@mui/icons-material/Group";
import AssignmentIcon from "@mui/icons-material/Assignment";
import TaskIcon from "@mui/icons-material/Task";
import TaskList from "../components/Task/TaskList";
import TeamTaskItem from "../components/Teams/TeamTaskItem";
import { teamTasksAPI, teamsAPI, notificationsAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";

const Dashboard = () => {
  const theme = useTheme();
  const { user } = useAuth();

  const [tab, setTab] = useState(0);
  const [teamTasks, setTeamTasks] = useState([]);
  const [assignedTasks, setAssignedTasks] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState({
    teamTasks: true,
    assignedTasks: true,
    teams: true,
  });
  const [error, setError] = useState(null);
  const [teamTasksByTeam, setTeamTasksByTeam] = useState({});
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const handleTabChange = (_, newValue) => setTab(newValue);

  useEffect(() => {
    fetchTeamTasks();
    fetchTeams();
    fetchAssignedTasks();
  }, []);

  const fetchTeams = async () => {
    try {
      const response = await teamsAPI.getTeams();
      setTeams(response.data);
    } catch (err) {
      console.error("Error loading teams:", err);
    } finally {
      setLoading(prev => ({ ...prev, teams: false }));
    }
  };

  const fetchTeamTasks = async () => {
    setLoading(prev => ({ ...prev, teamTasks: true }));
    setError(null);
    try {
      const response = await teamTasksAPI.getMyTeamTasks();
      setTeamTasks(response.data);
      
      const grouped = groupTasksByTeam(response.data);
      setTeamTasksByTeam(grouped);
    } catch (err) {
      console.error("Error loading team tasks:", err);
      setError("Failed to load team tasks. Please try again.");
    } finally {
      setLoading(prev => ({ ...prev, teamTasks: false }));
    }
  };

  const fetchAssignedTasks = async () => {
    setLoading(prev => ({ ...prev, assignedTasks: true }));
    try {
      const teamsRes = await teamsAPI.getTeams();
      const userTeams = teamsRes.data;
      
      let allAssignedTasks = [];
      
      for (const team of userTeams) {
        try {
          const response = await teamTasksAPI.getMyAssignedTasks(team._id);
          allAssignedTasks = [...allAssignedTasks, ...response.data];
        } catch (err) {
          console.error(`Error fetching assigned tasks for team ${team._id}:`, err);
        }
      }
      
      allAssignedTasks.sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      });
      
      setAssignedTasks(allAssignedTasks);
    } catch (err) {
      console.error("Error loading assigned tasks:", err);
    } finally {
      setLoading(prev => ({ ...prev, assignedTasks: false }));
    }
  };

  // Group tasks by team
  const groupTasksByTeam = (tasks) => {
    const grouped = {};
    
    tasks.forEach(task => {
      if (task.team) {
        const teamId = task.team._id || task.team;
        const teamName = task.team.name || "Unknown Team";
        
        if (!grouped[teamId]) {
          grouped[teamId] = {
            id: teamId,
            name: teamName,
            color: task.team.color || "#4CAF50",
            icon: task.team.icon || "👥",
            tasks: []
          };
        }
        grouped[teamId].tasks.push(task);
      }
    });
    
    return grouped;
  };

  // Handle task status change
  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await teamTasksAPI.updateTask(taskId, { status: newStatus });
      fetchTeamTasks();
      fetchAssignedTasks();
    } catch (err) {
      console.error("Error updating task status:", err);
    }
  };

  // Handle task delete
  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    
    try {
      await teamTasksAPI.deleteTask(taskId);
      fetchTeamTasks();
      fetchAssignedTasks();
      showSnackbar("Task deleted successfully", "success");
    } catch (err) {
      console.error("Error deleting task:", err);
      showSnackbar("Failed to delete task", "error");
    }
  };

  // Handle task edit
  const handleEditTask = (task) => {
    if (task.team && task.team._id) {
      window.location.href = `/teams/${task.team._id}`;
    }
  };

  // NEW: Handle extension request
const handleRequestExtension = async (taskId, reason, newDueDate) => {
  try {
    console.log("Sending extension request:", { taskId, reason, newDueDate });
    
    // Convert to ISO string for backend
    const dateToSend = new Date(newDueDate).toISOString();
    
    const response = await teamTasksAPI.requestExtension(taskId, reason, dateToSend);
    console.log("Extension response:", response.data);
    
    await fetchTeamTasks();
    await fetchTeam();
    
    setSnackbar({
      open: true,
      message: "Extension request submitted successfully",
      severity: "success",
    });
  } catch (err) {
    console.error("Full extension error:", {
      message: err.message,
      response: err.response?.data,
      status: err.response?.status,
      url: err.config?.url,
      method: err.config?.method,
    });
    
    setSnackbar({
      open: true,
      message: err.response?.data?.message || "Failed to submit extension request",
      severity: "error",
    });
  }
};

  // NEW: Handle quick complete
  const handleQuickComplete = async (taskId) => {
    try {
      await teamTasksAPI.quickComplete(taskId);
      fetchTeamTasks();
      fetchAssignedTasks();
      showSnackbar("Task marked as complete!", "success");
    } catch (err) {
      console.error("Error completing task:", err);
      showSnackbar(err.response?.data?.message || "Failed to complete task", "error");
    }
  };

  // Helper function for snackbar
  const showSnackbar = (message, severity = "success") => {
    setSnackbar({
      open: true,
      message,
      severity,
    });
  };

  // Calculate user's role in a team
  const getUserRoleInTeam = (teamId) => {
    const team = teams.find(t => t._id === teamId);
    if (!team) return "member";
    
    const member = team.members?.find(m => 
      m.user?._id === user?._id || m.user === user?._id
    );
    return member?.role || "member";
  };

  // Get team by ID
  const getTeamById = (teamId) => {
    return teams.find(t => t._id === teamId);
  };

  // Count assigned tasks by status
  const getAssignedTaskStats = () => {
    const total = assignedTasks.length;
    const todo = assignedTasks.filter(t => t.status === "todo").length;
    const inProgress = assignedTasks.filter(t => t.status === "in-progress").length;
    const completed = assignedTasks.filter(t => t.status === "completed").length;
    const overdue = assignedTasks.filter(t => {
      if (!t.dueDate) return false;
      return new Date(t.dueDate) < new Date() && t.status !== "completed";
    }).length;
    
    return { total, todo, inProgress, completed, overdue };
  };

  const assignedStats = getAssignedTaskStats();

  return (
    <Box sx={{ pt: 1 }}>
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert 
          severity={snackbar.severity} 
          sx={{ width: "100%" }}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      <Typography
        variant="h4"
        fontWeight="bold"
        sx={{ mb: 2, color: theme.palette.text.primary }}
      >
        Dashboard
      </Typography>

      {/* TABS */}
      <Paper
        elevation={1}
        sx={{
          backgroundColor: theme.palette.background.paper,
          borderRadius: 2,
          mb: 2,
          p: 1,
          border: theme.palette.mode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
        }}
      >
        <Tabs
          value={tab}
          onChange={handleTabChange}
          textColor="primary"
          indicatorColor="primary"
          sx={{
            "& .MuiTab-root": {
              textTransform: "none",
              fontWeight: 600,
              fontSize: '0.95rem',
              minHeight: '48px',
            },
          }}
        >
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TaskIcon fontSize="small" />
                <span>My Tasks</span>
              </Box>
            } 
          />
          <Tab 
            label={
              <Badge 
                badgeContent={assignedStats.total} 
                color="primary" 
                sx={{ '& .MuiBadge-badge': { fontSize: '0.7rem', height: '18px', minWidth: '18px' } }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AssignmentIcon fontSize="small" />
                  <span>Assigned to Me</span>
                </Box>
              </Badge>
            } 
          />
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <GroupIcon fontSize="small" />
                <span>Team Tasks</span>
              </Box>
            } 
          />
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <GroupIcon fontSize="small" />
                <span>My Teams</span>
              </Box>
            } 
          />
        </Tabs>
      </Paper>

      {/* PERSONAL TASKS */}
      {tab === 0 && <TaskList />}

      {/* ASSIGNED TO ME - NEW TAB */}
      {tab === 1 && (
        <Box>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {loading.assignedTasks ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : assignedTasks.length > 0 ? (
            <Box>
              {/* Assigned Tasks Summary */}
              <Paper sx={{ 
                p: 2, 
                mb: 3, 
                bgcolor: 'background.default',
                borderLeft: `4px solid ${theme.palette.primary.main}`,
              }}>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                  📋 Tasks Assigned to You
                </Typography>
                
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={6} sm={3}>
                    <Paper sx={{ 
                      p: 2, 
                      textAlign: 'center',
                      bgcolor: assignedStats.overdue > 0 ? 'error.light' : 'primary.light',
                      color: assignedStats.overdue > 0 ? 'error.contrastText' : 'primary.contrastText',
                    }}>
                      <Typography variant="h5">{assignedStats.total}</Typography>
                      <Typography variant="body2">Total</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Paper sx={{ 
                      p: 2, 
                      textAlign: 'center',
                      bgcolor: 'warning.light',
                      color: 'warning.contrastText',
                    }}>
                      <Typography variant="h5">{assignedStats.todo}</Typography>
                      <Typography variant="body2">To Do</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Paper sx={{ 
                      p: 2, 
                      textAlign: 'center',
                      bgcolor: 'info.light',
                      color: 'info.contrastText',
                    }}>
                      <Typography variant="h5">{assignedStats.inProgress}</Typography>
                      <Typography variant="body2">In Progress</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Paper sx={{ 
                      p: 2, 
                      textAlign: 'center',
                      bgcolor: 'success.light',
                      color: 'success.contrastText',
                    }}>
                      <Typography variant="h5">{assignedStats.completed}</Typography>
                      <Typography variant="body2">Completed</Typography>
                    </Paper>
                  </Grid>
                </Grid>

                {assignedStats.overdue > 0 && (
                  <Alert severity="error" sx={{ mb: 1 }}>
                    ⚠️ You have {assignedStats.overdue} overdue task{assignedStats.overdue > 1 ? 's' : ''}!
                  </Alert>
                )}
              </Paper>

              {/* Priority Sections */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 2, color: 'error.main' }}>
                  🔥 High Priority ({assignedTasks.filter(t => t.priority === 'high').length})
                </Typography>
                {assignedTasks
                  .filter(task => task.priority === 'high')
                  .map(task => (
                    <TeamTaskItem
                      key={task._id}
                      task={task}
                      canEdit={true}
                      onEdit={() => handleEditTask(task)}
                      onDelete={() => handleDeleteTask(task._id)}
                      onStatusChange={handleStatusChange}
                      onRequestExtension={handleRequestExtension}
                      onQuickComplete={handleQuickComplete}
                    />
                  ))}
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 2, color: 'warning.main' }}>
                  ⚡ Medium Priority ({assignedTasks.filter(t => t.priority === 'medium').length})
                </Typography>
                {assignedTasks
                  .filter(task => task.priority === 'medium')
                  .map(task => (
                    <TeamTaskItem
                      key={task._id}
                      task={task}
                      canEdit={true}
                      onEdit={() => handleEditTask(task)}
                      onDelete={() => handleDeleteTask(task._id)}
                      onStatusChange={handleStatusChange}
                      onRequestExtension={handleRequestExtension}
                      onQuickComplete={handleQuickComplete}
                    />
                  ))}
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 2, color: 'success.main' }}>
                  🌱 Low Priority ({assignedTasks.filter(t => t.priority === 'low').length})
                </Typography>
                {assignedTasks
                  .filter(task => task.priority === 'low')
                  .map(task => (
                    <TeamTaskItem
                      key={task._id}
                      task={task}
                      canEdit={true}
                      onEdit={() => handleEditTask(task)}
                      onDelete={() => handleDeleteTask(task._id)}
                      onStatusChange={handleStatusChange}
                      onRequestExtension={handleRequestExtension}
                      onQuickComplete={handleQuickComplete}
                    />
                  ))}
              </Box>
            </Box>
          ) : (
            <Paper
              elevation={1}
              sx={{
                textAlign: "center",
                p: 4,
                backgroundColor: theme.palette.background.paper,
                border: theme.palette.mode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
              }}
            >
              <AssignmentIcon sx={{ fontSize: 60, color: theme.palette.text.secondary, mb: 2 }} />
              <Typography
                variant="h6"
                sx={{
                  color: theme.palette.text.secondary,
                  mb: 2,
                }}
              >
                No tasks assigned to you yet
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: theme.palette.text.secondary,
                  mb: 3,
                }}
              >
                Team admins will assign tasks to you here. Check back later!
              </Typography>
              <Button 
                variant="contained" 
                startIcon={<GroupIcon />}
                onClick={() => {
                  setTab(2);
                }}
              >
                Browse Team Tasks
              </Button>
            </Paper>
          )}
        </Box>
      )}

      {/* TEAM TASKS */}
      {tab === 2 && (
        <Box>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {loading.teamTasks ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : teamTasks.length > 0 ? (
            <Box>
              {/* Summary Stats */}
              <Paper sx={{ p: 2, mb: 2, bgcolor: 'background.default' }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Typography variant="subtitle1" fontWeight={600}>
                    Total Team Tasks: {teamTasks.length}
                  </Typography>
                  <Chip 
                    label={`${teamTasks.filter(t => t.status === 'completed').length} completed`}
                    color="success" 
                    size="small"
                  />
                  <Chip 
                    label={`${teamTasks.filter(t => t.status === 'in-progress').length} in progress`}
                    color="info" 
                    size="small"
                  />
                </Stack>
              </Paper>

              {/* Grouped by Team View */}
              {Object.keys(teamTasksByTeam).length > 0 ? (
                <Box>
                  {Object.values(teamTasksByTeam).map(teamData => {
                    const team = getTeamById(teamData.id);
                    const userRole = getUserRoleInTeam(teamData.id);
                    const isAdminOrManager = ["admin", "manager"].includes(userRole);
                    
                    return (
                      <Paper
                        key={teamData.id}
                        sx={{
                          mb: 3,
                          borderRadius: 2,
                          overflow: 'hidden',
                          border: `1px solid ${theme.palette.divider}`,
                        }}
                      >
                        {/* Team Header */}
                        <Box
                          sx={{
                            p: 2,
                            bgcolor: teamData.color + '20',
                            borderBottom: `1px solid ${theme.palette.divider}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box
                              sx={{
                                width: 40,
                                height: 40,
                                borderRadius: '50%',
                                bgcolor: teamData.color,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.2rem',
                              }}
                            >
                              {teamData.icon}
                            </Box>
                            <Box>
                              <Typography variant="h6" fontWeight={600}>
                                {teamData.name}
                              </Typography>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Typography variant="body2" color="text.secondary">
                                  {teamData.tasks.length} tasks
                                </Typography>
                                <Chip 
                                  label={userRole}
                                  size="small"
                                  color={userRole === "admin" ? "primary" : "default"}
                                />
                                {teamData.tasks.some(t => t.assignedTo?._id === user?._id) && (
                                  <Chip 
                                    label={`${teamData.tasks.filter(t => t.assignedTo?._id === user?._id).length} assigned to you`}
                                    color="primary" 
                                    variant="outlined"
                                    size="small"
                                  />
                                )}
                              </Stack>
                            </Box>
                          </Box>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => window.location.href = `/teams/${teamData.id}`}
                          >
                            View Team
                          </Button>
                        </Box>

                        {/* Team Tasks */}
                        <Box sx={{ p: 2 }}>
                          {teamData.tasks.map(task => (
                            <TeamTaskItem
                              key={task._id}
                              task={task}
                              canEdit={isAdminOrManager || task.assignedTo?._id === user?._id}
                              onEdit={() => handleEditTask(task)}
                              onDelete={() => handleDeleteTask(task._id)}
                              onStatusChange={handleStatusChange}
                              onRequestExtension={handleRequestExtension}
                              onQuickComplete={handleQuickComplete}
                            />
                          ))}
                        </Box>
                      </Paper>
                    );
                  })}
                </Box>
              ) : (
                <Paper
                  sx={{
                    textAlign: "center",
                    p: 3,
                    backgroundColor: theme.palette.background.paper,
                  }}
                >
                  <Typography sx={{ mb: 2, color: theme.palette.text.secondary }}>
                    No team tasks found.
                  </Typography>
                  <Button 
                    variant="contained" 
                    startIcon={<GroupIcon />}
                    onClick={() => window.location.href = "/teams"}
                  >
                    Join or Create a Team
                  </Button>
                </Paper>
              )}
            </Box>
          ) : (
            <Paper
              elevation={1}
              sx={{
                textAlign: "center",
                p: 3,
                backgroundColor: theme.palette.background.paper,
                border: theme.palette.mode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
              }}
            >
              <Typography
                sx={{
                  color: theme.palette.text.secondary,
                  mb: 2,
                }}
              >
                No team tasks yet.
              </Typography>
              <Button 
                variant="contained" 
                startIcon={<GroupIcon />}
                onClick={() => window.location.href = "/teams"}
              >
                Join or Create a Team
              </Button>
            </Paper>
          )}
        </Box>
      )}

      {/* MY TEAMS TAB */}
      {tab === 3 && (
        <Box>
          {loading.teams ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : teams.length > 0 ? (
            <Grid container spacing={2}>
              {teams.map(team => {
                const userRole = getUserRoleInTeam(team._id);
                const assignedTasksCount = assignedTasks.filter(t => 
                  t.team?._id === team._id || t.team === team._id
                ).length;
                
                return (
                  <Grid item xs={12} sm={6} md={4} key={team._id}>
                    <Paper
                      sx={{
                        p: 3,
                        borderRadius: 2,
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        cursor: 'pointer',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: theme.shadows[4],
                        },
                      }}
                      onClick={() => window.location.href = `/teams/${team._id}`}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Box
                          sx={{
                            width: 50,
                            height: 50,
                            borderRadius: '50%',
                            bgcolor: team.color || theme.palette.primary.main,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.5rem',
                            mr: 2,
                          }}
                        >
                          {team.icon || "👥"}
                        </Box>
                        <Box>
                          <Typography variant="h6" fontWeight={600}>
                            {team.name}
                          </Typography>
                          <Chip 
                            label={userRole}
                            size="small"
                            color={userRole === "admin" ? "primary" : "default"}
                            sx={{ mt: 0.5 }}
                          />
                        </Box>
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, flexGrow: 1 }}>
                        {team.description || "No description"}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Stack direction="row" spacing={1}>
                          <Typography variant="body2">
                            👥 {team.members?.length || 0}
                          </Typography>
                          {assignedTasksCount > 0 && (
                            <Typography variant="body2" color="primary">
                              📋 {assignedTasksCount}
                            </Typography>
                          )}
                        </Stack>
                        <Typography variant="body2" color="primary">
                          View Team →
                        </Typography>
                      </Box>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          ) : (
            <Paper
              sx={{
                textAlign: "center",
                p: 4,
                backgroundColor: theme.palette.background.paper,
              }}
            >
              <Typography sx={{ mb: 2, color: theme.palette.text.secondary }}>
                You haven't joined any teams yet.
              </Typography>
              <Button 
                variant="contained" 
                startIcon={<GroupIcon />}
                onClick={() => window.location.href = "/teams"}
              >
                Browse Teams
              </Button>
            </Paper>
          )}
        </Box>
      )}
    </Box>
  );
};

// Import Alert component


export default Dashboard;