import React from "react";
import { Paper, Typography, Box, alpha } from "@mui/material";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { styles, getStatusColor } from "./overview.styles";

const StatusDonut = ({ data = {} }) => {
  const chartData = Object.entries(data).map(([key, value]) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1).replace("-", " "),
    value,
    color: getStatusColor(key),
  }));

  const hasData = chartData.some(d => d.value > 0);
  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <Box sx={styles.analyticsCard}>
      <Typography textAlign={"center"} variant="h6" fontWeight={700} sx={{ mb: 1 }}>
        Task Status
      </Typography>
      
      {!hasData ? (
        <Box sx={styles.emptyStateContainer}>
          <Typography sx={styles.emptyStateText}>
            No tasks to display
          </Typography>
        </Box>
      ) : (
        <>
          <Box sx={styles.donutChartWrapper}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="52%"
                  outerRadius="72%"
                  paddingAngle={2}
                  labelLine={false}
                  
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      stroke="#fff"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => [`${value} tasks`, 'Count']}
                  labelFormatter={(label) => `Status: ${label}`}
                />
                <Legend 
                  layout="horizontal"
                  verticalAlign="bottom"
                  align="center"
                  wrapperStyle={{ marginTop: -10 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </Box>
          
          <Box sx={{ 
            mt: 2, 
            textAlign: "center",
            p: 1,
            backgroundColor: alpha("#f5f5f5", 0.5),
            borderRadius: 1
          }}>
            <Typography variant="body2" color="text.secondary">
              Total: <strong>{total}</strong> tasks
            </Typography>
          </Box>
        </>
      )}
    </Box>
  );
};

export default StatusDonut;