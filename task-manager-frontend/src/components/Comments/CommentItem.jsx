import {
  Avatar,
  Box,
  Paper,
  Typography,
  IconButton,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";

export default function CommentItem({ comment, myRole, onDelete }) {
  // ✅ CORRECT: Use comment.type (backend: "comment" | "system")
  const canDelete =
    ["admin", "manager"].includes(myRole) &&
    comment.type === "comment"; // ✅ Changed from "user" to "comment"

  // ✅ SAFE: Use optional chaining to prevent crashes
  const authorName = comment.author?.name || comment.user?.name || "Unknown";
  const authorPhoto = comment.author?.photo || comment.user?.photo;
  const content = comment.content || comment.text || "";

  return (
    <Box sx={{ display: "flex", gap: 1 }}>
      {/* ✅ CORRECT: Use comment.author instead of comment.user */}
      <Avatar src={authorPhoto}>
        {authorName[0]?.toUpperCase()}
      </Avatar>

      <Paper
        sx={{
          p: 1.5,
          borderRadius: 2,
          maxWidth: "80%",
          position: "relative",
          backgroundColor: 'grey.50'
        }}
      >
        <Typography fontWeight={600} variant="body2" color="text.primary">
          {authorName}
        </Typography>

        {/* ✅ CORRECT: Use comment.content instead of comment.text */}
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {content}
        </Typography>

        {/* Optional: Show timestamp */}
        {comment.createdAt && (
          <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 1 }}>
            {new Date(comment.createdAt).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </Typography>
        )}

        {canDelete && (
          <IconButton
            size="small"
            onClick={() => onDelete(comment._id)}
            sx={{ position: "absolute", top: 4, right: 4 }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        )}
      </Paper>
    </Box>
  );
}