import React, { useEffect, useState } from "react";
import { Box, Tabs, Tab, Typography, CircularProgress } from "@mui/material";
import TaskList from "../components/Task/TaskList";
import TeamTaskItem from "../components/Teams/TeamTaskItem";
import { teamsAPI } from "../services/teamsAPI";

const Dashboard = () => {
  const [tab, setTab] = useState(0);
  const [teamTasks, setTeamTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const handleTabChange = (e, newValue) => {
    setTab(newValue);
  };

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
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" fontWeight="bold" sx={{ mb: 2 }}>
        Dashboard
      </Typography>

      <Tabs
        value={tab}
        onChange={handleTabChange}
        sx={{ mb: 3 }}
        textColor="primary"
        indicatorColor="primary"
      >
        <Tab label="My Tasks" />
        <Tab label="Team Tasks" />
      </Tabs>

      {/* PERSONAL TASKS TAB */}
      {tab === 0 && (
        <TaskList />
      )}

      {/* TEAM TASKS TAB */}
      {tab === 1 && (
        <Box>
          {loading ? (
            <CircularProgress />
          ) : teamTasks.length > 0 ? (
            teamTasks.map((task) => (
              <TeamTaskItem key={task._id} task={task} />
            ))
          ) : (
            <Typography>No team tasks yet.</Typography>
          )}
        </Box>
      )}
    </Box>
  );
};

export default Dashboard;
