import React, { useMemo } from "react";
import { Box, Grid } from "@mui/material";
import { styles } from "./overview.styles"; // Import the styles

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
    <Box sx={styles.container}>
      {/* ================= KPIs ================= */}
      <TeamKPIs stats={stats} />

      {/* ================= WORKLOAD + STATUS (SIDE BY SIDE) ================= */}
      <Grid container spacing={3} sx={styles.mainChartContainer}>
        {isManagerView && (
          <Grid item xs={12} md={6}>
            <Box sx={styles.chartPaper}>
              <WorkloadChart data={workload} />
            </Box>
          </Grid>
        )}

        <Grid item xs={12} md={isManagerView ? 6 : 12}>
          <Box sx={styles.donutPaper}>
            <StatusDonut data={statusDist} />
          </Box>
        </Grid>
      </Grid>

      {/* ================= DELIVERY + AT RISK (SIDE BY SIDE) ================= */}
      {isManagerView && (
        <Grid container spacing={3} sx={styles.mainChartContainer}>
          <Grid item xs={12} md={6}>
            <Box sx={styles.chartPaper}>
              <DeliveryHealth data={deliveryHealth} />
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <Box sx={styles.atRiskPaper}>
              <AtRiskPanel tasks={atRiskTasks} />
            </Box>
          </Grid>
        </Grid>
      )}

      {/* ================= ACTIVITY FEED ================= */}
      <Box sx={{ mt: { xs: 3, md: 4 } }}>
        <ActivityFeed activities={activities} />
      </Box>
    </Box>
  );
};

export default TeamAnalytics;