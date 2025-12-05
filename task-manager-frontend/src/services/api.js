import axios from "axios";

// -------------------------
// BASE API INSTANCE
// -------------------------
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000",
  withCredentials: true,
});

// -------------------------
// TOKEN ATTACH
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
// TEAMS API
// -------------------------
export const teamsAPI = {
  getTeams: () => api.get("/api/teams/my"),
  createTeam: (data) => api.post("/api/teams", data),
  getTeam: (teamId) => api.get(`/api/teams/${teamId}/details`),
  updateTeam: (teamId, data) => api.put(`/api/teams/${teamId}`, data),
  deleteTeam: (teamId) => api.delete(`/api/teams/${teamId}`),
  
  joinTeam: (teamId) => api.post(`/api/teams/${teamId}/join`),
  getInviteLink: (teamId) => api.get(`/api/teams/${teamId}/invite`),
  leaveTeam: (teamId) => api.post(`/api/teams/${teamId}/leave`),
  
  updateMemberRole: (teamId, userId, role) => 
    api.put(`/api/teams/${teamId}/members/${userId}/role`, { role }),
  removeMember: (teamId, userId) => 
    api.delete(`/api/teams/${teamId}/members/${userId}`),
  
  getAllMyTeamTasks: () => api.get("/api/teams/my/tasks"),
};

// -------------------------
// TEAM TASKS API - COMPLETELY FIXED
// -------------------------
export const teamTasksAPI = {
  // GET endpoints
  getTasks: (teamId, filters = {}) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) params.append(key, filters[key]);
    });
    return api.get(`/api/team-tasks/${teamId}?${params.toString()}`);
  },
  
  getMyTeamTasks: (filters = {}) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) params.append(key, filters[key]);
    });
    return api.get(`/api/team-tasks/my/all?${params.toString()}`);
  },
  
  getMyAssignedTasks: (teamId, filters = {}) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) params.append(key, filters[key]);
    });
    return api.get(`/api/team-tasks/${teamId}/my?${params.toString()}`);
  },
  
  getUserTasks: (teamId, userId) => 
    api.get(`/api/team-tasks/${teamId}/user/${userId}`),
  
  getPendingExtensions: (teamId) => 
    api.get(`/api/team-tasks/${teamId}/extensions/pending`),
  
  // CRUD endpoints
  createTask: (teamId, data) => api.post(`/api/team-tasks/${teamId}`, data),
  updateTask: (taskId, data) => api.put(`/api/team-tasks/${taskId}`, data),
  deleteTask: (taskId) => api.delete(`/api/team-tasks/${taskId}`),
  
  // EXTENSION MANAGEMENT - FIXED
  requestExtension: (taskId, reason, requestedDueDate) => 
    api.post(`/api/team-tasks/${taskId}/request-extension`, {
      reason,
      requestedDueDate
    }),
  
  approveExtension: (taskId, reason = "Extension approved") => 
    api.put(`/api/team-tasks/${taskId}/extension/approve`, { reason }),
  
  rejectExtension: (taskId, reason = "Extension rejected") => 
    api.put(`/api/team-tasks/${taskId}/extension/reject`, { reason }),
  
  // QUICK ACTIONS
  quickComplete: (taskId) => 
    api.post(`/api/team-tasks/${taskId}/quick-complete`),
};

// -------------------------
// NOTIFICATIONS API
// -------------------------
export const notificationsAPI = {
  getNotifications: () => api.get("/api/notifications"),
  markAsRead: (notificationId) => api.put(`/api/notifications/${notificationId}/read`),
  markAllAsRead: () => api.put("/api/notifications/read-all"),
  deleteNotification: (notificationId) => api.delete(`/api/notifications/${notificationId}`),
  clearAll: () => api.delete("/api/notifications"),
};

export default api;