import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
} from "@mui/material";
import { teamsAPI } from "../services/api";

export default function JoinTeam() {
  const { inviteCode } = useParams();
  const navigate = useNavigate();

  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  // Fetch team details for the invite code
  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const res = await teamsAPI.getTeamInvite(inviteCode);
        setTeam(res.data);
      } catch (err) {
        setError("Invalid or expired invite link.");
      } finally {
        setLoading(false);
      }
    };
    fetchTeam();
  }, [inviteCode]);

  const handleJoin = async () => {
    try {
      setJoining(true);
      const res = await teamsAPI.acceptInvite(inviteCode);

      // redirect to the team page
      navigate(`/teams/${res.data.teamId}`);
    } catch (err) {
      console.error(err);
      setError("Unable to join team.");
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ textAlign: "center", mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ textAlign: "center", mt: 10 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        maxWidth: 450,
        mx: "auto",
        mt: 10,
        p: 2,
      }}
    >
      <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
        <CardContent sx={{ textAlign: "center" }}>
          <Box
            sx={{
              width: 70,
              height: 70,
              borderRadius: "50%",
              background: team.color || "#1976d2",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              mx: "auto",
              mb: 2,
              fontSize: "2.2rem",
            }}
          >
            {team.icon}
          </Box>

          <Typography variant="h5" fontWeight={700}>
            Join {team.name}
          </Typography>

          <Typography
            sx={{ mt: 1, mb: 3, color: "text.secondary", fontSize: "0.95rem" }}
          >
            {team.description}
          </Typography>

          <Button
            fullWidth
            variant="contained"
            size="large"
            sx={{ textTransform: "none", borderRadius: 2 }}
            onClick={handleJoin}
            disabled={joining}
          >
            {joining ? "Joining..." : "Join Team"}
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}
