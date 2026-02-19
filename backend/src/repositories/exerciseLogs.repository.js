const { db } = require('../config/database/db');

function getExerciseOwnedByUser(exerciseId, userId) {
  return db
    .prepare(`
      SELECT we.id, we.name, we.movement_id
      FROM workout_exercises we
      JOIN workouts w ON we.workout_id = w.id
      WHERE we.id = ? AND w.user_id = ?
    `)
    .get(exerciseId, userId);
}

function getMovementByNormalized(userId, normalizedName) {
  return db
    .prepare('SELECT id FROM movements WHERE user_id = ? AND name_normalized = ?')
    .get(userId, normalizedName);
}

function createMovement({ userId, name, normalizedName }) {
  return db
    .prepare('INSERT INTO movements (name, name_normalized, user_id) VALUES (?, ?, ?)')
    .run(name, normalizedName, userId);
}

function setExerciseMovementId(exerciseId, movementId) {
  return db.prepare('UPDATE workout_exercises SET movement_id = ? WHERE id = ?').run(movementId, exerciseId);
}

function insertLog({ weight, reps, userId, exerciseId, movementId, date }) {
  if (date) {
    return db
      .prepare(`
        INSERT INTO exercise_logs (weight, reps, date, user_id, exercise_id, movement_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .run(weight, reps, date, userId, exerciseId, movementId);
  }

  return db
    .prepare(`
      INSERT INTO exercise_logs (weight, reps, user_id, exercise_id, movement_id)
      VALUES (?, ?, ?, ?, ?)
    `)
    .run(weight, reps, userId, exerciseId, movementId);
}

function listLogsByMovementAndUser(movementId, userId) {
  return db
    .prepare(`
      SELECT id, weight, reps, date
      FROM exercise_logs
      WHERE movement_id = ? AND user_id = ?
      ORDER BY date DESC, id DESC
    `)
    .all(movementId, userId);
}

function getLastLogByMovementAndUser(movementId, userId) {
  return db
    .prepare(`
      SELECT id, weight, reps, date
      FROM exercise_logs
      WHERE movement_id = ? AND user_id = ?
      ORDER BY date DESC, id DESC
      LIMIT 1
    `)
    .get(movementId, userId);
}

function getLogOwnedByUser(logId, userId) {
  return db
    .prepare('SELECT id, weight, reps, date FROM exercise_logs WHERE id = ? AND user_id = ?')
    .get(logId, userId);
}

function updateLog({ logId, weight, reps, date }) {
  return db
    .prepare('UPDATE exercise_logs SET weight = ?, reps = ?, date = ? WHERE id = ?')
    .run(weight, reps, date, logId);
}

function deleteLog(logId) {
  return db.prepare('DELETE FROM exercise_logs WHERE id = ?').run(logId);
}

module.exports = {
  getExerciseOwnedByUser,
  getMovementByNormalized,
  createMovement,
  setExerciseMovementId,
  insertLog,
  listLogsByMovementAndUser,
  getLastLogByMovementAndUser,
  getLogOwnedByUser,
  updateLog,
  deleteLog
};
