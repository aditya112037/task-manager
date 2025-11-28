import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  Container,
  useTheme,
  Chip
} from "@mui/material";
import { Link } from "react-router-dom";
import GroupsIcon from "@mui/icons-material/Groups";
import { teamsAPI } from "../services/api";

const TeamsHome = () => {
  const theme = useTheme();

  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadTeams = async () => {
    try {
      const res = await teamsAPI.getTeams();
      setTeams(res.data);
    } catch (err) {
      console.error("Failed to load teams:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadTeams();
  }, []);

  if (loading) return <Typography>Loading teams...</Typography>;

  // -------------------------------
  // If user HAS TEAMS
  // -------------------------------
  if (teams.length > 0) {
    return (
      <Box>
        <Typography variant="h4" fontWeight="bold" sx={{ mb: 2 }}>
          Your Teams
        </Typography>

        <Container maxWidth="md">
          {teams.map((t) => (
            <Paper
              key={t._id}
              elevation={1}
              sx={{
                p: 3,
                mb: 2,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                cursor: "pointer",
              }}
              component={Link}
              to={`/teams/${t._id}`}
            >
              <Typography variant="h6">{t.name}</Typography>
              <Chip label={`${t.members.length} members`} />
            </Paper>
          ))}
        </Container>

        <Box sx={{ mt: 3 }}>
          <Button variant="contained" component={Link} to="/teams/create">
            Create New Team
          </Button>
        </Box>
      </Box>
    );
  }

  // -------------------------------
  // If NO teams → show empty state
  // -------------------------------
  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold">
          Teams
        </Typography>
      </Box>

      <Container maxWidth="md">
        <Paper
          elevation={1}
          sx={{
            p: 4,
            textAlign: "center",
          }}
        >
          <GroupsIcon sx={{ fontSize: 64, mb: 2 }} />
          <Typography variant="h5" sx={{ mb: 2 }}>
            You are not part of any team yet
          </Typography>

          <Box sx={{ display: "flex", gap: 2, justifyContent: "center" }}>
            <Button variant="contained" to="/teams/create" component={Link}>
              Create New Team
            </Button>
            <Button variant="outlined" to="/join-team" component={Link}>
              Join With Invite Code
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default TeamsHome;
