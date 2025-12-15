import { Typography, Box } from "@mui/material";

export default function SystemComment({ comment }) {
  // ✅ CRITICAL GUARD: Prevent crash if comment is undefined
  if (!comment || !comment.action) {
    console.warn("Invalid system comment:", comment);
    return null;
  }

  // ✅ Extract data with fallbacks
  const { action, meta = {}, createdAt, content, text } = comment;
  
  // ✅ Support both backend and mock data
  const displayText = content || text || "";
  const timestamp = createdAt ? new Date(createdAt) : null;

  // ✅ Generate user-friendly message based on action
  const getSystemMessage = () => {
    switch (action) {
      case "task_created":
        return `Task "${meta.title}" was created`;
      
      case "status_changed":
        return `Status changed from ${meta.from || 'unknown'} to ${meta.to || 'unknown'}`;
      
      case "assigned":
        return meta.to 
          ? `Task was assigned to user ${meta.to}`
          : "Task assignment was updated";
      
      case "extension_requested":
        return `Extension requested: ${meta.reason || 'No reason provided'}`;
      
      case "extension_approved":
        return "Extension request was approved";
      
      case "extension_rejected":
        return "Extension request was rejected";
      
      case "comment_created":
        return "A comment was added";
      
      case "task_updated":
        return "Task was updated";
      
      case "task_deleted":
        return "Task was deleted";
      
      default:
        return displayText || `System action: ${action}`;
    }
  };

  const message = getSystemMessage();

  return (
    <Box sx={{ 
      textAlign: "center", 
      my: 1.5,
      px: 1,
      py: 0.5,
      backgroundColor: 'action.hover',
      borderRadius: 1,
      mx: 'auto',
      maxWidth: '90%'
    }}>
      <Typography
        variant="caption"
        sx={{
          color: "text.secondary",
          fontStyle: "italic",
          fontSize: '0.75rem',
          lineHeight: 1.2,
        }}
      >
        {message}
        
        {/* ✅ Show timestamp if available */}
        {timestamp && (
          <Typography 
            component="span" 
            variant="caption" 
            sx={{ 
              ml: 1, 
              color: 'text.disabled',
              fontSize: '0.7rem'
            }}
          >
            • {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Typography>
        )}
      </Typography>
    </Box>
  );
}