import React, { useEffect, useState } from "react";
import { Box, Typography, Button, Grid, CircularProgress } from "@mui/material";
import { teamsAPI } from "../services/teamsAPI";
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
      setTeams(res.data);
    } catch (error) {
      console.error("Error fetching teams:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* HEADER */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
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

      {/* JOIN TEAM BUTTON */}
      <Button
        variant="outlined"
        sx={{
          borderRadius: 2,
          textTransform: "none",
          mb: 3,
        }}
        href="/join/code-placeholder"
      >
        Join Team With Invite Code
      </Button>

      {/* TEAMS GRID */}
      {teams.length === 0 ? (
        <Typography sx={{ mt: 4 }} color="text.secondary">
          You are not part of any team yet.
        </Typography>
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
