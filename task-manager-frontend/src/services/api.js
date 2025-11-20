// src/services/api.js
import axios from "axios";

// Load backend URL from Vercel
const API = process.env.REACT_APP_API_URL;

if (!API) {
  console.error("❌ ERROR: REACT_APP_API_URL is NOT set in environment variables!");
}

// Create axios instance
const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

// Attach token to every request
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

// ----------------------
// AUTH API
// ----------------------
export const authAPI = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
  getProfile: () => api.get("/auth/profile"),
};

// ----------------------
// TASKS API
// ----------------------
export const tasksAPI = {
  getTasks: () => api.get("/tasks"),
  createTask: (data) => api.post("/tasks", data),
  updateTask: (id, data) => api.put(`/tasks/${id}`, data),
  deleteTask: (id) => api.delete(`/tasks/${id}`),
};

export default api;
