import React , { useMemo } from "react";
import { Box, Grid } from "@mui/material";

import {
  getTaskStats,
  getStatusDistribution,
} from "./overview.utils";

import { getAtRiskTasks } from "./overview.utils";
import AtRiskPanel from "./AtRiskPanel";


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
  const stats = useMemo(
  () => getTaskStats(tasks),
  [tasks]
);
const statusDist = useMemo(
  () => getStatusDistribution(tasks),
  [tasks]
);

const workload = useMemo(
  () => getWorkloadByMember(tasks, team?.members || []),
  [tasks, team?.members]
);

const deliveryHealth = useMemo(
  () => getDeliveryHealth(tasks),
  [tasks]
);

const atRiskTasks = useMemo(
  () => getAtRiskTasks(tasks, 48),
  [tasks]
);

const activities = useMemo(
  () => getActivityFeed(tasks, 10),
  [tasks]
);
  const isManagerView = myRole === "admin" || myRole === "manager";





  return (
    <Box sx={{ width: "100%" }}>
      
      {/* ================= KPI ROW ================= */}
      <TeamKPIs stats={stats} />

      <Grid container spacing={3} sx={{ mt: 3 }}>
            {isManagerView && (
            <Grid item xs={12} md={6}>
                <WorkloadChart data={workload} />
            </Grid>
            )}

    </Grid>


      {/* ================= STATUS DONUT ================= */}
      <Grid container spacing={3} sx={{ mt: 3 }}>
        <Grid item xs={12} md={6}>
          <StatusDonut data={statusDist} />
        </Grid>
      </Grid>

      {/* ================= DELIVERY HEALTH ================= */}
      {isManagerView && (
<Grid container spacing={3} sx={{ mt: 3 }}>
  <Grid item xs={12} md={6}>
    <DeliveryHealth data={deliveryHealth} />
  </Grid>
</Grid>
      )}
  <Grid item xs={12} md={6}>
    <AtRiskPanel tasks={atRiskTasks} />
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
