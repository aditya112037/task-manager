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
  Badge,
  Tooltip,
  AvatarGroup,
  Avatar,
  ButtonBase,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import EmojiEmotionsIcon from "@mui/icons-material/EmojiEmotions";
import AttachFileIcon from "@mui/icons-icons/AttachFile";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import FormatQuoteIcon from "@mui/icons-icons/FormatQuote";
import { useState, useRef, useEffect } from "react";

const QUICK_COMMENTS = [
  { text: "Please extend the due date ⏳", emoji: "⏳" },
  { text: "I'm blocked, need help 🚧", emoji: "🚧" },
  { text: "Task completed, please review ✅", emoji: "✅" },
  { text: "Can we reassign this task? 🔄", emoji: "🔄" },
  { text: "Great work! Keep it up 🎉", emoji: "🎉" },
  { text: "Let's discuss this in the meeting 📅", emoji: "📅" },
  { text: "Need more clarification ❓", emoji: "❓" },
  { text: "On track! Delivery on schedule 🚀", emoji: "🚀" },
];

const EMOJI_CATEGORIES = {
  Reactions: ["👍", "👎", "❤️", "🔥", "🎉", "😮", "😢", "😡"],
  Common: ["✅", "⏳", "🚀", "🔴", "🟡", "🟢", "📌", "📝"],
  Symbols: ["❗", "❓", "💡", "⚠️", "⭐", "🔄", "🔒", "🔓"],
  Objects: ["💻", "📁", "📊", "📈", "📉", "🔗", "🎯", "🏆"],
};

const SUGGESTED_USERS = [
  { name: "Alex", color: "#FF6B6B" },
  { name: "Sam", color: "#4ECDC4" },
  { name: "Jordan", color: "#FFD166" },
  { name: "Taylor", color: "#06D6A0" },
];

export default function CommentInput({ onSend, disabled = false }) {
  const [text, setText] = useState("");
  const [anchorEl, setAnchorEl] = useState(null);
  const [activeCategory, setActiveCategory] = useState("Reactions");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);

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

  const insertMention = (username) => {
    setText(prev => `${prev}@${username} `);
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
      elevation={isFocused ? 3 : 0}
      sx={{
        p: 2,
        mt: 3,
        borderRadius: 3,
        border: "2px solid",
        borderColor: isFocused ? "primary.main" : "divider",
        backgroundColor: "background.paper",
        transition: "all 0.2s ease",
        "&:hover": {
          borderColor: isFocused ? "primary.main" : "action.hover",
          boxShadow: 1,
        },
      }}
    >
      {/* Quick Prompts Section */}
      <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: "wrap", gap: 1 }}>
        <Chip
          icon={<SmartToyIcon fontSize="small" />}
          label="Quick Prompts"
          size="small"
          variant="outlined"
          sx={{ mb: 0.5 }}
          color="primary"
        />
        {QUICK_COMMENTS.map((item, index) => (
          <Chip
            key={index}
            label={item.text}
            size="small"
            variant="outlined"
            onClick={() => {
              setText(item.text);
              inputRef.current?.focus();
            }}
            sx={{
              borderRadius: 2,
              transition: "all 0.2s",
              "&:hover": {
                backgroundColor: "primary.light",
                color: "primary.contrastText",
                transform: "translateY(-1px)",
              },
            }}
            avatar={
              <Box sx={{ fontSize: "1rem", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {item.emoji}
              </Box>
            }
          />
        ))}
      </Stack>

      {/* User Mentions */}
      <Box sx={{ mb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Chip
            icon={<FormatQuoteIcon fontSize="small" />}
            label="Mention Teammates"
            size="small"
            variant="outlined"
            color="secondary"
          />
          <AvatarGroup max={4} spacing="small">
            {SUGGESTED_USERS.map((user, index) => (
              <Tooltip key={index} title={`Mention @${user.name}`}>
                <Avatar
                  sx={{
                    width: 28,
                    height: 28,
                    bgcolor: user.color,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    "&:hover": {
                      transform: "scale(1.1)",
                      boxShadow: 2,
                    },
                  }}
                  onClick={() => insertMention(user.name)}
                >
                  {user.name[0]}
                </Avatar>
              </Tooltip>
            ))}
          </AvatarGroup>
        </Stack>
      </Box>

      {/* Main Input Area */}
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
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
              transition: "all 0.2s",
              backgroundColor: isFocused ? "background.default" : "transparent",
            },
          }}
        />

        {/* Action Buttons */}
        <Stack direction="column" spacing={1}>
          <IconButton
            color="primary"
            onClick={handleSend}
            disabled={!text.trim() || disabled}
            sx={{
              backgroundColor: "primary.main",
              color: "white",
              "&:hover": {
                backgroundColor: "primary.dark",
                transform: "scale(1.05)",
              },
              "&.Mui-disabled": {
                backgroundColor: "action.disabledBackground",
              },
              transition: "all 0.2s",
            }}
          >
            <SendIcon />
          </IconButton>

          <Tooltip title="Add emoji">
            <IconButton
              onClick={(e) => setAnchorEl(anchorEl ? null : e.currentTarget)}
              disabled={disabled}
              sx={{
                border: "2px solid",
                borderColor: emojiPickerOpen ? "primary.main" : "divider",
                backgroundColor: emojiPickerOpen ? "primary.light" : "transparent",
                "&:hover": {
                  backgroundColor: "primary.light",
                  borderColor: "primary.main",
                },
              }}
            >
              <EmojiEmotionsIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Attach file (coming soon)">
            <IconButton disabled sx={{ opacity: 0.5 }}>
              <AttachFileIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {/* Character Counter */}
      {text.length > 0 && (
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: text.length > 500 ? "error.main" : text.length > 400 ? "warning.main" : "success.main",
              }}
            />
            <Box
              component="span"
              sx={{
                fontSize: "0.75rem",
                color: text.length > 500 ? "error.main" : "text.secondary",
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
              color: "primary.main",
              textDecoration: "underline",
              "&:hover": { color: "primary.dark" },
              "&.Mui-disabled": { color: "text.disabled" },
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
                elevation={8}
                sx={{
                  p: 2,
                  width: 300,
                  borderRadius: 3,
                  backgroundColor: "background.paper",
                  border: "2px solid",
                  borderColor: "primary.main",
                }}
              >
                {/* Category Tabs */}
                <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: "wrap" }}>
                  {Object.keys(EMOJI_CATEGORIES).map((category) => (
                    <Chip
                      key={category}
                      label={category}
                      size="small"
                      variant={activeCategory === category ? "filled" : "outlined"}
                      color={activeCategory === category ? "primary" : "default"}
                      onClick={() => setActiveCategory(category)}
                      sx={{ borderRadius: 2 }}
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
                    "&::-webkit-scrollbar": { width: 8 },
                    "&::-webkit-scrollbar-thumb": {
                      backgroundColor: "divider",
                      borderRadius: 2,
                    },
                  }}
                >
                  {EMOJI_CATEGORIES[activeCategory].map((emoji, index) => (
                    <IconButton
                      key={index}
                      onClick={() => insertEmoji(emoji)}
                      sx={{
                        fontSize: "1.2rem",
                        width: 32,
                        height: 32,
                        transition: "all 0.2s",
                        "&:hover": {
                          backgroundColor: "primary.light",
                          transform: "scale(1.2)",
                        },
                      }}
                    >
                      {emoji}
                    </IconButton>
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