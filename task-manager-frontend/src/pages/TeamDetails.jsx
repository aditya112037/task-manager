// --------------------------------------------
// TEAM DETAILS (FIXED VERSION)
// --------------------------------------------
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
  InputLabel,
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
import Badge from "@mui/material/Badge";
import AccessTimeIcon from "@mui/icons-material/AccessTime";

import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import { teamsAPI, teamTasksAPI, teamExtensionsAPI } from "../services/api";

import TeamTaskItem from "../components/Teams/TeamTaskItem";
import TeamTaskForm from "../components/Teams/TeamTaskForm";
import ExtensionRequests from "../components/Teams/ExtensionRequests";

export default function TeamDetails() {
  const { teamId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState(0);

  const [team, setTeam] = useState(null);
  const [loadingTeam, setLoadingTeam] = useState(true);

  const [teamTasks, setTeamTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(true);

  const [pendingExtensions, setPendingExtensions] = useState([]);
  const [loadingExtensions, setLoadingExtensions] = useState(true);

  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const [editTeamDialog, setEditTeamDialog] = useState(false);
  const [teamFormData, setTeamFormData] = useState({});

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // ---------------------------------------------------
  // ROLE CALCULATION
  // ---------------------------------------------------
  const myRole =
    team?.members?.find(
      (m) => m.user?._id === user?._id || m.user === user?._id
    )?.role || "member";

  const isAdmin = myRole === "admin";
  const canEditTasks = myRole === "admin" || myRole === "manager";

  // ---------------------------------------------------
  // FETCH TEAM
  // ---------------------------------------------------
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
      console.error(err);
      setSnackbar({
        open: true,
        message: "Failed to load team",
        severity: "error",
      });
    } finally {
      setLoadingTeam(false);
    }
  };

  // ---------------------------------------------------
  // FETCH TASKS
  // ---------------------------------------------------
  const fetchTeamTasks = async () => {
    setLoadingTasks(true);
    try {
      const res = await teamTasksAPI.getTasks(teamId);
      setTeamTasks(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTasks(false);
    }
  };

  // ---------------------------------------------------
  // FETCH PENDING EXTENSIONS (IMPORTANT)
  // ---------------------------------------------------
  const fetchPendingExtensions = async () => {
    setLoadingExtensions(true);
    try {
      const res = await teamExtensionsAPI.getPendingExtensions(teamId);
      setPendingExtensions(res.data);
    } catch (err) {
      console.error("EXTENSION LOAD ERROR:", err);
      setPendingExtensions([]);
    } finally {
      setLoadingExtensions(false);
    }
  };

  useEffect(() => {
    fetchTeam();
    fetchTeamTasks();
    fetchPendingExtensions();
  }, [teamId]);

  const pendingExtensionsCount = pendingExtensions.length;

  // ---------------------------------------------------
  // HANDLE EXTENSION APPROVAL
  // ---------------------------------------------------
  const handleApproveExtension = async (taskId) => {
    try {
      await teamExtensionsAPI.approveExtension(taskId);
      await fetchTeamTasks();
      await fetchPendingExtensions();

      setSnackbar({
        open: true,
        message: "Extension approved",
        severity: "success",
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Failed to approve extension",
        severity: "error",
      });
    }
  };

  const handleRejectExtension = async (taskId) => {
    try {
      await teamExtensionsAPI.rejectExtension(taskId);
      await fetchTeamTasks();
      await fetchPendingExtensions();

      setSnackbar({
        open: true,
        message: "Extension rejected",
        severity: "info",
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Failed to reject extension",
        severity: "error",
      });
    }
  };

  // ---------------------------------------------------
  // REQUEST EXTENSION
  // ---------------------------------------------------
  const handleRequestExtension = async (taskId, reason, newDueDate) => {
    try {
      await teamExtensionsAPI.requestExtension(taskId, {
        reason,
        newDueDate,
      });

      fetchTeamTasks();
      fetchPendingExtensions();

      setSnackbar({
        open: true,
        message: "Extension request submitted",
        severity: "success",
      });
    } catch (err) {
      console.log(err);
      setSnackbar({
        open: true,
        message: err.response?.data?.message || "Failed to request extension",
        severity: "error",
      });
    }
  };

  // ---------------------------------------------------
  // HANDLE COPY INVITE LINK
  // ---------------------------------------------------
  const handleCopyInviteLink = () => {
    navigator.clipboard.writeText(
      `${window.location.origin}/join/${team._id}`
    );

    setSnackbar({
      open: true,
      message: "Invite link copied!",
      severity: "success",
    });
  };

  // ---------------------------------------------------
  // DELETE / UPDATE TEAM
  // ---------------------------------------------------
  const handleUpdateTeam = async () => {
    try {
      await teamsAPI.updateTeam(teamId, teamFormData);
      fetchTeam();
      setEditTeamDialog(false);

      setSnackbar({
        open: true,
        message: "Team updated",
        severity: "success",
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Failed to update team",
        severity: "error",
      });
    }
  };

  const handleDeleteTeam = async () => {
    if (!window.confirm("Delete this team?")) return;

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

  // ---------------------------------------------------
  // RENDER
  // ---------------------------------------------------
  if (loadingTeam)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
        <CircularProgress />
      </Box>
    );

  if (!team)
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">Team not found</Typography>
      </Box>
    );

  const inviteURL = `${window.location.origin}/join/${team._id}`;

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

      {/* TEAM HEADER */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Stack direction="row" justifyContent="space-between">
          <Stack direction="row" spacing={2}>
            <Avatar
              sx={{
                width: 70,
                height: 70,
                bgcolor: team.color || "primary.main",
                fontSize: 28,
              }}
            >
              {team.icon || "T"}
            </Avatar>

            <Box>
              <Typography variant="h5">{team.name}</Typography>
              <Typography color="text.secondary">
                {team.description || "No description"}
              </Typography>
              <Chip
                label={myRole.toUpperCase()}
                color={isAdmin ? "primary" : "default"}
                size="small"
                sx={{ mt: 1 }}
              />
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
              <Badge color="error" badgeContent={pendingExtensionsCount}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <AccessTimeIcon fontSize="small" /> Extensions
                </Box>
              </Badge>
            }
          />
          <Tab label="Settings" />
        </Tabs>
      </Paper>

      {/* ----------------------------- */}
      {/* EXTENSIONS TAB */}
      {/* ----------------------------- */}
      {tab === 3 && (
        <Paper sx={{ p: 3 }}>
          {loadingExtensions ? (
            <Box sx={{ textAlign: "center", p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <ExtensionRequests
              teamId={teamId}
              isAdminOrManager={canEditTasks}
              pendingExtensions={pendingExtensions}
              onApprove={handleApproveExtension}
              onReject={handleRejectExtension}
              refreshData={() => {
                fetchPendingExtensions();
                fetchTeamTasks();
              }}
            />
          )}
        </Paper>
      )}

      {/* (Other tabs remain unchanged — for brevity not repeated here) */}

      {/* EDIT TEAM DIALOG */}
      <Dialog
        open={editTeamDialog}
        onClose={() => setEditTeamDialog(false)}
      >
        <DialogTitle>Edit Team</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <TextField
              label="Team Name"
              value={teamFormData.name}
              onChange={(e) =>
                setTeamFormData({ ...teamFormData, name: e.target.value })
              }
              required
              fullWidth
            />

            <TextField
              label="Description"
              value={teamFormData.description}
              onChange={(e) =>
                setTeamFormData({
                  ...teamFormData,
                  description: e.target.value,
                })
              }
              multiline
              rows={3}
              fullWidth
            />

            <Box>
              <Typography sx={{ mb: 1 }}>Team Color</Typography>
              <input
                type="color"
                value={teamFormData.color}
                onChange={(e) =>
                  setTeamFormData({
                    ...teamFormData,
                    color: e.target.value,
                  })
                }
                style={{
                  width: "100%",
                  height: "40px",
                  borderRadius: "6px",
                  border: "1px solid #ccc",
                }}
              />
            </Box>

            <TextField
              label="Icon (emoji)"
              value={teamFormData.icon}
              onChange={(e) =>
                setTeamFormData({ ...teamFormData, icon: e.target.value })
              }
              fullWidth
              placeholder="🚀"
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
