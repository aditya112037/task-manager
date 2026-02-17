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

  const sortComments = useCallback(
    (list) =>
      [...list].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
    []
  );

  /* ---------------------------------------------------
     LOAD COMMENTS (single source of truth)
  --------------------------------------------------- */
  const loadComments = useCallback(async () => {
    if (!taskId || isTempTask) return;

    try {
      if (firstLoad.current) setLoading(true);

      const res = await commentsAPI.getByTask(taskId);

      setComments(sortComments(res.data || []));
      setError(null);
    } catch (err) {
      console.error("Failed to load comments:", err);
      setComments([]);
      setError("Failed to load comments");
    } finally {
      firstLoad.current = false;
      setLoading(false);
    }
  }, [taskId, isTempTask, sortComments]);

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
     REAL-TIME COMMENT EVENTS (NO HARD RELOAD)
  --------------------------------------------------- */
  useEffect(() => {
    if (!taskId || isTempTask) return;

    const handleCreated = (e) => {
      if (e.detail?.taskId !== taskId || !e.detail?.comment) return;

      setComments((prev) => {
        const next = [...prev];
        const index = next.findIndex((c) => c._id === e.detail.comment._id);

        if (index >= 0) {
          next[index] = { ...next[index], ...e.detail.comment, _optimistic: false };
        } else {
          next.push({ ...e.detail.comment, _optimistic: false });
        }

        return sortComments(next);
      });
    };

    const handleDeleted = (e) => {
      if (e.detail?.taskId !== taskId || !e.detail?.commentId) return;
      setComments((prev) => prev.filter((c) => c._id !== e.detail.commentId));
    };

    const handleInvalidate = (e) => {
      if (e.detail?.taskId !== taskId) return;
      loadComments();
    };

    window.addEventListener("comment:created", handleCreated);
    window.addEventListener("comment:deleted", handleDeleted);
    window.addEventListener("invalidate:comments", handleInvalidate);
    return () => {
      window.removeEventListener("comment:created", handleCreated);
      window.removeEventListener("comment:deleted", handleDeleted);
      window.removeEventListener("invalidate:comments", handleInvalidate);
    };
  }, [taskId, isTempTask, sortComments, loadComments]);

  /* ---------------------------------------------------
     ADD COMMENT
  --------------------------------------------------- */
  const addComment = async (text) => {
    const content = String(text || "").trim();
    if (!content || isTempTask) return;

    const optimisticId = `temp-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 9)}`;
    const optimisticComment = {
      _id: optimisticId,
      type: "comment",
      content,
      createdAt: new Date().toISOString(),
      author: {
        _id: user?._id,
        name: user?.name || "You",
        photo: user?.photo || null,
      },
      _optimistic: true,
    };

    setComments((prev) => sortComments([...prev, optimisticComment]));

    try {
      const res = await commentsAPI.create(taskId, {
        content,
        type: "comment",
      });

      if (res?.data?._id) {
        setComments((prev) =>
          sortComments(
            prev.map((c) =>
              c._id === optimisticId ? { ...res.data, _optimistic: false } : c
            )
          )
        );
      }
    } catch (err) {
      setComments((prev) => prev.filter((c) => c._id !== optimisticId));
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
