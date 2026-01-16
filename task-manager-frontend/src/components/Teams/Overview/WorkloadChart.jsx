import React from "react";
import {
  
  Typography,
  Box,
  LinearProgress,
  
} from "@mui/material";
import { styles } from "./overview.styles";

const WorkloadChart = ({ data = [] }) => {
  const sortedData = [...data].sort((a, b) => b.count - a.count);
  const max = Math.max(...sortedData.map((d) => d.count), 1);

  return (
    <Box sx={styles.analyticsCard}>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
        Team Workload
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Tasks assigned per member
      </Typography>

      <Box sx={styles.workloadList}>
        {sortedData.length === 0 ? (
          <Box sx={styles.emptyStateContainer}>
            <Typography sx={styles.emptyStateText}>
              No workload data available
            </Typography>
          </Box>
        ) : (
          sortedData.map((item) => (
            <Box key={item.id} sx={styles.workloadItem}>
              <Box sx={styles.workloadHeader}>
                <Typography variant="body2" fontWeight={500}>
                  {item.name}
                </Typography>
                <Typography variant="body2" fontWeight={600} color="primary">
                  {item.count} task{item.count !== 1 ? 's' : ''}
                </Typography>
              </Box>

              <LinearProgress
                variant="determinate"
                value={(item.count / max) * 100}
                sx={styles.workloadProgress}
              />
            </Box>
          ))
        )}
      </Box>
    </Box>
  );
};

export default WorkloadChart;