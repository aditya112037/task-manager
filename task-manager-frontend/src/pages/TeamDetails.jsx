// TeamDetails.jsx - Fixed with Complete Socket-Only Conference System
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  Card,
  CardContent,
  CardActions,
} from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import VideocamIcon from "@mui/icons-material/Videocam";
import GroupsIcon from "@mui/icons-material/Groups";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { teamsAPI, teamTasksAPI } from "../services/api";
import TeamTaskItem from "../components/Teams/TeamTaskItem";
import TeamTaskForm from "../components/Teams/TeamTaskForm";
import { useAuth } from "../context/AuthContext";
import TeamAnalytics from "../components/Teams/Overview/Analytics";
import { joinTeamRoom, leaveTeamRoom, getSocket } from "../services/socket";
import { requestConferenceCreation } from "../services/conferenceSocket";

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
  const { teamId: routeTeamId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const params = new URLSearchParams(location.search);
  const forcedTab = params.get("tab");

  const [tab, setTab] = useState(0);

  // Team state
  const [team, setTeam] = useState(null);
  const [loadingTeam, setLoadingTeam] = useState(true);

  // Task state
  const [teamTasks, setTeamTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(true);

  // Extension state
  const [pendingExtensions, setPendingExtensions] = useState([]);
  const [loadingExtensions, setLoadingExtensions] = useState(false);

  // Task form state
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // Team edit state
  const [editTeamDialog, setEditTeamDialog] = useState(false);
  const [teamFormData, setTeamFormData] = useState({});

  // Conference state - SOCKET-ONLY
  const [conference, setConference] = useState(null);
  const [loadingConference, setLoadingConference] = useState(false);
  const [socketConnected, setSocketConnected] = useState(true);

  // 🟢 FIX 1: Refresh lock for conference refresh
  const refreshLockRef = useRef(false);

  // 🟢 FIX 2: Reset flag on reconnect/disconnect
  const hasRequestedInitialStateRef = useRef(false);
  
  // 🟢 FIX 3: Store conference state in ref to avoid dependency issues
  const conferenceRef = useRef(null);
  
  // 🟢 FIX 4: Team ID ref to prevent stale closures
  const teamIdRef = useRef(routeTeamId);

  // Update teamId ref when routeTeamId changes
  useEffect(() => {
    teamIdRef.current = routeTeamId;
  }, [routeTeamId]);

  // Snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // 🚨 CRITICAL FIX: Memoized role that updates immediately when team changes
  const myRole = useMemo(() => {
    if (!team || !user) return null;
    const member = team.members?.find(
      (m) => resolveUserId(m.user) === resolveUserId(user?._id)
    );
    return member?.role || null;
  }, [team, user]);

  const canEditTasks = myRole === "admin" || myRole === "manager";
  const isAdmin = myRole === "admin";

  /* ---------------------------------------------------
     Helper functions
  --------------------------------------------------- */
  const showSnack = useCallback((msg, sev = "success") => {
    setSnackbar({ open: true, message: msg, severity: sev });
  }, []);

  /* ---------------------------------------------------
     APPLY ?tab=extensions
  --------------------------------------------------- */
  useEffect(() => {
    if (forcedTab === "extensions") setTab(3);
  }, [forcedTab]);

  /* ---------------------------------------------------
     LOAD TEAM
  --------------------------------------------------- */
  const fetchTeam = useCallback(async () => {
    setLoadingTeam(true);
    try {
      const res = await teamsAPI.getTeam(routeTeamId);
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
  }, [routeTeamId, showSnack]);

  /* ---------------------------------------------------
     LOAD TASKS
     🚨 CRITICAL FIX: Use current role, not stale closure
  --------------------------------------------------- */
  const fetchTeamTasks = useCallback(async () => {
    setLoadingTasks(true);
    try {
      const res = await teamTasksAPI.getTeamTasks(routeTeamId);
      let tasks = res.data || [];

      // 🚨 CRITICAL: Use current myRole value, not from closure
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
  }, [routeTeamId, myRole, user]);

  /* ---------------------------------------------------
     LOAD PENDING EXTENSIONS
  --------------------------------------------------- */
  const fetchPendingExtensions = useCallback(async () => {
    // 🚨 CRITICAL: Use current role check
    if (!["admin", "manager"].includes(myRole)) {
      setPendingExtensions([]);
      return;
    }
    
    setLoadingExtensions(true);
    try {
      const res = await teamTasksAPI.getPendingExtensions(routeTeamId);
      setPendingExtensions(res.data || []);
    } catch (err) {
      console.error("Pending extensions error:", err);
      showSnack("Failed to load extension requests", "error");
    } finally {
      setLoadingExtensions(false);
    }
  }, [routeTeamId, myRole, showSnack]);

  /* ---------------------------------------------------
     🚨 CRITICAL FIX: COMPLETE invalidation listeners
     Listen to ALL events: tasks, teams, extensions, comments
  --------------------------------------------------- */
  useEffect(() => {
    const onTasksInvalidate = ({ detail }) => {
      if (detail?.teamId && String(detail.teamId) !== String(routeTeamId)) return;
      console.log("🔄 TeamDetails: invalidate:tasks received");
      fetchTeamTasks();
    };

    const onTeamsInvalidate = ({ detail }) => {
      if (detail?.teamId && String(detail.teamId) !== String(routeTeamId)) return;
      console.log("🔄 TeamDetails: invalidate:teams received");
      fetchTeam();
    };

    const onExtensionsInvalidate = ({ detail }) => {
      if (detail?.teamId && String(detail.teamId) !== String(routeTeamId)) return;
      console.log("🔄 TeamDetails: invalidate:extensions received");
      fetchPendingExtensions();
    };

    // ✅ ADDED: Comments invalidation for this team's tasks
    const onCommentsInvalidate = ({ detail }) => {
      if (!detail?.taskId) return;
      // Check if this task belongs to current team
      const affectedTask = teamTasks.find(t => t._id === detail.taskId);
      if (affectedTask) {
        console.log("🔄 TeamDetails: invalidate:comments for task", detail.taskId);
        fetchTeamTasks();
      }
    };

    window.addEventListener("invalidate:tasks", onTasksInvalidate);
    window.addEventListener("invalidate:teams", onTeamsInvalidate);
    window.addEventListener("invalidate:extensions", onExtensionsInvalidate);
    window.addEventListener("invalidate:comments", onCommentsInvalidate);

    return () => {
      window.removeEventListener("invalidate:tasks", onTasksInvalidate);
      window.removeEventListener("invalidate:teams", onTeamsInvalidate);
      window.removeEventListener("invalidate:extensions", onExtensionsInvalidate);
      window.removeEventListener("invalidate:comments", onCommentsInvalidate);
    };
  }, [
    routeTeamId, 
    fetchTeamTasks, 
    fetchPendingExtensions, 
    fetchTeam,
    teamTasks
  ]);

  /* ---------------------------------------------------
     SOCKET CONFERENCE LISTENERS (PURE SOCKET-ONLY APPROACH)
     🚨 CRITICAL FIX: Remove conference from dependencies
  --------------------------------------------------- */
  useEffect(() => {
    const socket = getSocket();
    if (!socket) {
      console.error("Socket not available");
      setSocketConnected(false);
      setLoadingConference(false);
      return;
    }

    setSocketConnected(true);
    
    console.log("Setting up conference listeners for team:", routeTeamId);

    // 🔐 FIXED: Handle conference state from server
    const handleConferenceState = ({ active, conference: conf }) => {
      console.log("🎥 Conference state received:", { active, conf });
      
      // ✅ FIXED: ALWAYS clear loading state
      setLoadingConference(false);
      
      if (active && conf) {
        const newConference = {
          conferenceId: conf.conferenceId,
          teamId: conf.teamId,
          createdBy: conf.createdBy,
          speakerMode: conf.speakerMode,
          startedAt: conf.startedAt,
          // ✅ FIXED: Participants should ONLY come from conference:participants event
          participants: [],
          participantCount: 0,
        };
        
        // 🚨 CRITICAL FIX: Compare before updating
        const currentConf = conferenceRef.current;
        const isSameConference = currentConf && 
          currentConf.conferenceId === newConference.conferenceId;
        
        if (!isSameConference) {
          console.log("🔄 Updating conference state (changed)");
          setConference(newConference);
          conferenceRef.current = newConference;
        } else {
          console.log("⏸️ Conference state unchanged, skipping update");
        }
      } else {
        // ✅ FIXED: ALWAYS update React state, even if ref is already null
        console.log("📭 No active conference - updating state");
        setConference(null);
        conferenceRef.current = null;
      }
    };

    // ✅ FIX 2: Handle conference started - REQUEST STATE INSTEAD OF CREATING PARTIAL STATE
    const handleConferenceStarted = ({ teamId: startedTeamId }) => {
      console.log("🎥 Conference started event for team:", startedTeamId);
      if (String(startedTeamId) !== String(routeTeamId)) return;
      
      showSnack("Conference started successfully!", "success");
      // ✅ SINGLE SOURCE OF TRUTH: Request authoritative state from server
      socket.emit("conference:check", { teamId: teamIdRef.current });
    };

    // Listen for conference ended in this team
    const handleConferenceEnded = ({ conferenceId, teamId: endedTeamId }) => {
      console.log("🎥 Conference ended event:", { conferenceId, endedTeamId });
      if (String(endedTeamId) !== String(routeTeamId)) return;
      
      setConference(null);
      conferenceRef.current = null;
      showSnack("Conference ended", "info");
    };

    // Listen for conference creation error
    const handleConferenceError = ({ message }) => {
      console.error("🎥 Conference error:", message);
      showSnack(`Conference error: ${message}`, "error");
      setLoadingConference(false);
    };

    // 🟢 FIX: Handle conference invites
    const handleConferenceInvited = ({ conferenceId }) => {
      console.log("🎥 Conference invited:", conferenceId);
      showSnack(`You are invited to a conference`, "info");
    };

    // 🟢 FIX: Handle participants update with structural equality check
    const handleConferenceParticipants = ({ participants }) => {
      console.log("🎥 Conference participants received:", participants);
      
      setConference(prev => {
        if (!prev) return prev;
        
        // ✅ FIX: Cheap shallow check to prevent unnecessary re-renders
        const sameParticipants = 
          prev.participants?.length === participants?.length &&
          prev.participants?.every((p, i) => 
            p.socketId === participants[i]?.socketId &&
            p.userId === participants[i]?.userId &&
            p.userName === participants[i]?.userName
          );
        
        if (sameParticipants) {
          console.log("⏸️ Participants unchanged, skipping update");
          return prev;
        }
        
        console.log("🔄 Participants updated, triggering re-render");
        const updated = {
          ...prev,
          participants: participants || [],
          participantCount: participants?.length || 0
        };
        
        conferenceRef.current = updated;
        return updated;
      });
    };

    // 🔐 Request conference state via socket only
    const requestConferenceState = () => {
      const id = teamIdRef.current;
      if (!id) {
        console.warn("No teamId available for conference check");
        return;
      }
      console.log("Requesting conference state via socket for team:", id);
      socket.emit("conference:check", { teamId: id });
    };

    // 🟢 FIXED: Handle socket reconnection - RESET THE FLAG
    const handleReconnect = () => {
      console.log("🔄 Socket reconnected, resetting conference state flag");
      hasRequestedInitialStateRef.current = false;
      setSocketConnected(true);
      
      // Request conference state again
      if (teamIdRef.current) {
        socket.emit("conference:check", { teamId: teamIdRef.current });
      }
    };

    // 🟢 FIX: Handle socket disconnect properly (use socket.io events)
    const handleDisconnect = () => {
      console.log("Socket connection lost");
      hasRequestedInitialStateRef.current = false;
      setSocketConnected(false);
    };

    // Set up socket listeners
    socket.on("conference:state", handleConferenceState);
    socket.on("conference:started", handleConferenceStarted);
    socket.on("conference:ended", handleConferenceEnded);
    socket.on("conference:error", handleConferenceError);
    socket.on("conference:invited", handleConferenceInvited);
    socket.on("conference:participants", handleConferenceParticipants);
    
    // Request conference state ONCE - with fixed flag logic
    if (!hasRequestedInitialStateRef.current) {
      hasRequestedInitialStateRef.current = true;
      setLoadingConference(true);
      requestConferenceState();
    }
    
    // ✅ FIX: Use socket.io events for connection management (best practice)
    socket.io.on("reconnect", handleReconnect);
socket.on("disconnect", handleDisconnect);
socket.on("connect", handleReconnect);


    return () => {
      console.log("Cleaning up conference listeners and resetting refresh lock");
      
      // ✅ FIX 5: Reset refresh lock on unmount
      refreshLockRef.current = false;
      
      // Clean up socket listeners
      socket.off("conference:state", handleConferenceState);
      socket.off("conference:started", handleConferenceStarted);
      socket.off("conference:ended", handleConferenceEnded);
      socket.off("conference:error", handleConferenceError);
      socket.off("conference:invited", handleConferenceInvited);
      socket.off("conference:participants", handleConferenceParticipants);
      
      // Clean up socket.io connection listeners
      socket.io.off("reconnect", handleReconnect);
      socket.io.off("reconnect_error", handleDisconnect);
      socket.io.off("reconnect_failed", handleDisconnect);
    };
  }, [routeTeamId, navigate, showSnack]);

  /* ---------------------------------------------------
     🚨 CRITICAL FIX: Refetch when role changes
     When role updates, tasks and extensions visibility may change
  --------------------------------------------------- */
  useEffect(() => {
    if (!team || !myRole) return;
    
    fetchTeamTasks();
    fetchPendingExtensions();
  }, [myRole, team, fetchTeamTasks, fetchPendingExtensions]);

  /* ---------------------------------------------------
     INITIAL LOAD
  --------------------------------------------------- */
  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  useEffect(() => {
    if (!routeTeamId) return;
    joinTeamRoom(routeTeamId);
    return () => {
      leaveTeamRoom(routeTeamId);
    };
  }, [routeTeamId]);

  /* ---------------------------------------------------
     CONFERENCE HANDLERS (PURE SOCKET-ONLY)
     🚨 CRITICAL FIX: No REST calls
  --------------------------------------------------- */
  const handleStartConference = () => {
    if (!socketConnected) {
      showSnack("Connection error. Please refresh the page.", "error");
      return;
    }

    if (!["admin", "manager"].includes(myRole)) {
      showSnack("Only admins and managers can start conferences", "error");
      return;
    }

    if (conferenceRef.current) {
      showSnack("Conference already active. Join instead.", "warning");
      return;
    }

    setLoadingConference(true);
    console.log("Starting conference for team:", routeTeamId);
    
    try {
      requestConferenceCreation(routeTeamId);
      
      // The loading will be cleared by conference:error or conference:state events
      // Navigation happens explicitly when user clicks Join Conference
      
    } catch (error) {
      console.error("Error starting conference:", error);
      setLoadingConference(false);
      showSnack("Failed to start conference", "error");
    }
  };

  const handleJoinConference = () => {
    if (!conference) {
      showSnack("No active conference to join", "error");
      return;
    }
    
    if (!socketConnected) {
      showSnack("Connection error. Please refresh the page.", "error");
      return;
    }
    
    console.log("Joining conference:", conference.conferenceId);
    navigate(`/conference/${conference.conferenceId}`);
  };

  /* ---------------------------------------------------
     CONFERENCE STATUS REFRESH (SOCKET-ONLY) WITH LOCK
  --------------------------------------------------- */
  const handleRefreshConference = useCallback(() => {
    if (refreshLockRef.current) {
      showSnack("Please wait before refreshing again", "warning");
      return;
    }
    
    const socket = getSocket();
    if (!socket || !socket.connected) {
      showSnack("Socket not available", "error");
      return;
    }
    
    refreshLockRef.current = true;
    setLoadingConference(true);
    
    console.log("Refreshing conference status");
    socket.emit("conference:check", { teamId: teamIdRef.current });
    
    // ✅ FIX 3: Simple timeout without misleading return
    setTimeout(() => {
      refreshLockRef.current = false;
    }, 1000);
  }, [showSnack]);

  /* ---------------------------------------------------
     APPROVE - FIXED with optimistic update
  --------------------------------------------------- */
  const handleApproveExtension = async (taskId) => {
    if (!window.confirm("Approve this extension request?")) return;
    
    // Optimistic update
    setPendingExtensions(prev => prev.filter(t => t._id !== taskId));
    
    try {
      await teamTasksAPI.approveExtension(taskId);
      // Socket event will update the task itself
    } catch (err) {
      console.error("Approve error:", err);
      showSnack(err.response?.data?.message || "Server error", "error");
      // Re-fetch on error
      fetchPendingExtensions();
    }
  };

  /* ---------------------------------------------------
     REJECT - FIXED with optimistic update
  --------------------------------------------------- */
  const handleRejectExtension = async (taskId) => {
    if (!window.confirm("Reject this extension request?")) return;
    
    // Optimistic update
    setPendingExtensions(prev => prev.filter(t => t._id !== taskId));
    
    try {
      await teamTasksAPI.rejectExtension(taskId);
      // Socket event will update the task itself
    } catch (err) {
      console.error("Reject error:", err);
      showSnack(err.response?.data?.message || "Server error", "error");
      // Re-fetch on error
      fetchPendingExtensions();
    }
  };

  /* ---------------------------------------------------
     LEAVE TEAM
  --------------------------------------------------- */
  const handleLeaveTeam = async () => {
    if (!window.confirm("Leave team?")) return;

    try {
      await teamsAPI.leaveTeam(routeTeamId);
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
      await teamsAPI.updateMemberRole(routeTeamId, userId, newRole);

      // ✅ FIX: update local state immediately
      setTeam(prev => ({
        ...prev,
        members: prev.members.map(m =>
          resolveUserId(m.user) === userId
            ? { ...m, role: newRole }
            : m
        )
      }));

      showSnack("Role updated", "success");
    } catch (err) {
      showSnack("Failed to update role", "error");
    }
  };

  /* ---------------------------------------------------
     REMOVE MEMBER
  --------------------------------------------------- */
  const handleRemoveMember = async (userId) => {
    if (!window.confirm("Remove member?")) return;

    try {
      await teamsAPI.removeMember(routeTeamId, userId);
      // Socket event will trigger invalidate:teams
      showSnack("Member removed", "success");
    } catch (err) {
      console.error("Remove member error:", err);
      showSnack("Failed to remove member", "error");
    }
  };

  /* ---------------------------------------------------
     COPY INVITE
  --------------------------------------------------- */
  const handleCopyInviteLink = () => {
    if (!team) return;
    navigator.clipboard.writeText(`${window.location.origin}/join/${team._id}`);
    showSnack("Invite link copied!", "success");
  };

  /* ---------------------------------------------------
     UPDATE TEAM
  --------------------------------------------------- */
  const handleUpdateTeam = async () => {
    try {
      await teamsAPI.updateTeam(routeTeamId, teamFormData);
      // Socket event will trigger invalidate:teams
      setEditTeamDialog(false);
      showSnack("Team updated", "success");
    } catch (err) {
      console.error("Update team error:", err);
      showSnack("Failed to update team", "error");
    }
  };

  /* ---------------------------------------------------
     DELETE TEAM
  --------------------------------------------------- */
  const handleDeleteTeam = async () => {
    if (!window.confirm("Are you sure you want to delete this team? This action cannot be undone.")) return;

    try {
      await teamsAPI.deleteTeam(routeTeamId);
      showSnack("Team deleted successfully", "success");
      navigate("/teams");
    } catch (err) {
      console.error("Delete team error:", err);
      showSnack(err.response?.data?.message || "Failed to delete team", "error");
    }
  };

  /* ---------------------------------------------------
     TASK HANDLERS - FIXED with optimistic updates
  --------------------------------------------------- */
  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("Delete this task?")) return;
    
    // Optimistic update
    setTeamTasks(prev => prev.filter(t => t._id !== taskId));
    setPendingExtensions(prev => prev.filter(t => t._id !== taskId));
    
    try {
      await teamTasksAPI.deleteTask(taskId);
      showSnack("Task deleted", "success");
    } catch (err) {
      console.error("Delete task error:", err);
      showSnack("Failed to delete task", "error");
      // Rollback on error
      fetchTeamTasks();
      fetchPendingExtensions();
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    // Optimistic update
    setTeamTasks(prev =>
      prev.map(t => t._id === taskId ? { ...t, status: newStatus } : t)
    );
    
    try {
      await teamTasksAPI.updateTask(taskId, { status: newStatus });
      showSnack("Task status updated", "success");
    } catch (err) {
      console.error("Status change error:", err);
      showSnack("Failed to update task status", "error");
      // Rollback on error
      fetchTeamTasks();
    }
  };

  const handleQuickComplete = async (taskId) => {
    // Optimistic update
    setTeamTasks(prev =>
      prev.map(t => t._id === taskId ? { ...t, status: "completed" } : t)
    );
    
    try {
      await teamTasksAPI.updateTask(taskId, { status: "completed" });
      showSnack("Task completed", "success");
    } catch (err) {
      console.error("Quick complete error:", err);
      showSnack("Failed to complete task", "error");
      // Rollback on error
      fetchTeamTasks();
    }
  };

  const handleTaskSubmit = async (data) => {
    try {
      if (editingTask) {
        // Optimistic update for edit
        const updatedTask = { ...editingTask, ...data };
        setTeamTasks(prev =>
          prev.map(t => t._id === editingTask._id ? updatedTask : t)
        );
        
        await teamTasksAPI.updateTask(editingTask._id, data);
        showSnack("Task updated", "success");
      } else {
        // Optimistic update for create
        const tempTask = {
          ...data,
          _id: `temp-${Date.now()}`,
          team: { _id: routeTeamId, name: team.name },
          status: "todo",
          extensionRequest: null
        };
        setTeamTasks(prev => [...prev, tempTask]);
        
        const res = await teamTasksAPI.createTask(routeTeamId, data);
        // Replace temp task with real one
        setTeamTasks(prev =>
          prev.map(t => t._id === tempTask._id ? res.data : t)
        );
        showSnack("Task created", "success");
      }
      
      setShowTaskForm(false);
      setEditingTask(null);
    } catch (err) {
      console.error("Task submit error:", err);
      showSnack("Failed to save task", "error");
      // Rollback on error
      fetchTeamTasks();
    }
  };

  /* ---------------------------------------------------
     MANUAL REFRESH FUNCTIONS
  --------------------------------------------------- */
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
     RENDER CONFERENCE CARD COMPONENT
  --------------------------------------------------- */
const renderConferenceCard = () => (
  <Card
    sx={{
      maxWidth: 400,
      mb: 4,
      borderRadius: 2,
      border: conference ? "2px solid #00e676" : "1px solid #e0e0e0",
      boxShadow: conference
        ? "0 4px 20px rgba(0, 230, 118, 0.15)"
        : "0 2px 8px rgba(0,0,0,0.1)",
    }}
  >
    <CardContent>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <VideocamIcon color={conference ? "success" : "primary"} />
        <Typography variant="h6" fontWeight={700}>
          {conference ? "Active Conference" : "Team Conference"}
        </Typography>
        {conference && (
          <Chip
            label="Live"
            color="error"
            size="small"
            sx={{ ml: "auto", fontWeight: "bold" }}
          />
        )}
      </Box>

      {loadingConference ? (
        <Box sx={{ display: "flex", gap: 2, py: 2 }}>
          <CircularProgress size={24} />
          <Typography variant="body2" color="text.secondary">
            Checking conference status…
          </Typography>
        </Box>
      ) : conference ? (
        <>
          {/* ✅ HOST */}
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Host: <strong>{conference.createdBy?.name || "Unknown"}</strong>
          </Typography>

          {/* ✅ PARTICIPANT COUNT */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 1 }}>
            <GroupsIcon fontSize="small" />
            <Typography variant="body2">
              <strong>{conference.participantCount ?? 0}</strong> participants
            </Typography>
          </Box>

          {/* ✅ START TIME */}
          {conference.startedAt && (
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              mt={1}
            >
              Started:{" "}
              {new Date(conference.startedAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Typography>
          )}
        </>
      ) : (
        <Typography variant="body2" color="text.secondary">
          No active conference right now.
        </Typography>
      )}
    </CardContent>

    {/* ✅ BUTTON TEXT LOGIC */}
    <CardActions sx={{ justifyContent: "center", p: 2, pt: 0 }}>
      <Button
        variant="contained"
        color={conference ? "success" : "primary"}
        startIcon={<VideocamIcon />}
        fullWidth
        size="large"
        disabled={!socketConnected || loadingConference}
        onClick={conference ? handleJoinConference : handleStartConference}
      >
        {conference
          ? ["admin", "manager"].includes(myRole)
            ? "Enter Conference"
            : "Join Conference"
          : "Start Conference"}
      </Button>
    </CardActions>

    <Box sx={{ textAlign: "center", pb: 2 }}>
      <Button
        size="small"
        startIcon={<RefreshIcon />}
        onClick={handleRefreshConference}
        disabled={loadingConference || refreshLockRef.current}
      >
        {refreshLockRef.current ? "Refreshing…" : "Refresh Status"}
      </Button>
    </Box>
  </Card>
);


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
                  <Typography variant="caption" color="text.secondary">
                    {team.members?.length || 0} members • {teamTasks.length} tasks
                  </Typography>
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

      {/* OVERVIEW */}
      {tab === 0 && (
        <>
          {/* CONFERENCE SECTION - SOCKET-ONLY */}
          <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography variant="h6" fontWeight={700}>
                Team Conference
              </Typography>
              <Chip 
                label={socketConnected ? "Connected" : "Disconnected"} 
                color={socketConnected ? "success" : "error"} 
                size="small" 
              />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Real-time audio/video collaboration for this team
            </Typography>
            
            {renderConferenceCard()}

            {!socketConnected && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                Socket connection lost. Please refresh the page to restore conference functionality.
              </Alert>
            )}
          </Paper>

          {/* ANALYTICS SECTION */}
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <TeamAnalytics team={team} tasks={teamTasks} myRole={myRole} />

            <Button 
              sx={{ mt: 3 }} 
              variant="outlined" 
              startIcon={<ContentCopyIcon />} 
              onClick={handleCopyInviteLink}
            >
              Copy Invite Link
            </Button>
          </Paper>
        </>
      )}

      {/* MEMBERS */}
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

      {/* TASKS */}
      {tab === 2 && (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Typography variant="h6" fontWeight={700}>Team Tasks</Typography>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button 
                variant="outlined" 
                size="small"
                startIcon={<RefreshIcon />}
                onClick={handleRefreshTasks}
                disabled={loadingTasks}
              >
                Refresh
              </Button>
              {canEditTasks && (
                <Button 
                  variant="contained" 
                  onClick={() => {
                    setEditingTask(null);
                    setShowTaskForm(true);
                  }}
                >
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
                  teamId={routeTeamId}
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

      {/* EXTENSIONS */}
      {tab === 3 && (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Box sx={{ display: "flex", justifyContent:"space-between", alignItems: "center", mb: 2 }}>
            <Typography variant="h6" fontWeight={700}>Extension Requests</Typography>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button 
                variant="outlined" 
                startIcon={<RefreshIcon />}
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
                    <Grid item xs={12} md={4} sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
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

      {/* SETTINGS */}
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

      {/* EDIT TEAM DIALOG */}
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