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
      {/* ================= FULL WIDTH KPIs ================= */}
      <Box sx={{ maxWidth: 1200, mx: "auto" }}>
  <TeamKPIs stats={stats} />
</Box>

      {/* ================= FIRST ROW: WORKLOAD ONLY (Full Width for Managers) ================= */}
      {isManagerView && (
        <Box sx={styles.topRowContainer}>
          <Grid container spacing={3}>
            <Grid item xs={12} md = {4}>
              <Box sx={styles.chartPaper}>
                <WorkloadChart data={workload} />
              </Box>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* ================= SECOND ROW: STATUS, DELIVERY, AT RISK ================= */}
      <Grid
  container
  spacing={3}
  sx={{
    mt: 3,
    maxWidth: 1200,
    mx: "auto",
    alignItems: "stretch",
  }}
>
        {/* Task Status Distribution - Always visible */}
        <Grid item xs={12}>
          <Box sx={styles.donutPaper}>
            <StatusDonut data={statusDist} />
          </Box>
        </Grid>

        {/* Delivery Health - Only for managers */}
        {isManagerView && (
          <Grid item xs={12} md={4}>
            <Box sx={styles.chartPaper}>
              <DeliveryHealth data={deliveryHealth} />
            </Box>
          </Grid>
        )}

        {/* At Risk Tasks - Only for managers */}
        {isManagerView && (
          <Grid item xs={12} md={4}>
            <Box sx={styles.atRiskPaper}>
              <AtRiskPanel tasks={atRiskTasks} />
            </Box>
          </Grid>
        )}
      </Grid>

      {/* ================= ACTIVITY FEED (Full Width) ================= */}
      <Box sx={styles.activityFeedContainer}>
        <ActivityFeed activities={activities} />
      </Box>
    </Box>
  );
};

export default TeamAnalytics;