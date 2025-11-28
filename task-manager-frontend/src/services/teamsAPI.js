import api from "./api";

// ---- TEAM CRUD ----
export const teamsAPI = {
  getTeams: () => api.get("/api/teams/my"),
  createTeam: (data) => api.post("/api/teams", data),
  getTeam: (teamId) => api.get(`/api/teams/${teamId}/details`),
  joinTeam: (teamId) => api.post(`/api/teams/${teamId}/join`),
};

// ---- TEAM TASKS CRUD ----
export const teamTasksAPI = {
  getTasks: (teamId) => api.get(`/api/team-tasks/${teamId}`),
  createTask: (teamId, data) => api.post(`/api/team-tasks/${teamId}`, data),
  updateTask: (taskId, data) => api.put(`/api/team-tasks/${taskId}`, data),
  deleteTask: (taskId) => api.delete(`/api/team-tasks/${taskId}`),
};
