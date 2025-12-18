import React from "react";
import { Grid, Paper, Typography, Box } from "@mui/material";
import AssignmentIcon from "@mui/icons-material/Assignment";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import HourglassBottomIcon from "@mui/icons-material/HourglassBottom";

/*
  Team KPI Row
  ------------
  stats = {
    total,
    completed,
    overdue,
    pending
  }
*/

const TeamKPIs = ({ stats }) => {
  const completionRate =
    stats.total === 0
      ? 0
      : Math.round((stats.completed / stats.total) * 100);

  return (
    <Grid container spacing={2}>
      <KpiCard
        label="Total Tasks"
        value={stats.total}
        icon={<AssignmentIcon />}
        color="#1976d2"
      />

      <KpiCard
        label="Completed"
        value={`${stats.completed} (${completionRate}%)`}
        icon={<CheckCircleIcon />}
        color="#2e7d32"
      />

      <KpiCard
        label="Overdue"
        value={stats.overdue}
        icon={<WarningAmberIcon />}
        color="#d32f2f"
      />

      <KpiCard
        label="Pending"
        value={stats.pending}
        icon={<HourglassBottomIcon />}
        color="#ed6c02"
      />
    </Grid>
  );
};

/* ---------------- KPI CARD ---------------- */

const KpiCard = ({ label, value, icon, color }) => (
  <Grid item xs={12} sm={6} md={3}>
    <Paper
      sx={{
        p: 2,
        borderRadius: 3,
        height: "100%",
        display: "flex",
        alignItems: "center",
        gap: 2,
      }}
    >
      <Box
        sx={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: `${color}22`,
          color,
        }}
      >
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
  </Grid>
);

export default TeamKPIs;
