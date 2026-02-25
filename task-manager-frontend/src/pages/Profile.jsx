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
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import InsightsIcon from "@mui/icons-material/Insights";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import MilitaryTechIcon from "@mui/icons-material/MilitaryTech";
import TipsAndUpdatesIcon from "@mui/icons-material/TipsAndUpdates";
import Groups2Icon from "@mui/icons-material/Groups2";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import { alpha } from "@mui/material/styles";
import { authAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "@mui/material/styles";

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

const MetricCard = ({ label, value, hint, pulseDelay = "0s" }) => {
  const theme = useTheme();
  const isLight = theme.palette.mode === "light";
  return (
    <Paper
      sx={{
        p: 2,
        borderRadius: 3,
        height: "100%",
        bgcolor: isLight ? alpha(theme.palette.background.paper, 0.96) : "rgba(5, 18, 31, 0.62)",
        border: `1px solid ${isLight ? alpha(theme.palette.primary.main, 0.22) : "rgba(90, 152, 211, 0.2)"}`,
        boxShadow: isLight ? "0 8px 16px rgba(20, 45, 70, 0.08)" : "0 10px 24px rgba(0, 0, 0, 0.28)",
        backdropFilter: "blur(8px)",
        animation: `cardRise 540ms ease ${pulseDelay} both`,
      }}
    >
      <Typography
        variant="h5"
        fontWeight={700}
        sx={{ fontFamily: "'Merriweather', 'Georgia', serif" }}
      >
        {value}
      </Typography>
      <Typography variant="body2" sx={{ mt: 0.4, opacity: 0.95 }}>
        {label}
      </Typography>
      {hint && (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.3 }}>
          {hint}
        </Typography>
      )}
    </Paper>
  );
};

const TrendBars = ({ title, bars, color }) => (
  <Box sx={{ minHeight: 172 }}>
    <Typography variant="subtitle2" sx={{ mb: 1.2, opacity: 0.95 }}>
      {title}
    </Typography>
    <Stack direction="row" alignItems="flex-end" spacing={1.2} sx={{ minHeight: 136 }}>
      {bars.map((bar) => (
        <Box key={bar.label} sx={{ textAlign: "center", minWidth: 48 }}>
          <Box
            sx={{
              height: `${bar.height}px`,
              borderRadius: 2,
              background: color,
              border: "1px solid rgba(255,255,255,0.16)",
              boxShadow: "0 8px 20px rgba(0, 0, 0, 0.22)",
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
  const theme = useTheme();
  const isLight = theme.palette.mode === "light";
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

  const completionRate = Number(metrics.completionRate ?? 0);
  const onTimeRate = Number(metrics.onTimeRate ?? 0);
  const panelBg = isLight ? alpha(theme.palette.background.paper, 0.92) : "rgba(3, 20, 34, 0.72)";
  const panelBorder = isLight ? alpha(theme.palette.primary.main, 0.22) : "rgba(98, 176, 234, 0.2)";
  const heroBorder = isLight ? alpha(theme.palette.primary.main, 0.26) : "rgba(93, 180, 255, 0.16)";
  const heroBg = isLight
    ? "radial-gradient(circle at 20% 10%, rgba(89, 169, 224, 0.18), transparent 40%), linear-gradient(130deg, rgba(245, 251, 255, 0.96), rgba(236, 246, 253, 0.92) 55%, rgba(226, 240, 250, 0.86))"
    : "radial-gradient(circle at 20% 10%, rgba(30, 125, 172, 0.22), transparent 40%), linear-gradient(130deg, rgba(1, 15, 31, 0.95), rgba(3, 23, 41, 0.92) 55%, rgba(7, 34, 57, 0.8))";

  return (
    <Box
      sx={{
        position: "relative",
        px: { xs: 1, md: 0 },
        pb: 1,
        "@keyframes cardRise": {
          from: { opacity: 0, transform: "translateY(16px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
      }}
    >
      <Box
        sx={{
          mb: 2.5,
          p: { xs: 2, md: 2.6 },
          borderRadius: 4,
          border: `1px solid ${heroBorder}`,
          background: heroBg,
          boxShadow: isLight ? "0 14px 28px rgba(30, 60, 90, 0.12)" : "0 18px 40px rgba(0, 0, 0, 0.35)",
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1.5}>
          <Stack direction="row" alignItems="center" spacing={1.1}>
            <InsightsIcon sx={{ color: "#70d2ff" }} />
            <Typography
              variant="h4"
              fontWeight={700}
              sx={{ fontFamily: "'Merriweather', 'Georgia', serif", letterSpacing: 0.2 }}
            >
              Profile Performance
            </Typography>
          </Stack>
          <Chip
            icon={<Groups2Icon />}
            label={`${(identity.teams || []).length} Teams Active`}
            sx={{
              bgcolor: isLight ? alpha(theme.palette.primary.main, 0.12) : "rgba(16, 76, 120, 0.35)",
              border: `1px solid ${isLight ? alpha(theme.palette.primary.main, 0.24) : "rgba(106, 186, 239, 0.26)"}`,
            }}
          />
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          A professional snapshot of identity, execution quality, consistency trends, and improvement signals.
        </Typography>
      </Box>

      {message && (
        <Alert severity={message.type} sx={{ mb: 2, borderRadius: 2.5 }}>
          {message.text}
        </Alert>
      )}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "320px minmax(0, 1fr)" },
          gap: 2.2,
          alignItems: "start",
        }}
      >
        <Box>
          <Paper
            sx={{
              p: 2.5,
              borderRadius: 4,
              height: "100%",
              border: `1px solid ${panelBorder}`,
              bgcolor: panelBg,
              boxShadow: isLight ? "0 10px 20px rgba(20, 45, 70, 0.09)" : "0 14px 28px rgba(0, 0, 0, 0.28)",
              animation: "cardRise 500ms ease both",
            }}
          >
            <Stack alignItems="center" spacing={1.25}>
              <Avatar
                src={user.photo || ""}
                sx={{
                  width: 102,
                  height: 102,
                  border: "2px solid rgba(132, 208, 255, 0.58)",
                  boxShadow: "0 10px 26px rgba(6, 83, 126, 0.46)",
                }}
              >
                {user.name?.[0]}
              </Avatar>
              <Typography
                variant="h6"
                sx={{ fontFamily: "'Merriweather', 'Georgia', serif", fontWeight: 700 }}
              >
                {user.name}
              </Typography>
              <Stack direction="row" spacing={0.8} alignItems="center">
                <EmailOutlinedIcon sx={{ fontSize: 16, opacity: 0.75 }} />
                <Typography variant="body2" color="text.secondary">
                  {user.email}
                </Typography>
              </Stack>
              <Chip
                label={`Role: ${identity.primaryRole || "member"}`}
                size="small"
                sx={{
                  bgcolor: isLight ? alpha(theme.palette.info.main, 0.12) : "rgba(22, 85, 122, 0.32)",
                  border: `1px solid ${isLight ? alpha(theme.palette.info.main, 0.25) : "rgba(121, 190, 232, 0.24)"}`,
                }}
              />
              <Button
                variant="outlined"
                startIcon={<CloudUploadIcon />}
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                sx={{
                  mt: 0.8,
                  px: 2.4,
                  borderRadius: 2.2,
                  borderColor: isLight ? alpha(theme.palette.primary.main, 0.45) : "rgba(110, 198, 238, 0.45)",
                }}
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
            <Stack spacing={1.2}>
              <Typography variant="subtitle2" sx={{ mb: 0.2 }}>
                Personal Reliability
              </Typography>
              <Box>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">
                    Completion Rate
                  </Typography>
                  <Typography variant="caption" fontWeight={700}>
                    {completionRate}%
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={Math.max(0, Math.min(100, completionRate))}
                  sx={{
                    mt: 0.45,
                    height: 8,
                    borderRadius: 10,
                    bgcolor: "rgba(255,255,255,0.08)",
                    "& .MuiLinearProgress-bar": {
                      background: "linear-gradient(90deg, #2da8c9, #73e3d2)",
                    },
                  }}
                />
              </Box>
              <Box>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">
                    On-time Delivery
                  </Typography>
                  <Typography variant="caption" fontWeight={700}>
                    {onTimeRate}%
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={Math.max(0, Math.min(100, onTimeRate))}
                  sx={{
                    mt: 0.45,
                    height: 8,
                    borderRadius: 10,
                    bgcolor: "rgba(255,255,255,0.08)",
                    "& .MuiLinearProgress-bar": {
                      background: "linear-gradient(90deg, #be996f, #e3c293)",
                    },
                  }}
                />
              </Box>
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
                  sx={{
                    justifyContent: "flex-start",
                    borderRadius: 2,
                    borderColor: isLight ? alpha(theme.palette.primary.main, 0.24) : "rgba(125, 202, 242, 0.28)",
                    bgcolor: isLight ? alpha(theme.palette.primary.main, 0.08) : "rgba(4, 25, 44, 0.52)",
                  }}
                />
              ))}
              {(identity.teams || []).length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  No teams joined yet.
                </Typography>
              )}
            </Stack>
          </Paper>
        </Box>

        <Box>
          <Paper
            sx={{
              p: 2.5,
              borderRadius: 4,
              border: `1px solid ${panelBorder}`,
              bgcolor: panelBg,
              boxShadow: isLight ? "0 10px 20px rgba(20, 45, 70, 0.09)" : "0 14px 28px rgba(0, 0, 0, 0.27)",
              animation: "cardRise 560ms ease both",
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.2 }}>
              <Typography variant="h6" sx={{ fontFamily: "'Merriweather', 'Georgia', serif" }}>
                Execution Snapshot
              </Typography>
              <Chip
                size="small"
                label={executionScore?.snapshotDate ? formatDateLabel(executionScore.snapshotDate) : "No snapshot yet"}
                sx={{
                  bgcolor: isLight ? alpha(theme.palette.info.main, 0.12) : "rgba(19, 81, 122, 0.28)",
                  border: `1px solid ${isLight ? alpha(theme.palette.info.main, 0.24) : "rgba(116, 191, 235, 0.24)"}`,
                }}
              />
            </Stack>
            <Grid container spacing={1.3}>
              <Grid item xs={6} md={4}>
                <MetricCard
                  label="Execution Score"
                  value={executionScore?.score ?? 0}
                  hint={executionScore?.snapshotDate ? "Latest stored snapshot" : "Not computed yet"}
                  pulseDelay="0.05s"
                />
              </Grid>
              <Grid item xs={6} md={4}>
                <MetricCard label="On-time %" value={`${metrics.onTimeRate ?? 0}%`} pulseDelay="0.1s" />
              </Grid>
              <Grid item xs={6} md={4}>
                <MetricCard label="Subtasks Completed" value={metrics.subtasksCompleted ?? 0} pulseDelay="0.15s" />
              </Grid>
              <Grid item xs={6} md={4}>
                <MetricCard label="Active Tasks" value={metrics.activeTasks ?? 0} pulseDelay="0.2s" />
              </Grid>
              <Grid item xs={6} md={4}>
                <MetricCard
                  label="Avg Completion Time"
                  value={`${metrics.averageSubtaskDurationHours ?? 0}h`}
                  pulseDelay="0.25s"
                />
              </Grid>
              <Grid item xs={6} md={4}>
                <MetricCard
                  label="Completion Rate"
                  value={`${metrics.completionRate ?? 0}%`}
                  pulseDelay="0.3s"
                />
              </Grid>
            </Grid>
          </Paper>

          <Paper
            sx={{
              p: 2.5,
              borderRadius: 4,
              mt: 2,
              border: `1px solid ${panelBorder}`,
              bgcolor: panelBg,
              boxShadow: isLight ? "0 10px 20px rgba(20, 45, 70, 0.09)" : "0 14px 28px rgba(0, 0, 0, 0.25)",
              animation: "cardRise 620ms ease both",
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.2 }}>
              <TrendingUpIcon sx={{ color: "#78d7ff" }} />
              <Typography variant="h6" sx={{ fontFamily: "'Merriweather', 'Georgia', serif" }}>
                Performance Trend
              </Typography>
            </Stack>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TrendBars
                  title="Score (Last 4 Weeks)"
                  bars={scoreBars}
                  color="linear-gradient(180deg, #1094ad, #166270)"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TrendBars
                  title="Completion Trend (Last 4 Weeks)"
                  bars={completionBars}
                  color="linear-gradient(180deg, #c59a70, #8b694d)"
                />
              </Grid>
            </Grid>
            <Alert severity="info" sx={{ mt: 1.8, borderRadius: 2.2 }}>
              Score trend uses your stored weekly/daily score snapshots. Completion trend counts
              subtasks completed per 7-day window across the latest 4 weeks.
            </Alert>
          </Paper>
          <Grid container spacing={2.2} sx={{ mt: 1.2 }}>
            <Grid item xs={12} md={6}>
              <Paper
                sx={{
                  p: 2.5,
                  borderRadius: 4,
                  height: "100%",
                  border: `1px solid ${panelBorder}`,
                  bgcolor: panelBg,
                  boxShadow: isLight ? "0 10px 20px rgba(20, 45, 70, 0.09)" : "0 12px 26px rgba(0, 0, 0, 0.22)",
                  animation: "cardRise 680ms ease both",
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                  <MilitaryTechIcon sx={{ color: "#79de9e" }} />
                  <Typography variant="h6" sx={{ fontFamily: "'Merriweather', 'Georgia', serif" }}>
                    Recognition Badges
                  </Typography>
                </Stack>
                <Stack spacing={1.2}>
                  {badges.map((badge) => (
                    <Box key={badge.id}>
                      <Chip
                        label={badge.title}
                        size="small"
                        sx={{
                          mb: 0.5,
                          bgcolor: isLight ? alpha(theme.palette.success.main, 0.12) : "rgba(27, 120, 73, 0.22)",
                          border: `1px solid ${isLight ? alpha(theme.palette.success.main, 0.28) : "rgba(122, 226, 171, 0.3)"}`,
                        }}
                      />
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
              <Paper
                sx={{
                  p: 2.5,
                  borderRadius: 4,
                  height: "100%",
                  border: `1px solid ${panelBorder}`,
                  bgcolor: panelBg,
                  boxShadow: isLight ? "0 10px 20px rgba(20, 45, 70, 0.09)" : "0 12px 26px rgba(0, 0, 0, 0.22)",
                  animation: "cardRise 740ms ease both",
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                  <TipsAndUpdatesIcon sx={{ color: "#f7c981" }} />
                  <Typography variant="h6" sx={{ fontFamily: "'Merriweather', 'Georgia', serif" }}>
                    Focus Nudges
                  </Typography>
                </Stack>
                {nudges.reminder ? (
                  <Alert severity="warning" sx={{ mb: 1.2, borderRadius: 2 }}>
                    {nudges.reminder}
                  </Alert>
                ) : (
                  <Alert severity="success" sx={{ mb: 1.2, borderRadius: 2 }}>
                    No stalled assigned tasks detected.
                  </Alert>
                )}
                <Stack spacing={1}>
                  {(nudges.needsAttentionTasks || []).map((item) => (
                    <Paper
                      key={item.taskId || item.title}
                      variant="outlined"
                      sx={{
                        p: 1.2,
                        borderRadius: 2.4,
                        borderColor: isLight ? alpha(theme.palette.primary.main, 0.24) : "rgba(118, 194, 236, 0.28)",
                        bgcolor: isLight ? alpha(theme.palette.primary.main, 0.06) : "rgba(8, 30, 49, 0.66)",
                      }}
                    >
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
      </Box>
    </Box>
  );
}
