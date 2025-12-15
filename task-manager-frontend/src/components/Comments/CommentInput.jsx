import { Box, IconButton, TextField } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import { useState } from "react";

export default function CommentInput({ onSend }) {
  const [text, setText] = useState("");

  const submit = () => {
    if (!text.trim()) return;
    onSend(text);
    setText("");
  };

  return (
    <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
      <TextField
        multiline
        maxRows={4}
        fullWidth
        placeholder="Write a comment…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
      />
      <IconButton color="primary" onClick={submit}>
        <SendIcon />
      </IconButton>
    </Box>
  );
}
