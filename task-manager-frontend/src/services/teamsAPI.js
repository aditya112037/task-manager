import axios from "axios";
import api from "./api";

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
});

// ---- TEAM CRUD ----
export const teamsAPI = {
  getTeams: () => API.get("/api/teams"),
  createTeam: (data) => API.post("/api/teams", data),
  getTeam: (teamId) => API.get(`/api/teams/${teamId}`),
  joinTeam: (code) => API.post(`/api/teams/join/${code}`),
};

// ---- TEAM TASKS CRUD ----
export const teamTasksAPI = {
  getTasks: (teamId) => API.get(`/api/team-tasks/${teamId}`),
  createTask: (teamId, data) =>
    API.post(`/api/team-tasks/${teamId}`, data),
  updateTask: (taskId, data) =>
    API.put(`/api/team-tasks/update/${taskId}`, data),
  deleteTask: (taskId) =>
    API.delete(`/api/team-tasks/delete/${taskId}`),
};
