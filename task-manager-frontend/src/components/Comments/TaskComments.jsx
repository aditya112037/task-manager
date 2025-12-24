import { Box, Divider, Stack, Typography, CircularProgress } from "@mui/material";
import { useEffect, useState, useCallback } from "react";
import { commentsAPI } from "../../services/api";
import CommentItem from "./CommentItem";
import CommentInput from "./CommentInput";
import SystemComment from "./SystemComment";
import { useAuth } from "../../context/AuthContext";

export default function TaskComments({ taskId, myRole }) {
  const { user } = useAuth();

  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /* ---------------------------------------------------
     CORE: Load comments from backend (single source of truth)
  --------------------------------------------------- */
  const loadComments = useCallback(async () => {
    if (!taskId) return;

    try {
      setLoading(true);
      const res = await commentsAPI.getByTask(taskId);
      setComments(res.data || []);
      setError(null);
    } catch (err) {
      console.error("Failed to load comments:", err);
      setComments([]);
      setError("Failed to load comments");
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  /* ---------------------------------------------------
     INITIAL LOAD
  --------------------------------------------------- */
  useEffect(() => {
    loadComments();
  }, [loadComments]);

  /* ---------------------------------------------------
     INVALIDATION LISTENER (socket-safe)
     Socket → invalidate → REST re-fetch
  --------------------------------------------------- */
  useEffect(() => {
    if (!taskId) return;

    const handleInvalidate = (e) => {
      if (e.detail?.taskId !== taskId) return;
      loadComments();
    };

    window.addEventListener("invalidate:comments", handleInvalidate);
    return () =>
      window.removeEventListener("invalidate:comments", handleInvalidate);
  }, [taskId, loadComments]);

  /* ---------------------------------------------------
     ADD COMMENT (NO optimistic mutation)
  --------------------------------------------------- */
  const addComment = async (text) => {
    if (!text.trim()) return;

    try {
      await commentsAPI.create(taskId, {
        content: text,
        type: "comment",
      });

      // 🔥 trigger global refresh (this + other clients)
      window.dispatchEvent(
        new CustomEvent("invalidate:comments", {
          detail: { taskId },
        })
      );
    } catch (err) {
      console.error("Failed to add comment:", err);
      alert("Failed to post comment. Please try again.");
    }
  };

  /* ---------------------------------------------------
     DELETE COMMENT
  --------------------------------------------------- */
  const deleteComment = async (commentId) => {
    if (!window.confirm("Delete this comment?")) return;

    try {
      await commentsAPI.delete(commentId);

      window.dispatchEvent(
        new CustomEvent("invalidate:comments", {
          detail: { taskId },
        })
      );
    } catch (err) {
      console.error("Failed to delete comment:", err);
      alert("Failed to delete comment. Please try again.");
    }
  };

  /* ---------------------------------------------------
     RENDER
  --------------------------------------------------- */
  return (
    <Box sx={{ mt: 3 }}>
      <Typography fontWeight={700} sx={{ mb: 1 }}>
        Comments
      </Typography>

      <Divider sx={{ mb: 2 }} />

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
          <CircularProgress size={24} />
        </Box>
      ) : error ? (
        <Typography
          color="error"
          variant="body2"
          sx={{ py: 2, textAlign: "center" }}
        >
          {error}
        </Typography>
      ) : (
        <Stack spacing={1.5}>
          {comments.length === 0 && (
            <Typography
              color="text.secondary"
              variant="body2"
              sx={{ py: 2, textAlign: "center" }}
            >
              No comments yet. Start the conversation!
            </Typography>
          )}

          {comments
            .filter(Boolean)
            .map((c) => {
              if (!c || !c.type) return null;

              if (c.type === "system") {
                return (
                  <SystemComment
                    key={c._id || c.id}
                    comment={c}
                  />
                );
              }

              return (
                <CommentItem
                  key={c._id || c.id}
                  comment={c}
                  myRole={myRole}
                  onDelete={deleteComment}
                />
              );
            })}
        </Stack>
      )}

      <CommentInput onSend={addComment} disabled={loading} />
    </Box>
  );
}
