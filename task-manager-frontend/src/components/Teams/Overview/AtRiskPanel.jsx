import React from "react";
import {
  Paper,
  Typography,
  Stack,
  Box,
  Chip,
} from "@mui/material";

/*
  AtRiskPanel
  -----------
  Props:
  - tasks: []
*/

const AtRiskPanel = ({ tasks = [] }) => {
  return (
    <Paper sx={{ p: 3, borderRadius: 3 }}>
      <Typography variant="h6" fontWeight={700}>
        At Risk Tasks
      </Typography>

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mt: 0.5 }}
      >
        Tasks due within the next 48 hours
      </Typography>

      <Stack spacing={2} sx={{ mt: 3 }}>
        {tasks.length === 0 ? (
          <Typography color="text.secondary">
            No tasks at risk 🎉
          </Typography>
        ) : (
          tasks.map((t) => (
            <Box key={t._id}>
              <Typography fontWeight={600}>
                {t.title}
              </Typography>

              <Typography variant="body2" color="text.secondary">
                Due:{" "}
                {new Date(t.dueDate).toLocaleString()}
              </Typography>

              {t.assignedTo && (
                <Chip
                  label={`Assigned to: ${t.assignedTo.name || "User"}`}
                  size="small"
                  sx={{ mt: 0.5 }}
                />
              )}
            </Box>
          ))
        )}
      </Stack>
    </Paper>
  );
};

export default AtRiskPanel;
