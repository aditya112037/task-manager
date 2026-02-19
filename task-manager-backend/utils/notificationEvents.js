const emitNotificationsChanged = (userIds = []) => {
  const io = global._io;
  if (!io) return;

  const uniqueIds = [...new Set((userIds || []).map((id) => String(id)).filter(Boolean))];
  for (const userId of uniqueIds) {
    io.to(`user_${userId}`).emit("notifications:changed", { userId });
  }
};

module.exports = {
  emitNotificationsChanged,
};

