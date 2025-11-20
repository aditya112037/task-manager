import axios from 'axios';

// Load backend URL from Vercel environment variable
const API = process.env.REACT_APP;

// Create axios instance
const api = axios.create({
  baseURL: API, // ✔ FIXED
});

// Attach token automatically to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auth API
export const authAPI = {
  register: (userData) => api.post('/api/auth/register', userData),
  login: (userData) => api.post('/api/auth/login', userData),
  getProfile: () => api.get('/api/auth/profile'),
};

// Tasks API
export const tasksAPI = {
  getTasks: () => api.get('/api/tasks'),
  createTask: (taskData) => api.post('/api/tasks', taskData),
  updateTask: (id, taskData) => api.put(`/api/tasks/${id}`, taskData),
  deleteTask: (id) => api.delete(`/api/tasks/${id}`),
};

export default api;
