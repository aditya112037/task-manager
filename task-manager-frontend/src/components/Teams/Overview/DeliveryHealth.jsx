import React from "react";
import {
  Paper,
  Typography,
  Box,
  Stack,
  Chip,
} from "@mui/material";

/*
  DeliveryHealth
  --------------
  Props:
  - data: { completed, overdue, onTrack, total }
*/

const DeliveryHealth = ({ data }) => {
  if (!data || data.total === 0) {
    return (
      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Typography variant="h6" fontWeight={700}>
          Delivery Health
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 2 }}>
          No task data available
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, borderRadius: 3 }}>
      <Typography variant="h6" fontWeight={700}>
        Delivery Health
      </Typography>

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mt: 0.5 }}
      >
        Task delivery status overview
      </Typography>

      <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
        <Chip
          label={`Completed: ${data.completed}`}
          color="success"
          variant="outlined"
        />
        <Chip
          label={`On Track: ${data.onTrack}`}
          color="primary"
          variant="outlined"
        />
        <Chip
          label={`Overdue: ${data.overdue}`}
          color="error"
          variant="outlined"
        />
      </Stack>

      <Box sx={{ mt: 3 }}>
        <Typography variant="body2" color="text.secondary">
          Total Tasks
        </Typography>
        <Typography variant="h5" fontWeight={700}>
          {data.total}
        </Typography>
      </Box>
    </Paper>
  );
};

export default DeliveryHealth;
