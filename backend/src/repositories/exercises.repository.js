const { db } = require('../config/database/db');

function getWorkoutOwnedByManager(workoutId, managerId) {
  return db
    .prepare('SELECT id, user_id FROM workouts WHERE id = ? AND manager_id = ? AND archived_at IS NULL')
    .get(workoutId, managerId);
}

function getExerciseOwnedByManager(exerciseId, managerId) {
  return db
    .prepare(`
      SELECT we.id, w.user_id
      FROM workout_exercises we
      JOIN workouts w ON we.workout_id = w.id
      WHERE we.id = ? AND w.manager_id = ? AND we.archived_at IS NULL AND w.archived_at IS NULL
    `)
    .get(exerciseId, managerId);
}

function insertExercise({ name, sets, reps, rir, rmPercent, order, workoutId, movementId }) {
  return db
    .prepare(`
      INSERT INTO workout_exercises
      (name, sets, reps, rir, rm_percent, order_index, workout_id, movement_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(name, sets, reps, rir, rmPercent, order, workoutId, movementId);
}

function listExercisesByWorkout(workoutId) {
  return db
    .prepare('SELECT * FROM workout_exercises WHERE workout_id = ? AND archived_at IS NULL ORDER BY order_index')
    .all(workoutId);
}

function archiveExercise(exerciseId) {
  return db.prepare(`
    UPDATE workout_exercises
    SET archived_at = CURRENT_TIMESTAMP,
        order_index = -id
    WHERE id = ? AND archived_at IS NULL
  `).run(exerciseId);
}

function updateExerciseFields(exerciseId, fields) {
  const columns = fields.map((field) => `${field.column} = ?`).join(', ');
  const values = fields.map((field) => field.value);
  return db.prepare(`UPDATE workout_exercises SET ${columns} WHERE id = ?`).run(...values, exerciseId);
}

function getExerciseById(exerciseId) {
  return db.prepare('SELECT * FROM workout_exercises WHERE id = ? AND archived_at IS NULL').get(exerciseId);
}

function getManagerOwnedUser(userId, managerId) {
  return db
    .prepare('SELECT id FROM users WHERE id = ? AND manager_id = ? AND role = ?')
    .get(userId, managerId, 'USER');
}

function getMovementByNormalized(userId, normalizedName) {
  return db
    .prepare('SELECT id FROM movements WHERE user_id = ? AND name_normalized = ?')
    .get(userId, normalizedName);
}

function getMovementByIdForUser(movementId, userId) {
  return db
    .prepare('SELECT id FROM movements WHERE id = ? AND user_id = ?')
    .get(movementId, userId);
}

function createMovement({ userId, name, normalizedName }) {
  return db
    .prepare('INSERT INTO movements (name, name_normalized, user_id) VALUES (?, ?, ?)')
    .run(name, normalizedName, userId);
}

function listMovementSuggestions(userId, normalizedQuery = '') {
  if (!normalizedQuery) {
    return db
      .prepare('SELECT id, name FROM movements WHERE user_id = ? ORDER BY name ASC LIMIT 15')
      .all(userId);
  }

  return db
    .prepare(`
      SELECT id, name
      FROM movements
      WHERE user_id = ? AND name_normalized LIKE ?
      ORDER BY name ASC
      LIMIT 15
    `)
    .all(userId, `%${normalizedQuery}%`);
}

module.exports = {
  getWorkoutOwnedByManager,
  getExerciseOwnedByManager,
  insertExercise,
  listExercisesByWorkout,
  archiveExercise,
  updateExerciseFields,
  getExerciseById,
  getManagerOwnedUser,
  getMovementByNormalized,
  getMovementByIdForUser,
  createMovement,
  listMovementSuggestions
};
