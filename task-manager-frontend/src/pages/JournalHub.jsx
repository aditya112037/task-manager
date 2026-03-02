import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Slider,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import FavoriteIcon from "@mui/icons-material/Favorite";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AddIcon from "@mui/icons-material/Add";
import { journalsAPI } from "../services/api";

const MOOD_OPTIONS = [
  { value: "awful", label: "Awful" },
  { value: "low", label: "Low" },
  { value: "neutral", label: "Neutral" },
  { value: "good", label: "Good" },
  { value: "great", label: "Great" },
];

const TEMPLATE_OPTIONS = [
  { value: "freeform", label: "Freeform" },
  { value: "morning-intent", label: "Morning Intent" },
  { value: "day-review", label: "Day Review" },
  { value: "travel-log", label: "Travel Log" },
];

const emptyForm = {
  title: "",
  content: "",
  mood: "neutral",
  energy: 3,
  entryDate: "",
  template: "freeform",
  tagsInput: "",
  gratitudeInput: "",
  highlightsInput: "",
  locationLabel: "",
};

const toLocalInputValue = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}`;
};

const parseCommaInput = (value) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const JournalHub = () => {
  const [entries, setEntries] = useState([]);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const [filters, setFilters] = useState({
    search: "",
    mood: "",
    favorite: false,
  });

  const [form, setForm] = useState(emptyForm);

  const moodCounts = useMemo(() => {
    if (!insights?.moodDistribution) return [];
    return insights.moodDistribution;
  }, [insights]);

  const loadEntries = useCallback(async () => {
    try {
      setError("");
      setLoading(true);
      const params = { limit: 50 };
      if (filters.search.trim()) params.search = filters.search.trim();
      if (filters.mood) params.mood = filters.mood;
      if (filters.favorite) params.favorite = true;

      const [entriesRes, insightsRes] = await Promise.all([
        journalsAPI.getEntries(params),
        journalsAPI.getInsights(30),
      ]);

      setEntries(entriesRes.data?.entries || []);
      setInsights(insightsRes.data || null);
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || "Failed to load journal data");
    } finally {
      setLoading(false);
    }
  }, [filters.favorite, filters.mood, filters.search]);

  useEffect(() => {
    const id = setTimeout(() => {
      loadEntries();
    }, 250);
    return () => clearTimeout(id);
  }, [loadEntries]);

  const openCreateDialog = () => {
    setEditing(null);
    setForm({ ...emptyForm, entryDate: toLocalInputValue(new Date()) });
    setDialogOpen(true);
  };

  const openEditDialog = (entry) => {
    setEditing(entry);
    setForm({
      title: entry.title || "",
      content: entry.content || "",
      mood: entry.mood || "neutral",
      energy: Number(entry.energy || 3),
      entryDate: toLocalInputValue(entry.entryDate || entry.createdAt),
      template: entry.template || "freeform",
      tagsInput: (entry.tags || []).join(", "),
      gratitudeInput: (entry.gratitude || []).join(", "),
      highlightsInput: (entry.highlights || []).join(", "),
      locationLabel: entry.location?.label || "",
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (saving) return;
    setDialogOpen(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const submitEntry = async () => {
    try {
      setSaving(true);
      const payload = {
        title: form.title,
        content: form.content,
        mood: form.mood,
        energy: form.energy,
        template: form.template,
        entryDate: form.entryDate ? new Date(form.entryDate).toISOString() : new Date().toISOString(),
        tags: parseCommaInput(form.tagsInput),
        gratitude: parseCommaInput(form.gratitudeInput),
        highlights: parseCommaInput(form.highlightsInput),
        location: { label: form.locationLabel || "" },
      };

      if (editing?._id) {
        await journalsAPI.updateEntry(editing._id, payload);
      } else {
        await journalsAPI.createEntry(payload);
      }

      closeDialog();
      await loadEntries();
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || "Failed to save entry");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (entryId) => {
    if (!window.confirm("Delete this journal entry?")) return;
    try {
      await journalsAPI.deleteEntry(entryId);
      await loadEntries();
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || "Failed to delete entry");
    }
  };

  const handleFavoriteToggle = async (entryId) => {
    try {
      await journalsAPI.toggleFavorite(entryId);
      await loadEntries();
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || "Failed to update favorite");
    }
  };

  return (
    <Container maxWidth="xl" sx={{ pb: 6 }}>
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between">
          <Box>
            <Typography variant="h4" fontWeight={700}>
              Journal
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Capture your day with reflections, mood, gratitude, and highlights.
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
            New Entry
          </Button>
        </Stack>
      </Paper>

      <Paper sx={{ p: 2, mb: 3, borderRadius: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              size="small"
              label="Search entries"
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Mood</InputLabel>
              <Select
                label="Mood"
                value={filters.mood}
                onChange={(e) => setFilters((prev) => ({ ...prev, mood: e.target.value }))}
              >
                <MenuItem value="">All moods</MenuItem>
                {MOOD_OPTIONS.map((mood) => (
                  <MenuItem key={mood.value} value={mood.value}>
                    {mood.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControlLabel
              control={
                <Switch
                  checked={filters.favorite}
                  onChange={(e) => setFilters((prev) => ({ ...prev, favorite: e.target.checked }))}
                />
              }
              label="Favorites only"
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <Button variant="outlined" fullWidth onClick={loadEntries}>
              Refresh
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {insights && (
        <Paper sx={{ p: 2, mb: 3, borderRadius: 3 }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
            <Chip label={`Entries: ${insights.totalEntries || 0}`} />
            <Chip label={`Unique Days: ${insights.uniqueDays || 0}`} />
            <Chip label={`Favorites: ${insights.favoriteCount || 0}`} />
            <Chip label={`Avg Words: ${insights.avgWordsPerEntry || 0}`} />
            {moodCounts.slice(0, 3).map((item) => (
              <Chip key={item.mood} variant="outlined" label={`${item.mood}: ${item.count}`} />
            ))}
          </Stack>
        </Paper>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Typography color="text.secondary">Loading entries...</Typography>
      ) : entries.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: "center", borderRadius: 3 }}>
          <Typography variant="h6" gutterBottom>
            No journal entries yet
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Start with a quick daily check-in.
          </Typography>
          <Button variant="contained" onClick={openCreateDialog}>
            Create First Entry
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {entries.map((entry) => (
            <Grid item xs={12} md={6} lg={4} key={entry._id}>
              <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Stack direction="row" justifyContent="space-between" spacing={1}>
                    <Typography variant="h6" sx={{ pr: 1 }}>
                      {entry.title || "Untitled Entry"}
                    </Typography>
                    <Tooltip title={entry.isFavorite ? "Unfavorite" : "Favorite"}>
                      <IconButton onClick={() => handleFavoriteToggle(entry._id)} size="small">
                        {entry.isFavorite ? <FavoriteIcon color="error" /> : <FavoriteBorderIcon />}
                      </IconButton>
                    </Tooltip>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(entry.entryDate || entry.createdAt).toLocaleString()}
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 1, mb: 1, flexWrap: "wrap", gap: 1 }}>
                    <Chip size="small" label={`Mood: ${entry.mood || "neutral"}`} />
                    <Chip size="small" variant="outlined" label={`Energy: ${entry.energy || 3}/5`} />
                    <Chip size="small" variant="outlined" label={`${entry.wordCount || 0} words`} />
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-line" }}>
                    {String(entry.content || "").slice(0, 220) || "No content"}
                    {String(entry.content || "").length > 220 ? "..." : ""}
                  </Typography>
                  {(entry.tags || []).length > 0 && (
                    <Stack direction="row" sx={{ mt: 1.5, flexWrap: "wrap", gap: 0.8 }}>
                      {entry.tags.slice(0, 6).map((tag) => (
                        <Chip key={`${entry._id}-${tag}`} size="small" variant="outlined" label={`#${tag}`} />
                      ))}
                    </Stack>
                  )}
                </CardContent>
                <CardActions>
                  <Button size="small" startIcon={<EditIcon />} onClick={() => openEditDialog(entry)}>
                    Edit
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    startIcon={<DeleteOutlineIcon />}
                    onClick={() => handleDelete(entry._id)}
                  >
                    Delete
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="md">
        <DialogTitle>{editing ? "Edit Entry" : "New Journal Entry"}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Title"
              fullWidth
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            />
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <TextField
                  type="datetime-local"
                  fullWidth
                  label="Entry Date"
                  InputLabelProps={{ shrink: true }}
                  value={form.entryDate}
                  onChange={(e) => setForm((prev) => ({ ...prev, entryDate: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Mood</InputLabel>
                  <Select
                    label="Mood"
                    value={form.mood}
                    onChange={(e) => setForm((prev) => ({ ...prev, mood: e.target.value }))}
                  >
                    {MOOD_OPTIONS.map((mood) => (
                      <MenuItem key={mood.value} value={mood.value}>
                        {mood.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Template</InputLabel>
                  <Select
                    label="Template"
                    value={form.template}
                    onChange={(e) => setForm((prev) => ({ ...prev, template: e.target.value }))}
                  >
                    {TEMPLATE_OPTIONS.map((tpl) => (
                      <MenuItem key={tpl.value} value={tpl.value}>
                        {tpl.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <Box>
              <Typography gutterBottom>Energy ({form.energy}/5)</Typography>
              <Slider
                value={form.energy}
                min={1}
                max={5}
                step={1}
                marks
                valueLabelDisplay="auto"
                onChange={(_, value) => setForm((prev) => ({ ...prev, energy: Number(value) }))}
              />
            </Box>
            <TextField
              label="Content"
              fullWidth
              multiline
              minRows={6}
              value={form.content}
              onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
            />
            <TextField
              label="Tags (comma separated)"
              fullWidth
              value={form.tagsInput}
              onChange={(e) => setForm((prev) => ({ ...prev, tagsInput: e.target.value }))}
            />
            <TextField
              label="Gratitude (comma separated)"
              fullWidth
              value={form.gratitudeInput}
              onChange={(e) => setForm((prev) => ({ ...prev, gratitudeInput: e.target.value }))}
            />
            <TextField
              label="Highlights (comma separated)"
              fullWidth
              value={form.highlightsInput}
              onChange={(e) => setForm((prev) => ({ ...prev, highlightsInput: e.target.value }))}
            />
            <TextField
              label="Location"
              fullWidth
              value={form.locationLabel}
              onChange={(e) => setForm((prev) => ({ ...prev, locationLabel: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submitEntry} variant="contained" disabled={saving}>
            {saving ? "Saving..." : editing ? "Update Entry" : "Create Entry"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default JournalHub;
