import React from "react";
import { Paper, Typography, Box } from "@mui/material";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const COLORS = {
  todo: "#9e9e9e",
  "in-progress": "#1976d2",
  completed: "#2e7d32",
  unknown: "#bdbdbd",
};

const StatusDonut = ({ data = {} }) => {
  const chartData = Object.entries(data).map(([key, value]) => ({
    name: key,
    value,
  }));

  const hasData = chartData.some(d => d.value > 0);

  return (
    <Paper sx={{ p: 3, borderRadius: 3, height: "100%" }}>
      <Typography variant="h6" fontWeight={700}>
        Task Status
      </Typography>

      {!hasData ? (
        <Box
          sx={{
            height: 220,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "text.secondary",
          }}
        >
          No tasks yet
        </Box>
      ) : (
        <Box sx={{ height: 220 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={3}
              >
                {chartData.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={COLORS[entry.name] || COLORS.unknown}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Box>
      )}
    </Paper>
  );
};

export default StatusDonut;
