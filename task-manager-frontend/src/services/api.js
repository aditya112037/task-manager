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
};

// -------------------------
// TEAM TASKS API — FIXED
// -------------------------
export const teamTasksAPI = {
  // 🆕 Load every team task user has access to (admin/member)
  getMyTeamTasks: (filters = {}) => api.get("/api/team-tasks/my/all", { params: filters }),

  // 🆕 Assigned tasks only — NO teamId needed anymore
  getMyAssignedTasks: (filters = {}) =>
    api.get("/api/team-tasks/my/all", {
      params: { assignedTo: "me", ...filters },
    }),

  // Get all tasks for a specific team (admin/member)
  getTasks: (teamId, filters = {}) =>
    api.get(`/api/team-tasks/${teamId}`, { params: filters }),

  // Get all tasks assigned to a user (for admin/manager)
  getUserTasks: (teamId, userId) =>
    api.get(`/api/team-tasks/${teamId}/user/${userId}`),

  // CRUD
  createTask: (teamId, data) => api.post(`/api/team-tasks/${teamId}`, data),
  updateTask: (taskId, data) => api.put(`/api/team-tasks/${taskId}`, data),
  deleteTask: (taskId) => api.delete(`/api/team-tasks/${taskId}`),

  // Extension system — FULLY WORKING
 requestExtension: (taskId, payload) =>
    api.post(`/api/team-tasks/${taskId}/request-extension`, payload),

  approveExtension: (taskId) =>
    api.post(`/api/team-tasks/${taskId}/extension/approve`),

  rejectExtension: (taskId) =>
    api.post(`/api/team-tasks/${taskId}/extension/reject`),

  // Pending extension list
  getPendingExtensions: (teamId) =>
    api.get(`/api/team-tasks/${teamId}/extensions/pending`),
};

// -------------------------
// NOTIFICATIONS API
// -------------------------
export const notificationsAPI = {
  getNotifications: () => api.get("/api/notifications"),
  markAsRead: (notificationId) =>
    api.put(`/api/notifications/${notificationId}/read`),
  markAllAsRead: () => api.put("/api/notifications/read-all"),
  deleteNotification: (notificationId) =>
    api.delete(`/api/notifications/${notificationId}`),
  clearAll: () => api.delete("/api/notifications"),
};

export default api;
