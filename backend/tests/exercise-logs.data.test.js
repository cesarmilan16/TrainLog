const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { after, before, test } = require('node:test');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.DB_PATH = path.join(os.tmpdir(), `trainlog-logs-test-${process.pid}.db`);

const { db, initSchema, seedExampleData, closeDb } = require('../src/config/database/db');
const { addLog, getLog, getLastLog } = require('../src/services/exerciseLogs.service');

let demoUserId;
let otherUserId;
let demoExerciseId;

before(() => {
  initSchema();
  seedExampleData({ reset: true });

  demoUserId = db
    .prepare("SELECT id FROM users WHERE email = 'cliente@trainlog.com'")
    .get().id;

  otherUserId = db
    .prepare("SELECT id FROM users WHERE email = 'alegria@trainlog.com'")
    .get().id;

  demoExerciseId = db
    .prepare(`
      SELECT we.id
      FROM workout_exercises we
      JOIN workouts w ON we.workout_id = w.id
      WHERE w.user_id = ?
      ORDER BY we.id ASC
      LIMIT 1
    `)
    .get(demoUserId).id;
});

after(() => {
  closeDb();
  fs.rmSync(process.env.DB_PATH, { force: true });
});

test('addLog crea log cuando datos y ownership son válidos', () => {
  const result = addLog({ exerciseId: demoExerciseId, weight: 77, reps: 9 }, demoUserId);

  assert.equal(typeof result.id, 'number');
  assert.equal(result.message, 'Log creado');

  const inserted = db
    .prepare('SELECT weight, reps, user_id, exercise_id FROM exercise_logs WHERE id = ?')
    .get(result.id);

  assert.deepEqual(inserted, {
    weight: 77,
    reps: 9,
    user_id: demoUserId,
    exercise_id: demoExerciseId
  });
});

test('addLog devuelve 400 con payload inválido', () => {
  const result = addLog({ exerciseId: 'x', weight: 0, reps: -1 }, demoUserId);

  assert.equal(result.status, 400);
  assert.equal(result.error, 'Peso, repeticiones y exerciseId deben ser números válidos');
});

test('addLog permite guardar 0kg', () => {
  const result = addLog({ exerciseId: demoExerciseId, weight: 0, reps: 12 }, demoUserId);

  assert.equal(typeof result.id, 'number');

  const inserted = db
    .prepare('SELECT weight, reps FROM exercise_logs WHERE id = ?')
    .get(result.id);

  assert.deepEqual(inserted, {
    weight: 0,
    reps: 12
  });
});

test('addLog devuelve 403 si ejercicio no pertenece al usuario', () => {
  const result = addLog({ exerciseId: demoExerciseId, weight: 70, reps: 8 }, otherUserId);

  assert.equal(result.status, 403);
  assert.equal(result.error, 'Este ejercicio no pertenece al usuario');
});

test('getLog devuelve 400 con exerciseId inválido', () => {
  const result = getLog('no-num', demoUserId);

  assert.equal(result.status, 400);
  assert.equal(result.error, 'exerciseId inválido');
});

test('getLog devuelve logs solo del usuario', () => {
  addLog({ exerciseId: demoExerciseId, weight: 81, reps: 6 }, demoUserId);
  addLog({ exerciseId: demoExerciseId, weight: 82, reps: 5 }, demoUserId);

  const result = getLog(demoExerciseId, demoUserId);

  assert.ok(Array.isArray(result.data));
  assert.ok(result.data.length >= 2);
  assert.ok(result.data.some((log) => log.weight === 81 && log.reps === 6));
  assert.ok(result.data.some((log) => log.weight === 82 && log.reps === 5));
});

test('getLastLog devuelve 403 si no hay ownership', () => {
  const result = getLastLog(demoExerciseId, otherUserId);

  assert.equal(result.status, 403);
  assert.equal(result.error, 'Este ejercicio no pertenece al usuario');
});

test('getLastLog devuelve null si no hay logs en ese ejercicio', () => {
  const workoutId = db
    .prepare('SELECT id FROM workouts WHERE user_id = ? ORDER BY id DESC LIMIT 1')
    .get(demoUserId).id;

  const exerciseIdWithoutLogs = db
    .prepare(`
      INSERT INTO workout_exercises (name, sets, reps, rir, rm_percent, order_index, workout_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    .run('Test sin logs', 3, 10, null, null, 999, workoutId).lastInsertRowid;

  const result = getLastLog(exerciseIdWithoutLogs, demoUserId);

  assert.deepEqual(result, { data: null });
});

test('getLastLog devuelve el último log insertado para ese ejercicio', () => {
  const first = addLog({ exerciseId: demoExerciseId, weight: 84, reps: 4 }, demoUserId);
  const second = addLog({ exerciseId: demoExerciseId, weight: 85, reps: 3 }, demoUserId);

  db.prepare('UPDATE exercise_logs SET date = ? WHERE id = ?').run('2099-01-01 10:00:00', first.id);
  db.prepare('UPDATE exercise_logs SET date = ? WHERE id = ?').run('2099-01-01 10:10:00', second.id);

  const result = getLastLog(demoExerciseId, demoUserId);

  assert.equal(result.data.id, second.id);
  assert.equal(result.data.weight, 85);
  assert.equal(result.data.reps, 3);
  assert.ok(result.data.id > first.id);
});
