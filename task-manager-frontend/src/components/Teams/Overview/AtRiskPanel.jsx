import React from "react";
import {
  Paper,
  Typography,
  Stack,
  Box,
  Chip,
} from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import { styles } from "./overview.styles";

const AtRiskPanel = ({ tasks = [] }) => {
  return (
    <Box sx={styles.atRiskContainer}>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
        At Risk Tasks
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Tasks due within the next 48 hours
      </Typography>

      <Box sx={styles.atRiskContent}>
        {tasks.length === 0 ? (
          <Box sx={styles.emptyStateContainer}>
            <Box sx={styles.emptyStateIcon}>🎉</Box>
            <Typography sx={styles.emptyStateText}>
              No tasks at risk
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Everything is on track
            </Typography>
          </Box>
        ) : (
          <Stack spacing={2}>
            {tasks.map((t) => (
              <Box key={t._id} sx={styles.atRiskTaskItem}>
                <Typography fontWeight={600} color="warning.main">
                  {t.title}
                </Typography>

                <Typography variant="body2" color="text.secondary" sx={{ 
                  mt: 0.5,
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5
                }}>
                  <AccessTimeIcon fontSize="small" />
                  Due: {new Date(t.dueDate).toLocaleString()}
                </Typography>

                {t.assignedTo && (
                  <Chip
                    label={`Assigned to: ${t.assignedTo.name || "User"}`}
                    size="small"
                    sx={{ 
                      mt: 1,
                      backgroundColor: alpha("#ff9800", 0.1),
                      color: "warning.dark",
                      fontWeight: 500
                    }}
                  />
                )}
              </Box>
            ))}
          </Stack>
        )}
      </Box>
    </Box>
  );
};

export default AtRiskPanel;