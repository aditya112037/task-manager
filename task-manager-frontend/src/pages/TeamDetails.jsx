import React from "react";
import {
  Box,
  Typography,
  Avatar,
  Tabs,
  Tab,
  Paper,
  Divider,
  Stack,
  Button
} from "@mui/material";
import { useParams } from "react-router-dom";

export default function TeamDetails() {
  const { teamId } = useParams();
  const [tab, setTab] = React.useState(0);

  return (
    <Box sx={{ p: 2 }}>
      {/* TEAM HEADER */}
      <Paper
        sx={{
          p: 3,
          borderRadius: 3,
          mb: 3,
          boxShadow: "0 4px 15px rgba(0,0,0,0.08)"
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar
            src=""
            sx={{ width: 70, height: 70, bgcolor: "primary.main", fontSize: 28 }}
          >
            T
          </Avatar>

          <Box>
            <Typography variant="h5" fontWeight={700}>
              Team Name (placeholder)
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Short description of the team goes here.
            </Typography>
          </Box>
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Tabs
          value={tab}
          onChange={(e, newVal) => setTab(newVal)}
          sx={{ mb: 1 }}
        >
          <Tab label="Overview" />
          <Tab label="Members" />
          <Tab label="Tasks" />
          <Tab label="Settings" />
        </Tabs>
      </Paper>

      {/* TAB CONTENT */}
      {tab === 0 && (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={700}>
            Overview
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            This is the Overview section. Will show team stats, activity,
            deadlines, etc.
          </Typography>
        </Paper>
      )}

      {tab === 1 && (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={700}>
            Members
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            List of team members will appear here.
          </Typography>
        </Paper>
      )}

      {tab === 2 && (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={700}>
            Team Tasks
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            Tasks belonging to this team will be listed here.
          </Typography>

          <Button
            variant="contained"
            sx={{ mt: 2, borderRadius: 2, textTransform: "none" }}
          >
            Add Team Task
          </Button>
        </Paper>
      )}

      {tab === 3 && (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={700}>
            Settings
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            Team settings (rename, change icon/color, manage roles, delete team)
          </Typography>
        </Paper>
      )}
    </Box>
  );
}
