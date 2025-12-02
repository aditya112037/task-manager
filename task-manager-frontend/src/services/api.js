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
// RESPONSE INTERCEPTOR - ADD THIS
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
// TEAMS CRUD - FIXED ENDPOINTS
// -------------------------
export const teamsAPI = {
  getTeams: () => api.get("/api/teams/my"),
  createTeam: (data) => api.post("/api/teams", data),
  getTeam: (teamId) => api.get(`/api/teams/${teamId}/details`),
  joinTeam: (teamId) => api.post(`/api/teams/${teamId}/join`),
  getInviteLink: (teamId) => api.get(`/api/teams/${teamId}/invite`),
  getAllMyTeamTasks: () => api.get("/api/teams/my/tasks"), // You might need to create this endpoint
  updateTeam: (teamId, data) => api.put(`/api/teams/${teamId}/`, data),
};

// -------------------------
// TEAM TASKS CRUD - FIXED ENDPOINTS
// -------------------------
export const teamTasksAPI = {
  getTasks: (teamId) => api.get(`/api/team-tasks/${teamId}`),
  getMyTeamTasks: () => api.get("/api/team-tasks/my/all"),
  createTask: (teamId, data) => api.post(`/api/team-tasks/${teamId}`, data),
    // UPDATE existing task
  updateTask: (taskId, data) => api.put(`/api/team-tasks/${taskId}`, data),

  // DELETE a task
  deleteTask: (taskId) => api.delete(`/api/team-tasks/${taskId}`),
};

export default api;