// overview.styles.js
import { alpha } from "@mui/material";

export const styles = {
  // ================= CONTAINER & LAYOUT =================
  container: {
    width: "100%",
    p: { xs: 2, sm: 3 },
    backgroundColor: "background.default",
  },

  // ================= KPIs =================
  kpiContainer: {
    spacing: 2,
  },

  kpiCard: {
    p: 2.5,
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
  },

  kpiIconContainer: (color) => ({
    width: 48,
    height: 48,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: `${color}15`,
    color: color,
    fontSize: 24,
  }),

  // ================= CHARTS & GRAPHS =================
  chartContainer: {
    mt: 3,
  },

  chartPaper: {
    p: 3,
    borderRadius: 3,
    height: "100%",
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
    mb: 0.5,
    color: "text.primary",
  },

  chartSubtitle: {
    variant: "body2",
    color: "text.secondary",
    mb: 3,
  },

  donutContainer: {
    height: 260,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  donutChartPaper: {
    p: 3,
    borderRadius: 3,
    height: "100%",
    backgroundColor: "background.paper",
    boxShadow: "0 2px 12px rgba(0, 0, 0, 0.05)",
    border: "1px solid",
    borderColor: "divider",
  },

  // ================= WORKLOAD CHART =================
  workloadItem: {
    mb: 2,
  },

  workloadHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    mb: 1,
  },

  workloadProgress: {
    height: 8,
    borderRadius: 4,
    backgroundColor: alpha("#1976d2", 0.1),
    "& .MuiLinearProgress-bar": {
      borderRadius: 4,
    },
  },

  // ================= DELIVERY HEALTH =================
  deliveryChipContainer: {
    spacing: 2,
    mt: 3,
    flexWrap: "wrap",
  },

  deliveryChip: (color) => ({
    borderWidth: 1.5,
    borderColor: color,
    color: color,
    fontWeight: 600,
    backgroundColor: alpha(color, 0.08),
    "& .MuiChip-label": {
      px: 1,
    },
  }),

  totalTasksContainer: {
    mt: 3,
    p: 2,
    borderRadius: 2,
    backgroundColor: alpha("#1976d2", 0.05),
    border: "1px solid",
    borderColor: alpha("#1976d2", 0.2),
  },

  // ================= AT RISK PANEL =================
  atRiskPaper: {
    p: 3,
    borderRadius: 3,
    backgroundColor: "background.paper",
    boxShadow: "0 2px 12px rgba(0, 0, 0, 0.05)",
    border: "1px solid",
    borderColor: alpha("#ff9800", 0.3),
    background: `linear-gradient(to bottom right, ${alpha("#fff8e1", 0.3)}, ${alpha("#fff3e0", 0.1)})`,
  },

  atRiskTaskItem: {
    p: 2,
    mb: 2,
    borderRadius: 2,
    backgroundColor: alpha("#fff8e1", 0.3),
    border: "1px solid",
    borderColor: alpha("#ff9800", 0.2),
    "&:last-child": {
      mb: 0,
    },
  },

  dueDateText: {
    variant: "body2",
    color: "text.secondary",
    mt: 0.5,
    display: "flex",
    alignItems: "center",
    gap: 0.5,
  },

  // ================= ACTIVITY FEED =================
  activityPaper: {
    p: 3,
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
  },

  activityDivider: {
    my: 2,
    backgroundColor: "divider",
  },

  activityItem: {
    p: 2,
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

  activityText: {
    variant: "body2",
    color: "text.primary",
    mb: 0.5,
  },

  activityTimestamp: {
    variant: "caption",
    color: "text.secondary",
    display: "flex",
    alignItems: "center",
    gap: 0.5,
  },

  // ================= EMPTY STATES =================
  emptyStateContainer: {
    height: 220,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    color: "text.secondary",
    gap: 1,
  },

  emptyStateIcon: {
    fontSize: 48,
    color: "action.disabled",
    mb: 1,
  },

  emptyStateText: {
    color: "text.secondary",
    textAlign: "center",
  },

  // ================= RESPONSIVE STYLES =================
  responsiveGrid: {
    container: {
      spacing: 3,
      mt: 3,
    },
    item: {
      xs: 12,
      md: 6,
    },
  },

  // ================= COLORS & THEMES =================
  colors: {
    success: "#2e7d32",
    warning: "#ed6c02",
    error: "#d32f2f",
    info: "#1976d2",
    primary: "#1976d2",
    secondary: "#9c27b0",
  },

  // ================= SHADOWS & ELEVATION =================
  shadows: {
    light: "0 2px 8px rgba(0, 0, 0, 0.08)",
    medium: "0 4px 16px rgba(0, 0, 0, 0.12)",
    strong: "0 8px 24px rgba(0, 0, 0, 0.16)",
  },

  // ================= TRANSITIONS =================
  transitions: {
    smooth: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    quick: "all 0.2s ease",
  },
};

// Helper function for status colors
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

// Helper function for delivery status colors
export const getDeliveryColor = (type) => {
  const colors = {
    "completed": "#2e7d32",
    "onTrack": "#1976d2",
    "overdue": "#d32f2f",
  };
  return colors[type] || colors.onTrack;
};