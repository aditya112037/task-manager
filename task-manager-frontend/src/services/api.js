import axios from "axios";

// -------------------------
// BASE API INSTANCE
// -------------------------
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  withCredentials: true,
});

// -------------------------
// TOKEN ATTACH
// -------------------------
api.interceptors.request.use(
  (config) => {
    const user = JSON.parse(localStorage.getItem("user"));

    if (user?.token) {
      config.headers.Authorization = `Bearer ${user.token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
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
// TEAMS CRUD
// -------------------------
export const teamsAPI = {
  getTeams: () => api.get("/api/teams/my"),
  createTeam: (data) => api.post("/api/teams", data),
  getTeam: (teamId) => api.get(`/api/teams/${teamId}/details`),
  joinTeam: (teamId) => api.post(`/api/teams/${teamId}/join`),
};

// -------------------------
// TEAM TASKS CRUD
// -------------------------
export const teamTasksAPI = {
  getTasks: (teamId) => api.get(`/api/team-tasks/${teamId}`),
  createTask: (teamId, data) => api.post(`/api/team-tasks/${teamId}`, data),
  updateTask: (taskId, data) => api.put(`/api/team-tasks/${taskId}`, data),
  deleteTask: (taskId) => api.delete(`/api/team-tasks/${taskId}`),
};

export default api;
