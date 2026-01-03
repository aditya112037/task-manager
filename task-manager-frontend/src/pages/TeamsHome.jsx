import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  Container,
  useTheme,
  CircularProgress,
  Grid,
  Avatar,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import GroupsIcon from "@mui/icons-material/Groups";
import { teamsAPI } from "../services/api";
import { joinTeamRoom, leaveTeamRoom } from "../services/socket";

const TeamsHome = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState([]);
  const [openJoinModal, setOpenJoinModal] = useState(false);
  const [inviteInput, setInviteInput] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);

  useEffect(() => {
    loadTeams();
  }, []);



  const handleJoinSubmit = async () => {
    if (!inviteInput.trim()) {
      setJoinError("Please enter an invite code");
      return;
    }

    // Extract invite code from input (accept both URL and code)
    let code = inviteInput.trim();
    if (code.includes("/join/")) {
      const parts = code.split("/join/");
      code = parts[parts.length - 1];
    }

    setJoinLoading(true);
    setJoinError("");

    try {
      // Call your API to join team
      await teamsAPI.joinTeam(code);
      
      // Refresh teams list and close modal
      await loadTeams();
      setOpenJoinModal(false);
      setInviteInput("");
      
      // Optionally show success message or navigate to the joined team
      // You might need to get the team ID from the joinTeam response
    } catch (err) {
      setJoinError(err.response?.data?.message || "Failed to join team. Please check the invite code.");
      console.error("Join team error:", err);
    } finally {
      setJoinLoading(false);
    }
  };

  const loadTeams = async () => {
    try {
      const res = await teamsAPI.getTeams();
      setTeams(res.data || []);
    } catch (err) {
      console.error("Failed to fetch teams:", err);
    }
    setLoading(false);
  };

  // -----------------------------
  // LOADING STATE
  // -----------------------------
  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  // -----------------------------
  // JOIN TEAM MODAL
  // -----------------------------
  const JoinTeamModal = () => (
    <Dialog
      open={openJoinModal}
      onClose={() => {
        setOpenJoinModal(false);
        setInviteInput("");
        setJoinError("");
      }}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Join a Team</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Enter the invite code shared by the team admin
        </Typography>
        
        {joinError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {joinError}
          </Alert>
        )}
        
        <TextField
          autoFocus
          fullWidth
          label="Invite Code"
          value={inviteInput}
          onChange={(e) => setInviteInput(e.target.value)}
          placeholder="e.g., ABC123 or https://yourdomain.com/join/ABC123"
          variant="outlined"
          onKeyPress={(e) => {
            if (e.key === "Enter") {
              handleJoinSubmit();
            }
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => {
            setOpenJoinModal(false);
            setInviteInput("");
            setJoinError("");
          }}
          disabled={joinLoading}
        >
          Cancel
        </Button>
        <Button
          onClick={handleJoinSubmit}
          variant="contained"
          disabled={joinLoading || !inviteInput.trim()}
        >
          {joinLoading ? "Joining..." : "Join Team"}
        </Button>
      </DialogActions>
    </Dialog>
  );

  // -----------------------------
  // EMPTY STATE
  // -----------------------------
  if (teams.length === 0) {
    return (
      <Box>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" fontWeight="bold">
            Teams
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your teams and collaborate with others
          </Typography>
        </Box>

        <Container maxWidth="md">
          <Paper
            sx={{
              p: 4,
              textAlign: "center",
              borderRadius: 2,
            }}
          >
            <GroupsIcon sx={{ fontSize: 64, mb: 2, color: "primary.main" }} />

            <Typography variant="h5" sx={{ mb: 2 }}>
              You are not part of any team yet
            </Typography>

            <Typography sx={{ mb: 4, maxWidth: 400, mx: "auto" }}>
              Create a new team or join an existing one.
            </Typography>

            <Box sx={{ display: "flex", gap: 2, justifyContent: "center" }}>
              <Button 
                variant="contained" 
                component={Link} 
                to="/teams/create"
                size="large"
              >
                Create New Team
              </Button>

              <Button
                variant="outlined"
                size="large"
                sx={{ textTransform: "none" }}
                onClick={() => setOpenJoinModal(true)}
              >
                Join Team
              </Button>
            </Box>
          </Paper>
        </Container>
        
        <JoinTeamModal />
      </Box>
    );
  }

  // -----------------------------
  // TEAM LIST (NON EMPTY)
  // -----------------------------
  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold">
          Your Teams
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your teams and collaborate with others
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {teams.map((team) => (
          <Grid item xs={12} sm={6} md={4} key={team._id}>
            <Paper
              sx={{
                p: 3,
                borderRadius: 3,
                cursor: "pointer",
                transition: "0.2s",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: theme.shadows[4],
                },
              }}
              onClick={() => navigate(`/teams/${team._id}`)}
            >
              <Avatar
                sx={{
                  width: 60,
                  height: 60,
                  mb: 2,
                  bgcolor: team.color || "#1976d2",
                  fontSize: 30,
                }}
              >
                {team.icon || "👥"}
              </Avatar>

              <Typography variant="h6" fontWeight={600}>
                {team.name}
              </Typography>

              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {team.members?.length || 0} members
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mt: 4, display: "flex", gap: 2 }}>
        <Button 
          variant="contained" 
          component={Link} 
          to="/teams/create"
        >
          Create New Team
        </Button>
        
        <Button
          variant="outlined"
          onClick={() => setOpenJoinModal(true)}
        >
          Join Another Team
        </Button>
      </Box>
      
      <JoinTeamModal />
    </Box>
  );
};

export default TeamsHome;