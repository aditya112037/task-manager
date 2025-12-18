import React from "react";
import {
  Paper,
  Typography,
  Box,
  LinearProgress,
  Stack,
} from "@mui/material";

/*
  WorkloadChart
  -------------
  Props:
  - data: [{ id, name, count }]
*/

const WorkloadChart = ({ data = [] }) => {
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <Paper sx={{ p: 3, borderRadius: 3 }}>
      <Typography variant="h6" fontWeight={700}>
        Team Workload
      </Typography>

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mt: 0.5 }}
      >
        Tasks assigned per member
      </Typography>

      <Stack spacing={2} sx={{ mt: 3 }}>
        {data.length === 0 && (
          <Typography color="text.secondary">
            No workload data available
          </Typography>
        )}

        {data.map((item) => (
          <Box key={item.id}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                mb: 0.5,
              }}
            >
              <Typography variant="body2">
                {item.name}
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {item.count}
              </Typography>
            </Box>

            <LinearProgress
              variant="determinate"
              value={(item.count / max) * 100}
              sx={{
                height: 8,
                borderRadius: 4,
              }}
            />
          </Box>
        ))}
      </Stack>
    </Paper>
  );
};

export default WorkloadChart;
