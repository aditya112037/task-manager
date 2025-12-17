import React from "react";
import {
  Box,
  Paper,
  Typography,
  Grid,
  Divider,
} from "@mui/material";

/*
  Team Overview Skeleton
  ----------------------
  Props:
  - team: Team object
  - tasks: Array of team tasks
  - myRole: "admin" | "manager" | "member"
*/

const TeamOverview = ({ team, tasks, myRole }) => {
  return (
    <Box sx={{ width: "100%" }}>
      
      {/* ================================
          KPI SECTION (TOP)
      ================================= */}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, borderRadius: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Total Tasks
            </Typography>
            <Typography variant="h5" fontWeight={700}>
              —
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, borderRadius: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Completed
            </Typography>
            <Typography variant="h5" fontWeight={700}>
              —
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, borderRadius: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Overdue
            </Typography>
            <Typography variant="h5" fontWeight={700}>
              —
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, borderRadius: 2 }}>
            <Typography variant="body2" color="text.secondary">
              At Risk
            </Typography>
            <Typography variant="h5" fontWeight={700}>
              —
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* ================================
          WORKLOAD SECTION
      ================================= */}
      <Paper sx={{ p: 3, borderRadius: 3, mt: 3 }}>
        <Typography variant="h6" fontWeight={700}>
          Team Workload
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 1 }}
        >
          Tasks assigned per team member
        </Typography>

        <Box
          sx={{
            mt: 3,
            height: 240,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "text.secondary",
          }}
        >
          Workload chart goes here
        </Box>
      </Paper>

      {/* ================================
          DELIVERY + STATUS
      ================================= */}
      <Grid container spacing={2} sx={{ mt: 3 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={700}>
              Delivery Health
            </Typography>

            <Box
              sx={{
                mt: 3,
                height: 200,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "text.secondary",
              }}
            >
              Delivery chart goes here
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={700}>
              Task Status
            </Typography>

            <Box
              sx={{
                mt: 3,
                height: 200,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "text.secondary",
              }}
            >
              Status donut goes here
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* ================================
          ACTIVITY FEED
      ================================= */}
      <Paper sx={{ p: 3, borderRadius: 3, mt: 3 }}>
        <Typography variant="h6" fontWeight={700}>
          Recent Activity
        </Typography>

        <Divider sx={{ my: 2 }} />

        <Box
          sx={{
            height: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "text.secondary",
          }}
        >
          Activity feed goes here
        </Box>
      </Paper>

    </Box>
  );
};

export default TeamOverview;
