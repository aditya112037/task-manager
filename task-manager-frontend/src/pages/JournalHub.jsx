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
  Divider,
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
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import ViewAgendaIcon from "@mui/icons-material/ViewAgenda";
import TimelineIcon from "@mui/icons-material/Timeline";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { journalsAPI } from "../services/api";

const MOOD_OPTIONS = [
  { value: "awful", label: "Awful" },
  { value: "sad", label: "Sad" },
  { value: "anxious", label: "Anxious" },
  { value: "low", label: "Low" },
  { value: "neutral", label: "Neutral" },
  { value: "calm", label: "Calm" },
  { value: "good", label: "Good" },
  { value: "excited", label: "Excited" },
  { value: "grateful", label: "Grateful" },
  { value: "great", label: "Great" },
];

const TEMPLATE_OPTIONS = [
  { value: "freeform", label: "Freeform" },
  { value: "morning-intent", label: "Morning Intent" },
  { value: "day-review", label: "Day Review" },
  { value: "travel-log", label: "Travel Log" },
];

const MOOD_TONE = {
  awful: "Be gentle. Keep this short and honest.",
  sad: "Write softly. Name what hurts and what helps.",
  anxious: "Ground yourself. Focus on what is in your control.",
  low: "Keep it simple. One small win is enough.",
  neutral: "Document clearly. Keep it balanced and practical.",
  calm: "Reflect steadily and capture what worked.",
  good: "Build momentum by noting progress and gratitude.",
  excited: "Channel energy into clear next steps.",
  grateful: "Lean into appreciation and relationships.",
  great: "Celebrate boldly and define a meaningful next move.",
};

const MOOD_CARD_STYLE = {
  awful: { borderColor: "error.dark", glow: "rgba(211,47,47,0.16)" },
  sad: { borderColor: "error.main", glow: "rgba(244,67,54,0.14)" },
  anxious: { borderColor: "warning.main", glow: "rgba(237,108,2,0.18)" },
  low: { borderColor: "warning.dark", glow: "rgba(255,167,38,0.14)" },
  neutral: { borderColor: "divider", glow: "rgba(148,163,184,0.12)" },
  calm: { borderColor: "info.main", glow: "rgba(2,136,209,0.16)" },
  good: { borderColor: "success.main", glow: "rgba(46,125,50,0.14)" },
  excited: { borderColor: "secondary.main", glow: "rgba(156,39,176,0.16)" },
  grateful: { borderColor: "primary.main", glow: "rgba(2,136,209,0.16)" },
  great: { borderColor: "success.light", glow: "rgba(56,142,60,0.24)" },
};

const formatPromptDate = (value) => {
  const d = new Date(value || Date.now());
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const createTemplateDraft = (template, mood, entryDate) => {
  const tone = MOOD_TONE[mood] || MOOD_TONE.neutral;
  const dateLabel = formatPromptDate(entryDate);

  if (template === "morning-intent") {
    return {
      title: `Morning Intent - ${dateLabel}`,
      content: `Tone: ${tone}\n\nTop focus for today:\n- \n\nWhy this matters:\n- \n\nWhat I will protect (time/energy):\n- \n\nPotential friction + response plan:\n- \n\nOne promise to myself:\n- `,
      gratitudeInput: "fresh start, support system",
      highlightsInput: "most important outcome for tonight",
    };
  }

  if (template === "day-review") {
    return {
      title: `Day Review - ${dateLabel}`,
      content: `Tone: ${tone}\n\nWhat happened today:\n- \n\nWhat I handled well:\n- \n\nWhat felt hard:\n- \n\nLesson to carry forward:\n- \n\nTomorrow's first step:\n- `,
      gratitudeInput: "one person, one moment",
      highlightsInput: "key win, key learning",
    };
  }

  if (template === "travel-log") {
    return {
      title: `Travel Log - ${dateLabel}`,
      content: `Tone: ${tone}\n\nWhere I went:\n- \n\nBest moment:\n- \n\nPeople I met:\n- \n\nFood / culture notes:\n- \n\nPractical notes for future me:\n- `,
      gratitudeInput: "local kindness, safe travel",
      highlightsInput: "favorite place, must-repeat experience",
    };
  }

  return {
    title: `Freeform - ${dateLabel}`,
    content: `Tone: ${tone}\n\nWrite freely.\n`,
    gratitudeInput: "",
    highlightsInput: "",
  };
};

const REMINDER_LAST_KEY = "journalReminderLastDate";
const MAX_MEDIA_FILES = 8;
const MAX_MEDIA_BYTES = 4 * 1024 * 1024;

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
  linkInput: "",
  attachments: [],
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

const countWordsFromContent = (value) => {
  const text = String(value || "").trim();
  if (!text) return 0;
  const words = text.match(/\S+/g);
  return words ? words.length : 0;
};

const getDisplayWordCount = (entry) => {
  const backendCount = Number(entry?.wordCount || 0);
  const computed = countWordsFromContent(entry?.content || "");
  return Math.max(backendCount, computed);
};

const parseTimeToMinutes = (value) => {
  const [hh, mm] = String(value || "")
    .split(":")
    .map((part) => Number(part));
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  return hh * 60 + mm;
};

const normalizeReminderTime = (value) => {
  const raw = String(value || "").trim();
  const isoMatch = raw.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (isoMatch) return raw;

  const ampmMatch = raw.match(/^(\d{1,2}):([0-5]\d)\s*(am|pm)$/i);
  if (ampmMatch) {
    let hour = Number(ampmMatch[1]);
    const minute = Number(ampmMatch[2]);
    const period = ampmMatch[3].toLowerCase();
    if (hour === 12) hour = period === "am" ? 0 : 12;
    else if (period === "pm") hour += 12;
    return `${String(Math.max(0, Math.min(23, hour))).padStart(2, "0")}:${String(
      Math.max(0, Math.min(59, minute))
    ).padStart(2, "0")}`;
  }

  return "21:00";
};

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
    reader.readAsDataURL(file);
  });

const toDateKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const monthLabel = (date) =>
  date.toLocaleString(undefined, { month: "long", year: "numeric" });

const getCalendarCells = (monthDate) => {
  const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
  const firstDay = start.getDay();
  const cells = [];
  for (let i = 0; i < firstDay; i += 1) {
    cells.push({ key: `blank-${i}`, day: null });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    const d = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
    cells.push({ key: `day-${day}`, day, dateKey: toDateKey(d) });
  }
  return cells;
};

const EntryCard = ({ entry, onFavorite, onEdit, onDelete, onView }) => (
  <Card
    sx={{
      height: "100%",
      display: "flex",
      flexDirection: "column",
      border: "1px solid",
      borderColor: MOOD_CARD_STYLE[entry.mood || "neutral"]?.borderColor || "divider",
      boxShadow: `0 0 0 1px ${MOOD_CARD_STYLE[entry.mood || "neutral"]?.glow || "transparent"}, 0 10px 22px rgba(0,0,0,0.08)`,
      backgroundImage: `linear-gradient(180deg, ${MOOD_CARD_STYLE[entry.mood || "neutral"]?.glow || "transparent"} 0%, transparent 42%)`,
    }}
  >
    <CardContent sx={{ flexGrow: 1 }}>
      <Stack direction="row" justifyContent="space-between" spacing={1}>
        <Typography variant="h6" sx={{ pr: 1 }}>
          {entry.title || "Untitled Entry"}
        </Typography>
        <Tooltip title={entry.isFavorite ? "Unfavorite" : "Favorite"}>
          <IconButton onClick={() => onFavorite(entry._id)} size="small">
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
        <Chip size="small" variant="outlined" label={`${getDisplayWordCount(entry)} words`} />
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-line" }}>
        {String(entry.content || "").slice(0, 220) || "No content"}
        {String(entry.content || "").length > 220 ? "..." : ""}
      </Typography>
      {(() => {
        const media = (entry.attachments || []).filter((item) => item.type === "image" || item.type === "audio");
        const previewImage = media.find((item) => item.type === "image");
        const previewAudio = media.find((item) => item.type === "audio");
        return (
          <>
            {previewImage?.url && (
              <Box sx={{ mt: 1.5 }}>
                <Box
                  component="img"
                  src={previewImage.url}
                  alt={previewImage.caption || "Journal image"}
                  sx={{
                    width: "100%",
                    height: 150,
                    borderRadius: 1.5,
                    objectFit: "cover",
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                />
              </Box>
            )}
            {previewAudio?.url && (
              <Box sx={{ mt: 1.3 }}>
                <audio controls preload="none" style={{ width: "100%" }}>
                  <source src={previewAudio.url} />
                </audio>
              </Box>
            )}
          </>
        );
      })()}
      {(entry.attachments || []).some((att) => att.type !== "image") && (
        <Stack direction="row" sx={{ mt: 1.2, flexWrap: "wrap", gap: 0.8 }}>
          {(entry.attachments || [])
            .filter((att) => att.type !== "image")
            .slice(0, 3)
            .map((att, idx) => (
            <Chip
              key={`${entry._id}-att-${idx}`}
              size="small"
              color="primary"
              variant="outlined"
              label={att.type === "link" ? "Link" : "Audio"}
            />
          ))}
        </Stack>
      )}
      {(entry.tags || []).length > 0 && (
        <Stack direction="row" sx={{ mt: 1.5, flexWrap: "wrap", gap: 0.8 }}>
          {entry.tags.slice(0, 6).map((tag) => (
            <Chip key={`${entry._id}-${tag}`} size="small" variant="outlined" label={`#${tag}`} />
          ))}
        </Stack>
      )}
    </CardContent>
    <CardActions>
      <Button size="small" startIcon={<VisibilityIcon />} onClick={() => onView(entry)}>
        View
      </Button>
      <Button size="small" startIcon={<EditIcon />} onClick={() => onEdit(entry)}>
        Edit
      </Button>
      <Button size="small" color="error" startIcon={<DeleteOutlineIcon />} onClick={() => onDelete(entry._id)}>
        Delete
      </Button>
    </CardActions>
  </Card>
);

const JournalHub = () => {
  const [entries, setEntries] = useState([]);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewingEntry, setViewingEntry] = useState(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState("list");
  const [selectedDate, setSelectedDate] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const [filters, setFilters] = useState({
    search: "",
    mood: "",
    favorite: false,
  });

  const [form, setForm] = useState(emptyForm);

  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState("21:00");
  const [reminderSettingsLoaded, setReminderSettingsLoaded] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "denied"
  );

  const moodCounts = useMemo(() => insights?.moodDistribution || [], [insights]);

  const loadEntries = useCallback(async () => {
    try {
      setError("");
      setLoading(true);
      const params = { limit: 120 };
      if (filters.search.trim()) params.search = filters.search.trim();
      if (filters.mood) params.mood = filters.mood;
      if (filters.favorite) params.favorite = true;

      const [entriesRes, insightsRes] = await Promise.all([
        journalsAPI.getEntries(params),
        journalsAPI.getInsights(180),
      ]);

      setEntries(entriesRes.data?.entries || []);
      setInsights(insightsRes.data || null);
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || "Failed to load insights data");
    } finally {
      setLoading(false);
    }
  }, [filters.favorite, filters.mood, filters.search]);

  useEffect(() => {
    const id = setTimeout(() => loadEntries(), 200);
    return () => clearTimeout(id);
  }, [loadEntries]);

  useEffect(() => {
    const syncPermission = () => {
      setNotificationPermission(typeof Notification !== "undefined" ? Notification.permission : "denied");
    };

    syncPermission();
    document.addEventListener("visibilitychange", syncPermission);
    window.addEventListener("focus", syncPermission);
    return () => {
      document.removeEventListener("visibilitychange", syncPermission);
      window.removeEventListener("focus", syncPermission);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const loadReminderSettings = async () => {
      try {
        const res = await journalsAPI.getReminderSettings();
        if (!active) return;
        setReminderEnabled(Boolean(res?.data?.enabled));
        setReminderTime(normalizeReminderTime(res?.data?.time || "21:00"));
      } catch (err) {
        console.error("Failed to load reminder settings:", err);
      } finally {
        if (active) setReminderSettingsLoaded(true);
      }
    };

    loadReminderSettings();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!reminderSettingsLoaded) return;
    const timeout = setTimeout(async () => {
      try {
        await journalsAPI.updateReminderSettings({
          enabled: reminderEnabled,
          time: normalizeReminderTime(reminderTime),
        });
      } catch (err) {
        console.error("Failed to save reminder settings:", err);
      }
    }, 250);

    return () => clearTimeout(timeout);
  }, [reminderEnabled, reminderTime, reminderSettingsLoaded]);

  useEffect(() => {
    if (!reminderEnabled) return;
    if (typeof Notification === "undefined") return;

    if (Notification.permission === "default") {
      Notification.requestPermission()
        .then((permission) => {
          setNotificationPermission(permission);
          if (permission !== "granted") {
            setError("Notification permission is required for reminders.");
          }
        })
        .catch((err) => {
          console.error(err);
          setError("Could not request notification permission.");
        });
    }
  }, [reminderEnabled]);

  useEffect(() => {
    const maybeSendReminder = async () => {
      if (!reminderEnabled || notificationPermission !== "granted") return;

      const now = new Date();
      const today = toDateKey(now);
      const last = localStorage.getItem(REMINDER_LAST_KEY);
      if (last === today) return;

      const targetMinutes = parseTimeToMinutes(reminderTime);
      if (targetMinutes === null) return;

      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      if (nowMinutes < targetMinutes) return;

      localStorage.setItem(REMINDER_LAST_KEY, today);

      // Persist a once-per-day in-app notification so reminder appears in Notification Center.
      try {
        await journalsAPI.emitReminderNotification();
      } catch (err) {
        console.error("Failed to emit reminder notification:", err);
      }

      const reminder = new Notification("Insights Reminder", {
        body: "Take 2 minutes to write today's reflection.",
      });
      reminder.onclick = () => window.focus();
    };

    // Run once immediately (handles opening app after reminder time).
    maybeSendReminder();

    // Then check every minute.
    const interval = setInterval(maybeSendReminder, 60000);
    return () => clearInterval(interval);
  }, [notificationPermission, reminderEnabled, reminderTime]);

  const openCreateDialog = () => {
    const now = new Date();
    const draft = createTemplateDraft("freeform", "neutral", now);
    setEditing(null);
    setForm({
      ...emptyForm,
      template: "freeform",
      mood: "neutral",
      entryDate: toLocalInputValue(now),
      title: draft.title,
      content: draft.content,
      gratitudeInput: draft.gratitudeInput,
      highlightsInput: draft.highlightsInput,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (entry) => {
    setEditing(entry);
    const existingLinks = (entry.attachments || [])
      .filter((item) => item.type === "link" && String(item.url || "").startsWith("http"))
      .map((item) => item.url)
      .join(", ");
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
      linkInput: existingLinks,
      attachments: (entry.attachments || []).filter((item) => item.type !== "link"),
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (saving) return;
    setDialogOpen(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const applyTemplateToForm = (templateValue, moodValue, dateValue) => {
    const draft = createTemplateDraft(templateValue, moodValue, dateValue || new Date());
    setForm((prev) => ({
      ...prev,
      template: templateValue,
      title: draft.title,
      content: draft.content,
      gratitudeInput: draft.gratitudeInput,
      highlightsInput: draft.highlightsInput,
    }));
  };

  const updateToneLine = (content, moodValue) => {
    const toneLine = `Tone: ${MOOD_TONE[moodValue] || MOOD_TONE.neutral}`;
    const text = String(content || "");
    if (!text.trim()) return `${toneLine}\n\n`;
    if (text.startsWith("Tone: ")) {
      const firstBreak = text.indexOf("\n");
      if (firstBreak === -1) return toneLine;
      return `${toneLine}${text.slice(firstBreak)}`;
    }
    return `${toneLine}\n\n${text}`;
  };

  const openViewDialog = (entry) => {
    setViewingEntry(entry);
    setViewOpen(true);
  };

  const closeViewDialog = () => {
    setViewOpen(false);
    setViewingEntry(null);
  };

  const submitEntry = async () => {
    try {
      setSaving(true);
      const linkAttachments = parseCommaInput(form.linkInput)
        .filter((url) => /^https?:\/\//i.test(url))
        .map((url) => ({ type: "link", url, caption: "" }));
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
        attachments: [...(form.attachments || []), ...linkAttachments].slice(0, 12),
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

  const handleMediaUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    try {
      const current = form.attachments || [];
      const remainingSlots = Math.max(0, MAX_MEDIA_FILES - current.length);
      const accepted = files.slice(0, remainingSlots);
      const nextAttachments = [];
      for (const file of accepted) {
        if (file.size > MAX_MEDIA_BYTES) {
          setError(`"${file.name}" exceeds 4MB and was skipped.`);
          continue;
        }
        const type = file.type.startsWith("image/")
          ? "image"
          : file.type.startsWith("audio/")
            ? "audio"
            : "";
        if (!type) continue;
        const dataUrl = await fileToDataUrl(file);
        nextAttachments.push({
          type,
          url: dataUrl,
          caption: file.name,
        });
      }
      setForm((prev) => ({
        ...prev,
        attachments: [...(prev.attachments || []), ...nextAttachments].slice(0, MAX_MEDIA_FILES),
      }));
    } catch (err) {
      console.error(err);
      setError("Failed to upload media.");
    } finally {
      event.target.value = "";
    }
  };

  const removeAttachment = (index) => {
    setForm((prev) => ({
      ...prev,
      attachments: (prev.attachments || []).filter((_, i) => i !== index),
    }));
  };

  const handleDelete = async (entryId) => {
    if (!window.confirm("Delete this insights entry?")) return;
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

  const entriesByDay = useMemo(() => {
    const map = new Map();
    for (const entry of entries) {
      const key = toDateKey(entry.entryDate || entry.createdAt);
      if (!key) continue;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(entry);
    }
    for (const items of map.values()) {
      items.sort((a, b) => new Date(b.entryDate || b.createdAt) - new Date(a.entryDate || a.createdAt));
    }
    return map;
  }, [entries]);

  const visibleEntries = useMemo(() => {
    if (!selectedDate) return entries;
    return entries.filter((entry) => toDateKey(entry.entryDate || entry.createdAt) === selectedDate);
  }, [entries, selectedDate]);

  const timelineGroups = useMemo(() => {
    const grouped = {};
    visibleEntries.forEach((entry) => {
      const key = toDateKey(entry.entryDate || entry.createdAt);
      if (!key) return;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(entry);
    });
    return Object.keys(grouped)
      .sort((a, b) => new Date(b) - new Date(a))
      .map((key) => ({
        dateKey: key,
        entries: grouped[key].sort((a, b) => new Date(b.entryDate || b.createdAt) - new Date(a.entryDate || a.createdAt)),
      }));
  }, [visibleEntries]);

  const calendarCells = useMemo(() => getCalendarCells(calendarMonth), [calendarMonth]);

  const changeMonth = (offset) => {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };

  const renderList = () => {
    if (visibleEntries.length === 0) {
      return (
        <Paper sx={{ p: 6, textAlign: "center", borderRadius: 3 }}>
          <Typography variant="h6" gutterBottom>
            No insights yet
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Start with a quick daily check-in.
          </Typography>
          <Button variant="contained" onClick={openCreateDialog}>
            Create First Entry
          </Button>
        </Paper>
      );
    }
    return (
      <Grid container spacing={2}>
        {visibleEntries.map((entry) => (
          <Grid item xs={12} md={6} lg={4} key={entry._id}>
            <EntryCard
              entry={entry}
              onFavorite={handleFavoriteToggle}
              onEdit={openEditDialog}
              onDelete={handleDelete}
              onView={openViewDialog}
            />
          </Grid>
        ))}
      </Grid>
    );
  };

  const renderTimeline = () => {
    if (timelineGroups.length === 0) {
      return <Alert severity="info">No entries match this date/filter selection.</Alert>;
    }
    return (
      <Stack spacing={2}>
        {timelineGroups.map((group) => (
          <Paper key={group.dateKey} sx={{ p: 2.5, borderRadius: 3 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              {new Date(`${group.dateKey}T00:00:00`).toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              {group.entries.map((entry) => (
                <Grid item xs={12} md={6} key={entry._id}>
                  <EntryCard
                    entry={entry}
                    onFavorite={handleFavoriteToggle}
                    onEdit={openEditDialog}
                    onDelete={handleDelete}
                    onView={openViewDialog}
                  />
                </Grid>
              ))}
            </Grid>
          </Paper>
        ))}
      </Stack>
    );
  };

  const renderCalendar = () => (
    <Paper sx={{ p: 2.5, borderRadius: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Button startIcon={<ChevronLeftIcon />} onClick={() => changeMonth(-1)}>
          Prev
        </Button>
        <Typography variant="h6">{monthLabel(calendarMonth)}</Typography>
        <Button endIcon={<ChevronRightIcon />} onClick={() => changeMonth(1)}>
          Next
        </Button>
      </Stack>
      <Grid container spacing={1}>
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <Grid item xs key={d}>
            <Typography align="center" variant="caption" color="text.secondary">
              {d}
            </Typography>
          </Grid>
        ))}
      </Grid>
      <Grid container spacing={1} sx={{ mt: 0.5 }}>
        {calendarCells.map((cell) => {
          if (!cell.day) {
            return (
              <Grid item xs key={cell.key}>
                <Box sx={{ height: 84 }} />
              </Grid>
            );
          }
          const count = entriesByDay.get(cell.dateKey)?.length || 0;
          const active = selectedDate === cell.dateKey;
          return (
            <Grid item xs key={cell.key}>
              <Paper
                onClick={() => setSelectedDate((prev) => (prev === cell.dateKey ? "" : cell.dateKey))}
                sx={{
                  height: 84,
                  p: 1,
                  cursor: "pointer",
                  border: "1px solid",
                  borderColor: active ? "primary.main" : "divider",
                  backgroundColor: active ? "action.selected" : "background.paper",
                }}
              >
                <Typography variant="body2" fontWeight={700}>
                  {cell.day}
                </Typography>
                {count > 0 && (
                  <Chip size="small" color="primary" variant={active ? "filled" : "outlined"} label={`${count} entries`} />
                )}
              </Paper>
            </Grid>
          );
        })}
      </Grid>
      <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
        <Button variant="outlined" size="small" onClick={() => setSelectedDate("")}>
          Clear Date Filter
        </Button>
        <Button variant="outlined" size="small" onClick={() => setViewMode("timeline")}>
          Open Timeline
        </Button>
      </Stack>
    </Paper>
  );

  return (
    <Container maxWidth="xl" sx={{ pb: 6 }}>
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between">
          <Box>
            <Typography variant="h4" fontWeight={700}>
              Insights
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
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small" sx={{ minWidth: 220 }}>
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
          <Grid item xs={12} md={2}>
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
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.2} alignItems={{ md: "center" }} sx={{ flexWrap: "wrap" }}>
            <Chip label={`Entries: ${insights.totalEntries || 0}`} />
            <Chip label={`Unique Days: ${insights.uniqueDays || 0}`} />
            <Chip label={`Favorites: ${insights.favoriteCount || 0}`} />
            <Chip label={`Avg Words: ${insights.avgWordsPerEntry || 0}`} />
            <Chip color="success" variant="outlined" label={`Current Streak: ${insights?.streak?.current || 0} day(s)`} />
            <Chip color="secondary" variant="outlined" label={`Best Streak: ${insights?.streak?.longest || 0} day(s)`} />
            {moodCounts.slice(0, 3).map((item) => (
              <Chip key={item.mood} variant="outlined" label={`${item.mood}: ${item.count}`} />
            ))}
          </Stack>
        </Paper>
      )}

      <Paper sx={{ p: 2, mb: 3, borderRadius: 3 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }} justifyContent="space-between">
          <Stack direction="row" spacing={1}>
            <Button
              variant={viewMode === "list" ? "contained" : "outlined"}
              startIcon={<ViewAgendaIcon />}
              onClick={() => setViewMode("list")}
            >
              List
            </Button>
            <Button
              variant={viewMode === "timeline" ? "contained" : "outlined"}
              startIcon={<TimelineIcon />}
              onClick={() => setViewMode("timeline")}
            >
              Timeline
            </Button>
            <Button
              variant={viewMode === "calendar" ? "contained" : "outlined"}
              startIcon={<CalendarMonthIcon />}
              onClick={() => setViewMode("calendar")}
            >
              Calendar
            </Button>
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <NotificationsActiveIcon fontSize="small" color={reminderEnabled ? "primary" : "disabled"} />
              <FormControlLabel
                control={<Switch checked={reminderEnabled} onChange={(e) => setReminderEnabled(e.target.checked)} />}
                label="Daily reminder"
              />
            </Stack>
            <TextField
              type="time"
              size="small"
              label="Reminder Time"
              InputLabelProps={{ shrink: true }}
              value={reminderTime}
              onChange={(e) => setReminderTime(normalizeReminderTime(e.target.value))}
              inputProps={{ step: 60 }}
              sx={{ minWidth: 145 }}
            />
            
          </Stack>
        </Stack>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Typography color="text.secondary">Loading entries...</Typography>
      ) : viewMode === "calendar" ? (
        renderCalendar()
      ) : viewMode === "timeline" ? (
        renderTimeline()
      ) : (
        renderList()
      )}

      <Dialog open={viewOpen} onClose={closeViewDialog} fullWidth maxWidth="md">
        <DialogTitle>{viewingEntry?.title || "Insight Entry"}</DialogTitle>
        <DialogContent dividers>
          {viewingEntry ? (
            <Stack spacing={2}>
              <Typography variant="caption" color="text.secondary">
                {new Date(viewingEntry.entryDate || viewingEntry.createdAt).toLocaleString()}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
                <Chip size="small" label={`Mood: ${viewingEntry.mood || "neutral"}`} />
                <Chip size="small" variant="outlined" label={`Energy: ${viewingEntry.energy || 3}/5`} />
                <Chip size="small" variant="outlined" label={`${getDisplayWordCount(viewingEntry)} words`} />
              </Stack>
              <Typography variant="body1" sx={{ whiteSpace: "pre-line" }}>
                {viewingEntry.content || "No content"}
              </Typography>

              {((viewingEntry.attachments || []).filter((item) => item.type === "image").length > 0) && (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Images
                  </Typography>
                  <Grid container spacing={1.2}>
                    {(viewingEntry.attachments || [])
                      .filter((item) => item.type === "image")
                      .map((item, idx) => (
                        <Grid item xs={12} sm={6} key={`view-image-${idx}`}>
                          <Box
                            component="img"
                            src={item.url}
                            alt={item.caption || `Image ${idx + 1}`}
                            sx={{
                              width: "100%",
                              borderRadius: 2,
                              maxHeight: 280,
                              objectFit: "cover",
                              border: "1px solid",
                              borderColor: "divider",
                            }}
                          />
                          {item.caption ? (
                            <Typography variant="caption" color="text.secondary">
                              {item.caption}
                            </Typography>
                          ) : null}
                        </Grid>
                      ))}
                  </Grid>
                </Box>
              )}

              {((viewingEntry.attachments || []).filter((item) => item.type === "audio").length > 0) && (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Audio
                  </Typography>
                  <Stack spacing={1}>
                    {(viewingEntry.attachments || [])
                      .filter((item) => item.type === "audio")
                      .map((item, idx) => (
                        <Paper key={`view-audio-${idx}`} sx={{ p: 1.2 }}>
                          <Typography variant="body2" sx={{ mb: 0.7 }}>
                            {item.caption || `Audio ${idx + 1}`}
                          </Typography>
                          <audio controls preload="metadata" style={{ width: "100%" }}>
                            <source src={item.url} />
                          </audio>
                        </Paper>
                      ))}
                  </Stack>
                </Box>
              )}

              {((viewingEntry.attachments || []).filter((item) => item.type === "link").length > 0) && (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Links
                  </Typography>
                  <Stack spacing={1}>
                    {(viewingEntry.attachments || [])
                      .filter((item) => item.type === "link")
                      .map((item, idx) => (
                        <Button
                          key={`view-link-${idx}`}
                          variant="outlined"
                          component="a"
                          href={item.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          endIcon={<OpenInNewIcon />}
                          sx={{ justifyContent: "flex-start" }}
                        >
                          {item.caption || item.url}
                        </Button>
                      ))}
                  </Stack>
                </Box>
              )}

              {(viewingEntry.tags || []).length > 0 && (
                <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.8 }}>
                  {(viewingEntry.tags || []).map((tag) => (
                    <Chip key={`view-tag-${tag}`} size="small" variant="outlined" label={`#${tag}`} />
                  ))}
                </Stack>
              )}
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeViewDialog}>Close</Button>
          {viewingEntry ? (
            <Button
              onClick={() => {
                closeViewDialog();
                openEditDialog(viewingEntry);
              }}
              variant="contained"
              startIcon={<EditIcon />}
            >
              Edit Entry
            </Button>
          ) : null}
        </DialogActions>
      </Dialog>

      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="md">
        <DialogTitle>{editing ? "Edit Entry" : "New Insight Entry"}</DialogTitle>
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
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        mood: e.target.value,
                        content: updateToneLine(prev.content, e.target.value),
                      }))
                    }
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
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
              <Button
                variant="outlined"
                onClick={() => applyTemplateToForm(form.template, form.mood, form.entryDate || new Date())}
              >
                Apply Selected Template
              </Button>
              <Typography variant="caption" color="text.secondary">
                {MOOD_TONE[form.mood] || MOOD_TONE.neutral}
              </Typography>
            </Stack>
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
            <Typography variant="caption" color="text.secondary">
              Word Count: {countWordsFromContent(form.content)}
            </Typography>
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
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2} alignItems={{ sm: "center" }}>
              <Button variant="outlined" component="label">
                Upload Media
                <input hidden type="file" accept="image/*,audio/*" multiple onChange={handleMediaUpload} />
              </Button>
              <Typography variant="caption" color="text.secondary">
                Images/audio up to 4MB each, max {MAX_MEDIA_FILES} files.
              </Typography>
            </Stack>
            {(form.attachments || []).length > 0 && (
              <Stack spacing={1}>
                {(form.attachments || []).map((att, index) => (
                  <Paper
                    key={`att-${index}`}
                    sx={{ p: 1.2, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ overflow: "hidden" }}>
                      <Chip size="small" label={att.type === "audio" ? "Audio" : "Media"} />
                      <Typography variant="body2" noWrap>
                        {att.caption || `${att.type} attachment`}
                      </Typography>
                    </Stack>
                    <Button size="small" color="error" onClick={() => removeAttachment(index)}>
                      Remove
                    </Button>
                  </Paper>
                ))}
              </Stack>
            )}
            <TextField
              label="Links (comma separated https URLs)"
              fullWidth
              value={form.linkInput}
              onChange={(e) => setForm((prev) => ({ ...prev, linkInput: e.target.value }))}
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
