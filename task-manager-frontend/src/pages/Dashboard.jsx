import React, { useEffect, useState } from "react";
import {
  Box,
  Tabs,
  Tab,
  Typography,
  CircularProgress,
  Paper,
  useTheme,
  Alert,
  Button,
  Stack,
  Chip,
} from "@mui/material";
import GroupIcon from "@mui/icons-material/Group";
import TaskList from "../components/Task/TaskList";
import TeamTaskItem from "../components/Teams/TeamTaskItem";
import { teamTasksAPI, teamsAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";

const Dashboard = () => {
  const theme = useTheme();
  const { user } = useAuth();

  const [tab, setTab] = useState(0);
  const [teamTasks, setTeamTasks] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [teamTasksByTeam, setTeamTasksByTeam] = useState({}); // Grouped by team

  const handleTabChange = (_, newValue) => setTab(newValue);

  useEffect(() => {
    fetchTeamTasks();
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      const response = await teamsAPI.getTeams();
      setTeams(response.data);
    } catch (err) {
      console.error("Error loading teams:", err);
    }
  };

  const fetchTeamTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      // FIXED: Changed from getAllMyTeamTasks() to getMyTeamTasks()
      const response = await teamTasksAPI.getMyTeamTasks();
      setTeamTasks(response.data);
      
      // Group tasks by team for better organization
      const grouped = groupTasksByTeam(response.data);
      setTeamTasksByTeam(grouped);
    } catch (err) {
      console.error("Error loading team tasks:", err);
      setError("Failed to load team tasks. Please try again.");
    } finally {
      setLoading(false);
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
      // Refresh tasks
      fetchTeamTasks();
    } catch (err) {
      console.error("Error updating task status:", err);
    }
  };

  // Handle task delete
  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    
    try {
      await teamTasksAPI.deleteTask(taskId);
      // Refresh tasks
      fetchTeamTasks();
    } catch (err) {
      console.error("Error deleting task:", err);
      alert("Failed to delete task. Please try again.");
    }
  };

  // Handle task edit
  const handleEditTask = (task) => {
    // Navigate to team page to edit the task
    if (task.team && task.team._id) {
      window.location.href = `/teams/${task.team._id}`;
    }
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

  return (
    <Box sx={{ pt: 1 }}>
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
          <Tab label="My Tasks" />
          <Tab label="Team Tasks" />
          <Tab label="My Teams" />
        </Tabs>
      </Paper>

      {/* PERSONAL TASKS */}
      {tab === 0 && <TaskList />}

      {/* TEAM TASKS */}
      {tab === 1 && (
        <Box>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {loading ? (
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
                            bgcolor: teamData.color + '20', // 20% opacity
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
                              canEdit={isAdminOrManager}
                              onEdit={() => handleEditTask(task)}
                              onDelete={() => handleDeleteTask(task._id)}
                              onStatusChange={handleStatusChange}
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
      {tab === 2 && (
        <Box>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : teams.length > 0 ? (
            <Grid container spacing={2}>
              {teams.map(team => {
                const userRole = getUserRoleInTeam(team._id);
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
                        <Typography variant="body2">
                          {team.members?.length || 0} members
                        </Typography>
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

// Import Grid component
import { Grid } from "@mui/material";

export default Dashboard;