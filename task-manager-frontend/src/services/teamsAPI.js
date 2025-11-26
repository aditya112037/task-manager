import api from "./api";

export const teamsAPI = {
  getTeams: () => api.get("/teams"),
  createTeam: (data) => api.post("/teams", data),
  getTeamDetails: (id) => api.get(`/teams/${id}`),
  joinTeam: (teamId) => api.post(`/teams/join/${teamId}`)
};
