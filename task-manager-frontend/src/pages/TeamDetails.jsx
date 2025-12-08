// TeamDetails.jsx
import React, { useState, useEffect } from "react";
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
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useParams, useNavigate } from "react-router-dom";
import { teamsAPI, teamTasksAPI } from "../services/api";
import TeamTaskItem from "../components/Teams/TeamTaskItem";
import TeamTaskForm from "../components/Teams/TeamTaskForm";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useAuth } from "../context/AuthContext";

export default function TeamDetails() {
  const { teamId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Tabs: 0 = Overview, 1 = Members, 2 = Tasks, 3 = Extensions, 4 = Settings
  const [tab, setTab] = useState(0);

  const [team, setTeam] = useState(null);
  const [loadingTeam, setLoadingTeam] = useState(true);

  const [teamTasks, setTeamTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(true);

  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const [editTeamDialog, setEditTeamDialog] = useState(false);
  const [teamFormData, setTeamFormData] = useState({});

  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  // Extensions
  const [pendingExtensions, setPendingExtensions] = useState([]);
  const [loadingExtensions, setLoadingExtensions] = useState(false);

  // Calculate user role once team is loaded
  const myRole = team
    ? team?.members?.find(
        (m) => (m.user?._id === user?._id) || (m.user === user?._id)
      )?.role
    : null;

  const canEditTasks = myRole === "admin" || myRole === "manager";
  const isAdmin = myRole === "admin";

  // ---- Fetch team first, then tasks (so we know membership & role) ----
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
      setSnackbar({ open: true, message: "Failed to load team", severity: "error" });
      setTeam(null);
    } finally {
      setLoadingTeam(false);
    }
  };

  // Fetch tasks, but apply client-side restriction for regular members:
  // members only see tasks assignedTo them or unassigned.
  const fetchTeamTasks = async () => {
    setLoadingTasks(true);
    try {
      const res = await teamTasksAPI.getTasks(teamId);
      let tasks = res.data || [];

      // If current user is a plain member, filter tasks to only those assigned to them OR unassigned
      if (myRole === "member") {
        tasks = tasks.filter(
          (t) =>
            !t.assignedTo || // unassigned
            (t.assignedTo && (t.assignedTo._id === user?._id || t.assignedTo === user?._id))
        );
      }

      setTeamTasks(tasks);
    } catch (err) {
      console.error("Task load error:", err);
      setSnackbar({ open: true, message: "Failed to load tasks", severity: "error" });
    } finally {
      setLoadingTasks(false);
    }
  };

  // Fetch pending extension requests (admins/managers only)
  const fetchPendingExtensions = async () => {
    if (!teamId) return;
    setLoadingExtensions(true);
    try {
      const res = await teamTasksAPI.getPendingExtensions(teamId);
      setPendingExtensions(res.data || []);
    } catch (err) {
      console.error("Pending extensions load error:", err);
      setSnackbar({ open: true, message: "Failed to load pending extensions", severity: "error" });
    } finally {
      setLoadingExtensions(false);
    }
  };

  // Approve extension
  const handleApproveExtension = async (taskId) => {
    if (!window.confirm("Approve this extension request?")) return;
    try {
      await teamTasksAPI.approveExtension(taskId);
      setSnackbar({ open: true, message: "Extension approved", severity: "success" });
      // refresh both lists
      await fetchPendingExtensions();
      await fetchTeamTasks();
    } catch (err) {
      console.error("Approve error:", err);
      setSnackbar({ open: true, message: err.response?.data?.message || "Failed to approve", severity: "error" });
    }
  };

  // Reject extension
  const handleRejectExtension = async (taskId) => {
    if (!window.confirm("Reject this extension request?")) return;
    try {
      await teamTasksAPI.rejectExtension(taskId);
      setSnackbar({ open: true, message: "Extension rejected", severity: "success" });
      await fetchPendingExtensions();
      await fetchTeamTasks();
    } catch (err) {
      console.error("Reject error:", err);
      setSnackbar({ open: true, message: err.response?.data?.message || "Failed to reject", severity: "error" });
    }
  };

  // ---- Initial load: team, then tasks and extensions ----
  useEffect(() => {
    if (teamId) fetchTeam();
    // eslint-disable-next-line
  }, [teamId]);

  // when team and myRole are known, fetch tasks & pending extensions if allowed
  useEffect(() => {
    if (!team) return;
    fetchTeamTasks();

    if (["admin", "manager"].includes(myRole)) {
      fetchPendingExtensions();
    } else {
      setPendingExtensions([]);
    }
    // eslint-disable-next-line
  }, [team, myRole]);

  // ---- Leave team ----
  const handleLeaveTeam = async () => {
    if (!window.confirm("Are you sure you want to leave this team?")) return;
    try {
      await teamsAPI.leaveTeam(teamId);
      setSnackbar({ open: true, message: "Successfully left the team", severity: "success" });
      navigate("/teams");
    } catch (err) {
      console.error("Leave team error:", err);
      setSnackbar({ open: true, message: err.response?.data?.message || "Failed to leave team", severity: "error" });
    }
  };

  // ---- Update member role ----
  const handleUpdateRole = async (userId, newRole) => {
    try {
      await teamsAPI.updateMemberRole(teamId, userId, newRole);
      await fetchTeam();
      setSnackbar({ open: true, message: "Role updated successfully", severity: "success" });
    } catch (err) {
      console.error("Update role error:", err);
      setSnackbar({ open: true, message: "Failed to update role", severity: "error" });
    }
  };

  // ---- Remove member ----
  const handleRemoveMember = async (userId) => {
    if (!window.confirm("Are you sure you want to remove this member?")) return;
    try {
      await teamsAPI.removeMember(teamId, userId);
      await fetchTeam();
      setSnackbar({ open: true, message: "Member removed", severity: "success" });
    } catch (err) {
      console.error("Remove member error:", err);
      setSnackbar({ open: true, message: "Failed to remove member", severity: "error" });
    }
  };

  // ---- Copy invite link ----
  const handleCopyInviteLink = () => {
    const inviteURL = `${window.location.origin}/join/${team._id}`;
    navigator.clipboard.writeText(inviteURL);
    setSnackbar({ open: true, message: "Invite link copied to clipboard!", severity: "success" });
  };

  // ---- Update team ----
  const handleUpdateTeam = async () => {
    try {
      await teamsAPI.updateTeam(teamId, teamFormData);
      await fetchTeam();
      setEditTeamDialog(false);
      setSnackbar({ open: true, message: "Team updated successfully", severity: "success" });
    } catch (err) {
      console.error("Update team error:", err);
      setSnackbar({ open: true, message: "Failed to update team", severity: "error" });
    }
  };

  // ---- Delete team ----
  const handleDeleteTeam = async () => {
    if (!window.confirm("Are you sure you want to delete this team? This action cannot be undone.")) return;
    try {
      await teamsAPI.deleteTeam(teamId);
      setSnackbar({ open: true, message: "Team deleted successfully", severity: "success" });
      navigate("/teams");
    } catch (err) {
      console.error("Delete team error:", err);
      setSnackbar({ open: true, message: "Failed to delete team", severity: "error" });
    }
  };

  // ---- Loading state (team) ----
  if (loadingTeam) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  // ---- Team not found or no access ----
  if (!team) {
    return (
      <Box sx={{ p: 3, pt: { xs: 10, sm: 8 }, maxWidth: 1200, mx: "auto" }}>
        <Typography variant="h6" color="error">
          Team not found or you don't have access.
        </Typography>
        <Button variant="contained" onClick={() => navigate("/teams")} sx={{ mt: 2 }}>
          Back to Teams
        </Button>
      </Box>
    );
  }

  const inviteURL = `${window.location.origin}/join/${team._id}`;

  return (
    <Box sx={{ px: 2, pt: { xs: 10, sm: 8 }, maxWidth: 1200, mx: "auto" }}>
      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Header */}
      <Paper sx={{ p: 3, borderRadius: 3, mb: 3, boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar sx={{ width: 70, height: 70, bgcolor: team.color || "primary.main", fontSize: 28 }}>
              {team.icon || "T"}
            </Avatar>
            <Box>
              <Typography variant="h5" fontWeight={700}>
                {team.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {team.description || "No description"}
              </Typography>
              {myRole && (
                <Chip
                  label={`${myRole}`.toUpperCase()}
                  color={isAdmin ? "primary" : "default"}
                  size="small"
                  sx={{ mt: 1 }}
                />
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

<Tabs 
  value={tab} 
  onChange={(e, v) => setTab(v)}
  sx={{
    // Allow tabs to wrap if needed
    flexWrap: 'wrap',
    minHeight: '48px' // Ensure consistent height even with badge
  }}
>
  <Tab label="Overview" />
  <Tab label="Members" />
  <Tab label="Tasks" />
  <Tab
    label={
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        Extensions
        {["admin", "manager"].includes(myRole) && pendingExtensions.length > 0 && (
          <Chip 
            label={pendingExtensions.length} 
            color="error" 
            size="small" 
            sx={{ 
              height: '20px', 
              minWidth: '20px', 
              fontSize: '0.75rem',
              '& .MuiChip-label': {
                px: 0.5
              }
            }}
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
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={700}>
            Overview
          </Typography>

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
              <Typography variant="h5">{teamTasks.filter((t) => t.status === "completed").length}</Typography>
            </Box>
          </Stack>

          <Button variant="outlined" startIcon={<ContentCopyIcon />} sx={{ mt: 3 }} onClick={handleCopyInviteLink}>
            Copy Invite Link
          </Button>

          <Box sx={{ mt: 4 }}>
            <Typography fontWeight={600} sx={{ mb: 2 }}>
              Recent Tasks
            </Typography>
            {teamTasks.slice(0, 5).map((t) => (
              <Box key={t._id} sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <Chip label={t.status} color={t.status === "completed" ? "success" : "default"} size="small" sx={{ mr: 2 }} />
                <Typography>{t.title}</Typography>
              </Box>
            ))}
            {teamTasks.length === 0 && <Typography color="text.secondary">No tasks yet</Typography>}
          </Box>
        </Paper>
      )}

      {/* MEMBERS */}
      {tab === 1 && (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>
            Team Members ({team.members?.length || 0})
          </Typography>

          <Stack spacing={2}>
            {team.members?.map((m) => {
              // normalize member object
              const member = m.user?._id ? m.user : { _id: m.user, name: "Unknown User" };
              const isCurrentUser = member._id === user?._id;
              // mark team admin if your team model has a top-level admin prop; if not, skip
              const isTeamAdmin = (team.admin && (team.admin._id === member._id || team.admin === member._id)) || false;

              return (
                <Paper key={member._id} sx={{ p: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Box>
                    <Typography fontWeight={600}>
                      {member.name} {isTeamAdmin && <Chip label="ADMIN" color="primary" size="small" sx={{ ml: 2 }} />}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {m.role}
                    </Typography>
                  </Box>

                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {isAdmin && !isTeamAdmin && (
                      <FormControl size="small" sx={{ minWidth: 120 }}>
                        <Select value={m.role} onChange={(e) => handleUpdateRole(member._id, e.target.value)}>
                          <MenuItem value="member">Member</MenuItem>
                          <MenuItem value="manager">Manager</MenuItem>
                          <MenuItem value="admin">Admin</MenuItem>
                        </Select>
                      </FormControl>
                    )}

                    {isAdmin && !isTeamAdmin && !isCurrentUser && (
                      <IconButton color="error" onClick={() => handleRemoveMember(member._id)}>
                        <DeleteIcon />
                      </IconButton>
                    )}

                    {!isAdmin && isCurrentUser && (
                      <Button startIcon={<ExitToAppIcon />} color="error" onClick={handleLeaveTeam} variant="outlined" size="small">
                        Leave
                      </Button>
                    )}
                  </Box>
                </Paper>
              );
            })}
          </Stack>
        </Paper>
      )}

      {/* TASKS */}
      {tab === 2 && (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
            <Typography variant="h6" fontWeight={700}>
              Team Tasks
            </Typography>

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

          {loadingTasks ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
              <CircularProgress />
            </Box>
          ) : teamTasks.length === 0 ? (
            <Typography color="text.secondary" sx={{ textAlign: "center", p: 3 }}>
              No team tasks yet. Create your first task!
            </Typography>
          ) : (
            <Stack spacing={2}>
              {teamTasks.map((task) => {
                const isPending = task.extensionRequest?.status === "pending";
                const isAssignedToMe =
                  task.assignedTo && (task.assignedTo._id === user?._id || task.assignedTo === user?._id);

                return (
                  <Box key={task._id} sx={{ position: "relative" }}>
                    <TeamTaskItem
                      task={task}
                      canEdit={canEditTasks}
                      isAdminOrManager={canEditTasks}
                      currentUserId={user?._id}
                      onEdit={() => {
                        setEditingTask(task);
                        setShowTaskForm(true);
                      }}
                      onDelete={async () => {
                        try {
                          await teamTasksAPI.deleteTask(task._id);
                          await fetchTeamTasks();
                          setSnackbar({ open: true, message: "Task deleted", severity: "success" });
                        } catch (err) {
                          console.error("Delete task error:", err);
                          setSnackbar({ open: true, message: "Failed to delete task", severity: "error" });
                        }
                      }}
                      onStatusChange={async (taskId, newStatus) => {
                        try {
                          await teamTasksAPI.updateTask(taskId, { status: newStatus });
                          await fetchTeamTasks();
                        } catch (err) {
                          console.error("Status update error:", err);
                          setSnackbar({ open: true, message: "Failed to update task status", severity: "error" });
                        }
                      }}
                      onQuickComplete={async (taskId) => {
                        try {
                          await teamTasksAPI.updateTask(taskId, { status: "completed" });
                          await fetchTeamTasks();
                          setSnackbar({ open: true, message: "Task marked as complete", severity: "success" });
                        } catch (err) {
                          console.error("Quick complete error:", err);
                          setSnackbar({ open: true, message: "Failed to complete task", severity: "error" });
                        }
                      }}
                    />

                    {/* If pending extension and current user is admin/manager, show Review button
                        This button will switch to the Extensions tab and fetch pending extensions */}
                    {isPending && canEditTasks && (
                      <Box sx={{ position: "absolute", top: 12, right: 12 }}>
                        <Button
                          variant="contained"
                          color="primary"
                          size="small"
                          onClick={() => {
                            setTab(3);
                            fetchPendingExtensions();
                          }}
                        >
                          Review Request
                        </Button>
                      </Box>
                    )}
                  </Box>
                );
              })}
            </Stack>
          )}

          {/* Task form dialog */}
          {showTaskForm && (
            <TeamTaskForm
              open={showTaskForm}
              task={editingTask}
              teamMembers={team.members}
              onCancel={() => {
                setShowTaskForm(false);
                setEditingTask(null);
              }}
              onSubmit={async (formData) => {
                try {
                  if (editingTask) {
                    await teamTasksAPI.updateTask(editingTask._id, formData);
                  } else {
                    await teamTasksAPI.createTask(teamId, formData);
                  }
                  await fetchTeamTasks();
                  setShowTaskForm(false);
                  setEditingTask(null);
                  setSnackbar({ open: true, message: editingTask ? "Task updated" : "Task created", severity: "success" });
                } catch (err) {
                  console.error("Task save error:", err);
                  setSnackbar({ open: true, message: err.response?.data?.message || "Failed to save task", severity: "error" });
                }
              }}
            />
          )}
        </Paper>
      )}

      {/* EXTENSIONS */}
      {tab === 3 && (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Typography variant="h6" fontWeight={700}>
              Extension Requests
            </Typography>
            <Box>
              <Button variant="outlined" onClick={fetchPendingExtensions}>
                Refresh
              </Button>
            </Box>
          </Box>

          {!["admin", "manager"].includes(myRole) ? (
            <Typography color="text.secondary">
              Only team admins and managers can approve or reject extension requests. If you requested an extension,
              check the task card for its status.
            </Typography>
          ) : loadingExtensions ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
              <CircularProgress />
            </Box>
          ) : pendingExtensions.length === 0 ? (
            <Typography color="text.secondary">No pending extension requests.</Typography>
          ) : (
            <Stack spacing={2}>
              {pendingExtensions.map((t) => (
                <Paper key={t._id} sx={{ p: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={8}>
                      <Typography variant="h6">{t.title}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Assigned to: {t.assignedTo?.name || "Unassigned"}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        {t.description}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                        Requested by: {t.extensionRequest?.requestedBy?.name || "Unknown"} • Requested at:{" "}
                        {t.extensionRequest?.requestedAt ? new Date(t.extensionRequest.requestedAt).toLocaleString() : ""}
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
                      <Button variant="contained" color="success" onClick={() => handleApproveExtension(t._id)}>
                        Approve
                      </Button>
                      <Button variant="outlined" color="error" onClick={() => handleRejectExtension(t._id)}>
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
          <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>
            Team Settings
          </Typography>

          {!isAdmin && (
            <Box>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                Only team admins can update team settings.
              </Typography>
              <Button variant="outlined" color="error" startIcon={<ExitToAppIcon />} onClick={handleLeaveTeam}>
                Leave Team
              </Button>
            </Box>
          )}

          {isAdmin && (
            <Stack spacing={4}>
              {/* Invite link */}
              <Box>
                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                  Invite Members
                </Typography>
                <Paper sx={{ p: 2, borderRadius: 2, bgcolor: "background.default", display: "flex", alignItems: "center", gap: 2 }}>
                  <Typography sx={{ flexGrow: 1, wordBreak: "break-all" }}>{inviteURL}</Typography>
                  <Button variant="contained" startIcon={<ContentCopyIcon />} onClick={handleCopyInviteLink}>
                    Copy
                  </Button>
                </Paper>
              </Box>

              {/* Team actions */}
              <Box>
                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                  Team Actions
                </Typography>
                <Stack spacing={2}>
                  <Button variant="contained" onClick={() => setEditTeamDialog(true)} startIcon={<EditIcon />}>
                    Edit Team Info
                  </Button>
                  <Button variant="outlined" color="error" onClick={handleDeleteTeam} startIcon={<DeleteIcon />}>
                    Delete Team
                  </Button>
                </Stack>
              </Box>
            </Stack>
          )}
        </Paper>
      )}

      {/* EDIT TEAM DIALOG */}
      <Dialog open={editTeamDialog} onClose={() => setEditTeamDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Team</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <TextField
              label="Team Name"
              value={teamFormData.name}
              onChange={(e) => setTeamFormData({ ...teamFormData, name: e.target.value })}
              fullWidth
              required
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
              <Typography variant="body2" sx={{ mb: 1 }}>
                Team Color
              </Typography>
              <input
                type="color"
                value={teamFormData.color}
                onChange={(e) => setTeamFormData({ ...teamFormData, color: e.target.value })}
                style={{ width: "100%", height: "40px", border: "1px solid #ccc", borderRadius: "8px", cursor: "pointer" }}
              />
            </Box>

            <TextField
              label="Icon (emoji)"
              value={teamFormData.icon}
              onChange={(e) => setTeamFormData({ ...teamFormData, icon: e.target.value })}
              fullWidth
              placeholder="e.g., 🚀, 👥, 💼"
              helperText="Enter a single emoji"
            />
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setEditTeamDialog(false)}>Cancel</Button>
          <Button onClick={handleUpdateTeam} variant="contained" disabled={!teamFormData.name?.trim()}>
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
