import React, { useMemo } from "react";
import { Box, Grid } from "@mui/material";
import { styles } from "./overview.styles";

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

const Analytics = ({ team, tasks = [], myRole }) => {
  const isManagerView = myRole === "admin" || myRole === "manager";

  // ================= DERIVED DATA =================
  const stats = useMemo(() => getTaskStats(tasks), [tasks]);
  const statusDist = useMemo(() => getStatusDistribution(tasks), [tasks]);

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

  return (
    <Box sx={styles.container}>
      {/* ================= KPI ROW ================= */}
      <TeamKPIs stats={stats} />
      

      {/* ================= ANALYTICS GRID (ONE FLOW) ================= */}
        <Grid
  container
  spacing={isManagerView ? 3 : 5}
  columnSpacing={isManagerView ? 3 : 5}
  sx={{
    mt: 3,
    maxWidth: 1200,
    mx: "auto",
    alignItems: "stretch",
  }}
>
  {/* WORKLOAD */}
  {isManagerView && (
    <Grid item xs={12} md={6} lg={4}>
      <Box sx={styles.chartPaper}>
        <WorkloadChart data={workload} />
      </Box>
    </Grid>
  )}

  {/* STATUS DISTRIBUTION */}
  <Grid
    item
    xs={12}
    md={isManagerView ? 6 : 12}
    lg={isManagerView ? 4 : 6}
  >
    <Box sx={styles.donutPaper}>
      <StatusDonut data={statusDist} />
    </Box>
  </Grid>

  {/* DELIVERY HEALTH */}
  {isManagerView && (
    <Grid item xs={12} md={6} lg={4}>
      <Box sx={styles.chartPaper}>
        <DeliveryHealth data={deliveryHealth} />
      </Box>
    </Grid>
  )}

    
        {/* AT RISK */}
        {isManagerView && (
          <Grid item xs={12} md={6} lg={3}>
            <Box sx={styles.atRiskPaper}>
              <AtRiskPanel tasks={atRiskTasks} />
            </Box>
          </Grid>
        )}</Grid>
      

      {/* ================= ACTIVITY FEED ================= */}
      <Box sx={{ mt: 4, maxWidth: 1200, mx: "auto" }}>
        <ActivityFeed activities={activities} />
      </Box>
    </Box>
  );
};

export default Analytics;
