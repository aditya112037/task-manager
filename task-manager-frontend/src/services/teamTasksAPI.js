// src/services/teamTasksAPI.js
import api from "./api";

export const teamTasksAPI = {
  getTasks: (teamId) => api.get(`/api/team-tasks/${teamId}`),
  createTask: (teamId, data) => api.post(`/api/team-tasks/${teamId}`, data),
  updateTask: (taskId, data) => api.put(`/api/team-tasks/${taskId}`, data),
  deleteTask: (taskId) => api.delete(`/api/team-tasks/${taskId}`),
};
