import {
  Avatar,
  Box,
  Paper,
  Typography,
  IconButton,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";

export default function CommentItem({ comment, myRole, onDelete }) {
  const canDelete =
    ["admin", "manager"].includes(myRole) &&
    comment.type === "user";

  return (
    <Box sx={{ display: "flex", gap: 1 }}>
      <Avatar src={comment.user?.photo}>
        {comment.user?.name?.[0]}
      </Avatar>

      <Paper
        sx={{
          p: 1.5,
          borderRadius: 2,
          maxWidth: "80%",
          position: "relative",
        }}
      >
        <Typography fontWeight={600} variant="body2">
          {comment.user?.name}
        </Typography>

        <Typography variant="body2">
          {comment.text}
        </Typography>

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
