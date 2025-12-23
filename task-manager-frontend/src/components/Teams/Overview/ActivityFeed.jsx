import React from "react";
import {
  Paper,
  Typography,
  Stack,
  Box,
  Divider,
} from "@mui/material";

/*
  ActivityFeed
  ------------
  Props:
  - activities: []
*/

const renderText = (activity) => {
  switch (activity.action) {
    case "task_created":
      return "Task created";

    case "status_changed":
      return `Status updated to ${activity.meta?.to}`;

    case "assigned":
      return `Assigned to ${activity.meta?.user}`;

    case "overdue":
      return "Task became overdue";

    default:
      return "Activity updated";
  }
};


const ActivityFeed = ({ activities = [] }) => {
  return (
    <Paper sx={{ p: 3, borderRadius: 3 }}>
      <Typography variant="h6" fontWeight={700}>
        Recent Activity
      </Typography>

      <Divider sx={{ my: 2 }} />

      {activities.length === 0 ? (
        <Typography color="text.secondary">
          No recent activity
        </Typography>
      ) : (
        <Stack spacing={2}>
          {activities.map((a) => (
            <Box key={a.id}>
              <Typography variant="body2">
                <strong>{a.taskTitle}</strong> — {renderText(a)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {new Date(a.createdAt).toLocaleString()}
              </Typography>
            </Box>
          ))}
        </Stack>
      )}
    </Paper>
  );
};

export default ActivityFeed;
