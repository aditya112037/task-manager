import React from "react";
import { Box, Grid } from "@mui/material";

import {
  getTaskStats,
  getStatusDistribution,
} from "./overview.utils";

import { getActivityFeed } from "./overview.utils";
import ActivityFeed from "./ActivityFeed";


import { getWorkloadByMember } from "./overview.utils";
import WorkloadChart from "./WorkloadChart";

import { getDeliveryHealth } from "./overview.utils";
import DeliveryHealth from "./DeliveryHealth";

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
  const deliveryHealth = getDeliveryHealth(tasks);
  const activities = getActivityFeed(tasks, 10);



  return (
    <Box sx={{ width: "100%" }}>
      
      {/* ================= KPI ROW ================= */}
      <TeamKPIs stats={stats} />

      <Grid container spacing={3} sx={{ mt: 3 }}>
  <Grid item xs={12} md={6}>
    <WorkloadChart data={workload} />
  </Grid>
    </Grid>


      {/* ================= STATUS DONUT ================= */}
      <Grid container spacing={3} sx={{ mt: 3 }}>
        <Grid item xs={12} md={6}>
          <StatusDonut data={statusDist} />
        </Grid>
      </Grid>

      {/* ================= DELIVERY HEALTH ================= */}
<Grid container spacing={3} sx={{ mt: 3 }}>
  <Grid item xs={12} md={6}>
    <DeliveryHealth data={deliveryHealth} />
  </Grid>
</Grid>

    {/* ================= ACTIVITY FEED ================= */}
<Grid container spacing={3} sx={{ mt: 3 }}>
  <Grid item xs={12}>
    <ActivityFeed activities={activities} />
  </Grid>
</Grid>

    </Box>
  );
};

export default TeamAnalytics;
