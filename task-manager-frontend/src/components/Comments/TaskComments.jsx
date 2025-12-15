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

  // Listen for socket events
  useEffect(() => {
    const onNewComment = (e) => {
      if (e.detail.taskId !== taskId) return;
      setComments((prev) => [...prev, e.detail.comment]);
    };

    const onDeleteComment = (e) => {
      if (e.detail.taskId !== taskId) return;
      setComments((prev) =>
        prev.filter((c) => c._id !== e.detail.commentId)
      );
    };

    window.addEventListener("comment:new", onNewComment);
    window.addEventListener("comment:delete", onDeleteComment);

    return () => {
      window.removeEventListener("comment:new", onNewComment);
      window.removeEventListener("comment:delete", onDeleteComment);
    };
  }, [taskId]);

  const addComment = (text) => {
    const newComment = {
      _id: Date.now().toString(),
      task: taskId,
      type: "user",
      user,
      text,
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
        {comments.map((c) =>
          c.type === "system" ? (
            <SystemComment
              key={c._id}
              text={c.text}
            />
          ) : (
            <CommentItem
              key={c._id}
              comment={c}
              myRole={myRole}
              onDelete={deleteComment}
            />
          )
        )}
      </Stack>

      <CommentInput onSend={addComment} />
    </Box>
  );
}