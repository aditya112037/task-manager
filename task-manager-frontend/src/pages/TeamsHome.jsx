import React, { useEffect, useState } from "react";
import { teamsAPI } from "../services/teamsAPI";
import { Box, Typography, Grid, Button, CircularProgress } from "@mui/material";
import TeamCard from "../components/Teams/TeamCard";

const TeamsHome = () => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      const res = await teamsAPI.getMyTeams();
      setTeams(res.data.teams);
    } catch (err) {
      console.error("Failed to load teams", err);
    }
    setLoading(false);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          mb: 3,
          alignItems: "center",
        }}
      >
        <Typography variant="h5" fontWeight={700}>
          My Teams
        </Typography>

        <Button
          variant="contained"
          sx={{ borderRadius: 2, textTransform: "none" }}
          href="/teams/create"
        >
          Create Team
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ textAlign: "center", mt: 10 }}>
          <CircularProgress />
        </Box>
      ) : teams.length === 0 ? (
        <Box sx={{ textAlign: "center", mt: 10 }}>
          <Typography variant="h6" color="text.secondary">
            You are not part of any team yet.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Create a new team or join via invite link.
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {teams.map((team) => (
            <Grid item xs={12} sm={6} md={4} key={team._id}>
              <TeamCard team={team} />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default TeamsHome;
