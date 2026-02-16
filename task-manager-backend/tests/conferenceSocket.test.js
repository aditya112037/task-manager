const test = require('node:test');
const assert = require('node:assert/strict');

const conferenceStore = require('../utils/conferenceStore');

function loadConferenceSocketWithTeamMock(teamFindById) {
  const socketHandlerPath = require.resolve('../socket/conference');
  const teamModelPath = require.resolve('../models/team');

  delete require.cache[socketHandlerPath];
  require.cache[teamModelPath] = {
    id: teamModelPath,
    filename: teamModelPath,
    loaded: true,
    exports: { findById: teamFindById },
  };

  return require('../socket/conference');
}

function createFakeIo() {
  const roomEvents = [];

  return {
    roomEvents,
    to(roomName) {
      return {
        emit(event, payload) {
          roomEvents.push({ roomName, event, payload });
        },
      };
    },
  };
}

function createFakeSocket(user) {
  const handlers = new Map();
  const emitted = [];

  return {
    id: 'socket-1',
    user,
    conferenceId: null,
    emitted,
    on(event, handler) {
      handlers.set(event, handler);
    },
    async trigger(event, payload) {
      const handler = handlers.get(event);
      assert.ok(handler, `Expected handler for ${event}`);
      await handler(payload);
    },
    emit(event, payload) {
      emitted.push({ event, payload });
    },
    join() {},
    leave() {},
    to() {
      return { emit() {} };
    },
  };
}

test('conference:create returns conference:error for non-member and socket remains stable', async () => {
  conferenceStore.conferences.clear();

  const registerConferenceSocket = loadConferenceSocketWithTeamMock(async () => ({
    _id: 'team-1',
    members: [
      { user: 'member-2', role: 'admin' },
    ],
  }));

  const io = createFakeIo();
  const socket = createFakeSocket({ _id: 'member-1', name: 'Non Member' });

  registerConferenceSocket(io, socket);

  await socket.trigger('conference:create', { teamId: 'team-1' });

  assert.deepEqual(socket.emitted[0], {
    event: 'conference:error',
    payload: { message: 'Not authorized to create conference' },
  });
  assert.equal(conferenceStore.getConferenceByTeamId('team-1'), null);

  await socket.trigger('conference:check', { teamId: 'team-1' });

  assert.deepEqual(socket.emitted[1], {
    event: 'conference:state',
    payload: { active: false },
  });

  conferenceStore.conferences.clear();
});
