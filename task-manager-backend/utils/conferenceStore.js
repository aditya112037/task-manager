// utils/conferenceStore.js

/*
  Authoritative in-memory conference store
  SINGLE SOURCE OF TRUTH for conference lifecycle
*/

const conferences = new Map();

/* ---------------------------------------------------
   READ OPERATIONS
--------------------------------------------------- */

const getConference = (conferenceId) => {
  const conf = conferences.get(conferenceId);
  if (!conf) return null;
  if (conf.status === "ended") return null;
  return conf;
};

const getConferenceRaw = (conferenceId) => {
  // INTERNAL USE ONLY (can return ended conference)
  return conferences.get(conferenceId) || null;
};

const getConferenceByTeamId = (teamId) => {
  for (const conf of conferences.values()) {
    if (
      String(conf.teamId) === String(teamId) &&
      conf.status === "active"
    ) {
      return conf;
    }
  }
  return null;
};

const getAllActiveConferences = () =>
  Array.from(conferences.values()).filter(
    (c) => c.status === "active"
  );

/* ---------------------------------------------------
   CREATE
--------------------------------------------------- */

const createConference = (conferenceId, data) => {
  const conference = {
    ...data,
    conferenceId,
    status: "active",
    createdAt: new Date(),
    endedAt: null,
    endReason: null,
  };

  conferences.set(conferenceId, conference);
  return conference;
};

/* ---------------------------------------------------
   END CONFERENCE (THE ONLY WAY TO END)
--------------------------------------------------- */

const endConference = (conferenceId, reason = "unknown") => {
  const conference = conferences.get(conferenceId);
  if (!conference) return null;

  // ✅ IDEMPOTENT: already ended → do nothing
  if (conference.status === "ended") {
    return conference;
  }

  conference.status = "ended";
  conference.endedAt = new Date();
  conference.endReason = reason;

  return conference;
};

/* ---------------------------------------------------
   HARD DELETE (INTERNAL / CLEANUP ONLY)
   ⚠️ NEVER call this from sockets directly
--------------------------------------------------- */

const destroyConference = (conferenceId) => {
  const conf = conferences.get(conferenceId);
  conferences.delete(conferenceId);
  return conf;
};

/* ---------------------------------------------------
   METRICS
--------------------------------------------------- */

const getActiveConferenceCount = () =>
  getAllActiveConferences().length;

module.exports = {
  // raw store (debug only)
  conferences,

  // reads
  getConference,
  getConferenceRaw,
  getConferenceByTeamId,
  getAllActiveConferences,

  // lifecycle
  createConference,
  endConference,
  destroyConference,

  // metrics
  getActiveConferenceCount,
};
