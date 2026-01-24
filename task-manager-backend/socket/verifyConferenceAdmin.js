// socket/verifyConferenceAdmin.js
const Team = require("../models/team");

module.exports = async function verifyConferenceAdmin({ userId, conference }) {
  try {
    if (!userId || !conference?.teamId) return false;

    const team = await Team.findById(conference.teamId);
    if (!team) return false;

    const member = team.members.find(
      (m) => String(m.user) === String(userId)
    );

    return !!member && ["admin", "manager"].includes(member.role);
  } catch (err) {
    console.error("verifyConferenceAdmin error:", err);
    return false;
  }
};
