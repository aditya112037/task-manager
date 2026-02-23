import {
  Box,
  IconButton,
  TextField,
  Paper,
  Stack,
  Chip,
  Popper,
  Fade,
  ClickAwayListener,
  Tooltip,
  AvatarGroup,
  Avatar,
  ButtonBase,
  alpha,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import EmojiEmotionsIcon from "@mui/icons-material/EmojiEmotions";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import FormatQuoteIcon from "@mui/icons-material/FormatQuote";
import { useState, useRef, useEffect, useMemo } from "react";
import { useTheme } from "@mui/material/styles";

const QUICK_COMMENTS = [
  { text: "Please extend the due date ⏳", emoji: "⏳", color: "#FFB74D" },
  { text: "I'm blocked, need help 🚧", emoji: "🚧", color: "#E57373" },
  { text: "Task completed, please review ✅", emoji: "✅", color: "#81C784" },
  { text: "Can we reassign this task? 🔄", emoji: "🔄", color: "#64B5F6" },
  { text: "Great work! Keep it up 🎉", emoji: "🎉", color: "#FF8A65" },
  { text: "Let's discuss this in the meeting 📅", emoji: "📅", color: "#BA68C8" },
  { text: "Need more clarification ❓", emoji: "❓", color: "#FFD54F" },
  { text: "On track! Delivery on schedule 🚀", emoji: "🚀", color: "#4DB6AC" },
];

const EMOJI_CATEGORIES = {
  Reactions: ["👍", "👎", "❤️", "🔥", "🎉", "😮", "😢", "😡"],
  Common: ["✅", "⏳", "🚀", "🔴", "🟡", "🟢", "📌", "📝"],
  Symbols: ["❗", "❓", "💡", "⚠️", "⭐", "🔄", "🔒", "🔓"],
  Objects: ["💻", "📁", "📊", "📈", "📉", "🔗", "🎯", "🏆"],
};

const USER_COLORS = ["#FF6B6B", "#4ECDC4", "#FFD166", "#06D6A0", "#7E57C2", "#26A69A"];

const buildMentionHandle = (name = "") =>
  String(name)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_.-]/g, "");

export default function CommentInput({ onSend, disabled = false, teamMembers = [] }) {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === "dark";
  
  const [text, setText] = useState("");
  const [anchorEl, setAnchorEl] = useState(null);
  const [activeCategory, setActiveCategory] = useState("Reactions");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);
  const suggestedUsers = useMemo(() => {
    const seen = new Set();
    const users = [];
    for (let i = 0; i < teamMembers.length; i += 1) {
      const raw = teamMembers[i]?.user ?? teamMembers[i];
      const id = raw?._id || raw?.id || (typeof raw === "string" ? raw : null);
      const name = typeof raw === "object" ? raw?.name : null;
      if (!id || !name) continue;
      const key = String(id);
      if (seen.has(key)) continue;
      seen.add(key);
      const mentionHandle = buildMentionHandle(name);
      if (!mentionHandle) continue;
      users.push({
        id: key,
        name,
        mentionHandle,
        color: USER_COLORS[users.length % USER_COLORS.length],
      });
    }
    return users;
  }, [teamMembers]);

  const handleSend = () => {
    if (!text.trim() || disabled) return;
    onSend(text);
    setText("");
    setIsFocused(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const insertEmoji = (emoji) => {
    setText(prev => prev + emoji);
    setAnchorEl(null);
    inputRef.current?.focus();
  };

  const insertMention = (mentionHandle) => {
    setText(prev => `${prev}@${mentionHandle} `);
    inputRef.current?.focus();
  };

  // Auto-focus on mount
  useEffect(() => {
    if (inputRef.current && isFocused) {
      inputRef.current.focus();
    }
  }, [isFocused]);

  const emojiPickerOpen = Boolean(anchorEl);

  return (
    <Paper
      elevation={isFocused ? (isDarkMode ? 0 : 3) : 0}
      sx={{
        p: 2.5,
        mt: 3,
        borderRadius: 3,
        border: "2px solid",
        borderColor: isFocused 
          ? theme.palette.primary.main 
          : isDarkMode 
            ? alpha(theme.palette.divider, 0.5)
            : theme.palette.divider,
        backgroundColor: isDarkMode 
          ? alpha(theme.palette.background.paper, 0.8)
          : theme.palette.background.paper,
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        backdropFilter: isDarkMode ? "blur(10px)" : "none",
        "&:hover": {
          borderColor: isFocused 
            ? theme.palette.primary.main 
            : isDarkMode 
              ? alpha(theme.palette.divider, 0.8)
              : theme.palette.action.hover,
          boxShadow: isDarkMode 
            ? `0 4px 20px ${alpha(theme.palette.common.black, 0.3)}`
            : theme.shadows[4],
        },
      }}
    >
      {/* Quick Prompts Section */}
      <Stack direction="row" spacing={1} sx={{ mb: 2.5, flexWrap: "wrap", gap: 1 }}>
        <Chip
          icon={<SmartToyIcon fontSize="small" />}
          label="Quick Prompts"
          size="small"
          variant="outlined"
          sx={{ 
            mb: 0.5,
            borderColor: isDarkMode 
              ? alpha(theme.palette.primary.main, 0.5)
              : theme.palette.primary.main,
            color: isDarkMode 
              ? theme.palette.primary.light
              : theme.palette.primary.main,
            backgroundColor: isDarkMode 
              ? alpha(theme.palette.primary.main, 0.1)
              : "transparent",
          }}
          color="primary"
        />
        {QUICK_COMMENTS.map((item, index) => (
          <Tooltip key={index} title={item.text} placement="top">
            <Chip
              label={item.text}
              size="small"
              variant="outlined"
              onClick={() => {
                setText(item.text);
                inputRef.current?.focus();
              }}
              sx={{
                borderRadius: 2,
                transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                borderColor: isDarkMode 
                  ? alpha(item.color, 0.3)
                  : item.color,
                color: isDarkMode 
                  ? alpha(theme.palette.common.white, 0.9)
                  : theme.palette.text.primary,
                backgroundColor: isDarkMode 
                  ? alpha(item.color, 0.1)
                  : alpha(item.color, 0.05),
                "&:hover": {
                  backgroundColor: isDarkMode 
                    ? alpha(item.color, 0.3)
                    : alpha(item.color, 0.2),
                  color: isDarkMode 
                    ? theme.palette.common.white
                    : theme.palette.getContrastText(item.color),
                  transform: "translateY(-2px) scale(1.02)",
                  boxShadow: `0 4px 12px ${alpha(item.color, 0.3)}`,
                },
              }}
              avatar={
                <Box sx={{ 
                  fontSize: "1rem", 
                  width: 20, 
                  height: 20, 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center",
                  color: "inherit"
                }}>
                  {item.emoji}
                </Box>
              }
            />
          </Tooltip>
        ))}
      </Stack>

      {/* User Mentions */}
      <Box sx={{ mb: 2.5 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Chip
            icon={<FormatQuoteIcon fontSize="small" />}
            label="Mention Teammates"
            size="small"
            variant="outlined"
            sx={{
              borderColor: isDarkMode 
                ? alpha(theme.palette.secondary.main, 0.5)
                : theme.palette.secondary.main,
              color: isDarkMode 
                ? theme.palette.secondary.light
                : theme.palette.secondary.main,
              backgroundColor: isDarkMode 
                ? alpha(theme.palette.secondary.main, 0.1)
                : "transparent",
            }}
          />
          <AvatarGroup max={4} spacing="small">
            {suggestedUsers.map((user) => (
              <Tooltip key={user.id} title={`Mention @${user.mentionHandle}`} placement="top">
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    bgcolor: user.color,
                    cursor: "pointer",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    border: `2px solid ${isDarkMode 
                      ? alpha(theme.palette.background.paper, 0.8)
                      : theme.palette.background.paper
                    }`,
                    boxShadow: `0 2px 8px ${alpha(user.color, 0.4)}`,
                    "&:hover": {
                      transform: "scale(1.15) rotate(5deg)",
                      boxShadow: `0 4px 16px ${alpha(user.color, 0.6)}`,
                      zIndex: 2,
                    },
                  }}
                  onClick={() => insertMention(user.mentionHandle)}
                >
                  <Box
                    sx={{
                      fontSize: "0.9rem",
                      fontWeight: 600,
                      color: theme.palette.getContrastText(user.color),
                    }}
                  >
                      {user.name[0]}
                    </Box>
                  </Avatar>
              </Tooltip>
            ))}
          </AvatarGroup>
        </Stack>
        {suggestedUsers.length === 0 && (
          <Box sx={{ mt: 1, fontSize: "0.75rem", color: "text.secondary" }}>
            Team members will appear here for quick mentions.
          </Box>
        )}
      </Box>

      {/* Main Input Area */}
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
        <TextField
          inputRef={inputRef}
          multiline
          maxRows={6}
          fullWidth
          placeholder="Type your comment here... (Shift + Enter for new line)"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={disabled}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: 2,
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              backgroundColor: isFocused 
                ? (isDarkMode 
                  ? alpha(theme.palette.common.white, 0.05)
                  : alpha(theme.palette.common.black, 0.02)
                )
                : "transparent",
              "& fieldset": {
                borderColor: isDarkMode 
                  ? alpha(theme.palette.divider, 0.5)
                  : theme.palette.divider,
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              },
              "&:hover fieldset": {
                borderColor: isDarkMode 
                  ? alpha(theme.palette.divider, 0.8)
                  : theme.palette.action.hover,
              },
              "&.Mui-focused fieldset": {
                borderColor: theme.palette.primary.main,
                borderWidth: "2px",
                boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.1)}`,
              },
            },
            "& .MuiInputBase-input": {
              color: isDarkMode 
                ? alpha(theme.palette.common.white, 0.95)
                : theme.palette.text.primary,
              "&::placeholder": {
                color: isDarkMode 
                  ? alpha(theme.palette.common.white, 0.5)
                  : theme.palette.text.secondary,
              },
            },
          }}
        />

        {/* Action Buttons */}
        <Stack direction="column" spacing={1.5}>
          <Tooltip title="Send comment">
            <IconButton
              color="primary"
              onClick={handleSend}
              disabled={!text.trim() || disabled}
              sx={{
                backgroundColor: theme.palette.primary.main,
                color: theme.palette.primary.contrastText,
                width: 48,
                height: 48,
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                "&:hover": {
                  backgroundColor: theme.palette.primary.dark,
                  transform: "scale(1.1) rotate(5deg)",
                  boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.4)}`,
                },
                "&.Mui-disabled": {
                  backgroundColor: isDarkMode 
                    ? alpha(theme.palette.common.white, 0.1)
                    : alpha(theme.palette.common.black, 0.08),
                  color: isDarkMode 
                    ? alpha(theme.palette.common.white, 0.3)
                    : alpha(theme.palette.common.black, 0.26),
                },
              }}
            >
              <SendIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Add emoji">
            <IconButton
              onClick={(e) => setAnchorEl(anchorEl ? null : e.currentTarget)}
              disabled={disabled}
              sx={{
                border: "2px solid",
                borderColor: emojiPickerOpen 
                  ? theme.palette.primary.main 
                  : isDarkMode 
                    ? alpha(theme.palette.divider, 0.5)
                    : theme.palette.divider,
                backgroundColor: emojiPickerOpen 
                  ? alpha(theme.palette.primary.main, 0.1)
                  : "transparent",
                width: 40,
                height: 40,
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                "&:hover": {
                  backgroundColor: isDarkMode 
                    ? alpha(theme.palette.primary.main, 0.2)
                    : alpha(theme.palette.primary.main, 0.08),
                  borderColor: theme.palette.primary.main,
                  transform: "scale(1.05)",
                },
              }}
            >
              <EmojiEmotionsIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Attach file (coming soon)">
            <IconButton 
              disabled 
              sx={{ 
                opacity: 0.5,
                width: 40,
                height: 40,
                transition: "all 0.3s",
                "&:hover": {
                  opacity: 0.7,
                }
              }}
            >
              <AttachFileIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {/* Character Counter */}
      {text.length > 0 && (
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              sx={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: isDarkMode 
                  ? alpha(theme.palette.common.white, 0.1)
                  : alpha(theme.palette.common.black, 0.08),
                overflow: "hidden",
                position: "relative",
              }}
            >
              <Box
                sx={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  height: "100%",
                  width: `${Math.min(100, (text.length / 500) * 100)}%`,
                  backgroundColor: text.length > 500 
                    ? theme.palette.error.main 
                    : text.length > 400 
                      ? theme.palette.warning.main 
                      : theme.palette.success.main,
                  transition: "width 0.3s ease",
                }}
              />
            </Box>
            <Box
              component="span"
              sx={{
                fontSize: "0.75rem",
                color: text.length > 500 
                  ? theme.palette.error.main 
                  : text.length > 400 
                    ? theme.palette.warning.main 
                    : isDarkMode 
                      ? alpha(theme.palette.common.white, 0.7)
                      : theme.palette.text.secondary,
                fontWeight: text.length > 400 ? 600 : 400,
              }}
            >
              {text.length}/500
            </Box>
          </Box>
          <ButtonBase
            onClick={handleSend}
            disabled={!text.trim() || disabled}
            sx={{
              fontSize: "0.75rem",
              color: theme.palette.primary.main,
              textDecoration: "none",
              padding: "4px 8px",
              borderRadius: 1,
              transition: "all 0.2s",
              "&:hover": { 
                color: theme.palette.primary.dark,
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
              },
              "&.Mui-disabled": { 
                color: isDarkMode 
                  ? alpha(theme.palette.common.white, 0.3)
                  : theme.palette.text.disabled,
              },
            }}
          >
            Press Enter to send
          </ButtonBase>
        </Box>
      )}

      {/* Emoji Picker */}
      <Popper
        open={emojiPickerOpen}
        anchorEl={anchorEl}
        placement="top-start"
        transition
        sx={{ zIndex: 1300 }}
      >
        {({ TransitionProps }) => (
          <ClickAwayListener onClickAway={() => setAnchorEl(null)}>
            <Fade {...TransitionProps} timeout={200}>
              <Paper
                elevation={isDarkMode ? 0 : 8}
                sx={{
                  p: 2,
                  width: 320,
                  borderRadius: 3,
                  backgroundColor: isDarkMode 
                    ? alpha(theme.palette.background.paper, 0.95)
                    : theme.palette.background.paper,
                  border: "2px solid",
                  borderColor: theme.palette.primary.main,
                  backdropFilter: "blur(20px)",
                  boxShadow: isDarkMode 
                    ? `0 8px 32px ${alpha(theme.palette.common.black, 0.4)}`
                    : theme.shadows[8],
                }}
              >
                {/* Category Tabs */}
                <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: "wrap", gap: 1 }}>
                  {Object.keys(EMOJI_CATEGORIES).map((category) => (
                    <Chip
                      key={category}
                      label={category}
                      size="small"
                      variant={activeCategory === category ? "filled" : "outlined"}
                      color={activeCategory === category ? "primary" : "default"}
                      onClick={() => setActiveCategory(category)}
                      sx={{ 
                        borderRadius: 2,
                        borderColor: isDarkMode 
                          ? alpha(theme.palette.common.white, 0.2)
                          : undefined,
                      }}
                    />
                  ))}
                </Stack>

                {/* Emoji Grid */}
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(8, 1fr)",
                    gap: 1,
                    maxHeight: 200,
                    overflowY: "auto",
                    "&::-webkit-scrollbar": { 
                      width: 8,
                      height: 8,
                    },
                    "&::-webkit-scrollbar-track": {
                      backgroundColor: isDarkMode 
                        ? alpha(theme.palette.common.white, 0.05)
                        : alpha(theme.palette.common.black, 0.05),
                      borderRadius: 2,
                    },
                    "&::-webkit-scrollbar-thumb": {
                      backgroundColor: isDarkMode 
                        ? alpha(theme.palette.common.white, 0.2)
                        : alpha(theme.palette.common.black, 0.2),
                      borderRadius: 2,
                      "&:hover": {
                        backgroundColor: isDarkMode 
                          ? alpha(theme.palette.common.white, 0.3)
                          : alpha(theme.palette.common.black, 0.3),
                      },
                    },
                  }}
                >
                  {EMOJI_CATEGORIES[activeCategory].map((emoji, index) => (
                    <Tooltip key={index} title={emoji} placement="top">
                      <IconButton
                        onClick={() => insertEmoji(emoji)}
                        sx={{
                          fontSize: "1.4rem",
                          width: 36,
                          height: 36,
                          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                          "&:hover": {
                            backgroundColor: isDarkMode 
                              ? alpha(theme.palette.primary.main, 0.3)
                              : alpha(theme.palette.primary.main, 0.1),
                            transform: "scale(1.3) rotate(10deg)",
                          },
                        }}
                      >
                        {emoji}
                      </IconButton>
                    </Tooltip>
                  ))}
                </Box>
              </Paper>
            </Fade>
          </ClickAwayListener>
        )}
      </Popper>
    </Paper>
  );
}
