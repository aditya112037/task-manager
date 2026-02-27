import axios from "axios";

// -------------------------
// BASE API INSTANCE
// -------------------------
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  withCredentials: true,
  timeout: 10000,
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
  getProfile: (config = {}) => api.get("/api/auth/profile", config),
  getPublicProfile: (userId) => api.get(`/api/auth/profile/${userId}/public`),
  uploadProfilePhoto: (imageData) => api.put("/api/auth/profile/photo", { imageData }),
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
  leaveTeam: (teamId) => api.post(`/api/teams/${teamId}/leave`),
  getInviteLink: (teamId) => api.get(`/api/teams/${teamId}/invite`),

  updateMemberRole: (teamId, userId, role) =>
    api.put(`/api/teams/${teamId}/members/${userId}/role`, { role }),

  removeMember: (teamId, userId) =>
    api.delete(`/api/teams/${teamId}/members/${userId}`),
};

// -------------------------
// TEAM TASKS API (SAFE VERSION - ONLY EXISTING ROUTES)
// -------------------------
export const teamTasksAPI = {
  // ✅ ONLY THIS EXISTS in your backend (from TTRoutes.js)
  getTeamTasks: (teamId, filters = {}) =>
    api.get(`/api/team-tasks/${teamId}`, { params: filters }),

  // ✅ CRUD OPERATIONS (ALL EXIST)
  createTask: (teamId, data) =>
    api.post(`/api/team-tasks/${teamId}`, data),

  updateTask: (taskId, data) =>
    api.put(`/api/team-tasks/${taskId}`, data),

  deleteTask: (taskId) =>
    api.delete(`/api/team-tasks/${taskId}`),

  // ✅ EXTENSION SYSTEM (ALL EXIST)
  requestExtension: (taskId, payload) =>
    api.post(`/api/team-tasks/${taskId}/request-extension`, payload),

  approveExtension: (taskId) =>
    api.post(`/api/team-tasks/${taskId}/extension/approve`),

  rejectExtension: (taskId) =>
    api.post(`/api/team-tasks/${taskId}/extension/reject`),

  getPendingExtensions: (teamId) =>
    api.get(`/api/team-tasks/${teamId}/extensions/pending`),
  
  // 🚨 REMOVED - THESE ROUTES DON'T EXIST (causing 404s):
  // getMyTeamTasks: (filters = {}) => api.get("/api/team-tasks/my/all", { params: filters }),
  // getUserTasks: (teamId, userId) => api.get(`/api/team-tasks/${teamId}/user/${userId}`),
};

// -------------------------
// NOTIFICATIONS API
// -------------------------
export const notificationsAPI = {
  getNotifications: () => api.get("/api/notifications"),
  markAsRead: (id) => api.put(`/api/notifications/${id}/read`),
  markAllAsRead: () => api.put("/api/notifications/read-all"),
  deleteNotification: (id) => api.delete(`/api/notifications/${id}`),
  clearAll: () => api.delete("/api/notifications"),
  getPushVapidPublicKey: () => api.get("/api/notifications/push/vapid-public-key"),
  subscribePush: (subscription) =>
    api.post("/api/notifications/push/subscribe", { subscription }),
  unsubscribePush: (endpoint) =>
    api.post("/api/notifications/push/unsubscribe", { endpoint }),
};

// -------------------- COMMENTS API (CRITICAL FIX) --------------------
export const commentsAPI = {
  // ✅ CORRECT: Matches backend route /api/comments/:taskId
  getByTask: (taskId) =>
    api.get(`/api/comments/${taskId}`),

  // ✅ CORRECT: Matches backend route POST /api/comments/:taskId
  create: (taskId, data) =>
    api.post(`/api/comments/${taskId}`, data),

  // ✅ CORRECT: Matches backend route DELETE /api/comments/:commentId
  delete: (commentId) =>
    api.delete(`/api/comments/${commentId}`),
};

export default api;
