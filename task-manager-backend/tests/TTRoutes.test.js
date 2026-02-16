const test = require('node:test');
const assert = require('node:assert/strict');

function loadRouterWithMocks({ teamFindById }) {
  const routerPath = require.resolve('../routes/TTRoutes');
  const teamModelPath = require.resolve('../models/team');
  const taskModelPath = require.resolve('../models/TTask');
  const commentModelPath = require.resolve('../models/TaskComment');
  const authMiddlewarePath = require.resolve('../middleware/auth');

  delete require.cache[routerPath];

  require.cache[teamModelPath] = {
    id: teamModelPath,
    filename: teamModelPath,
    loaded: true,
    exports: { findById: teamFindById },
  };

  require.cache[taskModelPath] = {
    id: taskModelPath,
    filename: taskModelPath,
    loaded: true,
    exports: { create: async () => { throw new Error('should not be called'); } },
  };

  require.cache[commentModelPath] = {
    id: commentModelPath,
    filename: commentModelPath,
    loaded: true,
    exports: { create: async () => { throw new Error('should not be called'); } },
  };

  require.cache[authMiddlewarePath] = {
    id: authMiddlewarePath,
    filename: authMiddlewarePath,
    loaded: true,
    exports: { protect: (req, _res, next) => next() },
  };

  return require('../routes/TTRoutes');
}

function getCreateTaskHandler(router) {
  const layer = router.stack.find(
    (item) => item.route && item.route.path === '/:teamId' && item.route.methods.post,
  );

  assert.ok(layer, 'Expected POST /:teamId route to exist');
  return layer.route.stack[layer.route.stack.length - 1].handle;
}

test('POST /:teamId returns 404 when teamId is malformed', async () => {
  let findByIdCalls = 0;
  const router = loadRouterWithMocks({
    teamFindById: async () => {
      findByIdCalls += 1;
      return null;
    },
  });

  const handler = getCreateTaskHandler(router);

  const req = {
    params: { teamId: 'invalid-team-id' },
    user: { _id: 'user-123' },
    body: { title: 'Test task' },
  };

  let statusCode;
  let body;
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(payload) {
      body = payload;
      return this;
    },
  };

  await handler(req, res);

  assert.equal(statusCode, 404);
  assert.deepEqual(body, { message: 'Team not found' });
  assert.equal(findByIdCalls, 0);
});
