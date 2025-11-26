import axios from "axios";

const API = process.env.REACT_APP_API_URL;



const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

// Attach token automatically
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

// AUTH API
export const authAPI = {
  register: (data) => api.post("/api/auth/register", data),
  login: (data) => api.post("/api/auth/login", data),
  getProfile: () => api.get("/api/auth/profile"),
  forgotPassword: (data) => api.post("/auth/forgot-password", data),
  resetPassword: (token, data) => api.post(`/auth/reset-password/${token}`, data),

};

export const teamsAPI = {
  createTeam: (data) => axios.post("/api/teams", data),
  getMyTeams: () => axios.get("/api/teams"),

  getTeamDetails: (teamId) => axios.get(`/api/teams/${teamId}`),

  // NEW:
  getTeamInvite: (code) => axios.get(`/api/teams/join/${code}`),
  acceptInvite: (code) => axios.post(`/api/teams/join/${code}`),
};


// TASKS API
export const tasksAPI = {
  getTasks: () => api.get("/api/tasks"),
  createTask: (data) => api.post("/api/tasks", data),
  updateTask: (id, data) => api.put(`/api/tasks/${id}`, data),
  deleteTask: (id) => api.delete(`/api/tasks/${id}`),
};

export const teamTasksAPI = {
  getTasks: (teamId) => axios.get(`/api/team-tasks/${teamId}`),
  createTask: (teamId, data) => axios.post(`/api/team-tasks/${teamId}`, data),
  updateTask: (taskId, data) => axios.put(`/api/team-tasks/task/${taskId}`, data),
  deleteTask: (taskId) => axios.delete(`/api/team-tasks/task/${taskId}`)
};


export default api;
