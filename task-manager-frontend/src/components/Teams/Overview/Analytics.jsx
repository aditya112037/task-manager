import React from "react";
import { Box, Grid } from "@mui/material";

import {
  getTaskStats,
  getStatusDistribution,
} from "./overview.utils";

import { getWorkloadByMember } from "./overview.utils";
import WorkloadChart from "./WorkloadChart";

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
  const workload = getWorkloadByMember(tasks, team?.members || []);


  return (
    <Box sx={{ width: "100%" }}>
      
      {/* ================= KPI ROW ================= */}
      <TeamKPIs stats={stats} />

      <Grid container spacing={3} sx={{ mt: 3 }}>
  <Grid item xs={12} md={6}>
    <WorkloadChart data={workload} />
  </Grid>

  <Grid item xs={12} md={6}>
    <StatusDonut data={statusDist} />
  </Grid>
</Grid>

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
