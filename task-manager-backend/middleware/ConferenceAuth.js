const Team = require("../models/team");

module.exports = async function verifyConferenceAdmin({
  userId,
  conference,
}) {
  const team = await Team.findById(conference.team);

  if (!team) return false;

  const member = team.members.find(
    (m) => String(m.user) === String(userId)
  );

  if (!member) return false;

  return ["admin", "manager"].includes(member.role);
};
