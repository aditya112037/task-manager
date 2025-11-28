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
import { useParams, useNavigate } from "react-router-dom";

const JoinTeam = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { inviteCode } = useParams();
  const [code, setCode] = useState(inviteCode || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleJoinTeam = async () => {
  if (!code.trim()) {
    setError("Please enter an invite code");
    return;
  }

  setLoading(true);
  setError("");

  try {
    const res = await teamsAPI.joinTeam(code);
    navigate(`/teams/${code}`);
  } catch (err) {
    setError("Failed to join team.");
  } finally {
    setLoading(false);
  }
};


  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          fontWeight="bold"
          sx={{ color: theme.palette.text.primary, mb: 1 }}
        >
          Join Team
        </Typography>
        <Typography
          variant="body1"
          sx={{ color: theme.palette.text.secondary }}
        >
          Enter an invite code to join a team
        </Typography>
      </Box>

      {/* Join Form */}
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
            label="Invite Code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter team invite code"
            sx={{ mb: 3 }}
          />

          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={handleJoinTeam}
            disabled={loading}
            sx={{
              textTransform: "none",
              py: 1.5,
            }}
          >
            {loading ? "Joining Team..." : "Join Team"}
          </Button>
        </Paper>
      </Container>
    </Box>
  );
};

export default JoinTeam;