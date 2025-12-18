// overview.styles.js - UPDATED FOR SIDE-BY-SIDE LAYOUT
import { alpha } from "@mui/material";

export const styles = {
  // ================= CONTAINER & LAYOUT =================
  container: {
    width: "100%",
    p: { xs: 2, sm: 3, md: 4 },
    backgroundColor: "background.default",
    minHeight: "100vh",
  },

  // ================= KPIs =================
  kpiContainer: {
    spacing: { xs: 2, md: 3 },
  },

  kpiCard: {
    p: { xs: 2, md: 2.5 },
    borderRadius: 3,
    height: "100%",
    display: "flex",
    alignItems: "center",
    gap: 2,
    transition: "all 0.3s ease",
    "&:hover": {
      transform: "translateY(-2px)",
      boxShadow: 8,
    },
    minHeight: 90,
  },

  kpiIconContainer: (color) => ({
    width: { xs: 44, md: 48 },
    height: { xs: 44, md: 48 },
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: `${color}15`,
    color: color,
    fontSize: { xs: 22, md: 24 },
    flexShrink: 0,
  }),

  // ================= MAIN CHART CONTAINER =================
  mainChartContainer: {
    mt: { xs: 2, sm: 3, md: 4 },
    spacing: { xs: 2, md: 3 },
  },

  // ================= CHART PAPERS =================
  chartPaper: {
    p: { xs: 2, sm: 3 },
    borderRadius: 3,
    height: "100%",
    minHeight: 320,
    display: "flex",
    flexDirection: "column",
    backgroundColor: "background.paper",
    boxShadow: "0 2px 12px rgba(0, 0, 0, 0.05)",
    border: "1px solid",
    borderColor: "divider",
  },

  chartHeader: {
    variant: "h6",
    fontWeight: 700,
    fontSize: { xs: "1rem", sm: "1.125rem" },
    mb: 1,
    color: "text.primary",
  },

  chartSubtitle: {
    variant: "body2",
    color: "text.secondary",
    mb: 2,
    fontSize: { xs: "0.875rem", sm: "0.9375rem" },
  },

  // ================= DONUT CHART SPECIFIC =================
  donutContainer: {
    width: "100%",
    height: "100%",
    minHeight: 320,
  },

  donutPaper: {
    p: { xs: 2, sm: 3 },
    borderRadius: 3,
    height: "100%",
    minHeight: 320,
    display: "flex",
    flexDirection: "column",
    backgroundColor: "background.paper",
    boxShadow: "0 2px 12px rgba(0, 0, 0, 0.05)",
    border: "1px solid",
    borderColor: "divider",
  },

  donutChartWrapper: {
    height: 240,
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },

  // ================= WORKLOAD CHART =================
  workloadContainer: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
  },

  workloadList: {
    mt: 2,
    flex: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-around",
  },

  workloadItem: {
    mb: { xs: 1.5, sm: 2 },
    "&:last-child": {
      mb: 0,
    },
  },

  workloadHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    mb: 1,
  },

  workloadProgress: {
    height: 10,
    borderRadius: 5,
    backgroundColor: alpha("#1976d2", 0.1),
    "& .MuiLinearProgress-bar": {
      borderRadius: 5,
    },
  },

  // ================= DELIVERY HEALTH =================
  deliveryContainer: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
  },

  deliveryChipContainer: {
    spacing: { xs: 1, sm: 2 },
    mt: 3,
    flexWrap: "wrap",
    display: "flex",
    gap: { xs: 1, sm: 2 },
  },

  deliveryChip: (color) => ({
    borderWidth: 1.5,
    borderColor: color,
    color: color,
    fontWeight: 600,
    backgroundColor: alpha(color, 0.08),
    fontSize: { xs: "0.75rem", sm: "0.8125rem" },
    height: { xs: 32, sm: 36 },
    "& .MuiChip-label": {
      px: { xs: 1, sm: 1.5 },
    },
  }),

  totalTasksContainer: {
    mt: 3,
    p: { xs: 1.5, sm: 2 },
    borderRadius: 2,
    backgroundColor: alpha("#1976d2", 0.05),
    border: "1px solid",
    borderColor: alpha("#1976d2", 0.2),
    flexShrink: 0,
  },

  // ================= AT RISK PANEL =================
  atRiskContainer: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
  },

  atRiskPaper: {
    p: { xs: 2, sm: 3 },
    borderRadius: 3,
    height: "100%",
    minHeight: 320,
    backgroundColor: "background.paper",
    boxShadow: "0 2px 12px rgba(0, 0, 0, 0.05)",
    border: "1px solid",
    borderColor: alpha("#ff9800", 0.3),
    background: `linear-gradient(to bottom right, ${alpha("#fff8e1", 0.3)}, ${alpha("#fff3e0", 0.1)})`,
  },

  atRiskContent: {
    mt: 2,
    flex: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  },

  atRiskTaskItem: {
    p: { xs: 1.5, sm: 2 },
    mb: 2,
    borderRadius: 2,
    backgroundColor: alpha("#fff8e1", 0.3),
    border: "1px solid",
    borderColor: alpha("#ff9800", 0.2),
    "&:last-child": {
      mb: 0,
    },
  },

  // ================= ACTIVITY FEED =================
  activityPaper: {
    p: { xs: 2, sm: 3 },
    borderRadius: 3,
    backgroundColor: "background.paper",
    boxShadow: "0 2px 12px rgba(0, 0, 0, 0.05)",
    border: "1px solid",
    borderColor: "divider",
  },

  activityHeader: {
    variant: "h6",
    fontWeight: 700,
    color: "text.primary",
    fontSize: { xs: "1rem", sm: "1.125rem" },
  },

  activityDivider: {
    my: 2,
    backgroundColor: "divider",
  },

  activityItem: {
    p: { xs: 1.5, sm: 2 },
    mb: 1.5,
    borderRadius: 2,
    backgroundColor: alpha("#1976d2", 0.02),
    borderLeft: "3px solid",
    borderLeftColor: "primary.main",
    transition: "all 0.2s ease",
    "&:hover": {
      backgroundColor: alpha("#1976d2", 0.05),
    },
    "&:last-child": {
      mb: 0,
    },
  },

  // ================= EMPTY STATES =================
  emptyStateContainer: {
    height: "100%",
    minHeight: 240,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    color: "text.secondary",
    gap: 1,
    p: 2,
  },

  emptyStateIcon: {
    fontSize: { xs: 40, sm: 48 },
    color: "action.disabled",
    mb: 1,
  },

  emptyStateText: {
    color: "text.secondary",
    textAlign: "center",
    fontSize: { xs: "0.875rem", sm: "0.9375rem" },
  },

  // ================= RESPONSIVE GRID =================
  responsiveGrid: {
    container: {
      spacing: { xs: 2, sm: 3 },
      mt: { xs: 2, sm: 3, md: 4 },
    },
    item: {
      xs: 12,
      md: 6,
    },
  },

  // ================= COLORS =================
  colors: {
    success: "#2e7d32",
    warning: "#ed6c02",
    error: "#d32f2f",
    info: "#1976d2",
    primary: "#1976d2",
    secondary: "#9c27b0",
  },
};

// Helper functions
export const getStatusColor = (status) => {
  const colors = {
    "todo": "#9e9e9e",
    "in-progress": "#1976d2",
    "completed": "#2e7d32",
    "review": "#ed6c02",
    "blocked": "#d32f2f",
    "unknown": "#bdbdbd",
  };
  return colors[status] || colors.unknown;
};

export const getDeliveryColor = (type) => {
  const colors = {
    "completed": "#2e7d32",
    "onTrack": "#1976d2",
    "overdue": "#d32f2f",
  };
  return colors[type] || colors.onTrack;
};