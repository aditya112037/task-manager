import React, { useRef, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import InsightsIcon from "@mui/icons-material/Insights";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import { authAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

const formatDateLabel = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const formatRangeLabel = (start, end) => {
  const left = formatDateLabel(start);
  const right = formatDateLabel(end);
  if (!left && !right) return "";
  if (!left) return right;
  if (!right) return left;
  return `${left}-${right}`;
};

const toBars = (items = [], valueKey = "score") => {
  const max = Math.max(1, ...items.map((item) => Number(item[valueKey] || 0)));
  return items.map((item) => ({
    label: item.label || "",
    value: Number(item[valueKey] || 0),
    height: Math.max(10, Math.round((Number(item[valueKey] || 0) / max) * 90)),
  }));
};

const MetricCard = ({ label, value, hint }) => (
  <Paper
    sx={{
      p: 1.75,
      borderRadius: 2,
      height: "100%",
      bgcolor: "background.paper",
    }}
  >
    <Typography variant="h5" fontWeight={700}>
      {value}
    </Typography>
    <Typography variant="body2" sx={{ mt: 0.2 }}>
      {label}
    </Typography>
    {hint && (
      <Typography variant="caption" color="text.secondary">
        {hint}
      </Typography>
    )}
  </Paper>
);

const TrendBars = ({ title, bars, color }) => (
  <Box>
    <Typography variant="subtitle2" sx={{ mb: 1 }}>
      {title}
    </Typography>
    <Stack direction="row" alignItems="flex-end" spacing={1.2}>
      {bars.map((bar) => (
        <Box key={bar.label} sx={{ textAlign: "center", minWidth: 48 }}>
          <Box
            sx={{
              height: `${bar.height}px`,
              borderRadius: 1.2,
              background: color,
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          />
          <Typography variant="caption" color="text.secondary">
            {bar.label}
          </Typography>
          <Typography variant="caption" sx={{ display: "block", fontWeight: 700 }}>
            {bar.value}
          </Typography>
        </Box>
      ))}
    </Stack>
  </Box>
);

export default function Profile() {
  const { user, setUser } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);
  const fileRef = useRef(null);

  const identity = user?.identity || {};
  const metrics = user?.progress?.metrics || {};
  const executionScore = user?.progress?.executionScore || null;
  const badges = user?.progress?.badges || [];
  const scoreLast4Weeks = user?.progress?.trend?.scoreLast4Weeks || [];
  const completionLast4Weeks = user?.progress?.trend?.completionLast4Weeks || [];
  const nudges = user?.progress?.nudges || {};

  const scoreBars = toBars(
    scoreLast4Weeks.map((item) => ({
      ...item,
      label: formatDateLabel(item.snapshotDate) || item.label,
    })),
    "score"
  );
  const completionBars = toBars(
    completionLast4Weeks.map((item) => ({
      ...item,
      score: item.completedSubtasks,
      label: formatRangeLabel(item.start, item.end) || item.label,
    })),
    "score"
  );

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_IMAGE_BYTES) {
      setMessage({ type: "error", text: "Image must be <= 2MB." });
      return;
    }
    if (!file.type.startsWith("image/")) {
      setMessage({ type: "error", text: "Please upload an image file." });
      return;
    }

    const toDataUrl = () =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

    try {
      setUploading(true);
      const imageData = await toDataUrl();
      const res = await authAPI.uploadProfilePhoto(imageData);
      setUser({ photo: res.data.photo });

      const refreshed = await authAPI.getProfile();
      setUser(refreshed.data);
      localStorage.setItem("user", JSON.stringify(refreshed.data));

      setMessage({ type: "success", text: "Profile icon updated." });
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.message || "Upload failed." });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  if (!user) {
    return (
      <Box sx={{ py: 6, textAlign: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <InsightsIcon />
        <Typography variant="h4" fontWeight={700}>
          Profile Performance
        </Typography>
      </Stack>

      {message && (
        <Alert severity={message.type} sx={{ mb: 2 }}>
          {message.text}
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 2.5, borderRadius: 3, height: "100%" }}>
            <Stack alignItems="center" spacing={1.2}>
              <Avatar src={user.photo || ""} sx={{ width: 94, height: 94 }}>
                {user.name?.[0]}
              </Avatar>
              <Typography variant="h6">{user.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {user.email}
              </Typography>
              <Chip label={`Role: ${identity.primaryRole || "member"}`} size="small" />
              <Button
                variant="outlined"
                startIcon={<CloudUploadIcon />}
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                sx={{ mt: 0.8 }}
              >
                {uploading ? "Uploading..." : "Upload Profile Icon"}
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                style={{ display: "none" }}
                onChange={handleFileChange}
              />
              <Typography variant="caption" color="text.secondary">
                PNG/JPG/WEBP up to 2MB
              </Typography>
            </Stack>

            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Teams ({(identity.teams || []).length})
            </Typography>
            <Stack spacing={0.8} sx={{ maxHeight: 220, overflowY: "auto", pr: 0.5 }}>
              {(identity.teams || []).map((team) => (
                <Chip
                  key={team._id}
                  size="small"
                  variant="outlined"
                  label={`${team.name} (${team.role})`}
                  sx={{ justifyContent: "flex-start" }}
                />
              ))}
              {(identity.teams || []).length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  No teams joined yet.
                </Typography>
              )}
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 2.5, borderRadius: 3 }}>
            <Typography variant="h6" sx={{ mb: 1.2 }}>
              Execution Snapshot
            </Typography>
            <Grid container spacing={1.3}>
              <Grid item xs={6} md={4}>
                <MetricCard
                  label="Execution Score"
                  value={executionScore?.score ?? 0}
                  hint={executionScore?.snapshotDate ? "Latest stored snapshot" : "Not computed yet"}
                />
              </Grid>
              <Grid item xs={6} md={4}>
                <MetricCard label="On-time %" value={`${metrics.onTimeRate ?? 0}%`} />
              </Grid>
              <Grid item xs={6} md={4}>
                <MetricCard label="Subtasks Completed" value={metrics.subtasksCompleted ?? 0} />
              </Grid>
              <Grid item xs={6} md={4}>
                <MetricCard label="Active Tasks" value={metrics.activeTasks ?? 0} />
              </Grid>
              <Grid item xs={6} md={4}>
                <MetricCard
                  label="Avg Completion Time"
                  value={`${metrics.averageSubtaskDurationHours ?? 0}h`}
                />
              </Grid>
              <Grid item xs={6} md={4}>
                <MetricCard
                  label="Completion Rate"
                  value={`${metrics.completionRate ?? 0}%`}
                />
              </Grid>
            </Grid>
          </Paper>

          <Paper sx={{ p: 2.5, borderRadius: 3, mt: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
              <TrendingUpIcon />
              <Typography variant="h6">Performance Trend</Typography>
            </Stack>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TrendBars
                  title="Score (Last 4 Weeks)"
                  bars={scoreBars}
                  color="linear-gradient(180deg, #0f766e, #145f58)"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TrendBars
                  title="Completion Trend (Last 4 Weeks)"
                  bars={completionBars}
                  color="linear-gradient(180deg, #b08968, #8b694d)"
                />
              </Grid>
            </Grid>
            <Alert severity="info" sx={{ mt: 1.8 }}>
              Score trend uses your stored weekly/daily score snapshots. Completion trend counts
              subtasks completed per 7-day window across the latest 4 weeks.
            </Alert>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2.5, borderRadius: 3, height: "100%" }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Recognition Badges
            </Typography>
            <Stack spacing={1.2}>
              {badges.map((badge) => (
                <Box key={badge.id}>
                  <Chip label={badge.title} color="primary" size="small" sx={{ mb: 0.4 }} />
                  <Typography variant="body2" color="text.secondary">
                    {badge.description}
                  </Typography>
                </Box>
              ))}
              {badges.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  Badges are awarded automatically from real execution behavior.
                </Typography>
              )}
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2.5, borderRadius: 3, height: "100%" }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Focus Nudges
            </Typography>
            {nudges.reminder ? (
              <Alert severity="warning" sx={{ mb: 1.2 }}>
                {nudges.reminder}
              </Alert>
            ) : (
              <Alert severity="success" sx={{ mb: 1.2 }}>
                No stalled assigned tasks detected.
              </Alert>
            )}
            <Stack spacing={1}>
              {(nudges.needsAttentionTasks || []).map((item) => (
                <Paper key={item.taskId || item.title} variant="outlined" sx={{ p: 1.2 }}>
                  <Typography variant="body2" fontWeight={600}>
                    {item.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {item.stalledSubtasks} stalled subtask(s), up to {item.maxDaysStalled} day(s)
                    with no progress update.
                  </Typography>
                </Paper>
              ))}
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
