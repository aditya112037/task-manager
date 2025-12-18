import React from "react";
import { Box, Grid } from "@mui/material";

import {
  getTaskStats,
  getStatusDistribution,
} from "./overview.utils";

import TeamKPIs from "./TeamKPIs";
import StatusDonut from "./StatusDonut";

/*
  Team Analytics
  --------------
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
      <TeamKPIs stats={stats} />

      {/* ================= STATUS DONUT ================= */}
      <Grid container spacing={3} sx={{ mt: 3 }}>
        <Grid item xs={12} md={6}>
          <StatusDonut data={statusDist} />
        </Grid>
      </Grid>

    </Box>
  );
};

export default TeamAnalytics;
