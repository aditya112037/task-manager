import React from "react";
import { Box, Grid, Paper, Typography } from "@mui/material";
import {
  getTaskStats,
  getStatusDistribution,
} from "./overview.utils";

/*
  Team Analytics (SAFE BASE)
  -------------------------
  Props:
  - team
  - tasks
  - myRole
*/

const TeamAnalytics = ({ team, tasks = [], myRole }) => {
  const stats = getTaskStats(tasks);
  const statusDist = getStatusDistribution(tasks);

  return (
    <Box sx={{ width: "100%" }}>
      {/* ================= KPI ROW ================= */}
      <Grid container spacing={2}>
        <KpiCard label="Total Tasks" value={stats.total} />
        <KpiCard label="Completed" value={stats.completed} />
        <KpiCard label="Overdue" value={stats.overdue} />
        <KpiCard label="Pending" value={stats.pending} />
      </Grid>

      {/* ================= STATUS BREAKDOWN ================= */}
      <Paper sx={{ p: 3, mt: 3, borderRadius: 3 }}>
        <Typography variant="h6" fontWeight={700}>
          Task Status Breakdown
        </Typography>

        <Box sx={{ mt: 2 }}>
          {Object.entries(statusDist).map(([status, count]) => (
            <Typography key={status} sx={{ mt: 0.5 }}>
              {status.toUpperCase()}: <strong>{count}</strong>
            </Typography>
          ))}
        </Box>
      </Paper>
    </Box>
  );
};

/* ---------------- KPI CARD ---------------- */

const KpiCard = ({ label, value }) => (
  <Grid item xs={12} sm={6} md={3}>
    <Paper sx={{ p: 2, borderRadius: 2 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h5" fontWeight={700}>
        {value}
      </Typography>
    </Paper>
  </Grid>
);

export default TeamAnalytics;
