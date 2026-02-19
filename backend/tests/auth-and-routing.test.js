const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { after, before, test } = require('node:test');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.DB_PATH = path.join(os.tmpdir(), `trainlog-test-${process.pid}.db`);

const app = require('../src/app');
const jwt = require('jsonwebtoken');
const auth = require('../src/middleware/auth');
const { initSchema, seedExampleData, closeDb } = require('../src/config/database/db');
const { login } = require('../src/repositories/users.repository');

function createMockRes() {
  return {
    statusCode: 200,
    body: null,
    headersSent: false,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      this.headersSent = true;
      return this;
    }
  };
}

before(async () => {
  initSchema();
  seedExampleData({ reset: true });
});

after(async () => {
  closeDb();
  fs.rmSync(process.env.DB_PATH, { force: true });
});

test('login válido devuelve token', async () => {
  const result = login({ email: 'demo@trainlog.com', password: '1234' });
  assert.equal(typeof result.token, 'string');
  assert.ok(result.token.length > 10);
});

test('login inválido devuelve 401 con mensaje', async () => {
  const result = login({ email: 'demo@trainlog.com', password: 'incorrecta' });
  assert.equal(result.status, 401);
  assert.equal(result.error, 'Credenciales incorrectas');
});

test('ruta protegida sin token devuelve 401', async () => {
  const req = { headers: {} };
  const res = createMockRes();
  let nextCalled = false;

  auth(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.message, 'Token requerido');
});

test('auth con token válido llama next', async () => {
  const token = jwt.sign(
    { id: 1, email: 'demo@trainlog.com', role: 'MANAGER' },
    process.env.JWT_SECRET
  );
  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = createMockRes();
  let nextCalled = false;

  auth(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(req.user.email, 'demo@trainlog.com');
});

test('middleware 404 devuelve mensaje esperado', async () => {
  const notFoundLayer = app.router.stack.find((layer) => !layer.route && layer.handle.length === 2);
  assert.ok(notFoundLayer);

  const res = createMockRes();
  notFoundLayer.handle({}, res);

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.message, 'Ruta no encontrada');
});
