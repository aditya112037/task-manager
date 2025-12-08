// ---------- FIXED & CLEANED TEAM DETAILS PAGE ----------
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
} from "@mui/material";

import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import AccessTimeIcon from "@mui/icons-material/AccessTime";

import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import { teamsAPI, teamTasksAPI } from "../services/api";
import TeamTaskItem from "../components/Teams/TeamTaskItem";
import TeamTaskForm from "../components/Teams/TeamTaskForm";
import ExtensionRequests from "../components/Teams/ExtensionRequests";
import Badge from "@mui/material/Badge";

export default function TeamDetails() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [tab, setTab] = useState(0);
  const [team, setTeam] = useState(null);
  const [teamTasks, setTeamTasks] = useState([]);

  const [loadingTeam, setLoadingTeam] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(true);

  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const [editTeamDialog, setEditTeamDialog] = useState(false);
  const [teamFormData, setTeamFormData] = useState({});

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // ---------- USER ROLE ----------
  const myRole = team?.members?.find(
    (m) => m.user?._id === user?._id || m.user === user?._id
  )?.role;

  const canEditTasks = myRole === "admin" || myRole === "manager";
  const isAdmin = myRole === "admin";

  const pendingExtensionsCount = team?.pendingExtensions?.length || 0;

  // ======================================================
  //                 FETCH TEAM
  // ======================================================
  const fetchTeam = async () => {
    setLoadingTeam(true);
    try {
      const res = await teamsAPI.getTeam(teamId);
      const data = res.data;
      setTeam(data);

      setTeamFormData({
        name: data.name,
        description: data.description || "",
        icon: data.icon || "",
        color: data.color || "#1976d2",
      });
    } catch (err) {
      console.error("Team load error:", err);
      setSnackbar({
        open: true,
        message: "Failed to load team",
        severity: "error",
      });
    }
    setLoadingTeam(false);
  };

  // ======================================================
  //                 FETCH TASKS
  // ======================================================
  const fetchTeamTasks = async () => {
    setLoadingTasks(true);
    try {
      const res = await teamTasksAPI.getTasks(teamId);
      setTeamTasks(res.data);
    } catch (err) {
      console.error("Task load error:", err);
    }
    setLoadingTasks(false);
  };

  useEffect(() => {
    fetchTeam();
    fetchTeamTasks();
  }, [teamId]);

  // ======================================================
  //      FIXED EXTENSION HANDLING — APPROVE / REJECT
  // ======================================================

  const handleApproveExtension = async (taskId) => {
    let reason = prompt("Enter approval reason (optional):", "Extension approved");
    if (reason === null) return; // Cancelled

    try {
      await teamTasksAPI.approveExtension(taskId, reason);
      await fetchTeam();
      await fetchTeamTasks();

      setSnackbar({
        open: true,
        message: "Extension approved successfully",
        severity: "success",
      });
    } catch (err) {
      console.error("Approve extension error:", err);
      setSnackbar({
        open: true,
        message: err.response?.data?.message || "Approval failed",
        severity: "error",
      });
    }
  };

  const handleRejectExtension = async (taskId) => {
    let reason = prompt("Enter rejection reason (optional):", "Extension rejected");
    if (reason === null) return;

    try {
      await teamTasksAPI.rejectExtension(taskId, reason);
      await fetchTeam();
      await fetchTeamTasks();

      setSnackbar({
        open: true,
        message: "Extension rejected",
        severity: "info",
      });
    } catch (err) {
      console.error("Reject extension error:", err);
      setSnackbar({
        open: true,
        message: err.response?.data?.message || "Rejection failed",
        severity: "error",
      });
    }
  };

  // ======================================================
  //        FIXED — REQUEST EXTENSION
  // ======================================================
  const handleRequestExtension = async (taskId, reason, newDueDate) => {
    try {
      const isoDate = new Date(newDueDate).toISOString();

      await teamTasksAPI.requestExtension(taskId, reason, isoDate);

      await fetchTeam();
      await fetchTeamTasks();

      setSnackbar({
        open: true,
        message: "Extension request submitted",
        severity: "success",
      });
    } catch (err) {
      console.error("Extension request error:", err);
      setSnackbar({
        open: true,
        message: err.response?.data?.message || "Request failed",
        severity: "error",
      });
    }
  };

  // ======================================================
  // LEAVE TEAM
  // ======================================================
  const handleLeaveTeam = async () => {
    if (!window.confirm("Are you sure you want to leave this team?")) return;

    try {
      await teamsAPI.leaveTeam(teamId);
      setSnackbar({
        open: true,
        message: "You have left the team",
        severity: "success",
      });
      navigate("/teams");
    } catch (err) {
      console.error("Leave team error:", err);
      setSnackbar({
        open: true,
        message: err.response?.data?.message || "Failed to leave team",
        severity: "error",
      });
    }
  };

  // ======================================================
  // UPDATE ROLE
  // ======================================================
  const handleUpdateRole = async (userId, newRole) => {
    try {
      await teamsAPI.updateMemberRole(teamId, userId, newRole);
      fetchTeam();

      setSnackbar({
        open: true,
        message: "Role updated",
        severity: "success",
      });
    } catch (err) {
      console.error("Update role error:", err);
      setSnackbar({
        open: true,
        message: "Failed to update role",
        severity: "error",
      });
    }
  };

  // ======================================================
  // REMOVE MEMBER
  // ======================================================
  const handleRemoveMember = async (userId) => {
    if (!window.confirm("Remove this member?")) return;

    try {
      await teamsAPI.removeMember(teamId, userId);
      fetchTeam();

      setSnackbar({
        open: true,
        message: "Member removed",
        severity: "success",
      });
    } catch (err) {
      console.error("Remove error:", err);
      setSnackbar({
        open: true,
        message: "Failed to remove member",
        severity: "error",
      });
    }
  };

  // ======================================================
  // COPY INVITE LINK
  // ======================================================
  const inviteURL = `${window.location.origin}/join/${team?._id}`;

  const handleCopyInviteLink = () => {
    navigator.clipboard.writeText(inviteURL);
    setSnackbar({
      open: true,
      message: "Invite link copied!",
      severity: "success",
    });
  };

  // ======================================================
  // UPDATE TEAM INFO
  // ======================================================
  const handleUpdateTeam = async () => {
    try {
      await teamsAPI.updateTeam(teamId, teamFormData);
      fetchTeam();

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

  // ======================================================
  // DELETE TEAM
  // ======================================================
  const handleDeleteTeam = async () => {
    if (!window.confirm("Delete this team permanently?")) return;

    try {
      await teamsAPI.deleteTeam(teamId);
      navigate("/teams");

      setSnackbar({
        open: true,
        message: "Team deleted",
        severity: "success",
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Failed to delete team",
        severity: "error",
      });
    }
  };

  // ======================================================
  // RENDERING STARTS HERE
  // ======================================================
  if (loadingTeam)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", height: "100vh", alignItems: "center" }}>
        <CircularProgress />
      </Box>
    );

  if (!team)
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">Team not found</Typography>
        <Button onClick={() => navigate("/teams")}>Back</Button>
      </Box>
    );

  return (
    <Box sx={{ px: 2, pt: { xs: 10, sm: 8 }, maxWidth: 1200, mx: "auto" }}>
      
      {/* SNACKBAR */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3800}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>

      {/* HEADER */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={2}>
            <Avatar sx={{ width: 70, height: 70, bgcolor: team.color }}>
              {team.icon || "T"}
            </Avatar>

            <Box>
              <Typography variant="h5">{team.name}</Typography>
              <Typography color="text.secondary">{team.description}</Typography>
              <Chip label={myRole?.toUpperCase()} size="small" sx={{ mt: 1 }} />
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
              <Badge badgeContent={pendingExtensionsCount} color="error">
                <AccessTimeIcon fontSize="small" />
              </Badge>
            }
          />
          <Tab label="Settings" />
        </Tabs>
      </Paper>

      {/* OVERVIEW */}
      {tab === 0 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6">Overview</Typography>
          <Stack spacing={1} sx={{ mt: 2 }}>
            <Typography>Total Members: {team.members.length}</Typography>
            <Typography>Total Tasks: {teamTasks.length}</Typography>
            <Typography>
              Completed: {teamTasks.filter((t) => t.status === "completed").length}
            </Typography>
          </Stack>

          <Button startIcon={<ContentCopyIcon />} sx={{ mt: 3 }} onClick={handleCopyInviteLink}>
            Copy Invite Link
          </Button>
        </Paper>
      )}

      {/* MEMBERS */}
      {tab === 1 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6">Team Members</Typography>
          <Stack spacing={2} sx={{ mt: 2 }}>
            {team.members.map((m) => {
              const member = m.user?._id ? m.user : { _id: m.user, name: "Unknown User" };
              const isCurrentUser = member._id === user?._id;
              const isTeamAdmin = team.admin === member._id;

              return (
                <Paper key={member._id} sx={{ p: 2, display: "flex", justifyContent: "space-between" }}>
                  <Box>
                    <Typography fontWeight="600">
                      {member.name}
                      {isTeamAdmin && <Chip label="ADMIN" size="small" sx={{ ml: 1 }} />}
                    </Typography>
                    <Typography>{m.role}</Typography>
                  </Box>

                  <Stack direction="row" spacing={1}>
                    {isAdmin && !isTeamAdmin && (
                      <Select
                        size="small"
                        value={m.role}
                        onChange={(e) => handleUpdateRole(member._id, e.target.value)}
                      >
                        <MenuItem value="member">Member</MenuItem>
                        <MenuItem value="manager">Manager</MenuItem>
                        <MenuItem value="admin">Admin</MenuItem>
                      </Select>
                    )}

                    {isAdmin && !isTeamAdmin && !isCurrentUser && (
                      <IconButton color="error" onClick={() => handleRemoveMember(member._id)}>
                        <DeleteIcon />
                      </IconButton>
                    )}

                    {!isAdmin && isCurrentUser && (
                      <Button color="error" startIcon={<ExitToAppIcon />} onClick={handleLeaveTeam}>
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
        <Paper sx={{ p: 3 }}>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="h6">Team Tasks</Typography>

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
          </Stack>

          {loadingTasks ? (
            <Box sx={{ textAlign: "center", p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Stack sx={{ mt: 2 }} spacing={2}>
              {teamTasks.map((task) => (
                <TeamTaskItem
                  key={task._id}
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
                      fetchTeamTasks();
                      setSnackbar({ open: true, message: "Task deleted", severity: "success" });
                    } catch (err) {
                      setSnackbar({ open: true, message: "Failed to delete task", severity: "error" });
                    }
                  }}
                  onStatusChange={async (id, status) => {
                    try {
                      await teamTasksAPI.updateTask(id, { status });
                      fetchTeamTasks();
                    } catch (err) {
                      setSnackbar({ open: true, message: "Status update failed", severity: "error" });
                    }
                  }}
                  onQuickComplete={async (id) => {
                    try {
                      await teamTasksAPI.updateTask(id, { status: "completed" });
                      fetchTeamTasks();
                    } catch (err) {
                      setSnackbar({ open: true, message: "Failed to complete", severity: "error" });
                    }
                  }}
                  onRequestExtension={handleRequestExtension}
                  onApproveExtension={handleApproveExtension}
                  onRejectExtension={handleRejectExtension}
                />
              ))}
            </Stack>
          )}

          {showTaskForm && (
            <TeamTaskForm
              open={showTaskForm}
              task={editingTask}
              teamMembers={team.members}
              onCancel={() => setShowTaskForm(false)}
              onSubmit={async (formData) => {
                try {
                  if (editingTask) {
                    await teamTasksAPI.updateTask(editingTask._id, formData);
                  } else {
                    await teamTasksAPI.createTask(teamId, formData);
                  }
                  fetchTeamTasks();
                  setShowTaskForm(false);
                  setEditingTask(null);
                } catch (err) {
                  setSnackbar({
                    open: true,
                    message: err.response?.data?.message || "Failed to save",
                    severity: "error",
                  });
                }
              }}
            />
          )}
        </Paper>
      )}

      {/* EXTENSIONS */}
      {tab === 3 && (
        <Paper sx={{ p: 3 }}>
          <ExtensionRequests
            teamId={teamId}
            isAdminOrManager={canEditTasks}
            onApprove={handleApproveExtension}
            onReject={handleRejectExtension}
            refreshData={() => {
              fetchTeam();
              fetchTeamTasks();
            }}
          />
        </Paper>
      )}

      {/* SETTINGS */}
      {tab === 4 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6">Settings</Typography>

          {!isAdmin && (
            <>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                Only admins can manage settings.
              </Typography>
              <Button color="error" startIcon={<ExitToAppIcon />} onClick={handleLeaveTeam}>
                Leave Team
              </Button>
            </>
          )}

          {isAdmin && (
            <Stack spacing={3} sx={{ mt: 2 }}>
              <Box>
                <Typography>Invite Members</Typography>
                <Paper sx={{ p: 2, display: "flex", alignItems: "center", gap: 2 }}>
                  <Typography sx={{ flexGrow: 1 }}>{inviteURL}</Typography>
                  <Button variant="contained" onClick={handleCopyInviteLink}>
                    Copy
                  </Button>
                </Paper>
              </Box>

              <Button variant="contained" startIcon={<EditIcon />} onClick={() => setEditTeamDialog(true)}>
                Edit Team Info
              </Button>

              <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={handleDeleteTeam}>
                Delete Team
              </Button>
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
            />

            <TextField
              label="Description"
              multiline
              rows={3}
              value={teamFormData.description}
              onChange={(e) => setTeamFormData({ ...teamFormData, description: e.target.value })}
            />

            <Box>
              <Typography>Team Color</Typography>
              <input
                type="color"
                value={teamFormData.color}
                onChange={(e) => setTeamFormData({ ...teamFormData, color: e.target.value })}
                style={{ width: "100%", height: "40px", borderRadius: "6px", marginTop: "5px" }}
              />
            </Box>

            <TextField
              label="Icon (emoji)"
              placeholder="🚀"
              value={teamFormData.icon}
              onChange={(e) => setTeamFormData({ ...teamFormData, icon: e.target.value })}
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
