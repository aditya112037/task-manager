import { Box, Divider, Stack, Typography, CircularProgress } from "@mui/material";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
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

  const firstLoad = useRef(true);

  // 🚨 CRITICAL: Detect temp task IDs
  const isTempTask = useMemo(() => {
    return typeof taskId === "string" && taskId.startsWith("temp-");
  }, [taskId]);

  /* ---------------------------------------------------
     LOAD COMMENTS (single source of truth)
  --------------------------------------------------- */
  const loadComments = useCallback(async () => {
    if (!taskId || isTempTask) return;

    try {
      if (firstLoad.current) setLoading(true);

      const res = await commentsAPI.getByTask(taskId);

      const sorted = (res.data || []).sort(
        (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
      );

      setComments(sorted);
      setError(null);
    } catch (err) {
      console.error("Failed to load comments:", err);
      setComments([]);
      setError("Failed to load comments");
    } finally {
      firstLoad.current = false;
      setLoading(false);
    }
  }, [taskId, isTempTask]);

  /* ---------------------------------------------------
     INITIAL LOAD
  --------------------------------------------------- */
  useEffect(() => {
    if (isTempTask) {
      // ⛔ Do NOT call backend for temp tasks
      setComments([]);
      setLoading(false);
      return;
    }

    loadComments();
  }, [loadComments, isTempTask]);

  /* ---------------------------------------------------
     SOCKET INVALIDATION LISTENER
  --------------------------------------------------- */
  useEffect(() => {
    if (!taskId || isTempTask) return;

    const handleInvalidate = (e) => {
      if (e.detail?.taskId !== taskId) return;
      loadComments();
    };

    window.addEventListener("invalidate:comments", handleInvalidate);
    return () =>
      window.removeEventListener("invalidate:comments", handleInvalidate);
  }, [taskId, isTempTask, loadComments]);

  /* ---------------------------------------------------
     ADD COMMENT
  --------------------------------------------------- */
  const addComment = async (text) => {
    if (!text.trim() || isTempTask) return;

    try {
      await commentsAPI.create(taskId, {
        content: text,
        type: "comment",
      });
      // ✅ socket will trigger refresh
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
      // ✅ socket will trigger refresh
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

      {isTempTask ? (
        <Typography
          color="text.secondary"
          variant="body2"
          sx={{ py: 2, textAlign: "center" }}
        >
          Comments will be available once the task is saved.
        </Typography>
      ) : loading ? (
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

          {comments.map((c) => {
            if (!c?.type) return null;

            if (c.type === "system") {
              return <SystemComment key={c._id} comment={c} />;
            }

            return (
              <CommentItem
                key={c._id}
                comment={c}
                myRole={myRole}
                onDelete={deleteComment}
              />
            );
          })}
        </Stack>
      )}

      <CommentInput
        onSend={addComment}
        disabled={loading || isTempTask}
      />
    </Box>
  );
}
