import axios from "axios";

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
});

// ---- TEAM CRUD ----
export const teamsAPI = {
  getTeams: () => API.get("/api/teams/my"),
  createTeam: (data) => API.post("/api/teams", data),
  getTeam: (teamId) => API.get(`/api/teams/${teamId}`),
  joinTeam: (teamId) => API.post(`/api/teams/${teamId}/join`),
};

// ---- TEAM TASKS CRUD ----
export const teamTasksAPI = {
  getTasks: (teamId) => API.get(`/api/team-tasks/${teamId}`),
  createTask: (teamId, data) => API.post(`/api/team-tasks/${teamId}`, data),
  updateTask: (taskId, data) =>
    API.put(`/api/team-tasks/task/${taskId}`, data),
  deleteTask: (taskId) =>
    API.delete(`/api/team-tasks/task/${taskId}`),
};
