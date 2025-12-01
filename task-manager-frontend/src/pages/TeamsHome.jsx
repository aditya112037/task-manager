import React, { useState } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  Container,
  useTheme,
  Modal,
  TextField,
  Stack,
} from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import GroupsIcon from "@mui/icons-material/Groups";

const TeamsHome = () => {
  const theme = useTheme();
  const navigate = useNavigate();

  const [openJoinModal, setOpenJoinModal] = useState(false);
  const [inviteInput, setInviteInput] = useState("");

  const handleJoinSubmit = () => {
    if (!inviteInput.trim()) return;

    // Accept both full URL and only invite code
    const code = inviteInput.includes("/join/")
      ? inviteInput.split("/join/")[1]
      : inviteInput.trim();

    navigate(`/join/${code}`);
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" sx={{ color: theme.palette.text.primary, mb: 1 }}>
          Teams
        </Typography>
        <Typography variant="body1" sx={{ color: theme.palette.text.secondary }}>
          Manage your teams and collaborate with others
        </Typography>
      </Box>

      {/* Main Content */}
      <Container maxWidth="md" sx={{ px: { xs: 2, sm: 3 } }}>
        <Paper
          elevation={1}
          sx={{
            p: 4,
            textAlign: "center",
            backgroundColor: theme.palette.background.paper,
            border:
              theme.palette.mode === "dark"
                ? "1px solid rgba(255,255,255,0.1)"
                : "1px solid rgba(0,0,0,0.1)",
            borderRadius: 2,
          }}
        >
          <GroupsIcon sx={{ fontSize: 64, color: theme.palette.text.secondary, mb: 2 }} />

          <Typography variant="h5" sx={{ mb: 2 }}>
            You're not part of any team yet
          </Typography>

          <Typography variant="body1" sx={{ mb: 4, maxWidth: 400, mx: "auto" }}>
            Create a new team or join one using an invite link or code.
          </Typography>

          {/* Buttons */}
          <Stack direction="row" spacing={2} justifyContent="center">
            <Button
              variant="contained"
              size="large"
              component={Link}
              to="/teams/create"
              sx={{ textTransform: "none" }}
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
          </Stack>
        </Paper>
      </Container>

      {/* Join Modal */}
      <Modal open={openJoinModal} onClose={() => setOpenJoinModal(false)}>
        <Box
          sx={{
            width: 400,
            bgcolor: theme.palette.background.paper,
            p: 4,
            borderRadius: 2,
            mx: "auto",
            mt: "15vh",
            boxShadow: 24,
          }}
        >
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
            Join a Team
          </Typography>

          <TextField
            fullWidth
            label="Invite Link or Code"
            placeholder="Paste invite link or enter code"
            value={inviteInput}
            onChange={(e) => setInviteInput(e.target.value)}
            sx={{ mb: 3 }}
          />

          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button variant="text" onClick={() => setOpenJoinModal(false)}>
              Cancel
            </Button>

            <Button
              variant="contained"
              onClick={handleJoinSubmit}
              disabled={!inviteInput.trim()}
            >
              Join
            </Button>
          </Stack>
        </Box>
      </Modal>
    </Box>
  );
};

export default TeamsHome;
