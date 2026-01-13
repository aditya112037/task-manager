// utils/conferenceStore.js

/*
  Shared in-memory conference store
  Accessible to both socket handlers and REST routes
*/
const conferences = new Map();

module.exports = {
  conferences,
  
  // Helper methods for easier access
  getConference: (conferenceId) => conferences.get(conferenceId),
  
  getConferenceByTeamId: (teamId) => {
    for (const conference of conferences.values()) {
      if (String(conference.teamId) === String(teamId)) {
        return conference;
      }
    }
    return null;
  },
  
  createConference: (conferenceId, data) => {
    conferences.set(conferenceId, data);
    return data;
  },
  
  deleteConference: (conferenceId) => {
    const conference = conferences.get(conferenceId);
    conferences.delete(conferenceId);
    return conference;
  },
  
  getActiveConferenceCount: () => conferences.size,
  
  getAllConferences: () => Array.from(conferences.values()),
};