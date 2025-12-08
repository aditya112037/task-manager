// src/pages/TeamDetails.jsx
import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Button,
  Grid,
  Avatar,
  Stack,
  Chip,
  CircularProgress,
  TextField,
  Snackbar,
  Alert,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import GroupIcon from "@mui/icons-material/Group";
import AssignmentIcon from "@mui/icons-material/Assignment";
import EventBusyIcon from "@mui/icons-material/EventBusy";
import SettingsIcon from "@mui/icons-material/Settings";
import AddIcon from "@mui/icons-material/Add";
import { useParams, useSearchParams } from "react-router-dom";
import { teamsAPI, teamTasksAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import TeamTaskItem from "../components/Teams/TeamTaskItem";

/**
 * TeamDetails (Style A - clean white cards)
 *
 * - Tabs: Overview | Members | Tasks | Extensions | Settings
 * - Members: simple list
 * - Tasks: members only see tasks assigned to them; admin/manager see all
 * - Extensions: pending extension requests; admin/manager can approve/reject
 *
 */

const TeamDetails = () => {
  const { teamId } = useParams();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  // Tabs: 0=Overview,1=Members,2=Tasks,3=Extensions,4=Settings
  const initialTabFromQuery = (() => {
    const t = searchParams.get("tab");
    if (!t) return 0;
    const map = {
      overview: 0,
      members: 1,
      tasks: 2,
      extensions: 3,
      settings: 4,
    };
   return map[t.toLowerCase()] ?? (isNaN(Number(t)) ? 0 : Number(t));
  })();

  const [tab, setTab] = useState(initialTabFromQuery);

  const [team, setTeam] = useState(null);
  const [teamLoading, setTeamLoading] = useState(true);
  const [teamError, setTeamError] = useState(null);

  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState(null);

  const [pendingExtensions, setPendingExtensions] = useState([]);
  const [loadingExtensions, setLoadingExtensions] = useState(false);

  const [creatingTask, setCreatingTask] = useState(false);
  const [createPayload, setCreatePayload] = useState({
    title: "",
    description: "",
    priority: "medium",
    status: "todo",
    assignedTo: "", // user id string
    dueDate: "",
  });

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // Derived: my role in this team
  const myRole = (() => {
    if (!team) return "member";
    const m = team.members?.find(
      (x) => String(x.user?._id || x.user) === String(user?._id)
    );
    return m?.role || "member";
  })();

  // Show snackbar
  const showSnackbar = (message, severity = "success") =>
    setSnackbar({ open: true, message, severity });

  // Load team details
  const fetchTeam = useCallback(async () => {
    setTeamLoading(true);
    setTeamError(null);
    try {
      const res = await teamsAPI.getTeam(teamId);
      // Expect a team object that includes members (with user populated or user id)
      setTeam(res.data);
    } catch (err) {
      console.error("Error loading team:", err);
      setTeamError("Failed to load team");
      showSnackbar("Failed to load team", "error");
    } finally {
      setTeamLoading(false);
    }
  }, [teamId]);

  // Load tasks for this team
  const fetchTasks = useCallback(async () => {
    setTasksLoading(true);
    setTasksError(null);
    try {
      // Use teamTasksAPI.getTasks which returns tasks for this team
      const res = await teamTasksAPI.getTasks(teamId);
      let list = res.data || [];

      // IMPORTANT: restrict visibility for plain 'member' role:
      // - Admin/Manager: see all tasks
      // - Member: only tasks assigned to them (prevents seeing unassigned tasks)
      const isAdminOrManager = ["admin", "manager"].includes(myRole);
      if (!isAdminOrManager) {
        list = list.filter(
          (t) =>
            (t.assignedTo && String(t.assignedTo._id || t.assignedTo) === String(user._id)) ||
            String(t.createdBy?._id || t.createdBy) === String(user._id) // allow creator to see their own tasks
        );
      }

      // Ensure populated names exist (defensive)
      list = list.map((t) => ({
        ...t,
        createdBy: t.createdBy || { name: t.createdBy?.name || "Unknown" },
        assignedTo: t.assignedTo || null,
      }));

      setTasks(list);
    } catch (err) {
      console.error("Error loading tasks:", err);
      setTasksError("Failed to load tasks");
      showSnackbar("Failed to load tasks", "error");
    } finally {
      setTasksLoading(false);
    }
  }, [teamId, myRole, user]);

  // Load pending extensions (for this team) — only if admin/manager
  const fetchPendingExtensions = useCallback(async () => {
    if (!teamId) return;
    setLoadingExtensions(true);
    try {
      // teamTasksAPI.getPendingExtensions expects teamId
      const res = await teamTasksAPI.getPendingExtensions(teamId);
      // response should be array of tasks (with extensionRequest populated)
      setPendingExtensions(res.data || []);
    } catch (err) {
      console.error("Error loading pending extensions:", err);
      showSnackbar("Failed to load extension requests", "error");
    } finally {
      setLoadingExtensions(false);
    }
  }, [teamId]);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  // Fetch tasks after team loaded & whenever tab toggles to tasks
  useEffect(() => {
    // Always fetch tasks (keeps UI fresh) but guard until team is loaded
    if (!teamLoading) fetchTasks();
  }, [teamLoading, fetchTasks, tab]);

  // Fetch pending extensions when user opens Extensions tab or on load if admin/manager
  useEffect(() => {
    if (tab === 3 || ["admin", "manager"].includes(myRole)) {
      fetchPendingExtensions();
    }
  }, [tab, myRole, fetchPendingExtensions]);

  // Approve extension
  const handleApproveExtension = async (taskId) => {
    try {
      await teamTasksAPI.approveExtension(taskId);
      showSnackbar("Extension approved", "success");
      // reload data
      fetchTasks();
      fetchPendingExtensions();
    } catch (err) {
      console.error("Approve error:", err);
      showSnackbar(err.response?.data?.message || "Failed to approve", "error");
    }
  };

  // Reject extension
  const handleRejectExtension = async (taskId) => {
    try {
      await teamTasksAPI.rejectExtension(taskId);
      showSnackbar("Extension rejected", "success");
      // reload
      fetchTasks();
      fetchPendingExtensions();
    } catch (err) {
      console.error("Reject error:", err);
      showSnackbar(err.response?.data?.message || "Failed to reject", "error");
    }
  };

  // Create a task (admin/manager only)
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!teamId) return;
    setCreatingTask(true);
    try {
      const payload = {
        title: createPayload.title,
        description: createPayload.description,
        priority: createPayload.priority,
        status: createPayload.status,
        assignedTo: createPayload.assignedTo || null,
        dueDate: createPayload.dueDate || null,
        color: "#4CAF50",
        icon: "📋",
      };
      await teamTasksAPI.createTask(teamId, payload);
      showSnackbar("Task created", "success");
      setCreatePayload({
        title: "",
        description: "",
        priority: "medium",
        status: "todo",
        assignedTo: "",
        dueDate: "",
      });
      // refresh tasks
      fetchTasks();
    } catch (err) {
      console.error("Create task error:", err);
      showSnackbar(err.response?.data?.message || "Failed to save task", "error");
    } finally {
      setCreatingTask(false);
    }
  };

  // Helper to navigate to extensions tab (keeps internal routing simple)
  const goToExtensions = () => {
    // update query param so deep links land with extensions open
    // app likely uses react-router; simpler to set location with query param
    const base = `/teams/${teamId}`;
    window.history.replaceState({}, "", `${base}?tab=extensions`);
    setTab(3);
  };

  // Render members list (shows name + role)
  const renderMembers = () => {
    if (!team?.members || team.members.length === 0) {
      return <Typography color="text.secondary">No members.</Typography>;
    }

    return (
      <Stack direction="column" spacing={2}>
        {team.members.map((m) => {
          const userObj = m.user || {};
          const name = userObj.name || userObj?.email || String(userObj);
          return (
            <Paper key={String(userObj._id || userObj)} sx={{ p: 2 }}>
              <Grid container alignItems="center" spacing={2}>
                <Grid item>
                  <Avatar>{(name || "U").charAt(0)}</Avatar>
                </Grid>
                <Grid item xs>
                  <Typography fontWeight={600}>{name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {m.role?.toUpperCase() || "MEMBER"}
                  </Typography>
                </Grid>
                <Grid item>
                  <Chip label={m.role} size="small" />
                </Grid>
              </Grid>
            </Paper>
          );
        })}
      </Stack>
    );
  };

  // Render tasks list
  const renderTasks = () => {
    if (tasksLoading) return <Box sx={{ p: 3 }}><CircularProgress /></Box>;
    if (tasksError) return <Typography color="error">{tasksError}</Typography>;
    if (!tasks || tasks.length === 0) {
      return <Typography color="text.secondary">No tasks found.</Typography>;
    }

    return (
      <Stack spacing={2}>
        {tasks.map((t) => {
          // Show names instead of ids for createdBy/assignedTo
          const createdByName = t.createdBy?.name || t.createdBy || "Unknown";
          const assignedName = t.assignedTo?.name || t.assignedTo || null;

          // show "Review request" button only when there is a pending extension and current user is admin/manager
          const hasPendingRequest = t.extensionRequest && t.extensionRequest.status === "pending";
          const isAdminOrManager = ["admin", "manager"].includes(myRole);

          return (
            <Paper key={t._id} sx={{ p: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={9}>
                  <Typography variant="h6">{t.title}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Created by: {createdByName}
                    {assignedName ? ` • Assigned to: ${assignedName}` : ""}
                  </Typography>
                  <Typography sx={{ mt: 1 }}>{t.description}</Typography>

                  <Stack direction="row" spacing={1} sx={{ mt: 2 }} alignItems="center">
                    <Chip label={t.priority} size="small" />
                    <Chip label={t.status} size="small" />
                    {t.dueDate && (
                      <Chip label={`Due: ${new Date(t.dueDate).toLocaleDateString()}`} size="small" />
                    )}
                    {t.extensionRequest?.status && (
                      <Chip label={`Ext: ${t.extensionRequest.status}`} size="small" variant="outlined" />
                    )}
                  </Stack>
                </Grid>

                <Grid item xs={12} md={3} sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                  <Stack direction="row" spacing={1}>
                    {isAdminOrManager && hasPendingRequest && (
                      <Button variant="outlined" size="small" onClick={() => goToExtensions()}>
                        Review Request
                      </Button>
                    )}
                    <Button size="small" variant="contained" onClick={() => (window.location.href = `/teams/${teamId}/task/${t._id}`)}>
                      Open
                    </Button>
                  </Stack>
                </Grid>
              </Grid>
            </Paper>
          );
        })}
      </Stack>
    );
  };

  // Render pending extensions (admin/manager)
  const renderExtensions = () => {
    if (!["admin", "manager"].includes(myRole)) {
      return (
        <Typography color="text.secondary">
          Only team admins and managers can approve or reject extension requests. If you requested an extension, check the task card for its status.
        </Typography>
      );
    }

    if (loadingExtensions) {
      return <Box sx={{ p: 3 }}><CircularProgress /></Box>;
    }

    if (!pendingExtensions || pendingExtensions.length === 0) {
      return <Typography color="text.secondary">No pending extension requests.</Typography>;
    }

    return (
      <Stack spacing={2}>
        {pendingExtensions.map((t) => {
          const requestedByName = t.extensionRequest?.requestedBy?.name || "Unknown";
          const assignedName = t.assignedTo?.name || "Unassigned";
          return (
            <Paper key={t._id} sx={{ p: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={8}>
                  <Typography variant="h6">{t.title}</Typography>
                  <Typography variant="body2" color="text.secondary">Assigned to: {assignedName}</Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>{t.description}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                    Requested by: {requestedByName} • {t.extensionRequest?.requestedAt ? new Date(t.extensionRequest.requestedAt).toLocaleString() : ""}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                    Reason: {t.extensionRequest?.reason}
                  </Typography>
                  {t.extensionRequest?.requestedDueDate && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                      Requested new due date: {new Date(t.extensionRequest.requestedDueDate).toLocaleDateString()}
                    </Typography>
                  )}
                </Grid>

                <Grid item xs={12} md={4} sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 1 }}>
                  <Button variant="contained" color="success" onClick={() => handleApproveExtension(t._id)}>Approve</Button>
                  <Button variant="outlined" color="error" onClick={() => handleRejectExtension(t._id)}>Reject</Button>
                </Grid>
              </Grid>
            </Paper>
          );
        })}
      </Stack>
    );
  };

  // Render overview card
  const renderOverview = () => {
    return (
      <Paper sx={{ p: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item>
            <Avatar sx={{ width: 64, height: 64 }}>{team?.icon || <GroupIcon />}</Avatar>
          </Grid>
          <Grid item xs>
            <Typography variant="h5" fontWeight={700}>{team?.name}</Typography>
            <Typography variant="body2" color="text.secondary">{team?.description || "No description"}</Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <Chip label={`Role: ${myRole}`} size="small" />
              <Chip label={`${team?.members?.length || 0} members`} size="small" />
            </Stack>
          </Grid>

          <Grid item>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setTab(2)}>
              Create Task
            </Button>
          </Grid>
        </Grid>
      </Paper>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Top header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>Team</Typography>
      </Box>

      {/* Team loading card */}
      {teamLoading ? (
        <Paper sx={{ p: 4, mb: 3 }}><CircularProgress /></Paper>
      ) : teamError ? (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography color="error">{teamError}</Typography>
        </Paper>
      ) : (
        <>
          {renderOverview()}

          {/* Tabs */}
          <Paper sx={{ mt: 3, p: 1, mb: 3 }}>
            <Tabs value={tab} onChange={(e, v) => setTab(v)}>
              <Tab label="Overview" icon={<PersonIcon />} iconPosition="start" />
              <Tab label="Members" icon={<GroupIcon />} iconPosition="start" />
              <Tab label="Tasks" icon={<AssignmentIcon />} iconPosition="start" />
              <Tab label="Extensions" icon={<EventBusyIcon />} iconPosition="start" />
              <Tab label="Settings" icon={<SettingsIcon />} iconPosition="start" />
            </Tabs>
          </Paper>

          {/* Tab content */}
          <Box>
            {tab === 0 && (
              <Box>
                {/* Simple overview copy */}
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6">About {team.name}</Typography>
                  <Typography color="text.secondary" sx={{ mt: 1 }}>{team.description || "No description available."}</Typography>
                </Paper>
              </Box>
            )}

            {tab === 1 && (
              <Box>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6">Members</Typography>
                  <Box sx={{ mt: 2 }}>{renderMembers()}</Box>
                </Paper>
              </Box>
            )}

            {tab === 2 && (
              <Box>
                <Paper sx={{ p: 3, mb: 2 }}>
                  <Grid container alignItems="center" spacing={2}>
                    <Grid item xs>
                      <Typography variant="h6">Team Tasks</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                        {["admin", "manager"].includes(myRole) ? "Showing all tasks" : "Showing tasks assigned to you or created by you"}
                      </Typography>
                    </Grid>
                    <Grid item>
                      <Button variant="outlined" onClick={fetchTasks}>Refresh</Button>
                    </Grid>
                  </Grid>
                </Paper>

                {renderTasks()}

                {/* Create task form (simple inline) - show only admin/manager */}
                {["admin", "manager"].includes(myRole) && (
                  <Paper sx={{ mt: 3, p: 2 }}>
                    <Typography variant="h6">Create New Task</Typography>
                    <Box component="form" onSubmit={handleCreateTask} sx={{ mt: 2 }}>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <TextField
                            label="Title"
                            value={createPayload.title}
                            onChange={(e) => setCreatePayload((p) => ({ ...p, title: e.target.value }))}
                            fullWidth
                            required
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            label="Assigned To (user id or leave blank)"
                            value={createPayload.assignedTo}
                            onChange={(e) => setCreatePayload((p) => ({ ...p, assignedTo: e.target.value }))}
                            fullWidth
                          />
                        </Grid>

                        <Grid item xs={12}>
                          <TextField
                            label="Description"
                            value={createPayload.description}
                            onChange={(e) => setCreatePayload((p) => ({ ...p, description: e.target.value }))}
                            fullWidth
                            multiline
                            minRows={3}
                          />
                        </Grid>

                        <Grid item xs={12} md={4}>
                          <TextField
                            label="Priority"
                            value={createPayload.priority}
                            onChange={(e) => setCreatePayload((p) => ({ ...p, priority: e.target.value }))}
                            fullWidth
                            helperText="low | medium | high"
                          />
                        </Grid>

                        <Grid item xs={12} md={4}>
                          <TextField
                            label="Status"
                            value={createPayload.status}
                            onChange={(e) => setCreatePayload((p) => ({ ...p, status: e.target.value }))}
                            fullWidth
                            helperText="todo | in-progress | completed"
                          />
                        </Grid>

                        <Grid item xs={12} md={4}>
                          <TextField
                            label="Due Date"
                            type="date"
                            value={createPayload.dueDate}
                            onChange={(e) => setCreatePayload((p) => ({ ...p, dueDate: e.target.value }))}
                            InputLabelProps={{ shrink: true }}
                            fullWidth
                          />
                        </Grid>

                        <Grid item xs={12} sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
                          <Button variant="outlined" onClick={() => setCreatePayload({
                            title: "",
                            description: "",
                            priority: "medium",
                            status: "todo",
                            assignedTo: "",
                            dueDate: "",
                          })}>Reset</Button>
                          <Button variant="contained" type="submit" disabled={creatingTask}>
                            {creatingTask ? <CircularProgress size={20} /> : "Create Task"}
                          </Button>
                        </Grid>
                      </Grid>
                    </Box>
                  </Paper>
                )}
              </Box>
            )}

            {tab === 3 && (
              <Box>
                <Paper sx={{ p: 3, mb: 2 }}>
                  <Grid container alignItems="center">
                    <Grid item xs>
                      <Typography variant="h6">Extension Requests</Typography>
                    </Grid>
                    <Grid item>
                      <Button variant="outlined" onClick={fetchPendingExtensions}>Refresh</Button>
                    </Grid>
                  </Grid>
                </Paper>

                <Box>{renderExtensions()}</Box>
              </Box>
            )}

            {tab === 4 && (
              <Box>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6">Settings</Typography>
                  <Typography color="text.secondary" sx={{ mt: 1 }}>Team settings and management actions go here.</Typography>
                </Paper>
              </Box>
            )}
          </Box>
        </>
      )}

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default TeamDetails;
