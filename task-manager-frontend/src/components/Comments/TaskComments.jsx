// src/components/Comments/TaskComments.jsx
import { Box, Divider, Stack, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { commentsAPI } from "../../services/api";
import CommentItem from "./CommentItem";
import CommentInput from "./CommentInput";
import SystemComment from "./SystemComment";
import { useAuth } from "../../context/AuthContext";

/**
 * TEMP: frontend-only mock
 * Backend will replace this later
 */
const mockStore = {};

export default function TaskComments({ taskId, myRole }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);

  useEffect(() => {
    setComments(mockStore[taskId] || []);
  }, [taskId]);

  // REMOVED: Socket event listeners (backend uses socket.io, not DOM events)
  // Will be re-implemented when socket hookup is done

  const addComment = (text) => {
    const newComment = {
      _id: Date.now().toString(),
      task: taskId,
      type: "comment", // ✅ FIXED: Backend uses "comment" not "user"
      author: user,    // ✅ FIXED: Backend uses "author" not "user"
      content: text,   // ✅ FIXED: Backend uses "content" not "text"
      createdAt: new Date(),
    };

    mockStore[taskId] = [...(mockStore[taskId] || []), newComment];
    setComments([...mockStore[taskId]]);
  };

  const deleteComment = (commentId) => {
    mockStore[taskId] = mockStore[taskId].filter(
      (c) => c._id !== commentId
    );
    setComments([...mockStore[taskId]]);
  };

  return (
    <Box sx={{ mt: 3 }}>
      <Typography fontWeight={700} sx={{ mb: 1 }}>
        Comments
      </Typography>

      <Divider sx={{ mb: 2 }} />

      <Stack spacing={1.5}>
        {/* ✅ FIXED: Frontend guard with proper data mapping */}
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

            // ✅ FIXED: Now correctly maps to "comment" type
            // Backend: type: "comment" | "system"
            return (
              <CommentItem
                key={c._id || c.id}
                comment={c}
                myRole={myRole}
                onDelete={deleteComment}
              />
            );
          })}
        
        {/* ✅ OPTIONAL: Empty state UI */}
        {comments.length === 0 && (
          <Typography color="text.secondary" variant="body2" sx={{ py: 2, textAlign: 'center' }}>
            No comments yet. Start the conversation!
          </Typography>
        )}
      </Stack>

      <CommentInput onSend={addComment} />
    </Box>
  );
}