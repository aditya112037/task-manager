import React from "react";
import {
  Paper,
  Typography,
  Box,
  Stack,
  Chip,
} from "@mui/material";
import { styles, getDeliveryColor } from "./overview.styles";

const DeliveryHealth = ({ data }) => {
  if (!data || data.total === 0) {
    return (
      <Box sx={styles.analyticsCard}>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
          Delivery Health
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 2 }}>
          No task data available
        </Typography>
      </Box>
    );
  }

  const completionRate = data.total > 0 
    ? Math.round((data.completed / data.total) * 100)
    : 0;

  return (
    <Box sx={styles.analyticsCard}>
      <Typography variant="h6" textAlign={"center"} fontWeight={700} sx={{ mb: 1 }}>
        Delivery Health
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Task delivery status overview
      </Typography>

      <Stack direction="row" sx={styles.deliveryChipContainer}>
        <Chip
          label={`Completed: ${data.completed}`}
          sx={styles.deliveryChip(getDeliveryColor("completed"))}
        />
        <Chip
          label={`On Track: ${data.onTrack}`}
          sx={styles.deliveryChip(getDeliveryColor("onTrack"))}
        />
        <Chip
          label={`Overdue: ${data.overdue}`}
          sx={styles.deliveryChip(getDeliveryColor("overdue"))}
        />
      </Stack>

      <Box sx={styles.totalTasksContainer}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
          Total Tasks
        </Typography>
        <Typography variant="h4" fontWeight={700} color="primary">
          {data.total}
        </Typography>
        
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
          Completion rate: <strong>{completionRate}%</strong>
        </Typography>
      </Box>
    </Box>
  );
};

export default DeliveryHealth;