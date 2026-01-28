// socketHandlers/registerConferenceSocket.js
const Team = require("../models/team");
const verifyConferenceAdmin = require("./verifyConferenceAdmin");
const { conferences, getConferenceByTeamId, deleteConference } = require("../utils/conferenceStore");

module.exports = function registerConferenceSocket(io, socket) {
  /* ---------------------------------------------------
     HELPERS
  --------------------------------------------------- */

  const getUserFromSocket = () => socket.user;

  const getConferenceRoom = (conferenceId) =>
    `conference_${conferenceId}`;

  const getParticipant = (conferenceId, socketId) => {
    const conference = conferences.get(conferenceId);
    if (!conference) return null;
    return conference.participants.get(socketId);
  };

  const isConferenceAdmin = (conferenceId, socketId) => {
    const participant = getParticipant(conferenceId, socketId);
    return participant && ["admin", "manager"].includes(participant.role);
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
     CONFERENCE CHECK ENDPOINT (FOR TEAMDETAILS.JSX)
     ✅ FIXED: State only, no participants
  --------------------------------------------------- */
  socket.on("conference:check", async ({ teamId }) => {
    const conference = await getActiveConference(teamId);

    if (!conference) {
      socket.emit("conference:state", { active: false });
      return;
    }

    socket.emit("conference:state", {
      active: true,
      conference: {
        conferenceId: conference.conferenceId,
        teamId: conference.teamId,
        startedAt: conference.startedAt,

        // ✅ REQUIRED FOR UI
        createdBy: {
          _id: conference.createdBy._id,
          name: conference.createdBy.name,
          role: conference.createdBy.role,
        },

        // ✅ CLEAN COUNT (no participant list here)
        participantCount: conference.participants?.length || 0,
      },
    });
  });

  /* ---------------------------------------------------
     CREATE CONFERENCE
     ✅ FIXED: Consistent payload structure
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

      if (!["admin", "manager"].includes(member.role)) {
        return socket.emit("conference:error", {
          message: "Only admin or manager can create a conference",
        });
      }

      const conferenceId = `${teamId}-${Date.now()}`;

      // Initialize conference
      conferences.set(conferenceId, {
        conferenceId,
        teamId,
        createdBy: user._id,
        createdAt: new Date(),
        participants: new Map(),
        speakerMode: {
          enabled: false,
          activeSpeaker: null,
          speakerTimeouts: new Map(),
        },
        raisedHands: new Set(),
        adminActions: new Map(),
      });

      // ✅ IDEMPOTENT JOIN: Check if already in conference before joining
      if (socket.conferenceId !== conferenceId) {
        socket.join(getConferenceRoom(conferenceId));
        socket.conferenceId = conferenceId;
      }

      // Add creator as first participant
      const conference = conferences.get(conferenceId);
      conference.participants.set(socket.id, {
        userId: user._id,
        role: member.role,
        name: user.name,
        socketId: socket.id,
        micOn: true,
        camOn: true,
      });

      // Notify team room
      io.to(`team_${teamId}`).emit("conference:started", {
        conferenceId,
        teamId,
        createdBy: user._id,
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
          createdBy: user._id,
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
     ✅ FIXED: IDEMPOTENT JOIN - Prevents duplicate joins
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

      const conference = conferences.get(conferenceId);
      if (!conference) {
        return socket.emit("conference:error", {
          message: "Conference not found",
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
    const conference = conferences.get(conferenceId);
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
     ✅ FIXED: Consistent payload structure + Clear conferenceId
  --------------------------------------------------- */
  socket.on("conference:leave", ({ conferenceId }) => {
    const conference = conferences.get(conferenceId);
    if (!conference) return;

    const participant = conference.participants.get(socket.id);
    if (!participant) return;

    console.log(`🚪 User ${participant.name} leaving conference ${conferenceId}`);

    // Remove from participants
    conference.participants.delete(socket.id);
    
    // Remove from raised hands
    conference.raisedHands.delete(socket.id);
    
    // Handle speaker mode
    if (conference.speakerMode.activeSpeaker === socket.id) {
      conference.speakerMode.activeSpeaker = null;
      clearSpeakerTimeout(conference, socket.id);
      
      io.to(getConferenceRoom(conferenceId)).emit("conference:active-speaker", {
        socketId: null,
      });
    }

    // ✅ Clear socket's conferenceId reference
    if (socket.conferenceId === conferenceId) {
      socket.conferenceId = null;
    }

    // Leave room
    socket.leave(getConferenceRoom(conferenceId));

    // ✅ FIXED: Update participant list
    const participants = Array.from(conference.participants.values());
    io.to(getConferenceRoom(conferenceId)).emit(
      "conference:participants",
      { participants }
    );

    // Notify others
    socket.to(getConferenceRoom(conferenceId)).emit(
      "conference:user-left",
      { socketId: socket.id, userId: participant.userId }
    );

    // Update raised hands
    io.to(getConferenceRoom(conferenceId)).emit("conference:hands-updated", {
      raisedHands: Array.from(conference.raisedHands),
    });

    // Auto-end if empty
    if (conference.participants.size === 0) {
      deleteConference(conferenceId);
      io.to(`team_${conference.teamId}`).emit("conference:ended", {
        conferenceId,
        teamId: conference.teamId,
      });
      console.log(`🏁 Conference ${conferenceId} ended (empty)`);
    }

    console.log(`✅ User left, ${conference.participants.size} remaining`);
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
    const conference = conferences.get(conferenceId);
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
    const conference = conferences.get(conferenceId);
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
      const conference = conferences.get(conferenceId);
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
        if (conference.speakerMode.speakerTimeouts) {
          conference.speakerMode.speakerTimeouts.forEach(timeout => clearTimeout(timeout));
          conference.speakerMode.speakerTimeouts.clear();
        }
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
    const conference = conferences.get(conferenceId);
    if (!conference || !conference.speakerMode.enabled) return;

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
      const conference = conferences.get(conferenceId);
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
      const conference = conferences.get(conferenceId);
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
     ✅ FIXED: Consistent payload structure for remove-from-conference
  --------------------------------------------------- */
  socket.on("conference:admin-action", async ({ conferenceId, action, targetSocketId }) => {
    try {
      const conference = conferences.get(conferenceId);
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
        
        case "remove-from-conference":
          conference.participants.delete(targetSocketId);
          conference.raisedHands.delete(targetSocketId);
          
          // Clear target socket's conferenceId reference
          const targetSocket = io.sockets.sockets.get(targetSocketId);
          if (targetSocket && targetSocket.conferenceId === conferenceId) {
            targetSocket.conferenceId = null;
          }
          
          if (conference.speakerMode.activeSpeaker === targetSocketId) {
            conference.speakerMode.activeSpeaker = null;
            clearSpeakerTimeout(conference, targetSocketId);

            io.to(getConferenceRoom(conferenceId)).emit("conference:active-speaker", {
              socketId: null,
            });
          }
          
          io.to(targetSocketId).emit("conference:removed-by-admin");
          
          // ✅ FIXED: Consistent participants payload
          const participants = Array.from(conference.participants.values());
          io.to(getConferenceRoom(conferenceId)).emit(
            "conference:participants",
            { participants }
          );
          
          io.to(getConferenceRoom(conferenceId)).emit("conference:hands-updated", {
            raisedHands: Array.from(conference.raisedHands),
          });
          break;
        
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
     DISCONNECT HANDLER
     ✅ FIXED: Consistent payload structure + Clear conferenceId
  --------------------------------------------------- */
  socket.on("disconnect", () => {
    console.log(`❌ Socket ${socket.id} disconnected`);

    // ✅ Clear socket's conferenceId reference
    const conferenceId = socket.conferenceId;
    if (conferenceId) {
      socket.conferenceId = null;
    }

    for (const [conferenceId, conference] of conferences.entries()) {
      if (conference.participants.has(socket.id)) {
        const participant = conference.participants.get(socket.id);
        
        console.log(`🗑️ Removing ${participant?.name} from conference ${conferenceId}`);
        
        // Remove participant
        conference.participants.delete(socket.id);
        conference.raisedHands.delete(socket.id);
        
        // Handle speaker
        if (conference.speakerMode.activeSpeaker === socket.id) {
          conference.speakerMode.activeSpeaker = null;
          clearSpeakerTimeout(conference, socket.id);
          
          io.to(getConferenceRoom(conferenceId)).emit("conference:active-speaker", {
            socketId: null,
          });
        }

        // ✅ FIXED: Update participant list
        const participants = Array.from(conference.participants.values());
        io.to(getConferenceRoom(conferenceId)).emit(
          "conference:participants",
          { participants }
        );

        io.to(getConferenceRoom(conferenceId)).emit("conference:hands-updated", {
          raisedHands: Array.from(conference.raisedHands),
        });

        io.to(getConferenceRoom(conferenceId)).emit(
          "conference:user-left",
          { socketId: socket.id }
        );

        // Auto-end if empty
        if (conference.participants.size === 0) {
          deleteConference(conferenceId);
          io.to(`team_${conference.teamId}`).emit("conference:ended", {
            conferenceId,
            teamId: conference.teamId,
          });
          console.log(`🏁 Conference ${conferenceId} auto-ended on disconnect`);
        }
        
        break; // Socket can only be in one conference at a time
      }
    }
  });
};