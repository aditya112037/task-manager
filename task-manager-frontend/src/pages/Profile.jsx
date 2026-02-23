import React, { useRef, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { authAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

const toBars = (items = [], valueKey = "score") => {
  const max = Math.max(1, ...items.map((item) => Number(item[valueKey] || 0)));
  return items.map((item) => ({
    label: item.label,
    value: Number(item[valueKey] || 0),
    height: Math.max(8, Math.round((Number(item[valueKey] || 0) / max) * 90)),
  }));
};

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

  const scoreBars = toBars(scoreLast4Weeks, "score");
  const completionBars = toBars(
    completionLast4Weeks.map((item) => ({ ...item, score: item.completedSubtasks })),
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
      <Typography variant="h4" fontWeight={700} sx={{ mb: 2 }}>
        Profile
      </Typography>

      {message && (
        <Alert severity={message.type} sx={{ mb: 2 }}>
          {message.text}
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2.5, borderRadius: 3 }}>
            <Stack alignItems="center" spacing={1.5}>
              <Avatar src={user.photo || ""} sx={{ width: 92, height: 92 }}>
                {user.name?.[0]}
              </Avatar>
              <Typography variant="h6">{user.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {user.email}
              </Typography>
              <Chip size="small" label={`Role: ${identity.primaryRole || "member"}`} />
              <Button
                variant="outlined"
                startIcon={<CloudUploadIcon />}
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
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
              <Box sx={{ width: "100%", mt: 1 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Teams
                </Typography>
                <Stack spacing={0.7}>
                  {(identity.teams || []).map((team) => (
                    <Chip key={team._id} size="small" label={`${team.name} (${team.role})`} />
                  ))}
                  {(identity.teams || []).length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      No teams joined yet.
                    </Typography>
                  )}
                </Stack>
              </Box>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2.5, borderRadius: 3 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Execution Snapshot
            </Typography>
            <Grid container spacing={1.5}>
              <Grid item xs={6} sm={4}>
                <Typography variant="h4" fontWeight={700}>
                  {executionScore?.score ?? 0}
                </Typography>
                <Typography variant="caption">Execution Score</Typography>
              </Grid>
              <Grid item xs={6} sm={4}>
                <Typography variant="h4" fontWeight={700}>
                  {metrics.onTimeRate ?? 0}%
                </Typography>
                <Typography variant="caption">On-time %</Typography>
              </Grid>
              <Grid item xs={6} sm={4}>
                <Typography variant="h4" fontWeight={700}>
                  {metrics.subtasksCompleted ?? 0}
                </Typography>
                <Typography variant="caption">Subtasks Completed</Typography>
              </Grid>
              <Grid item xs={6} sm={4}>
                <Typography variant="h4" fontWeight={700}>
                  {metrics.activeTasks ?? 0}
                </Typography>
                <Typography variant="caption">Active Tasks</Typography>
              </Grid>
              <Grid item xs={6} sm={4}>
                <Typography variant="h4" fontWeight={700}>
                  {metrics.averageSubtaskDurationHours ?? 0}h
                </Typography>
                <Typography variant="caption">Avg Completion Time</Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 2.5, borderRadius: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Performance Trend
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Score (Last 4 Weeks)
                </Typography>
                <Stack direction="row" alignItems="flex-end" spacing={1}>
                  {scoreBars.map((bar) => (
                    <Box key={bar.label} sx={{ textAlign: "center", minWidth: 50 }}>
                      <Box
                        sx={{
                          height: `${bar.height}px`,
                          borderRadius: 1,
                          background: "linear-gradient(180deg, #0f766e, #145f58)",
                        }}
                      />
                      <Typography variant="caption">{bar.label}</Typography>
                    </Box>
                  ))}
                </Stack>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Completion Trend (Last 4 Weeks)
                </Typography>
                <Stack direction="row" alignItems="flex-end" spacing={1}>
                  {completionBars.map((bar) => (
                    <Box key={bar.label} sx={{ textAlign: "center", minWidth: 50 }}>
                      <Box
                        sx={{
                          height: `${bar.height}px`,
                          borderRadius: 1,
                          background: "linear-gradient(180deg, #b08968, #8b694d)",
                        }}
                      />
                      <Typography variant="caption">{bar.label}</Typography>
                    </Box>
                  ))}
                </Stack>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2.5, borderRadius: 3 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Recognition Badges
            </Typography>
            <Stack spacing={1}>
              {badges.map((badge) => (
                <Box key={badge.id}>
                  <Chip label={badge.title} color="primary" size="small" sx={{ mb: 0.5 }} />
                  <Typography variant="body2" color="text.secondary">
                    {badge.description}
                  </Typography>
                </Box>
              ))}
              {badges.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  Keep execution steady. Badges are awarded automatically from real work patterns.
                </Typography>
              )}
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2.5, borderRadius: 3 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Focus Nudges
            </Typography>
            {nudges.reminder ? (
              <Alert severity="warning" sx={{ mb: 1.5 }}>
                {nudges.reminder}
              </Alert>
            ) : (
              <Alert severity="success" sx={{ mb: 1.5 }}>
                No stalled assigned tasks detected.
              </Alert>
            )}
            <Stack spacing={1}>
              {(nudges.needsAttentionTasks || []).map((item) => (
                <Box key={item.taskId || item.title}>
                  <Typography variant="body2" fontWeight={600}>
                    {item.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {item.stalledSubtasks} stalled subtask(s), up to {item.maxDaysStalled} day(s) without progress.
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
