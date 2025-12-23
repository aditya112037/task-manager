import React, { useMemo } from "react";
import { Box } from "@mui/material";
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
      {/* ================= KPI ROW (FULL WIDTH, CENTERED) ================= */}
      <Box
        sx={{
          width: "100%",
          display: "flex",
          justifyContent: "center",
          mt: 2,
          mb: 4,
        }}
      >
        <Box sx={{ width: "100%", maxWidth: 1400 }}>
          <TeamKPIs stats={stats} />
        </Box>
      </Box>

      {/* ================= ANALYTICS GRID (CSS GRID – ONE ROW GUARANTEED) ================= */}
      <Box sx={styles.container}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "1fr 1fr",
              md: isManagerView
                ? "repeat(4, 1fr)" // ⭐ all in one row
                : "repeat(3, 1fr)",
            },
            gap: 3,
            alignItems: "stretch",
          }}
        >
          <WorkloadChart data={workload} />

          <StatusDonut data={statusDist} />

          <DeliveryHealth data={deliveryHealth} />

          {isManagerView && (
            <AtRiskPanel tasks={atRiskTasks} />
          )}
        </Box>

        {/* ================= ACTIVITY FEED ================= */}
        <Box sx={{ mt: 5, maxWidth: 1200, mx: "auto" }}>
          <ActivityFeed activities={activities} />
        </Box>
      </Box>
    </>
  );
};

export default Analytics;
