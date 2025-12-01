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
  Avatar
} from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import GroupsIcon from "@mui/icons-material/Groups";
import { teamsAPI } from "../services/api";

const TeamsHome = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    loadTeams();
  }, []);

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
  if (loading) return <CircularProgress />;

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
            <GroupsIcon sx={{ fontSize: 64, mb: 2 }} />

            <Typography variant="h5" sx={{ mb: 2 }}>
              You are not part of any team yet
            </Typography>

            <Typography sx={{ mb: 4, maxWidth: 400, mx: "auto" }}>
              Create a new team or join an existing one.
            </Typography>

            <Box sx={{ display: "flex", gap: 2, justifyContent: "center" }}>
              <Button variant="contained" component={Link} to="/teams/create">
                Create New Team
              </Button>

              <Button variant="outlined" component={Link} to="/join-team">
                Join With Invite Code
              </Button>
            </Box>
          </Paper>
        </Container>
      </Box>
    );
  }

  // -----------------------------
  // TEAM LIST (NON EMPTY)
  // -----------------------------
  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" sx={{ mb: 3 }}>
        Your Teams
      </Typography>

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
                  transform: "scale(1.02)",
                  boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
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
                {team.members.length} members
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mt: 4 }}>
        <Button variant="contained" component={Link} to="/teams/create">
          Create New Team
        </Button>
      </Box>
    </Box>
  );
};

export default TeamsHome;
