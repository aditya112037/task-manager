const TeamKPIs = ({ stats }) => {
  const completionRate =
    stats.total === 0
      ? 0
      : Math.round((stats.completed / stats.total) * 100);

  return (
    <Box sx={{ width: "100%", mb: 3 }}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "1fr 1fr",
            md: "repeat(4, 1fr)",
          },
          gap: 2,
        }}
      >
        <KpiCard
          label="Total Tasks"
          value={stats.total}
          icon={<AssignmentIcon />}
          color="#1976d2"
        />

        <KpiCard
          label="Completed"
          value={`${stats.completed} (${completionRate}%)`}
          icon={<CheckCircleIcon />}
          color="#2e7d32"
        />

        <KpiCard
          label="Overdue"
          value={stats.overdue}
          icon={<WarningAmberIcon />}
          color="#d32f2f"
        />

        <KpiCard
          label="Pending"
          value={stats.pending}
          icon={<HourglassBottomIcon />}
          color="#ed6c02"
        />
      </Box>
    </Box>
  );
};
