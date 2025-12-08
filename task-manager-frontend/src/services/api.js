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
// TEAMS API
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
// TEAM TASKS API - UPDATED WITH NEW ENDPOINTS
// -------------------------
export const teamTasksAPI = {
  // GET endpoints
  getTasks: (teamId, filters = {}) => {
    const params = new URLSearchParams();
    if (filters.priority) params.append('priority', filters.priority);
    if (filters.status) params.append('status', filters.status);
    if (filters.assignedTo) params.append('assignedTo', filters.assignedTo);
    if (filters.dateFilter) params.append('dateFilter', filters.dateFilter);
    
    return api.get(`/api/team-tasks/${teamId}?${params.toString()}`);
  },
  
  getMyTeamTasks: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.priority) params.append('priority', filters.priority);
    if (filters.status) params.append('status', filters.status);
    if (filters.teamId) params.append('teamId', filters.teamId);
    if (filters.assignedTo) params.append('assignedTo', filters.assignedTo);
    
    return api.get(`/api/team-tasks/my/all?${params.toString()}`);
  },
  
  getMyAssignedTasks: (teamId, filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.priority) params.append('priority', filters.priority);
    if (filters.dateFilter) params.append('dateFilter', filters.dateFilter);
    
    return api.get(`/api/team-tasks/${teamId}/my?${params.toString()}`);
  },
  
  getUserTasks: (teamId, userId) => 
    api.get(`/api/team-tasks/${teamId}/user/${userId}`),
  
  // CRUD endpoints
  createTask: (teamId, data) => api.post(`/api/team-tasks/${teamId}`, data),
  updateTask: (taskId, data) => api.put(`/api/team-tasks/${taskId}`, data),
  deleteTask: (taskId) => api.delete(`/api/team-tasks/${taskId}`),
  
};


export const teamExtensionsAPI = {
  requestExtension: (taskId, data) =>
    api.post(`/api/team-extensions/${taskId}/request-extension`, data),

  getPendingExtensions: (teamId) =>
    api.get(`/api/team-extensions/${teamId}/extensions/pending`),

  approveExtension: (taskId) =>
    api.put(`/api/team-extensions/${taskId}/approve-extension`),

  rejectExtension: (taskId) =>
    api.put(`/api/team-extensions/${taskId}/reject-extension`),
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