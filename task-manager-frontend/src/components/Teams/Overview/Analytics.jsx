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
    <>
      {/* ================= KPI HEADER (NO CONTAINER PADDING) ================= */}
      <Box
        sx={{
          width: "100%",
          display: "flex",
          justifyContent: "center",
          mt: 2,
          mb: 3,
        }}
      >
        <Box sx={{ width: "100%"}}>
          <TeamKPIs stats={stats} />
        </Box>
      </Box>

      {/* ================= ANALYTICS CONTENT (PADDED) ================= */}
      <Box sx={styles.container}>
        <Grid container spacing={3} alignItems="stretch">
          <Grid item xs={12} md={3}>
            <WorkloadChart data={workload} />
          </Grid>

          <Grid item xs={12} md={3}>
            <StatusDonut data={statusDist} />
          </Grid>

          <Grid item xs={12} md={3}>
            <DeliveryHealth data={deliveryHealth} />
          </Grid>

          {isManagerView && (
            <Grid item xs={12} md={3}>
              <AtRiskPanel tasks={atRiskTasks} />
            </Grid>
          )}
        </Grid>

        {/* ================= ACTIVITY FEED ================= */}
        <Box sx={{ mt: 4, maxWidth: 1200, mx: "auto" }}>
          <ActivityFeed activities={activities} />
        </Box>
      </Box>
    </>
  );
};

export default Analytics;
