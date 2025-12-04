import axios from "axios";

// -------------------------
// BASE API INSTANCE
// -------------------------
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  withCredentials: true,
});

// -------------------------
// TOKEN ATTACH - FIXED
// -------------------------
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// -------------------------
// RESPONSE INTERCEPTOR
// -------------------------
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// -------------------------
// AUTH API
// -------------------------
export const authAPI = {
  register: (data) => api.post("/api/auth/register", data),
  login: (data) => api.post("/api/auth/login", data),
  getProfile: () => api.get("/api/auth/profile"),
};

// -------------------------
// PERSONAL TASKS API
// -------------------------
export const tasksAPI = {
  getTasks: () => api.get("/api/tasks"),
  createTask: (data) => api.post("/api/tasks", data),
  updateTask: (id, data) => api.put(`/api/tasks/${id}`, data),
  deleteTask: (id) => api.delete(`/api/tasks/${id}`),
};

// -------------------------
// TEAMS API - COMPLETE
// -------------------------
export const teamsAPI = {
  // Team management
  getTeams: () => api.get("/api/teams/my"),
  createTeam: (data) => api.post("/api/teams", data),
  getTeam: (teamId) => api.get(`/api/teams/${teamId}/details`),
  updateTeam: (teamId, data) => api.put(`/api/teams/${teamId}`, data),
  deleteTeam: (teamId) => api.delete(`/api/teams/${teamId}`),
  
  // Team joining
  joinTeam: (teamId) => api.post(`/api/teams/${teamId}/join`),
  getInviteLink: (teamId) => api.get(`/api/teams/${teamId}/invite`),
  leaveTeam: (teamId) => api.post(`/api/teams/${teamId}/leave`),
  
  // Member management
  updateMemberRole: (teamId, userId, role) => 
    api.put(`/api/teams/${teamId}/members/${userId}/role`, { role }),
  removeMember: (teamId, userId) => 
    api.delete(`/api/teams/${teamId}/members/${userId}`),
  
  // Task-related
  getAllMyTeamTasks: () => api.get("/api/teams/my/tasks"),
};

// -------------------------
// TEAM TASKS API
// -------------------------
// In api.js, add these new endpoints:

// -------------------------
// TEAM TASKS API - UPDATED
// -------------------------
export const teamTasksAPI = {
  requestExtension: (taskId, reason) => 
      api.post(`/api/team-tasks/${taskId}/request-extension`, { reason }),
  quickComplete: (taskId) => 
    api.post(`/api/team-tasks/${taskId}/quick-complete`),
  approveExtension: (taskId) => 
    api.put(`/api/team-tasks/${taskId}/extension/approve`),
  rejectExtension: (taskId) => 
    api.put(`/api/team-tasks/${taskId}/extension/reject`),

  // Existing endpoints
  getTasks: (teamId) => api.get(`/api/team-tasks/${teamId}`),
  getMyTeamTasks: () => api.get("/api/team-tasks/my/all"),
  createTask: (teamId, data) => api.post(`/api/team-tasks/${teamId}`, data),
  updateTask: (taskId, data) => api.put(`/api/team-tasks/${taskId}`, data),
  deleteTask: (taskId) => api.delete(`/api/team-tasks/${taskId}`),
  
  // NEW: Assignment-specific endpoints
  getMyAssignedTasks: (teamId) => api.get(`/api/team-tasks/${teamId}/my`),
  getUserTasks: (teamId, userId) => api.get(`/api/team-tasks/${teamId}/user/${userId}`),
  
  // NEW: Bulk operations (for future)
  bulkUpdateTasks: (teamId, taskIds, data) => 
    api.put(`/api/team-tasks/${teamId}/bulk`, { taskIds, data }),
  bulkDeleteTasks: (teamId, taskIds) => 
    api.delete(`/api/team-tasks/${teamId}/bulk`, { data: { taskIds } }),
};

export const notificationsAPI = {
  getNotifications: () => api.get("/api/notifications"),
  markAsRead: (notificationId) => api.put(`/api/notifications/${notificationId}/read`),
  markAllAsRead: () => api.put("/api/notifications/read-all"),
  deleteNotification: (notificationId) => api.delete(`/api/notifications/${notificationId}`),
  clearAll: () => api.delete("/api/notifications"),
};



export default api;