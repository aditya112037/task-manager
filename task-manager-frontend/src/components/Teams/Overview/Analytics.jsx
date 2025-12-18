import React, { useMemo } from "react";
import { Box, Grid } from "@mui/material";

import {
  getTaskStats,
  getStatusDistribution,
  getWorkloadByMember,
  getDeliveryHealth,
  getAtRiskTasks,
  getActivityFeed,
} from "./overview.utils";

import TeamKPIs from "./TeamKPIs";
import StatusDonut from "./StatusDonut";
import WorkloadChart from "./WorkloadChart";
import DeliveryHealth from "./DeliveryHealth";
import AtRiskPanel from "./AtRiskPanel";
import ActivityFeed from "./ActivityFeed";

/*
  Team Analytics
  --------------
  Props:
  - team
  - tasks
  - myRole
*/

const TeamAnalytics = ({ team, tasks = [], myRole }) => {
  const isManagerView = myRole === "admin" || myRole === "manager";

  const stats = useMemo(() => getTaskStats(tasks), [tasks]);
  const statusDist = useMemo(() => getStatusDistribution(tasks), [tasks]);
  const workload = useMemo(
    () => getWorkloadByMember(tasks, team?.members || []),
    [tasks, team?.members]
  );
  const deliveryHealth = useMemo(() => getDeliveryHealth(tasks), [tasks]);
  const atRiskTasks = useMemo(() => getAtRiskTasks(tasks, 48), [tasks]);
  const activities = useMemo(() => getActivityFeed(tasks, 10), [tasks]);

  return (
    <Box sx={{ width: "100%" }}>
      {/* ================= KPIs ================= */}
      <TeamKPIs stats={stats} />

      {/* ================= WORKLOAD + STATUS ================= */}
      <Grid container spacing={3} sx={{ mt: 3 }}>
        {isManagerView && (
          <Grid item xs={12} md={6}>
            <WorkloadChart data={workload} />
          </Grid>
        )}

        <Grid item xs={12} md={6}>
            <Box
  sx={{
    height: 260,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  }}
>
          <StatusDonut data={statusDist} />
          </Box>
        </Grid>
      </Grid>

      {/* ================= DELIVERY + AT RISK ================= */}
      {isManagerView && (
        <Grid container spacing={3} sx={{ mt: 3 }}>
          <Grid item xs={12} md={6}>
            <DeliveryHealth data={deliveryHealth} />
          </Grid>

          <Grid item xs={12} md={6}>
            <AtRiskPanel tasks={atRiskTasks} />
          </Grid>
        </Grid>
      )}

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
