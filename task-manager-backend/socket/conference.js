// socketHandlers/registerConferenceSocket.js
const Team = require("../models/team");
const verifyConferenceAdmin = require("./verifyConferenceAdmin");
const { 
  conferences, 
  getConferenceByTeamId, 
  getConference,
  endConference,
  destroyConference,
  createConference  // ✅ ADDED: Import createConference
} = require("../utils/conferenceStore");

module.exports = function registerConferenceSocket(io, socket) {
  /* ---------------------------------------------------
     HELPERS
  --------------------------------------------------- */

  const getUserFromSocket = () => socket.user;
  const EMPTY_END_DELAY = 5; // 30 seconds
  const getConferenceRoom = (conferenceId) =>
    `conference_${conferenceId}`;

  const getParticipant = (conferenceId, socketId) => {
    const conference = getConference(conferenceId);
    if (!conference) return null;
    return conference.participants.get(socketId);
  };

  const clearSpeakerTimeout = (conference, socketId) => {
    if (!conference.speakerMode || !conference.speakerMode.speakerTimeouts) return;
    
    if (conference.speakerMode.speakerTimeouts.has(socketId)) {
      clearTimeout(conference.speakerMode.speakerTimeouts.get(socketId));
      conference.speakerMode.speakerTimeouts.delete(socketId);
    }
  };

  const setSpeakerTimeout = (conference, socketId) => {
    if (!conference.speakerMode) return;
    
    clearSpeakerTimeout(conference, socketId);
    
    const timeout = setTimeout(() => {
      if (conference.speakerMode.activeSpeaker === socketId) {
        conference.speakerMode.activeSpeaker = null;
        io.to(getConferenceRoom(conference.conferenceId)).emit(
          "conference:active-speaker",
          { socketId: null }
        );
      }
      if (conference.speakerMode.speakerTimeouts) {
        conference.speakerMode.speakerTimeouts.delete(socketId);
      }
    }, 4000);
    
    if (!conference.speakerMode.speakerTimeouts) {
      conference.speakerMode.speakerTimeouts = new Map();
    }
    conference.speakerMode.speakerTimeouts.set(socketId, timeout);
  };

  /* ---------------------------------------------------
     SHARED HELPER: safelyRemoveParticipant
  --------------------------------------------------- */
  const safelyRemoveParticipant = (conferenceId, socketId) => {
    const conference = getConference(conferenceId);
    if (!conference) return false;

    if (!conference.participants.has(socketId)) {
      return false; // already removed
    }

    const participant = conference.participants.get(socketId);

    conference.participants.delete(socketId);
    conference.raisedHands.delete(socketId);

    if (conference.speakerMode.activeSpeaker === socketId) {
      conference.speakerMode.activeSpeaker = null;
      clearSpeakerTimeout(conference, socketId);

      io.to(getConferenceRoom(conferenceId)).emit("conference:active-speaker", {
        socketId: null,
      });
    }

    return participant;
  };

  /* ---------------------------------------------------
     🧱 FIXED: SINGLE end function using store lifecycle
  --------------------------------------------------- */
  const endConferenceAuthoritative = (conference, reason) => {
    // ✅ FIXED: Use store's endConference function
    const endedConference = endConference(conference.conferenceId, reason);
    if (!endedConference) return;

    const { conferenceId, teamId } = endedConference;

    const payload = { conferenceId, teamId, reason };

    io.to(`team_${teamId}`).emit("conference:ended", payload);
    io.to(`team_${teamId}`).emit("conference:refresh", { teamId });
    io.to(getConferenceRoom(conferenceId)).emit("conference:ended", payload);

    console.log(`🏁 Conference ${conferenceId} ended [${reason}]`);

    // ✅ FIXED: Delay destruction using store's destroyConference
    setTimeout(() => {
      destroyConference(conferenceId);
      console.log(`🧹 Conference ${conferenceId} destroyed`);
    }, 5);
  };

  /* ---------------------------------------------------
   PHASE-3: Unified Participant Exit Handler
   Single source of truth for leave / disconnect / admin-remove
  --------------------------------------------------- */
  const handleParticipantExit = ({ socket, reason }) => {
    const conferenceId = socket.conferenceId;

    // 🔴 HARD GUARD: find conference even if socket lost state
    const conference = conferenceId ? getConference(conferenceId) : null;

    // If socket lost conferenceId but conference still exists → find it
    const resolvedConference = conference || Array.from(conferences.values()).find(c => 
      c.participants.has(socket.id)
    );

    if (!resolvedConference) {
      socket.conferenceId = null;
      return;
    }

    const removedParticipant = safelyRemoveParticipant(resolvedConference.conferenceId, socket.id);
    if (!removedParticipant) {
      socket.conferenceId = null;
      return;
    }

    // Leave room safely
    socket.leave(getConferenceRoom(resolvedConference.conferenceId));
    socket.conferenceId = null;

    // 🔐 Authoritative participant list
    const participants = Array.from(resolvedConference.participants.values());
    io.to(getConferenceRoom(resolvedConference.conferenceId)).emit(
      "conference:participants",
      { participants }
    );

    // Raised hands sync
    io.to(getConferenceRoom(resolvedConference.conferenceId)).emit("conference:hands-updated", {
      raisedHands: Array.from(resolvedConference.raisedHands),
    });

    // Notify others
    socket.to(getConferenceRoom(resolvedConference.conferenceId)).emit(
      "conference:user-left",
      {
        socketId: socket.id,
        userId: removedParticipant.userId,
        reason,
      }
    );

    // ✅ FIXED: Delayed end-on-empty with timeout management
    if (resolvedConference.participants.size === 0) {
      if (!resolvedConference.emptyTimeout) {
        console.log("⏳ Conference empty, scheduling auto-end:", resolvedConference.conferenceId);

        resolvedConference.emptyTimeout = setTimeout(() => {
  const fresh = conferences.get(resolvedConference.conferenceId);

  if (
    fresh &&
    fresh.status === "active" &&
    fresh.participants.size === 0
  ) {
    endConferenceAuthoritative(fresh, "empty");
  }
}, EMPTY_END_DELAY);
      }
    }
  };

  /* ---------------------------------------------------
     CONFERENCE CHECK ENDPOINT (FOR TEAMDETAILS.JSX)
     ✅ FIXED: Simplified check (store already filters ended conferences)
  --------------------------------------------------- */
  socket.on("conference:check", ({ teamId }) => {
    const conference = getConferenceByTeamId(teamId);

    // ✅ FIXED: getConferenceByTeamId already returns only active conferences
    if (!conference || conference.emptyTimeout) {
      socket.emit("conference:state", { active: false });
      return;
    }

    socket.emit("conference:state", {
      active: true,
      conference: {
        conferenceId: conference.conferenceId,
        teamId: conference.teamId,
        createdBy: conference.createdBy,
        startedAt: conference.createdAt,
        participantCount: conference.participants.size,
      },
    });
  });

  /* ---------------------------------------------------
     CREATE CONFERENCE
     ✅ FIXED: Use createConference from store for proper lifecycle
  --------------------------------------------------- */
  socket.on("conference:create", async ({ teamId }) => {
    try {
      const user = getUserFromSocket();
      if (!user) return;

      console.log("🎥 conference:create requested for team:", teamId);

      // Check if conference already exists
      const existingConference = getConferenceByTeamId(teamId);
      if (existingConference) {
        return socket.emit("conference:error", {
          message: "Conference already exists for this team",
        });
      }

      const team = await Team.findById(teamId);
      if (!team) {
        return socket.emit("conference:error", {
          message: "Team not found",
        });
      }

      const member = team.members.find(
        (m) => String(m.user) === String(user._id)
      );

      if (!member) {
        return socket.emit("conference:error", {
          message: "Not authorized to create conference",
        });
      }

      if (!["admin", "manager"].includes(member.role)) {
        return socket.emit("conference:error", {
          message: "Only admin or manager can create a conference",
        });
      }

      const conferenceId = `${teamId}-${Date.now()}`;

      // ✅ FIXED: Use store's createConference for proper initialization
      const conference = createConference(
        conferenceId,
        {
          teamId,
          createdBy: {
            _id: user._id,
            name: user.name,
            role: member.role,
          },
          participants: new Map(),
          speakerMode: {
            enabled: false,
            activeSpeaker: null,
            speakerTimeouts: new Map(),
          },
          raisedHands: new Set(),
          adminActions: new Map(),
          emptyTimeout: null
        }
      );

      // ✅ IDEMPOTENT JOIN: Check if already in conference before joining
      if (socket.conferenceId !== conferenceId) {
        socket.join(getConferenceRoom(conferenceId));
        socket.conferenceId = conferenceId;
      }

      // Add creator as first participant
      conference.participants.set(socket.id, {
        userId: user._id,
        role: member.role,
        name: user.name,
        socketId: socket.id,
        micOn: true,
        camOn: true,
      });

      // ✅ FIXED: Cancel any pending empty timeout (should be none, but safe)
      if (conference.emptyTimeout) {
        clearTimeout(conference.emptyTimeout);
        conference.emptyTimeout = null;
        console.log("🛑 Cancelled auto-end (conference created)");
      }

      // Notify team room
      io.to(`team_${teamId}`).emit("conference:started", {
        conferenceId,
        teamId,
        createdBy: conference.createdBy,
      });

      // ✅ FIXED: Authoritative participants list
      const participants = Array.from(conference.participants.values());

      // 🔐 Authoritative participants list
      io.to(getConferenceRoom(conferenceId)).emit(
        "conference:participants",
        { participants }
      );

      // ✅ Explicit join confirmation for creator
      socket.emit("conference:joined", {
        participants,
      });

      // ✅ Conference existence state (NO participants here)
      socket.emit("conference:state", {
        active: true,
        conference: {
          conferenceId,
          teamId,
          createdBy: conference.createdBy,
          startedAt: conference.createdAt,
          speakerMode: conference.speakerMode,
        },
      });

      console.log(`✅ Conference created: ${conferenceId} for team ${teamId}`);
    } catch (err) {
      console.error("conference:create error:", err);
      socket.emit("conference:error", { message: "Server error" });
    }
  });

  /* ---------------------------------------------------
     JOIN CONFERENCE
     ✅ FIXED: Cancel empty timeout on ALL joins (including reconnects)
  --------------------------------------------------- */
  socket.on("conference:join", async ({ conferenceId }) => {
    try {
      // ✅ IDEMPOTENT JOIN: Check if already in this conference
      if (socket.conferenceId === conferenceId) {
        console.log(`⚠️ Socket ${socket.id} already in conference ${conferenceId}, skipping join`);
        return;
      }

      const user = getUserFromSocket();
      if (!user) return;

      console.log("🎥 conference:join requested:", conferenceId);

      const conference = getConference(conferenceId);
      if (!conference) {
        return socket.emit("conference:error", {
          message: "Conference not found",
        });
      }

      // ✅ FIXED: Clear empty timeout immediately on ANY join
      if (conference.emptyTimeout) {
        clearTimeout(conference.emptyTimeout);
        conference.emptyTimeout = null;
        console.log("🛑 Cancelled auto-end (participant joined/rejoined)");
      }

      // ✅ FIXED: Check conference.status instead of conference.ended
      if (conference.status === "ended") {
        return socket.emit("conference:error", {
          message: "Conference has ended",
        });
      }

      const team = await Team.findById(conference.teamId);
      if (!team) {
        return socket.emit("conference:error", {
          message: "Team not found",
        });
      }

      const member = team.members.find(
        (m) => String(m.user) === String(user._id)
      );

      if (!member) {
        return socket.emit("conference:error", {
          message: "Not a team member",
        });
      }

      // ✅ IDEMPOTENT JOIN: Join room only if not already in it
      socket.join(getConferenceRoom(conferenceId));
      socket.conferenceId = conferenceId;

      // Check if already a participant (shouldn't happen but safe)
      if (conference.participants.has(socket.id)) {
        console.log(`⚠️ Socket ${socket.id} already a participant in conference ${conferenceId}`);
        return;
      }

      // Add participant
      conference.participants.set(socket.id, {
        userId: user._id,
        role: member.role,
        name: user.name,
        socketId: socket.id,
        micOn: true,
        camOn: true,
      });

      // Notify others
      socket.to(getConferenceRoom(conferenceId)).emit(
        "conference:user-joined",
        {
          socketId: socket.id,
          userId: user._id,
          userName: user.name,
        }
      );

      // 🔐 Single source of truth
      const participants = Array.from(conference.participants.values());
      io.to(getConferenceRoom(conferenceId)).emit(
        "conference:participants",
        { participants }
      );

      // ✅ Join confirmation
      socket.emit("conference:joined", {
        participants,
      });

      // ✅ Conference state (NO participants here)
      socket.emit("conference:state", {
        active: true,
        conference: {
          conferenceId: conference.conferenceId,
          teamId: conference.teamId,
          createdBy: conference.createdBy,
          startedAt: conference.createdAt,
          speakerMode: conference.speakerMode,
        },
      });

      // Send current active speaker
      if (conference.speakerMode.activeSpeaker) {
        socket.emit("conference:active-speaker", {
          socketId: conference.speakerMode.activeSpeaker,
        });
      }

      // Send raised hands state
      socket.emit("conference:hands-updated", {
        raisedHands: Array.from(conference.raisedHands),
      });

      console.log(`✅ User ${user.name} joined conference ${conferenceId}`);
    } catch (err) {
      console.error("conference:join error:", err);
      socket.emit("conference:error", { message: "Server error" });
    }
  });

  /* ---------------------------------------------------
     MEDIA STATE UPDATES
  --------------------------------------------------- */
  socket.on("conference:media-update", ({ conferenceId, micOn, camOn }) => {
    const conference = getConference(conferenceId);
    if (!conference) return;

    const participant = conference.participants.get(socket.id);
    if (!participant) return;

    // Update server state
    participant.micOn = micOn;
    participant.camOn = camOn;

    // Broadcast to others
    socket.to(getConferenceRoom(conferenceId)).emit(
      "conference:media-update",
      {
        socketId: socket.id,
        micOn,
        camOn,
      }
    );

    console.log(`📡 Media update: ${participant.name} mic=${micOn}, cam=${camOn}`);
  });

  /* ---------------------------------------------------
     LEAVE CONFERENCE
  --------------------------------------------------- */
  socket.on("conference:leave", () => {
    console.log(`🚪 conference:leave from ${socket.id}`);
    handleParticipantExit({ socket, reason: "leave" });
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
     RAISE HAND FEATURE
  --------------------------------------------------- */
  socket.on("conference:raise-hand", ({ conferenceId }) => {
    const conference = getConference(conferenceId);
    if (!conference) return;

    const participant = conference.participants.get(socket.id);
    if (!participant) return;

    conference.raisedHands.add(socket.id);

    io.to(getConferenceRoom(conferenceId)).emit("conference:hands-updated", {
      raisedHands: Array.from(conference.raisedHands),
    });

    console.log(`✋ ${participant.name} raised hand`);
  });

  socket.on("conference:lower-hand", ({ conferenceId }) => {
    const conference = getConference(conferenceId);
    if (!conference) return;

    conference.raisedHands.delete(socket.id);

    io.to(getConferenceRoom(conferenceId)).emit("conference:hands-updated", {
      raisedHands: Array.from(conference.raisedHands),
    });

    console.log(`👇 Hand lowered for socket ${socket.id}`);
  });

  /* ---------------------------------------------------
     SPEAKER MODE FUNCTIONALITY
  --------------------------------------------------- */
  socket.on("conference:toggle-speaker-mode", async ({ conferenceId, enabled }) => {
    try {
      const conference = getConference(conferenceId);
      if (!conference) return;

      const user = getUserFromSocket();
      if (!user) return;

      const isAdmin = await verifyConferenceAdmin({
        userId: user._id,
        conference
      });

      if (!isAdmin) {
        return socket.emit("conference:error", {
          message: "Only admin can toggle speaker mode",
        });
      }

      conference.speakerMode.enabled = enabled;
      
      if (!enabled) {
        conference.speakerMode.activeSpeaker = null;
       if (conference.speakerMode?.speakerTimeouts) {
  conference.speakerMode.speakerTimeouts.forEach(clearTimeout);
  conference.speakerMode.speakerTimeouts.clear();
}
conference.speakerMode.activeSpeaker = null;

      }

      io.to(getConferenceRoom(conferenceId)).emit("conference:speaker-mode-toggled", {
        enabled,
        bySocketId: socket.id,
      });

      io.to(getConferenceRoom(conferenceId)).emit("conference:active-speaker", {
        socketId: conference.speakerMode.activeSpeaker,
      });

      console.log(`🔊 Speaker mode ${enabled ? 'enabled' : 'disabled'}`);
    } catch (err) {
      console.error("conference:toggle-speaker-mode error:", err);
      socket.emit("conference:error", { message: "Server error" });
    }
  });

  socket.on("conference:speaking", ({ conferenceId, speaking }) => {
    const conference = getConference(conferenceId);
    if (!conference) return;

if (!conference.speakerMode.enabled) {
  if (conference.speakerMode.activeSpeaker) {
    conference.speakerMode.activeSpeaker = null;
    io.to(getConferenceRoom(conferenceId)).emit(
      "conference:active-speaker",
      { socketId: null }
    );
  }
  return;
}


    const participant = conference.participants.get(socket.id);
    if (!participant) return;

    // Only current speaker can send speaking updates
    if (
      conference.speakerMode.activeSpeaker &&
      conference.speakerMode.activeSpeaker !== socket.id
    ) {
      console.log(`🚫 Blocked speaker hijack from ${socket.id}`);
      return;
    }

    if (speaking) {
      conference.speakerMode.activeSpeaker = socket.id;
      setSpeakerTimeout(conference, socket.id);

      io.to(getConferenceRoom(conferenceId)).emit(
        "conference:active-speaker",
        { socketId: socket.id }
      );
    } else {
      if (conference.speakerMode.activeSpeaker === socket.id) {
        setSpeakerTimeout(conference, socket.id);
      }
    }
  });

  socket.on("conference:set-speaker", async ({ conferenceId, targetSocketId }) => {
    try {
      const conference = getConference(conferenceId);
      if (!conference) return;

      const user = getUserFromSocket();
      if (!user) return;

      const isAdmin = await verifyConferenceAdmin({
        userId: user._id,
        conference
      });

      if (!isAdmin) {
        return socket.emit("conference:error", {
          message: "Only admin can set speaker",
        });
      }

      const targetParticipant = conference.participants.get(targetSocketId);
      if (!targetParticipant) {
        return socket.emit("conference:error", {
          message: "Target participant not found",
        });
      }

      conference.speakerMode.activeSpeaker = targetSocketId;
      setSpeakerTimeout(conference, targetSocketId);
      
      io.to(getConferenceRoom(conferenceId)).emit("conference:speaker-assigned", {
        socketId: targetSocketId,
        bySocketId: socket.id,
      });

      io.to(getConferenceRoom(conferenceId)).emit("conference:active-speaker", {
        socketId: targetSocketId,
      });

      console.log(`🎤 Speaker assigned to ${targetParticipant.name}`);
    } catch (err) {
      console.error("conference:set-speaker error:", err);
      socket.emit("conference:error", { message: "Server error" });
    }
  });

  socket.on("conference:clear-speaker", async ({ conferenceId }) => {
    try {
      const conference = getConference(conferenceId);
      if (!conference) return;

      const user = getUserFromSocket();
      if (!user) return;

      const isAdmin = await verifyConferenceAdmin({
        userId: user._id,
        conference
      });

      if (!isAdmin) {
        return socket.emit("conference:error", {
          message: "Only admin can clear speaker",
        });
      }

      const previousSpeaker = conference.speakerMode.activeSpeaker;
      conference.speakerMode.activeSpeaker = null;
      
      if (previousSpeaker) {
        clearSpeakerTimeout(conference, previousSpeaker);
      }

      io.to(getConferenceRoom(conferenceId)).emit("conference:active-speaker", {
        socketId: null,
      });

      console.log(`🔇 Speaker cleared`);
    } catch (err) {
      console.error("conference:clear-speaker error:", err);
      socket.emit("conference:error", { message: "Server error" });
    }
  });

  /* ---------------------------------------------------
     ADMIN ACTIONS
  --------------------------------------------------- */
  socket.on("conference:admin-action", async ({ conferenceId, action, targetSocketId }) => {
    try {
      const conference = getConference(conferenceId);
      if (!conference) return;

      const adminUser = getUserFromSocket();
      if (!adminUser) return;

      const isAdmin = await verifyConferenceAdmin({
        userId: adminUser._id,
        conference
      });

      if (!isAdmin) {
        return socket.emit("conference:error", {
          message: "Only admin can perform this action",
        });
      }

      const targetParticipant = conference.participants.get(targetSocketId);
      if (!targetParticipant) {
        return socket.emit("conference:error", {
          message: "Target participant not found",
        });
      }

      switch (action) {
        case "mute":
          socket.to(targetSocketId).emit("conference:force-mute");
          targetParticipant.micOn = false;
          io.to(getConferenceRoom(conferenceId)).emit("conference:media-update", {
            socketId: targetSocketId,
            micOn: false,
            camOn: targetParticipant.camOn,
          });
          break;
        
        case "camera-off":
          socket.to(targetSocketId).emit("conference:force-camera-off");
          targetParticipant.camOn = false;
          io.to(getConferenceRoom(conferenceId)).emit("conference:media-update", {
            socketId: targetSocketId,
            micOn: targetParticipant.micOn,
            camOn: false,
          });
          break;
        
        case "lower-hand":
          conference.raisedHands.delete(targetSocketId);
          io.to(getConferenceRoom(conferenceId)).emit("conference:hands-updated", {
            raisedHands: Array.from(conference.raisedHands),
          });
          break;
        
        case "remove-from-conference": {
          const targetSocket = io.sockets.sockets.get(targetSocketId);
          if (targetSocket) {
            handleParticipantExit({
              socket: targetSocket,
              reason: "admin-remove",
            });
            io.to(targetSocketId).emit("conference:removed-by-admin");
          }
          break;
        }
        
        case "clear-hands":
          conference.raisedHands.clear();
          io.to(getConferenceRoom(conferenceId)).emit("conference:hands-updated", {
            raisedHands: [],
          });
          break;
        
        default:
          console.warn(`Unknown admin action: ${action}`);
      }

      console.log(`🛠️ Admin action: ${action} on ${targetSocketId}`);
    } catch (err) {
      console.error("conference:admin-action error:", err);
      socket.emit("conference:error", { message: "Server error" });
    }
  });

  /* ---------------------------------------------------
   🧱 PHASE 4.3 — HOST END CONFERENCE (Zoom-style)
   ✅ FIXED: Cancel emptyTimeout when host ends conference
  --------------------------------------------------- */
  socket.on("conference:end", async ({ conferenceId }) => {
    try {
      const conference = getConference(conferenceId);
      if (!conference) return;

      const user = getUserFromSocket();
      if (!user) return;

      // 🔐 Only host/admin can end
      const isAdmin = await verifyConferenceAdmin({
        userId: user._id,
        conference,
      });

      if (!isAdmin) {
        return socket.emit("conference:error", {
          message: "Only host can end the conference",
        });
      }

      console.log(`🛑 Host ended conference ${conferenceId}`);

      // ✅ FIXED: Cancel pending empty timeout if exists
      if (conference.emptyTimeout) {
        clearTimeout(conference.emptyTimeout);
        conference.emptyTimeout = null;
        console.log("🛑 Cancelled pending auto-end (host ended)");
      }

      // 🚨 AUTHORITATIVE END (no leave logic)
      endConferenceAuthoritative(conference, "host-ended");

    } catch (err) {
      console.error("conference:end error:", err);
      socket.emit("conference:error", { message: "Server error" });
    }
  });

  /* ---------------------------------------------------
     DISCONNECT HANDLER
  --------------------------------------------------- */
  socket.on("disconnect", () => {
    console.log(`❌ Socket ${socket.id} disconnected`);
    handleParticipantExit({ socket, reason: "disconnect" });
  });
};
