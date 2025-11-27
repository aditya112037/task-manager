import React, { useEffect, useState } from "react";
import {
  Box,
  Tabs,
  Tab,
  Typography,
  CircularProgress,
  useTheme,
  Paper,
} from "@mui/material";

import TaskList from "../components/Task/TaskList";
import TeamTaskItem from "../components/Teams/TeamTaskItem";
import { teamsAPI } from "../services/teamsAPI";

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
    <Box
      sx={{
        p: 2,
        backgroundColor: theme.palette.background.default,
        minHeight: "calc(100vh - 64px)",
      }}
    >
      {/* PAGE TITLE */}
      <Typography
        variant="h4"
        fontWeight="bold"
        sx={{ mb: 3, color: theme.palette.text.primary }}
      >
        Dashboard
      </Typography>

      {/* TABS */}
      <Paper
        elevation={0}
        sx={{
          backgroundColor: theme.palette.background.paper,
          borderRadius: 2,
          mb: 3,
          p: 1,
        }}
      >
        <Tabs
          value={tab}
          onChange={handleTabChange}
          textColor="primary"
          indicatorColor="primary"
          sx={{
            "& .MuiTab-root": { textTransform: "none", fontWeight: 600 },
          }}
        >
          <Tab label="My Tasks" />
          <Tab label="Team Tasks" />
        </Tabs>
      </Paper>

      {/* PERSONAL TASKS TAB */}
      {tab === 0 && <TaskList />}

      {/* TEAM TASKS TAB */}
      {tab === 1 && (
        <Box sx={{ mt: 1 }}>
          {loading ? (
            <Box sx={{ py: 5, textAlign: "center" }}>
              <CircularProgress />
            </Box>
          ) : teamTasks.length > 0 ? (
            teamTasks.map((task) => (
              <TeamTaskItem
                key={task._id}
                task={task}
                isAdmin={task?.teamRole === "admin"} // you can adjust this
              />
            ))
          ) : (
            <Typography
              sx={{
                mt: 4,
                textAlign: "center",
                color: theme.palette.text.secondary,
              }}
            >
              No team tasks yet.
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
};

export default Dashboard;
