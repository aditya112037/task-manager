import React, { useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Container,
  useTheme,
  Alert,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { teamsAPI } from "../services/api"; // Make sure this import is correct

const CreateTeam = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [teamName, setTeamName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreateTeam = async () => {
  if (!teamName.trim()) {
    setError("Please enter a team name");
    return;
  }

  setLoading(true);
  setError("");

  try {
    const response = await teamsAPI.createTeam({
      name: teamName,
      description: "",
      color: "#1976d2",
      icon: "group"
    });

    navigate(`/teams/${response.data._id}`);
  } catch (err) {
    setError("Failed to create team. Please try again.");
  } finally {
    setLoading(false);
  }
};


  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" sx={{ color: theme.palette.text.primary, mb: 1 }}>
          Create New Team
        </Typography>
        <Typography variant="body1" sx={{ color: theme.palette.text.secondary }}>
          Create a new team to start collaborating
        </Typography>
      </Box>

      <Container maxWidth="sm" sx={{ px: { xs: 2, sm: 3 } }}>
        <Paper
          elevation={1}
          sx={{
            p: 4,
            backgroundColor: theme.palette.background.paper,
            border: theme.palette.mode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
            borderRadius: 2,
          }}
        >
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <TextField
            fullWidth
            label="Team Name"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="Enter your team name"
            sx={{ mb: 3 }}
          />

          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={handleCreateTeam}
            disabled={loading}
            sx={{
              textTransform: "none",
              py: 1.5,
            }}
          >
            {loading ? "Creating Team..." : "Create Team"}
          </Button>
        </Paper>
      </Container>
    </Box>
  );
};

export default CreateTeam;