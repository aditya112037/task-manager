import React from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  Container,
  useTheme,
} from "@mui/material";
import { Link } from "react-router-dom";
import GroupsIcon from "@mui/icons-material/Groups";

const TeamsHome = () => {
  const theme = useTheme();

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          fontWeight="bold"
          sx={{ color: theme.palette.text.primary, mb: 1 }}
        >
          Teams
        </Typography>
        <Typography
          variant="body1"
          sx={{ color: theme.palette.text.secondary }}
        >
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
            border: theme.palette.mode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
            borderRadius: 2,
          }}
        >
          <GroupsIcon
            sx={{
              fontSize: 64,
              color: theme.palette.text.secondary,
              mb: 2,
            }}
          />

          <Typography
            variant="h5"
            sx={{ mb: 2, color: theme.palette.text.primary }}
          >
            You are not part of any team yet
          </Typography>

          <Typography
            variant="body1"
            sx={{ mb: 4, color: theme.palette.text.secondary, maxWidth: 400, mx: 'auto' }}
          >
            Create a new team or join an existing one to start collaborating with others.
          </Typography>

          {/* Action Buttons */}
          <Box sx={{ display: "flex", gap: 2, justifyContent: "center", flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              size="large"
              component={Link}
              to="/teams/create"
              sx={{
                textTransform: "none",
                px: 4,
                py: 1,
              }}
            >
              Create New Team
            </Button>

            <Button
              variant="outlined"
              size="large"
              component={Link}
              to="/join-team"
              sx={{
                textTransform: "none",
                px: 4,
                py: 1,
              }}
            >
              Join With Invite Code
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default TeamsHome;