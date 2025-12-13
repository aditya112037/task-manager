// TeamDetails.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
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
  IconButton,
  MenuItem,
  Select,
  FormControl,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar,
  Alert,
  CircularProgress,
  Grid,
} from "@mui/material";
import CheckIcon from "@mui/icons-material/Check"
import CloseIcon from "@mui/icons-material/Close"
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

import { useParams, useNavigate, useLocation } from "react-router-dom";
import { teamsAPI, teamTasksAPI } from "../services/api";
import TeamTaskItem from "../components/Teams/TeamTaskItem";
import TeamTaskForm from "../components/Teams/TeamTaskForm";
import { useAuth } from "../context/AuthContext";
import { initSocket, getSocket, disconnectSocket } from "../services/socket";

/* ---------------------------------------------------
   SAFE MEMBER RESOLVER (prevents all crashes)
--------------------------------------------------- */
const resolveUserId = (u) => {
  if (!u) return null;
  if (typeof u === "string") return u;
  if (typeof u._id === "string") return u._id;
  return null;
};

export default function TeamDetails() {
  const { teamId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const socketRef = useRef(null);

  const params = new URLSearchParams(location.search);
  const forcedTab = params.get("tab");

  const [tab, setTab] = useState(0);
  const [socketConnected, setSocketConnected] = useState(false); // FIX: Track socket connection state

  const [team, setTeam] = useState(null);
  const [loadingTeam, setLoadingTeam] = useState(true);

  const [teamTasks, setTeamTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(true);

  const [pendingExtensions, setPendingExtensions] = useState([]);
  const [loadingExtensions, setLoadingExtensions] = useState(false);

  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const [editTeamDialog, setEditTeamDialog] = useState(false);
  const [teamFormData, setTeamFormData] = useState({});

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  /* ---------------------------------------------------
     Helper functions - MOVED BEFORE socket useEffect
  --------------------------------------------------- */
  const getMyRole = useCallback(() => {
    if (!team || !user) return null;
    return team.members?.find((m) => resolveUserId(m.user) === resolveUserId(user?._id))?.role;
  }, [team, user]);

  const showSnack = useCallback((msg, sev = "success") => {
    setSnackbar({ open: true, message: msg, severity: sev });
  }, []);

  /* ---------------------------------------------------
     Initialize Socket
  --------------------------------------------------- */
  useEffect(() => {
    if (!user?._id) return;
    
    initSocket(user._id);
    socketRef.current = getSocket();
    
    return () => {
      disconnectSocket();
      socketRef.current = null;
      setSocketConnected(false);
    };
  }, [user]);

  /* ---------------------------------------------------
     Join team room and setup socket listeners
  --------------------------------------------------- */
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !teamId) return;

    // Join the team room
    socket.emit("joinTeam", teamId);

    // Track connection status - FIX: Added to trigger re-renders
    const handleConnect = () => setSocketConnected(true);
    const handleDisconnect = () => setSocketConnected(false);
    
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    
    // Set initial connection state
    setSocketConnected(socket.connected);

    // Set up socket event listeners
    const handleTaskCreated = (newTask) => {
      console.log("taskCreated event in TeamDetails:", newTask);
      
      // Check if task belongs to this team
      const taskTeamId = newTask.team?._id || newTask.team;
      if (taskTeamId !== teamId) return;
      
      setTeamTasks(prev => {
        const exists = prev.some(task => task._id === newTask._id);
        if (exists) return prev;
        return [...prev, newTask];
      });
      
      showSnack(`New task created: ${newTask.title}`, "info");
    };

    const handleTaskUpdated = (updatedTask) => {
      console.log("taskUpdated event in TeamDetails:", updatedTask);
      
      // Check if task belongs to this team
      const taskTeamId = updatedTask.team?._id || updatedTask.team;
      if (taskTeamId !== teamId) return;
      
      // FIX: Handle task reassignment - add if doesn't exist
      setTeamTasks(prev => {
        const exists = prev.some(t => t._id === updatedTask._id);
        if (!exists) return [...prev, updatedTask];
        return prev.map(task => task._id === updatedTask._id ? updatedTask : task);
      });
      
      // Update pending extensions list
      setPendingExtensions(prev => 
        prev.map(task => task._id === updatedTask._id ? updatedTask : task)
      );
      
      // If editing this task, update editingTask
      setEditingTask(prev => 
        prev?._id === updatedTask._id ? updatedTask : prev
      );
      
      showSnack(`Task updated: ${updatedTask.title}`, "info");
    };

    const handleTaskDeleted = (deletedTaskId) => {
      console.log("taskDeleted event in TeamDetails:", deletedTaskId);
      
      setTeamTasks(prev => prev.filter(task => task._id !== deletedTaskId));
      setPendingExtensions(prev => prev.filter(task => task._id !== deletedTaskId));
      
      // If editing this task, close form
      if (editingTask?._id === deletedTaskId) {
        setShowTaskForm(false);
        setEditingTask(null);
      }
      
      showSnack("Task deleted", "warning");
    };

    const handleExtensionRequested = (task) => {
      console.log("extensionRequested event in TeamDetails:", task);
      
      const taskTeamId = task.team?._id || task.team;
      if (taskTeamId !== teamId) return;
      
      // FIX: Use getMyRole() which is now properly defined
      const myRole = getMyRole();
      
      // Update the task in teamTasks
      setTeamTasks(prev => 
        prev.map(t => t._id === task._id ? task : t)
      );
      
      // If user is admin/manager, add to pending extensions
      if (["admin", "manager"].includes(myRole)) {
        setPendingExtensions(prev => {
          const exists = prev.some(t => t._id === task._id);
          if (exists) {
            return prev.map(t => t._id === task._id ? task : t);
          }
          return [...prev, task];
        });
      }
      
      showSnack(`Extension requested for task: ${task.title}`, "info");
    };

    const handleExtensionApproved = (task) => {
      console.log("extensionApproved event in TeamDetails:", task);
      
      const taskTeamId = task.team?._id || task.team;
      if (taskTeamId !== teamId) return;
      
      // Update the task
      setTeamTasks(prev => 
        prev.map(t => t._id === task._id ? task : t)
      );
      
      // Remove from pending extensions
      setPendingExtensions(prev => prev.filter(t => t._id !== task._id));
      
      showSnack(`Extension approved for task: ${task.title}`, "success");
    };

    const handleExtensionRejected = (task) => {
      console.log("extensionRejected event in TeamDetails:", task);
      
      const taskTeamId = task.team?._id || task.team;
      if (taskTeamId !== teamId) return;
      
      // Update the task
      setTeamTasks(prev => 
        prev.map(t => t._id === task._id ? task : t)
      );
      
      // Remove from pending extensions
      setPendingExtensions(prev => prev.filter(t => t._id !== task._id));
      
      showSnack(`Extension rejected for task: ${task.title}`, "warning");
    };

    const handleTeamUpdated = (updatedTeam) => {
      console.log("teamUpdated event in TeamDetails:", updatedTeam);
      
      if (updatedTeam._id !== teamId) return;
      
      setTeam(updatedTeam);
      setTeamFormData({
        name: updatedTeam.name,
        description: updatedTeam.description || "",
        icon: updatedTeam.icon || "",
        color: updatedTeam.color || "#1976d2",
      });
      
      showSnack("Team information updated", "info");
    };

    const handleMemberUpdated = (data) => {
      console.log("memberUpdated event in TeamDetails:", data);
      
      const { teamId: eventTeamId } = data;
      if (eventTeamId !== teamId) return;
      
      // Refresh team data to get updated members
      fetchTeam();
      showSnack("Team membership updated", "info");
    };

    // Register event listeners
    socket.on("taskCreated", handleTaskCreated);
    socket.on("taskUpdated", handleTaskUpdated);
    socket.on("taskDeleted", handleTaskDeleted);
    socket.on("extensionRequested", handleExtensionRequested);
    socket.on("extensionApproved", handleExtensionApproved);
    socket.on("extensionRejected", handleExtensionRejected);
    socket.on("teamUpdated", handleTeamUpdated);
    socket.on("memberUpdated", handleMemberUpdated);

    // Handle socket errors
    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      showSnack("Connection lost. Attempting to reconnect...", "error");
    });

    socket.on("reconnect", () => {
      console.log("Socket reconnected in TeamDetails");
      setSocketConnected(true);
      showSnack("Connection restored", "success");
      
      // Rejoin team room after reconnection
      socket.emit("joinTeam", teamId);
      
      // Refresh data to ensure consistency
      fetchTeamTasks();
      fetchPendingExtensions();
    });

    // Cleanup function
    return () => {
      if (socket) {
        socket.emit("leaveTeam", teamId);
        socket.off("connect", handleConnect);
        socket.off("disconnect", handleDisconnect);
        socket.off("taskCreated", handleTaskCreated);
        socket.off("taskUpdated", handleTaskUpdated);
        socket.off("taskDeleted", handleTaskDeleted);
        socket.off("extensionRequested", handleExtensionRequested);
        socket.off("extensionApproved", handleExtensionApproved);
        socket.off("extensionRejected", handleExtensionRejected);
        socket.off("teamUpdated", handleTeamUpdated);
        socket.off("memberUpdated", handleMemberUpdated);
        socket.off("connect_error");
        socket.off("reconnect");
      }
    };
  }, [teamId, getMyRole, showSnack]); // Added getMyRole and showSnack to dependencies

  /* ---------------------------------------------------
     APPLY ?tab=extensions
  --------------------------------------------------- */
  useEffect(() => {
    if (forcedTab === "extensions") setTab(3);
  }, [forcedTab]);

  /* ---------------------------------------------------
     DETECT MY ROLE SAFELY - Now using the useCallback function
  --------------------------------------------------- */
  const myRole = getMyRole();
  const canEditTasks = myRole === "admin" || myRole === "manager";
  const isAdmin = myRole === "admin";

  /* ---------------------------------------------------
     LOAD TEAM
  --------------------------------------------------- */
  const fetchTeam = async () => {
    setLoadingTeam(true);
    try {
      const res = await teamsAPI.getTeam(teamId);
      setTeam(res.data);

      setTeamFormData({
        name: res.data.name,
        description: res.data.description || "",
        icon: res.data.icon || "",
        color: res.data.color || "#1976d2",
      });
    } catch (err) {
      console.error("Team load error:", err);
      showSnack("Failed to load team", "error");
      setTeam(null);
    } finally {
      setLoadingTeam(false);
    }
  };

  /* ---------------------------------------------------
     LOAD TASKS
  --------------------------------------------------- */
  const fetchTeamTasks = async () => {
    setLoadingTasks(true);
    try {
      const res = await teamTasksAPI.getTeamTasks(teamId);
      let tasks = res.data || [];

      // Filter for members
      if (myRole === "member") {
        tasks = tasks.filter((t) => {
          const assigned = resolveUserId(t.assignedTo);
          const me = resolveUserId(user?._id);
          return !assigned || assigned === me;
        });
      }

      setTeamTasks(tasks);
    } catch (err) {
      console.error("Task load error:", err);
    } finally {
      setLoadingTasks(false);
    }
  };

  /* ---------------------------------------------------
     LOAD PENDING EXTENSIONS
  --------------------------------------------------- */
  const fetchPendingExtensions = async () => {
    if (!["admin", "manager"].includes(myRole)) {
      setPendingExtensions([]);
      return;
    }
    setLoadingExtensions(true);

    try {
      const res = await teamTasksAPI.getPendingExtensions(teamId);
      setPendingExtensions(res.data || []);
    } catch (err) {
      console.error("Pending extensions error:", err);
      showSnack("Failed to load extension requests", "error");
    } finally {
      setLoadingExtensions(false);
    }
  };

  /* ---------------------------------------------------
     APPROVE
  --------------------------------------------------- */
  const handleApproveExtension = async (taskId) => {
    if (!window.confirm("Approve this extension request?")) return;
    try {
      await teamTasksAPI.approveExtension(taskId);
      // Socket event will handle UI update
    } catch (err) {
      console.error("Approve error:", err);
      showSnack(err.response?.data?.message || "Server error", "error");
    }
  };

  /* ---------------------------------------------------
     REJECT
  --------------------------------------------------- */
  const handleRejectExtension = async (taskId) => {
    if (!window.confirm("Reject this extension request?")) return;
    try {
      await teamTasksAPI.rejectExtension(taskId);
      // Socket event will handle UI update
    } catch (err) {
      console.error("Reject error:", err);
      showSnack(err.response?.data?.message || "Server error", "error");
    }
  };

  /* ---------------------------------------------------
     INITIAL LOAD
  --------------------------------------------------- */
  useEffect(() => {
    fetchTeam();
  }, [teamId]);

  useEffect(() => {
    if (!team) return;
    fetchTeamTasks();
    fetchPendingExtensions();
  }, [team, myRole]);

  /* ---------------------------------------------------
     LEAVE TEAM
  --------------------------------------------------- */
  const handleLeaveTeam = async () => {
    if (!window.confirm("Leave team?")) return;

    try {
      await teamsAPI.leaveTeam(teamId);
      showSnack("Left team", "success");
      navigate("/teams");
    } catch (err) {
      console.error("Leave error:", err);
      showSnack(err.response?.data?.message || "Error leaving team", "error");
    }
  };

  /* ---------------------------------------------------
     UPDATE ROLE
  --------------------------------------------------- */
  const handleUpdateRole = async (userId, newRole) => {
    try {
      await teamsAPI.updateMemberRole(teamId, userId, newRole);
      // Socket event will handle UI update
    } catch (err) {
      console.error("Role update error:", err);
    }
  };

  /* ---------------------------------------------------
     REMOVE MEMBER
  --------------------------------------------------- */
  const handleRemoveMember = async (userId) => {
    if (!window.confirm("Remove member?")) return;

    try {
      await teamsAPI.removeMember(teamId, userId);
      // Socket event will handle UI update
    } catch (err) {
      console.error("Remove member error:", err);
    }
  };

  /* ---------------------------------------------------
     COPY INVITE
  --------------------------------------------------- */
  const handleCopyInviteLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/join/${team._id}`);
    showSnack("Copied!", "success");
  };

  /* ---------------------------------------------------
     UPDATE TEAM
  --------------------------------------------------- */
  const handleUpdateTeam = async () => {
    try {
      await teamsAPI.updateTeam(teamId, teamFormData);
      // Socket event will handle UI update
      setEditTeamDialog(false);
    } catch (err) {
      console.error("Update team error:", err);
      showSnack("Failed to update team", "error");
    }
  };

  // ---- Delete team ----
  const handleDeleteTeam = async () => {
    if (!window.confirm("Are you sure you want to delete this team? This action cannot be undone.")) return;

    try {
      await teamsAPI.deleteTeam(teamId);
      showSnack("Team deleted successfully", "success");
      navigate("/teams");
    } catch (err) {
      console.error("Delete team error:", err);
      showSnack(err.response?.data?.message || "Failed to delete team", "error");
    }
  };

  // Task handlers - no refetching needed
  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("Delete this task?")) return;
    try {
      await teamTasksAPI.deleteTask(taskId);
      // Socket event will handle UI update
    } catch (err) {
      console.error("Delete task error:", err);
      showSnack("Failed to delete task", "error");
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await teamTasksAPI.updateTask(taskId, { status: newStatus });
      // Socket event will handle UI update
    } catch (err) {
      console.error("Status change error:", err);
      showSnack("Failed to update task status", "error");
    }
  };

  const handleQuickComplete = async (taskId) => {
    try {
      await teamTasksAPI.updateTask(taskId, { status: "completed" });
      // Socket event will handle UI update
    } catch (err) {
      console.error("Quick complete error:", err);
      showSnack("Failed to complete task", "error");
    }
  };

  const handleTaskSubmit = async (data) => {
    try {
      if (editingTask) {
        await teamTasksAPI.updateTask(editingTask._id, data);
      } else {
        await teamTasksAPI.createTask(teamId, data);
      }
      
      // Socket events will handle UI updates
      setShowTaskForm(false);
      setEditingTask(null);
    } catch (err) {
      console.error("Task submit error:", err);
      showSnack("Failed to save task", "error");
    }
  };

  // Manual refresh functions
  const handleRefreshTasks = async () => {
    setLoadingTasks(true);
    try {
      await fetchTeamTasks();
      showSnack("Tasks refreshed", "success");
    } catch (err) {
      showSnack("Failed to refresh tasks", "error");
    }
  };

  const handleRefreshExtensions = async () => {
    setLoadingExtensions(true);
    try {
      await fetchPendingExtensions();
      showSnack("Extensions refreshed", "success");
    } catch (err) {
      showSnack("Failed to refresh extensions", "error");
    }
  };

  /* ---------------------------------------------------
     LOADING
  --------------------------------------------------- */
  if (loadingTeam)
    return (
      <Box sx={{ height: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <CircularProgress />
      </Box>
    );

  if (!team)
    return (
      <Box sx={{ p: 4 }}>
        <Typography color="error">Team not found.</Typography>
      </Box>
    );

  const inviteURL = `${window.location.origin}/join/${team._id}`;

  /* ---------------------------------------------------
     RENDER UI
  --------------------------------------------------- */
  return (
    <Box sx={{ px: 2, pt: { xs: 10, sm: 8 }, maxWidth: 1200, mx: "auto" }}>
      {/* SNACKBAR */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>

      {/* HEADER */}
      <Paper sx={{ p: 3, borderRadius: 3, mb: 3, boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={2}>
            <Avatar sx={{ width: 70, height: 70, bgcolor: team.color, fontSize: 28 }}>
              {team.icon || "T"}
            </Avatar>

            <Box>
              <Typography variant="h5" fontWeight={700}>{team.name}</Typography>
              <Typography color="text.secondary">{team.description || "No description"}</Typography>

              {myRole && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 1 }}>
                  <Chip
                    label={myRole.toUpperCase()}
                    color={isAdmin ? "primary" : "default"}
                    size="small"
                  />
                  {/* FIX: Using state variable instead of socketRef.current */}
                  <Chip
                    label={`Live ${socketConnected ? "🟢" : "🔴"}`}
                    size="small"
                    color={socketConnected ? "success" : "error"}
                    variant="outlined"
                  />
                </Box>
              )}
            </Box>
          </Stack>

          {isAdmin && (
            <IconButton onClick={() => setEditTeamDialog(true)}>
              <EditIcon />
            </IconButton>
          )}
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Tabs value={tab} onChange={(e, v) => setTab(v)}>
          <Tab label="Overview" />
          <Tab label="Members" />
          <Tab label="Tasks" />
          <Tab
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                Extensions
                {["admin", "manager"].includes(myRole) &&
                  pendingExtensions.length > 0 && (
                    <Chip
                      label={pendingExtensions.length}
                      color="error"
                      size="small"
                    />
                  )}
              </Box>
            }
          />
          <Tab label="Settings" />
        </Tabs>
      </Paper>

      {/* -------------------------- OVERVIEW ---------------------------- */}
      {tab === 0 && (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={700}>Overview</Typography>

          <Stack spacing={2} sx={{ mt: 2 }}>
            <Box>
              <Typography color="text.secondary">Total Members</Typography>
              <Typography variant="h5">{team.members?.length || 0}</Typography>
            </Box>

            <Box>
              <Typography color="text.secondary">Total Tasks</Typography>
              <Typography variant="h5">{teamTasks.length}</Typography>
            </Box>

            <Box>
              <Typography color="text.secondary">Completed Tasks</Typography>
              <Typography variant="h5">
                {teamTasks.filter((t) => t.status === "completed").length}
              </Typography>
            </Box>
          </Stack>

          <Button sx={{ mt: 3 }} variant="outlined" startIcon={<ContentCopyIcon />} onClick={handleCopyInviteLink}>
            Copy Invite Link
          </Button>
        </Paper>
      )}

      {/* -------------------------- MEMBERS ----------------------------- */}
      {tab === 1 && (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={700}>Team Members</Typography>

          <Stack spacing={2} sx={{ mt: 2 }}>
            {team.members?.map((m) => {
              const memberId = resolveUserId(m.user);
              const isCurrent = memberId === resolveUserId(user?._id);

              return (
                <Paper key={memberId} sx={{ p: 2, display: "flex", justifyContent: "space-between" }}>
                  <Box>
                    <Typography fontWeight={600}>{m.user?.name || "User"}</Typography>
                    <Typography variant="body2" color="text.secondary">{m.role}</Typography>
                  </Box>

                  <Stack direction="row" alignItems="center" spacing={1}>
                    {isAdmin && (
                      <FormControl size="small">
                        <Select value={m.role} onChange={(e) => handleUpdateRole(memberId, e.target.value)}>
                          <MenuItem value="member">Member</MenuItem>
                          <MenuItem value="manager">Manager</MenuItem>
                          <MenuItem value="admin">Admin</MenuItem>
                        </Select>
                      </FormControl>
                    )}

                    {isAdmin && !isCurrent && (
                      <IconButton color="error" onClick={() => handleRemoveMember(memberId)}>
                        <DeleteIcon />
                      </IconButton>
                    )}

                    {!isAdmin && isCurrent && (
                      <Button size="small" variant="outlined" color="error" onClick={handleLeaveTeam}>
                        Leave
                      </Button>
                    )}
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
        </Paper>
      )}

      {/* ---------------------------- TASKS ----------------------------- */}
      {tab === 2 && (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Typography variant="h6" fontWeight={700}>Team Tasks</Typography>
            
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button 
                variant="outlined" 
                size="small"
                onClick={handleRefreshTasks}
                disabled={loadingTasks}
              >
                Refresh
              </Button>
              
              {canEditTasks && (
                <Button variant="contained" onClick={() => {
                  setEditingTask(null);
                  setShowTaskForm(true);
                }}>
                  Create Task
                </Button>
              )}
            </Box>
          </Box>

          {loadingTasks ? (
            <Box sx={{ p: 4, textAlign: "center" }}>
              <CircularProgress />
            </Box>
          ) : teamTasks.length === 0 ? (
            <Typography sx={{ p: 3 }} color="text.secondary">No tasks available.</Typography>
          ) : (
            <Stack spacing={2} sx={{ mt: 2 }}>
              {teamTasks.map((t) => (
                <TeamTaskItem
                  key={t._id}
                  task={t}
                  canEdit={canEditTasks || resolveUserId(t.assignedTo) === resolveUserId(user?._id)}
                  isAdminOrManager={canEditTasks}
                  currentUserId={resolveUserId(user?._id)}
                  onEdit={() => {
                    setEditingTask(t);
                    setShowTaskForm(true);
                  }}
                  onDelete={() => handleDeleteTask(t._id)}
                  onStatusChange={(taskId, newStatus) => handleStatusChange(taskId, newStatus)}
                  onQuickComplete={() => handleQuickComplete(t._id)}
                />
              ))}
            </Stack>
          )}

          {showTaskForm && (
            <TeamTaskForm
              open={showTaskForm}
              task={editingTask}
              teamMembers={team.members}
              onCancel={() => {
                setShowTaskForm(false);
                setEditingTask(null);
              }}
              onSubmit={handleTaskSubmit}
            />
          )}
        </Paper>
      )}

      {/* ------------------------ EXTENSIONS -------------------------- */}
      {tab === 3 && (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Typography variant="h6" fontWeight={700}>Extension Requests</Typography>
            
            <Box sx={{ display: "flex", gap: 1 }}>
              {/* FIX: Using state variable instead of socketRef.current */}
              <Chip 
                label={`Live ${socketConnected ? "🟢" : "🔴"}`}
                size="small"
                color={socketConnected ? "success" : "error"}
                variant="outlined"
              />
              <Button 
                variant="outlined" 
                onClick={handleRefreshExtensions}
                disabled={loadingExtensions}
              >
                Refresh
              </Button>
            </Box>
          </Box>

          {!["admin", "manager"].includes(myRole) ? (
            <Typography sx={{ mt: 2 }} color="text.secondary">
              Only admins and managers can review extension requests.
            </Typography>
          ) : loadingExtensions ? (
            <Box sx={{ p: 4, textAlign: "center" }}>
              <CircularProgress />
            </Box>
          ) : pendingExtensions.length === 0 ? (
            <Typography sx={{ mt: 2 }} color="text.secondary">
              No pending extension requests.
            </Typography>
          ) : (
            <Stack spacing={2} sx={{ mt: 2 }}>
              {pendingExtensions.map((t) => (
                <Paper key={t._id} sx={{ p: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={8}>
                      <Typography variant="h6">{t.title}</Typography>
                      <Typography color="text.secondary">
                        Assigned to: {t.assignedTo?.name || "Unassigned"}
                      </Typography>

                      <Typography sx={{ mt: 1 }}>{t.description}</Typography>

                      <Typography variant="caption" sx={{ display: "block", mt: 1 }}>
                        Requested by: {t.extensionRequest?.requestedBy?.name || "Unknown"} •{" "}
                        {t.extensionRequest?.requestedAt
                          ? new Date(t.extensionRequest.requestedAt).toLocaleString()
                          : ""}
                      </Typography>

                      <Typography variant="caption" sx={{ display: "block", mt: 0.5 }}>
                        Reason: {t.extensionRequest?.reason}
                      </Typography>

                      {t.extensionRequest?.requestedDueDate && (
                        <Typography variant="caption" sx={{ display: "block", mt: 0.5 }}>
                          Requested Due Date:{" "}
                          {new Date(t.extensionRequest.requestedDueDate).toLocaleDateString()}
                        </Typography>
                      )}
                    </Grid>

                    <Grid
                      item
                      xs={12}
                      md={4}
                      sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}
                    >
                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        startIcon={<CheckIcon />}
                        sx={{ borderRadius: 1, textTransform: "none" }}
                        onClick={() => handleApproveExtension(t._id)}
                      >
                        Approve
                      </Button>

                      <Button
                        variant="contained"
                        color="error"
                        size="small"
                        startIcon={<CloseIcon />}
                        sx={{ borderRadius: 1, textTransform: "none" }}
                        onClick={() => handleRejectExtension(t._id)}
                      >
                        Reject
                      </Button>
                    </Grid>
                  </Grid>
                </Paper>
              ))}
            </Stack>
          )}
        </Paper>
      )}

      {/* ------------------------ SETTINGS ---------------------------- */}
      {tab === 4 && (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={700}>Team Settings</Typography>

          {!isAdmin ? (
            <Box sx={{ mt: 2 }}>
              <Typography color="text.secondary">Only admins can manage settings.</Typography>
              <Button sx={{ mt: 2 }} variant="outlined" color="error" onClick={handleLeaveTeam}>
                Leave Team
              </Button>
            </Box>
          ) : (
            <Stack spacing={4} sx={{ mt: 2 }}>
              {/* Invite Link */}
              <Box>
                <Typography fontWeight={600}>Invite Members</Typography>
                <Paper sx={{ p: 2, mt: 1, display: "flex", gap: 2 }}>
                  <Typography sx={{ flexGrow: 1, wordBreak: "break-all" }}>
                    {inviteURL}
                  </Typography>
                  <Button variant="contained" onClick={handleCopyInviteLink}>
                    Copy
                  </Button>
                </Paper>
              </Box>

              {/* Edit/Delete */}
              <Box>
                <Typography fontWeight={600}>Team Actions</Typography>

                <Stack spacing={2} sx={{ mt: 1 }}>
                  <Button variant="contained" onClick={() => setEditTeamDialog(true)}>
                    Edit Team Info
                  </Button>

                  <Button variant="outlined" color="error" onClick={handleDeleteTeam}>
                    Delete Team
                  </Button>
                </Stack>
              </Box>
            </Stack>
          )}
        </Paper>
      )}

      {/* ------------------------ EDIT TEAM DIALOG --------------------- */}
      <Dialog open={editTeamDialog} onClose={() => setEditTeamDialog(false)}>
        <DialogTitle>Edit Team</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <TextField
              label="Team Name"
              value={teamFormData.name}
              onChange={(e) => setTeamFormData({ ...teamFormData, name: e.target.value })}
              fullWidth
            />

            <TextField
              label="Description"
              value={teamFormData.description}
              onChange={(e) => setTeamFormData({ ...teamFormData, description: e.target.value })}
              fullWidth
              multiline
              rows={3}
            />

            <Box>
              <Typography>Team Color</Typography>
              <input
                type="color"
                value={teamFormData.color}
                onChange={(e) => setTeamFormData({ ...teamFormData, color: e.target.value })}
                style={{
                  width: "100%",
                  height: "40px",
                  borderRadius: "8px",
                  cursor: "pointer",
                }}
              />
            </Box>

            <TextField
              label="Icon (emoji)"
              value={teamFormData.icon}
              onChange={(e) => setTeamFormData({ ...teamFormData, icon: e.target.value })}
              fullWidth
            />
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setEditTeamDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleUpdateTeam}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}