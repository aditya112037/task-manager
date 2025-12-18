import React from "react";
import { Box, Grid } from "@mui/material";

import {
  getTaskStats,
  getWorkloadByMember,
  getDeliveryHealth,
  getStatusDistribution,
} from "./overview.utils";

import TeamKPIs from "./TeamKPIs";
import StatusDonut from "./StatusDonut";
import WorkloadChart from "./WorkloadChart";
import DeliveryHealth from "./DeliveryHealth";
import ActivityFeed from "./ActivityFeed";

/*
  Team Overview
  -------------
  Props:
  - team: Team object
  - tasks: Array of team tasks
  - myRole: "admin" | "manager" | "member"
*/

const TaskOverview = ({ team, tasks, myRole }) => {
  const taskStats = getTaskStats(tasks);
  const workload = getWorkloadByMember(tasks, team.members || []);
  const deliveryHealth = getDeliveryHealth(tasks);
  const statusDist = getStatusDistribution(tasks);

  return (
    <Box sx={{ width: "100%" }}>
      
      {/* ================================
          KPI ROW
      ================================= */}
      <TeamKPIs stats={taskStats} />

      {/* ================================
          ANALYTICS GRID
      ================================= */}
      <Grid container spacing={3} sx={{ mt: 1 }}>
        
        <Grid item xs={12} md={4}>
          <StatusDonut data={statusDist} />
        </Grid>

        <Grid item xs={12} md={4}>
          <WorkloadChart data={workload} />
        </Grid>

        <Grid item xs={12} md={4}>
          <DeliveryHealth data={deliveryHealth} />
        </Grid>

        <Grid item xs={12}>
          <ActivityFeed teamId={team._id} />
        </Grid>

      </Grid>
    </Box>
  );
};

export default TaskOverview;
