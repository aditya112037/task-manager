// socket/conference.js

const Team = require("../models/team");
const verifyConferenceAdmin = require("./verifyConferenceAdmin");

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
      }),
      speakerMode: {
        enabled: false,
        activeSpeaker: null, // socketId of active speaker
        speakerTimeout: null, // timeout to clear speaker
        speakerTimeouts: Map() // per-user timeouts
      },
      raisedHands: Set(), // socketIds of users with raised hands
      adminActions: Map() // Track admin actions
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

  // Get participant from conference
  const getParticipant = (conferenceId, socketId) => {
    const conference = conferences.get(conferenceId);
    if (!conference) return null;
    return conference.participants.get(socketId);
  };

  // Check if user is admin in conference
  const isConferenceAdmin = (conferenceId, socketId) => {
    const participant = getParticipant(conferenceId, socketId);
    return participant && ["admin", "manager"].includes(participant.role);
  };

  // Clear speaker timeout for a user
  const clearSpeakerTimeout = (conference, socketId) => {
    if (!conference.speakerMode) return;
    
    if (conference.speakerMode.speakerTimeouts.has(socketId)) {
      clearTimeout(conference.speakerMode.speakerTimeouts.get(socketId));
      conference.speakerMode.speakerTimeouts.delete(socketId);
    }
  };

  // Set new speaker timeout (auto-clear after silence)
  const setSpeakerTimeout = (conference, socketId) => {
    clearSpeakerTimeout(conference, socketId);
    
    const timeout = setTimeout(() => {
      if (conference.speakerMode.activeSpeaker === socketId) {
        conference.speakerMode.activeSpeaker = null;
        io.to(getConferenceRoom(conference.conferenceId)).emit(
          "conference:active-speaker",
          { socketId: null }
        );
      }
      conference.speakerMode.speakerTimeouts.delete(socketId);
    }, 2000); // 2 seconds of silence
    
    conference.speakerMode.speakerTimeouts.set(socketId, timeout);
  };

  /* ---------------------------------------------------
     SERVER-SIDE MIC ENFORCEMENT (STEP 2)
  --------------------------------------------------- */
  // Periodic enforcement to prevent rogue clients
  const enforceSpeakerMode = () => {
    conferences.forEach((conference, conferenceId) => {
      if (!conference.speakerMode.enabled) return;

      conference.participants.forEach((_, socketId) => {
        if (socketId !== conference.speakerMode.activeSpeaker) {
          io.to(socketId).emit("conference:force-mute");
        }
      });
    });
  };

  // Run enforcement every 3 seconds
  setInterval(enforceSpeakerMode, 3000);

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
        speakerMode: {
          enabled: false,
          activeSpeaker: null,
          speakerTimeout: null,
          speakerTimeouts: new Map(),
        },
        raisedHands: new Set(),
        adminActions: new Map(),
      });

      socket.join(getConferenceRoom(conferenceId));

      conferences
        .get(conferenceId)
        .participants.set(socket.id, {
          userId: user._id,
          role: member.role,
          name: user.name,
          socketId: socket.id,
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
        socketId: socket.id,
      });

      // Emit participant list to all
      const participants = Array.from(conference.participants.values());
      io.to(getConferenceRoom(conferenceId)).emit("conference:participants", {
        users: participants,
      });

      socket.to(getConferenceRoom(conferenceId)).emit(
        "conference:user-joined",
        {
          socketId: socket.id,
          userId: user._id,
          userName: user.name,
        }
      );

      // ✅ STEP 3 — STATE SYNC ON RECONNECT
      const conferenceState = {
        conferenceId,
        participants: participants,
        raisedHands: Array.from(conference.raisedHands),
        speakerMode: {
          enabled: conference.speakerMode.enabled,
          activeSpeaker: conference.speakerMode.activeSpeaker,
        },
      };

      socket.emit("conference:joined", conferenceState);
      socket.emit("conference:state", conferenceState);

      // Send current active speaker state
      if (conference.speakerMode.activeSpeaker) {
        socket.emit("conference:active-speaker", {
          socketId: conference.speakerMode.activeSpeaker,
        });
      }
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

    // Remove from participants
    conference.participants.delete(socket.id);
    
    // Remove from raised hands
    conference.raisedHands.delete(socket.id);
    
    // Clear speaker if this user was speaking
    if (conference.speakerMode.activeSpeaker === socket.id) {
      conference.speakerMode.activeSpeaker = null;
      clearSpeakerTimeout(conference, socket.id);
      
      io.to(getConferenceRoom(conferenceId)).emit("conference:active-speaker", {
        socketId: null,
      });
    }

    socket.leave(getConferenceRoom(conferenceId));

    // Update participant list
    const participants = Array.from(conference.participants.values());
    io.to(getConferenceRoom(conferenceId)).emit("conference:participants", {
      users: participants,
    });

    socket.to(getConferenceRoom(conferenceId)).emit(
      "conference:user-left",
      { socketId: socket.id }
    );

    // Update raised hands
    io.to(getConferenceRoom(conferenceId)).emit("conference:hands-updated", {
      raisedHands: Array.from(conference.raisedHands),
    });

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
  });

  socket.on("conference:lower-hand", ({ conferenceId }) => {
    const conference = conferences.get(conferenceId);
    if (!conference) return;

    conference.raisedHands.delete(socket.id);

    io.to(getConferenceRoom(conferenceId)).emit("conference:hands-updated", {
      raisedHands: Array.from(conference.raisedHands),
    });
  });

  /* ---------------------------------------------------
     SPEAKER MODE FUNCTIONALITY (PHASE 4)
  --------------------------------------------------- */

  // Toggle speaker mode (admin only)
  socket.on("conference:toggle-speaker-mode", async ({ conferenceId, enabled }) => {
    try {
      const conference = conferences.get(conferenceId);
      if (!conference) return;

      const user = getUserFromSocket();
      if (!user) return;

      // ✅ STEP 2 — USE DB VERIFICATION FOR CRITICAL ACTIONS
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
        // Clear active speaker when disabling
        conference.speakerMode.activeSpeaker = null;
        // Clear all timeouts
        conference.speakerMode.speakerTimeouts.forEach(timeout => clearTimeout(timeout));
        conference.speakerMode.speakerTimeouts.clear();
      }

      io.to(getConferenceRoom(conferenceId)).emit("conference:speaker-mode-toggled", {
        enabled,
        bySocketId: socket.id,
      });

      // Also emit active speaker update
      io.to(getConferenceRoom(conferenceId)).emit("conference:active-speaker", {
        socketId: conference.speakerMode.activeSpeaker,
      });
    } catch (err) {
      console.error("conference:toggle-speaker-mode error:", err);
      socket.emit("conference:error", { message: "Server error" });
    }
  });

  // ✅ STEP 1 — SPEAKING DETECTION WITH OWNERSHIP LOCK
  socket.on("conference:speaking", ({ conferenceId, speaking }) => {
    const conference = conferences.get(conferenceId);
    if (!conference || !conference.speakerMode.enabled) return;

    const participant = conference.participants.get(socket.id);
    if (!participant) return;

    // 🔐 HARD RULE: Only current speaker can send speaking updates
    if (
      conference.speakerMode.activeSpeaker &&
      conference.speakerMode.activeSpeaker !== socket.id
    ) {
      console.log(`Blocked speaker hijack attempt from ${socket.id}, active speaker is ${conference.speakerMode.activeSpeaker}`);
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
      // Only clear if this user is the current active speaker
      if (conference.speakerMode.activeSpeaker === socket.id) {
        setSpeakerTimeout(conference, socket.id);
      }
    }
  });

  // Admin manually sets speaker
  socket.on("conference:set-speaker", async ({ conferenceId, targetSocketId }) => {
    try {
      const conference = conferences.get(conferenceId);
      if (!conference) return;

      const user = getUserFromSocket();
      if (!user) return;

      // ✅ STEP 2 — USE DB VERIFICATION FOR CRITICAL ACTIONS
      const isAdmin = await verifyConferenceAdmin({
        userId: user._id,
        conference
      });

      if (!isAdmin) {
        return socket.emit("conference:error", {
          message: "Only admin can set speaker",
        });
      }

      // Check if target exists
      const targetParticipant = conference.participants.get(targetSocketId);
      if (!targetParticipant) {
        return socket.emit("conference:error", {
          message: "Target participant not found",
        });
      }

      // Set active speaker
      conference.speakerMode.activeSpeaker = targetSocketId;
      
      // Clear previous timeout and set new one
      setSpeakerTimeout(conference, targetSocketId);
      
      // Broadcast to all
      io.to(getConferenceRoom(conferenceId)).emit("conference:speaker-assigned", {
        socketId: targetSocketId,
        bySocketId: socket.id,
      });

      io.to(getConferenceRoom(conferenceId)).emit("conference:active-speaker", {
        socketId: targetSocketId,
      });
    } catch (err) {
      console.error("conference:set-speaker error:", err);
      socket.emit("conference:error", { message: "Server error" });
    }
  });

  // Clear active speaker
  socket.on("conference:clear-speaker", async ({ conferenceId }) => {
    try {
      const conference = conferences.get(conferenceId);
      if (!conference) return;

      const user = getUserFromSocket();
      if (!user) return;

      // ✅ STEP 2 — USE DB VERIFICATION FOR CRITICAL ACTIONS
      const isAdmin = await verifyConferenceAdmin({
        userId: user._id,
        conference
      });

      if (!isAdmin) {
        return socket.emit("conference:error", {
          message: "Only admin can clear speaker",
        });
      }

      // Clear active speaker
      const previousSpeaker = conference.speakerMode.activeSpeaker;
      conference.speakerMode.activeSpeaker = null;
      
      if (previousSpeaker) {
        clearSpeakerTimeout(conference, previousSpeaker);
      }

      // Broadcast to all
      io.to(getConferenceRoom(conferenceId)).emit("conference:active-speaker", {
        socketId: null,
      });
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
      const conference = conferences.get(conferenceId);
      if (!conference) return;

      // ❌ ISSUE 3 FIXED — Never trust userId from client, use socket.user
      const adminUser = getUserFromSocket();
      if (!adminUser) return;

      const adminParticipant = conference.participants.get(socket.id);
      
      // ✅ STEP 2 — USE DB VERIFICATION FOR CRITICAL ACTIONS
      const isAdmin = await verifyConferenceAdmin({
        userId: adminUser._id,
        conference
      });

      if (!isAdmin) {
        return socket.emit("conference:error", {
          message: "Only admin can perform this action",
        });
      }

      // ❌ ISSUE 4 — CONFERENCE OWNERSHIP LOCK (Optional but recommended)
      // Uncomment if you want conference creator supremacy
      /*
      if (
        adminParticipant.role === "manager" &&
        String(conference.createdBy) !== String(adminParticipant.userId)
      ) {
        return socket.emit("conference:error", {
          message: "Only conference owner can perform this action"
        });
      }
      */

      const targetParticipant = conference.participants.get(targetSocketId);
      if (!targetParticipant) {
        return socket.emit("conference:error", {
          message: "Target participant not found",
        });
      }

      // Perform action
      switch (action) {
        case "mute":
          socket.to(targetSocketId).emit("conference:force-mute");
          break;
        
        case "camera-off":
          socket.to(targetSocketId).emit("conference:force-camera-off");
          break;
        
        case "lower-hand":
          conference.raisedHands.delete(targetSocketId);
          io.to(getConferenceRoom(conferenceId)).emit("conference:hands-updated", {
            raisedHands: Array.from(conference.raisedHands),
          });
          break;
        
        case "remove-from-conference":
          // Remove target from conference
          conference.participants.delete(targetSocketId);
          conference.raisedHands.delete(targetSocketId);
          
          // If target was active speaker, clear it
          if (conference.speakerMode.activeSpeaker === targetSocketId) {
            conference.speakerMode.activeSpeaker = null;
            io.to(getConferenceRoom(conferenceId)).emit("conference:active-speaker", {
              socketId: null,
            });
          }
          
          // Notify target
          io.to(targetSocketId).emit("conference:removed-by-admin");
          
          // Update participant list
          const participants = Array.from(conference.participants.values());
          io.to(getConferenceRoom(conferenceId)).emit("conference:participants", {
            users: participants,
          });
          
          // Update raised hands
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

      // Log admin action
      conference.adminActions.set(Date.now(), {
        action,
        adminSocketId: socket.id,
        adminUserId: adminUser._id,
        targetSocketId,
        targetUserId: targetParticipant.userId,
        timestamp: new Date(),
      });

    } catch (err) {
      console.error("conference:admin-action error:", err);
      socket.emit("conference:error", { message: "Server error" });
    }
  });

  /* ---------------------------------------------------
     CLEANUP ON DISCONNECT
  --------------------------------------------------- */
  socket.on("disconnect", () => {
    for (const [conferenceId, conference] of conferences.entries()) {
      if (conference.participants.has(socket.id)) {
        // Remove from participants
        conference.participants.delete(socket.id);
        
        // Remove from raised hands
        conference.raisedHands.delete(socket.id);
        
        // Clear speaker if this user was speaking
        if (conference.speakerMode.activeSpeaker === socket.id) {
          conference.speakerMode.activeSpeaker = null;
          clearSpeakerTimeout(conference, socket.id);
          
          io.to(getConferenceRoom(conferenceId)).emit("conference:active-speaker", {
            socketId: null,
          });
        }

        // Update participant list
        const participants = Array.from(conference.participants.values());
        io.to(getConferenceRoom(conferenceId)).emit("conference:participants", {
          users: participants,
        });

        // Update raised hands
        io.to(getConferenceRoom(conferenceId)).emit("conference:hands-updated", {
          raisedHands: Array.from(conference.raisedHands),
        });

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