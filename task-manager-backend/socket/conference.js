// socket/conference.js

const Team = require("../models/team");

/*
  In-memory conference store
  NOTE: This is intentional.
  Conferences are real-time constructs, not persistent data.
*/
const conferences = new Map();

/*
  conferences = {
    conferenceId: {
      teamId,
      createdBy,
      createdAt,
      participants: Map(socketId => {
        userId,
        role,
        name
      })
    }
  }
*/

module.exports = function registerConferenceSocket(io, socket) {
  /* ---------------------------------------------------
     HELPERS
  --------------------------------------------------- */

  const getUserFromSocket = () => socket.user; // injected via server.js

  const isAdminOrManager = (member) =>
    member && ["admin", "manager"].includes(member.role);

  const getConferenceRoom = (conferenceId) =>
    `conference_${conferenceId}`;

  /* ---------------------------------------------------
     CREATE CONFERENCE
     (ADMIN / MANAGER ONLY)
  --------------------------------------------------- */
  socket.on("conference:create", async ({ teamId }) => {
    try {
      const user = getUserFromSocket();
      if (!user) return;

      const team = await Team.findById(teamId);
      if (!team) {
        return socket.emit("conference:error", {
          message: "Team not found",
        });
      }

      const member = team.members.find(
        (m) => String(m.user) === String(user._id)
      );

      if (!isAdminOrManager(member)) {
        return socket.emit("conference:error", {
          message: "Only admin or manager can create a conference",
        });
      }

      const conferenceId = `${teamId}-${Date.now()}`;

      conferences.set(conferenceId, {
        conferenceId,
        teamId,
        createdBy: user._id,
        createdAt: new Date(),
        participants: new Map(),
      });

      socket.join(getConferenceRoom(conferenceId));

      conferences
        .get(conferenceId)
        .participants.set(socket.id, {
          userId: user._id,
          role: member.role,
          name: user.name,
        });

      socket.emit("conference:created", {
        conferenceId,
        teamId,
      });

      io.to(`team_${teamId}`).emit("conference:started", {
        conferenceId,
        teamId,
      });
    } catch (err) {
      console.error("conference:create error:", err);
      socket.emit("conference:error", { message: "Server error" });
    }
  });

  /* ---------------------------------------------------
     JOIN CONFERENCE
  --------------------------------------------------- */
  socket.on("conference:join", async ({ conferenceId }) => {
    try {
      const user = getUserFromSocket();
      if (!user) return;

      const conference = conferences.get(conferenceId);
      if (!conference) {
        return socket.emit("conference:error", {
          message: "Conference not found",
        });
      }

      const team = await Team.findById(conference.teamId);
      if (!team) return;

      const member = team.members.find(
        (m) => String(m.user) === String(user._id)
      );

      if (!member) {
        return socket.emit("conference:error", {
          message: "Not a team member",
        });
      }

      socket.join(getConferenceRoom(conferenceId));

      conference.participants.set(socket.id, {
        userId: user._id,
        role: member.role,
        name: user.name,
      });

      socket.to(getConferenceRoom(conferenceId)).emit(
        "conference:user-joined",
        {
          socketId: socket.id,
          user: {
            id: user._id,
            name: user.name,
            role: member.role,
          },
        }
      );

      socket.emit("conference:joined", {
        conferenceId,
        participants: Array.from(conference.participants.values()),
      });
    } catch (err) {
      console.error("conference:join error:", err);
    }
  });

  /* ---------------------------------------------------
     LEAVE CONFERENCE
  --------------------------------------------------- */
  socket.on("conference:leave", ({ conferenceId }) => {
    const conference = conferences.get(conferenceId);
    if (!conference) return;

    conference.participants.delete(socket.id);
    socket.leave(getConferenceRoom(conferenceId));

    socket.to(getConferenceRoom(conferenceId)).emit(
      "conference:user-left",
      { socketId: socket.id }
    );

    // Auto-end if empty
    if (conference.participants.size === 0) {
      conferences.delete(conferenceId);
      io.to(`team_${conference.teamId}`).emit("conference:ended", {
        conferenceId,
      });
    }
  });

  /* ---------------------------------------------------
     WEBRTC SIGNALING
  --------------------------------------------------- */

  socket.on("conference:offer", ({ to, offer }) => {
    socket.to(to).emit("conference:offer", {
      from: socket.id,
      offer,
    });
  });

  socket.on("conference:answer", ({ to, answer }) => {
    socket.to(to).emit("conference:answer", {
      from: socket.id,
      answer,
    });
  });

  socket.on("conference:ice-candidate", ({ to, candidate }) => {
    socket.to(to).emit("conference:ice-candidate", {
      from: socket.id,
      candidate,
    });
  });

  /* ---------------------------------------------------
     CLEANUP ON DISCONNECT
  --------------------------------------------------- */
  socket.on("disconnect", () => {
    for (const [conferenceId, conference] of conferences.entries()) {
      if (conference.participants.has(socket.id)) {
        conference.participants.delete(socket.id);

        socket
          .to(getConferenceRoom(conferenceId))
          .emit("conference:user-left", {
            socketId: socket.id,
          });

        if (conference.participants.size === 0) {
          conferences.delete(conferenceId);
          io.to(`team_${conference.teamId}`).emit("conference:ended", {
            conferenceId,
          });
        }
      }
    }
  });
};
