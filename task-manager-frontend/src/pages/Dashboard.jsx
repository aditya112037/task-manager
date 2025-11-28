import React, { useEffect, useState } from "react";
import {
  Box,
  Tabs,
  Tab,
  Typography,
  CircularProgress,
  Paper,
  useTheme,
} from "@mui/material";

import TaskList from "../components/Task/TaskList";
import TeamTaskItem from "../components/Teams/TeamTaskItem";
import { teamsAPI } from "../services/api";

const Dashboard = () => {
  const theme = useTheme();

  const [tab, setTab] = useState(0);
  const [teamTasks, setTeamTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const handleTabChange = (_, newValue) => setTab(newValue);

  useEffect(() => {
    fetchTeamTasks();
  }, []);

  const fetchTeamTasks = async () => {
    try {
      const response = await teamsAPI.getAllMyTeamTasks();
      setTeamTasks(response.data);
    } catch (err) {
      console.error("Error loading team tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ pt: 1 }}> {/* Reduced top padding */}
      <Typography
        variant="h4"
        fontWeight="bold"
        sx={{ mb: 2, color: theme.palette.text.primary }} // Reduced mb from 3 to 2
      >
        Dashboard
      </Typography>

      {/* TABS */}
      <Paper
        elevation={1}
        sx={{
          backgroundColor: theme.palette.background.paper,
          borderRadius: 2,
          mb: 2, // Reduced from 3 to 2
          p: 1,
          border: theme.palette.mode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
        }}
      >
        <Tabs
          value={tab}
          onChange={handleTabChange}
          textColor="primary"
          indicatorColor="primary"
          sx={{
            "& .MuiTab-root": {
              textTransform: "none",
              fontWeight: 600,
              fontSize: '0.95rem',
              minHeight: '48px',
            },
          }}
        >
          <Tab label="My Tasks" />
          <Tab label="Team Tasks" />
        </Tabs>
      </Paper>

      {/* PERSONAL TASKS */}
      {tab === 0 && <TaskList />}

      {/* TEAM TASKS */}
      {tab === 1 && (
        <Box>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}> {/* Reduced py */}
              <CircularProgress />
            </Box>
          ) : teamTasks.length > 0 ? (
            teamTasks.map((task) => (
              <TeamTaskItem
                key={task._id}
                task={task}
                isAdmin={task?.teamRole === "admin"}
              />
            ))
          ) : (
            <Paper
              elevation={1}
              sx={{
                textAlign: "center",
                p: 3, // Reduced from 4 to 3
                backgroundColor: theme.palette.background.paper,
                border: theme.palette.mode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
              }}
            >
              <Typography
                sx={{
                  color: theme.palette.text.secondary,
                }}
              >
                No team tasks yet.
              </Typography>
            </Paper>
          )}
        </Box>
      )}
    </Box>
  );
};

export default Dashboard;