import React from "react";
import { Grid, Paper, Typography, Box } from "@mui/material";
import AssignmentIcon from "@mui/icons-material/Assignment";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import HourglassBottomIcon from "@mui/icons-material/HourglassBottom";
import { styles } from "./overview.styles";

const TeamKPIs = ({ stats }) => {
  const completionRate =
    stats.total === 0
      ? 0
      : Math.round((stats.completed / stats.total) * 100);

  return (
    <Box sx={{ mb: 3 }}>
      <Grid
        container
        spacing={2}
        alignItems="stretch"
        sx={{
          width: "100%",
          m: 0,              // removes grid margin bleed
        }}
      >
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            label="Total Tasks"
            value={stats.total}
            icon={<AssignmentIcon />}
            color="#1976d2"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            label="Completed"
            value={`${stats.completed} (${completionRate}%)`}
            icon={<CheckCircleIcon />}
            color="#2e7d32"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            label="Overdue"
            value={stats.overdue}
            icon={<WarningAmberIcon />}
            color="#d32f2f"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            label="Pending"
            value={stats.pending}
            icon={<HourglassBottomIcon />}
            color="#ed6c02"
          />
        </Grid>
      </Grid>
    </Box>
  );
};

/* ---------------- KPI CARD ---------------- */
const KpiCard = ({ label, value, icon, color }) => (
  <Paper
    sx={{
      ...styles.kpiCard,
      height: "100%",                 // equal height cards
      display: "flex",
      alignItems: "center",
      gap: 2,
    }}
  >
    <Box sx={styles.kpiIconContainer(color)}>
      {icon}
    </Box>

    <Box>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h6" fontWeight={700}>
        {value}
      </Typography>
    </Box>
  </Paper>
);

export default TeamKPIs;
