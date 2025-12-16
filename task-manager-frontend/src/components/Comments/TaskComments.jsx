// src/components/Comments/TaskComments.jsx
import { Box, Divider, Stack, Typography, CircularProgress } from "@mui/material";
import { useEffect, useState } from "react";
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

  // 1️⃣ ALWAYS load comments from backend on mount
  useEffect(() => {
    if (!taskId) return;
    
    const loadComments = async () => {
      try {
        setLoading(true);
        const res = await commentsAPI.getByTask(taskId);
        setComments(res.data || []);
        setError(null);
      } catch (err) {
        console.error("Failed to load comments:", err);
        setError("Failed to load comments");
        setComments([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadComments();
  }, [taskId]);

  // 2️⃣ Listen for socket events to refresh comments
  useEffect(() => {
    if (!taskId) return;

    // Listen for global comment refresh events
    const handleCommentRefresh = (e) => {
      if (e.detail.taskId !== taskId) return;
      
      // Refresh comments from backend
      commentsAPI.getByTask(taskId)
        .then(res => {
          setComments(res.data || []);
        })
        .catch(err => {
          console.error("Failed to refresh comments:", err);
        });
    };

    // Listen for new comment events (optional - if you want to append instead of refresh)
    const handleNewComment = (e) => {
      if (e.detail.taskId !== taskId || !e.detail.comment) return;
      
      // Check if comment already exists to avoid duplicates
      setComments(prev => {
        if (prev.some(c => c._id === e.detail.comment._id)) {
          return prev;
        }
        return [...prev, e.detail.comment];
      });
    };

    // Listen for comment delete events
    const handleDeleteComment = (e) => {
      if (e.detail.taskId !== taskId) return;
      
      setComments(prev => prev.filter(c => c._id !== e.detail.commentId));
    };

    // Set up event listeners
    window.addEventListener("comment:refresh", handleCommentRefresh);
    window.addEventListener("comment:new", handleNewComment);
    window.addEventListener("comment:delete", handleDeleteComment);

    // Cleanup
    return () => {
      window.removeEventListener("comment:refresh", handleCommentRefresh);
      window.removeEventListener("comment:new", handleNewComment);
      window.removeEventListener("comment:delete", handleDeleteComment);
    };
  }, [taskId]);

  // 3️⃣ Real addComment function that saves to backend
  const addComment = async (text) => {
    if (!text.trim()) return;
    
    try {
      // Send to backend
      const res = await commentsAPI.create(taskId, {
        content: text,
        type: "comment"
      });
      
      const newComment = res.data;
      
      // Update local state
    
      // Trigger global event for other users
     
    } catch (err) {
      console.error("Failed to add comment:", err);
      // Show error to user
      alert("Failed to post comment. Please try again.");
    }
  };

  // 4️⃣ Real deleteComment function
  const deleteComment = async (commentId) => {
    if (!window.confirm("Delete this comment?")) return;
    
    try {
      await commentsAPI.delete(commentId);
      
      // Update local state
      
      
      // Trigger global event for other users
      
      
    } catch (err) {
      console.error("Failed to delete comment:", err);
      alert("Failed to delete comment. Please try again.");
    }
  };

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
        <Typography color="error" variant="body2" sx={{ py: 2, textAlign: 'center' }}>
          {error}
        </Typography>
      ) : (
        <Stack spacing={1.5}>
          {/* ✅ Properly render comments with backend data structure */}
          {comments
            .filter(Boolean) // Filter out null/undefined
            .map((c) => {
              // Guard: Check if comment has required properties
              if (!c || !c.type) {
                console.warn("Invalid comment in list:", c);
                return null;
              }

              if (c.type === "system") {
                return <SystemComment key={c._id || c.id} comment={c} />;
              }

              // User comment
              return (
                <CommentItem
                  key={c._id || c.id}
                  comment={c}
                  myRole={myRole}
                  onDelete={deleteComment}
                />
              );
            })}
          
          {/* ✅ Empty state */}
          {comments.length === 0 && (
            <Typography color="text.secondary" variant="body2" sx={{ py: 2, textAlign: 'center' }}>
              No comments yet. Start the conversation!
            </Typography>
          )}
        </Stack>
      )}

      <CommentInput onSend={addComment} disabled={loading} />
    </Box>
  );
}