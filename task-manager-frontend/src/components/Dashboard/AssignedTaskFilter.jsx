// components/Dashboard/AssignedTasksFilter.jsx
import React, { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Chip,
  Stack,
  Button,
  Menu,
  MenuItem,
  TextField,
  FormControl,
  InputLabel,
  Select,
  useTheme,
} from "@mui/material";
import FilterListIcon from "@mui/icons-material/FilterList";
import ClearIcon from "@mui/icons-material/Clear";
import DateRangeIcon from "@mui/icons-material/DateRange";

const AssignedTasksFilter = ({ 
  teams, 
  filters, 
  onFilterChange, 
  onClearFilters 
}) => {
  const theme = useTheme();
  const [priorityAnchor, setPriorityAnchor] = useState(null);
  const [statusAnchor, setStatusAnchor] = useState(null);
  const [teamAnchor, setTeamAnchor] = useState(null);
  const [dateAnchor, setDateAnchor] = useState(null);

  const datePresets = [
    { label: "Today", value: "today" },
    { label: "Tomorrow", value: "tomorrow" },
    { label: "This Week", value: "this_week" },
    { label: "Next Week", value: "next_week" },
    { label: "Overdue", value: "overdue" },
    { label: "No Due Date", value: "no_date" },
  ];

  const handlePriorityClick = (event) => {
    setPriorityAnchor(event.currentTarget);
  };

  const handleStatusClick = (event) => {
    setStatusAnchor(event.currentTarget);
  };

  const handleTeamClick = (event) => {
    setTeamAnchor(event.currentTarget);
  };

  const handleDateClick = (event) => {
    setDateAnchor(event.currentTarget);
  };

  const handleClose = () => {
    setPriorityAnchor(null);
    setStatusAnchor(null);
    setTeamAnchor(null);
    setDateAnchor(null);
  };

  const toggleFilter = (filterType, value) => {
    const currentValues = filters[filterType] || [];
    if (currentValues.includes(value)) {
      onFilterChange(filterType, currentValues.filter(v => v !== value));
    } else {
      onFilterChange(filterType, [...currentValues, value]);
    }
  };

  const setDateFilter = (preset) => {
    onFilterChange("datePreset", preset);
    setDateAnchor(null);
  };

  const hasActiveFilters = () => {
    return (
      (filters.priority && filters.priority.length > 0) ||
      (filters.status && filters.status.length > 0) ||
      (filters.team && filters.team.length > 0) ||
      filters.datePreset
    );
  };

  return (
    <Paper
      sx={{
        p: 2,
        mb: 3,
        bgcolor: "background.default",
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 2,
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={600}>
          Filter Tasks
        </Typography>
        
        {hasActiveFilters() && (
          <Button
            size="small"
            startIcon={<ClearIcon />}
            onClick={onClearFilters}
            sx={{ textTransform: "none" }}
          >
            Clear All
          </Button>
        )}
      </Box>

      <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
        {/* Priority Filter */}
        <Button
          variant="outlined"
          size="small"
          startIcon={<FilterListIcon />}
          onClick={handlePriorityClick}
          sx={{ textTransform: "none" }}
        >
          Priority
          {filters.priority?.length > 0 && (
            <Chip
              label={filters.priority.length}
              size="small"
              sx={{ ml: 1, height: 20 }}
            />
          )}
        </Button>

        {/* Status Filter */}
        <Button
          variant="outlined"
          size="small"
          startIcon={<FilterListIcon />}
          onClick={handleStatusClick}
          sx={{ textTransform: "none" }}
        >
          Status
          {filters.status?.length > 0 && (
            <Chip
              label={filters.status.length}
              size="small"
              sx={{ ml: 1, height: 20 }}
            />
          )}
        </Button>

        {/* Team Filter */}
        <Button
          variant="outlined"
          size="small"
          startIcon={<FilterListIcon />}
          onClick={handleTeamClick}
          sx={{ textTransform: "none" }}
        >
          Team
          {filters.team?.length > 0 && (
            <Chip
              label={filters.team.length}
              size="small"
              sx={{ ml: 1, height: 20 }}
            />
          )}
        </Button>

        {/* Date Filter */}
        <Button
          variant="outlined"
          size="small"
          startIcon={<DateRangeIcon />}
          onClick={handleDateClick}
          sx={{ textTransform: "none" }}
        >
          {filters.datePreset ? datePresets.find(d => d.value === filters.datePreset)?.label : "Date"}
        </Button>
      </Stack>

      {/* Active Filters Chips */}
      {hasActiveFilters() && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
            Active filters:
          </Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
            {filters.priority?.map(priority => (
              <Chip
                key={priority}
                label={`Priority: ${priority}`}
                size="small"
                onDelete={() => toggleFilter("priority", priority)}
              />
            ))}
            
            {filters.status?.map(status => (
              <Chip
                key={status}
                label={`Status: ${status}`}
                size="small"
                onDelete={() => toggleFilter("status", status)}
              />
            ))}
            
            {filters.team?.map(teamId => {
              const team = teams.find(t => t._id === teamId);
              return team ? (
                <Chip
                  key={teamId}
                  label={`Team: ${team.name}`}
                  size="small"
                  onDelete={() => toggleFilter("team", teamId)}
                />
              ) : null;
            })}
            
            {filters.datePreset && (
              <Chip
                label={`Date: ${datePresets.find(d => d.value === filters.datePreset)?.label}`}
                size="small"
                onDelete={() => onFilterChange("datePreset", null)}
              />
            )}
          </Stack>
        </Box>
      )}

      {/* Priority Menu */}
      <Menu
        anchorEl={priorityAnchor}
        open={Boolean(priorityAnchor)}
        onClose={handleClose}
      >
        {["high", "medium", "low"].map(priority => (
          <MenuItem
            key={priority}
            onClick={() => toggleFilter("priority", priority)}
            selected={filters.priority?.includes(priority)}
          >
            {priority.charAt(0).toUpperCase() + priority.slice(1)}
          </MenuItem>
        ))}
      </Menu>

      {/* Status Menu */}
      <Menu
        anchorEl={statusAnchor}
        open={Boolean(statusAnchor)}
        onClose={handleClose}
      >
        {["todo", "in-progress", "completed"].map(status => (
          <MenuItem
            key={status}
            onClick={() => toggleFilter("status", status)}
            selected={filters.status?.includes(status)}
          >
            {status.replace("-", " ").charAt(0).toUpperCase() + status.replace("-", " ").slice(1)}
          </MenuItem>
        ))}
      </Menu>

      {/* Team Menu */}
      <Menu
        anchorEl={teamAnchor}
        open={Boolean(teamAnchor)}
        onClose={handleClose}
      >
        {teams.map(team => (
          <MenuItem
            key={team._id}
            onClick={() => toggleFilter("team", team._id)}
            selected={filters.team?.includes(team._id)}
          >
            {team.icon} {team.name}
          </MenuItem>
        ))}
      </Menu>

      {/* Date Menu */}
      <Menu
        anchorEl={dateAnchor}
        open={Boolean(dateAnchor)}
        onClose={handleClose}
      >
        {datePresets.map(preset => (
          <MenuItem
            key={preset.value}
            onClick={() => setDateFilter(preset.value)}
            selected={filters.datePreset === preset.value}
          >
            {preset.label}
          </MenuItem>
        ))}
      </Menu>
    </Paper>
  );
};

export default AssignedTasksFilter;