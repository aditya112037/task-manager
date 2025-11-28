// src/services/teamsAPI.js
import api from "./api";

export const teamsAPI = {
  getTeams: () => api.get("/api/teams/my"),
  createTeam: (data) => api.post("/api/teams", data),
  getTeam: (teamId) => api.get(`/api/teams/${teamId}/details`),
  joinTeam: (teamId) => api.post(`/api/teams/${teamId}/join`),
};
