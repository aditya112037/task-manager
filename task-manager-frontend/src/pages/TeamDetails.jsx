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

import { useParams, useNavigate, useLocation } from "react-router-dom";
import { teamsAPI, teamTasksAPI } from "../services/api";
import TeamTaskItem from "../components/Teams/TeamTaskItem";
import TeamTaskForm from "../components/Teams/TeamTaskForm";
import { useAuth } from "../context/AuthContext";

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

  const params = new URLSearchParams(location.search);
  const forcedTab = params.get("tab");

  const [tab, setTab] = useState(0);

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
     APPLY ?tab=extensions
  --------------------------------------------------- */
  useEffect(() => {
    if (forcedTab === "extensions") setTab(3);
  }, [forcedTab]);

  /* ---------------------------------------------------
     DETECT MY ROLE SAFELY
  --------------------------------------------------- */
  const myRole = team
    ? team.members?.find((m) => resolveUserId(m.user) === resolveUserId(user?._id))?.role
    : null;

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
      setSnackbar({
        open: true,
        message: "Failed to load team",
        severity: "error",
      });
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
      const res = await teamTasksAPI.getTasks(teamId);
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
      setSnackbar({
        open: true,
        message: "Failed to load extension requests",
        severity: "error",
      });
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
      setSnackbar({ open: true, message: "Extension approved", severity: "success" });
      await fetchPendingExtensions();
      await fetchTeamTasks();
    } catch (err) {
      console.error("Approve error:", err);
      setSnackbar({
        open: true,
        message: err.response?.data?.message || "Server error",
        severity: "error",
      });
    }
  };

  /* ---------------------------------------------------
     REJECT
  --------------------------------------------------- */
  const handleRejectExtension = async (taskId) => {
    if (!window.confirm("Reject this extension request?")) return;
    try {
      await teamTasksAPI.rejectExtension(taskId);
      setSnackbar({ open: true, message: "Extension rejected", severity: "success" });
      await fetchPendingExtensions();
      await fetchTeamTasks();
    } catch (err) {
      console.error("Reject error:", err);
      setSnackbar({
        open: true,
        message: err.response?.data?.message || "Server error",
        severity: "error",
      });
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
      setSnackbar({ open: true, message: "Left team", severity: "success" });
      navigate("/teams");
    } catch (err) {
      console.error("Leave error:", err);
      setSnackbar({
        open: true,
        message: err.response?.data?.message || "Error leaving team",
        severity: "error",
      });
    }
  };

  /* ---------------------------------------------------
     UPDATE ROLE
  --------------------------------------------------- */
  const handleUpdateRole = async (userId, newRole) => {
    try {
      await teamsAPI.updateMemberRole(teamId, userId, newRole);
      await fetchTeam();
      setSnackbar({ open: true, message: "Role updated", severity: "success" });
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
      await fetchTeam();
    } catch (err) {
      console.error("Remove member error:", err);
    }
  };

  /* ---------------------------------------------------
     COPY INVITE
  --------------------------------------------------- */
  const handleCopyInviteLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/join/${team._id}`);
    setSnackbar({ open: true, message: "Copied!", severity: "success" });
  };

  /* ---------------------------------------------------
     UPDATE TEAM
  --------------------------------------------------- */
  const handleUpdateTeam = async () => {
    
    try {
      await teamsAPI.updateTeam(teamId, teamFormData);
      await fetchTeam();
      setEditTeamDialog(false);
      setSnackbar({ open: true, message: "Team updated", severity: "success" });
    } catch (err) {
      console.error("Update team error:", err);
      setSnackbar({
        open: true,
        message: "Failed to update team",
        severity: "error",
      });
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
                <Chip
                  label={myRole.toUpperCase()}
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
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="h6" fontWeight={700}>Team Tasks</Typography>

            {canEditTasks && (
              <Button variant="contained" onClick={() => {
                setEditingTask(null);
                setShowTaskForm(true);
              }}>
                Create Task
              </Button>
            )}
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
                  canEdit={canEditTasks}
                  isAdminOrManager={canEditTasks}
                  currentUserId={resolveUserId(user?._id)}
                  onEdit={() => {
                    setEditingTask(t);
                    setShowTaskForm(true);
                  }}
                  onDelete={async () => {
                    try {
                      await teamTasksAPI.deleteTask(t._id);
                      await fetchTeamTasks();
                    } catch (err) {
                      console.error(err);
                    }
                  }}
                  onStatusChange={async (taskId, newStatus) => {
                    try {
                      await teamTasksAPI.updateTask(taskId, { status: newStatus });
                      await fetchTeamTasks();
                    } catch (err) {
                      console.error(err);
                    }
                  }}
                  onQuickComplete={async (taskId) => {
                    try {
                      await teamTasksAPI.updateTask(taskId, { status: "completed" });
                      await fetchTeamTasks();
                    } catch (err) {
                      console.error(err);
                    }
                  }}
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
              onSubmit={async (data) => {
                try {
                  if (editingTask) {
                    await teamTasksAPI.updateTask(editingTask._id, data);
                  } else {
                    await teamTasksAPI.createTask(teamId, data);
                  }

                  await fetchTeamTasks();
                  setShowTaskForm(false);
                  setEditingTask(null);
                } catch (err) {
                  console.error(err);
                }
              }}
            />
          )}
        </Paper>
      )}

      {/* ------------------------ EXTENSIONS -------------------------- */}
      {tab === 3 && (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="h6" fontWeight={700}>Extension Requests</Typography>
            <Button variant="outlined" onClick={fetchPendingExtensions}>Refresh</Button>
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
                        onClick={() => handleApproveExtension(t._id)}
                      >
                        Approve
                      </Button>

                      <Button
                        variant="outlined"
                        color="error"
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
