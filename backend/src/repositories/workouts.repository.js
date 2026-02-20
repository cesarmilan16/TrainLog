const { db } = require('../config/database/db');

function getUserManagedByManager(userId, managerId) {
  return db.prepare('SELECT id FROM users WHERE id = ? AND manager_id = ?').get(userId, managerId);
}

function insertWorkout({ name, userId, managerId }) {
  return db
    .prepare('INSERT INTO workouts (name, user_id, manager_id, mesocycle_id) VALUES (?, ?, ?, ?)')
    .run(name, userId, managerId, null);
}

function insertWorkoutWithMesocycle({ name, userId, managerId, mesocycleId }) {
  return db
    .prepare('INSERT INTO workouts (name, user_id, manager_id, mesocycle_id) VALUES (?, ?, ?, ?)')
    .run(name, userId, managerId, mesocycleId);
}

function listActiveWorkoutsByUser(userId) {
  return db
    .prepare('SELECT id, name, mesocycle_id FROM workouts WHERE user_id = ? AND archived_at IS NULL ORDER BY id DESC')
    .all(userId);
}

function listManagerWorkoutsByUser(userId, managerId) {
  return db
    .prepare(`
      SELECT
        workouts.id,
        workouts.name,
        workouts.mesocycle_id,
        users.email AS name_user,
        COUNT(workout_exercises.id) AS exercises_count
      FROM workouts
      JOIN users ON workouts.user_id = users.id
      LEFT JOIN workout_exercises ON workout_exercises.workout_id = workouts.id
      WHERE workouts.user_id = ? AND workouts.manager_id = ? AND workouts.archived_at IS NULL
        AND (workout_exercises.archived_at IS NULL OR workout_exercises.id IS NULL)
      GROUP BY workouts.id, workouts.name, workouts.mesocycle_id, users.email
      ORDER BY workouts.id DESC
    `)
    .all(userId, managerId);
}

function listDashboardWorkoutsByUser(userId, mesocycleId) {
  if (mesocycleId === undefined) {
    return db
      .prepare('SELECT id, name, mesocycle_id FROM workouts WHERE user_id = ? AND archived_at IS NULL ORDER BY id DESC')
      .all(userId);
  }

  if (mesocycleId === null) {
    return db
      .prepare('SELECT id, name, mesocycle_id FROM workouts WHERE user_id = ? AND archived_at IS NULL AND mesocycle_id IS NULL ORDER BY id DESC')
      .all(userId);
  }

  return db
    .prepare('SELECT id, name, mesocycle_id FROM workouts WHERE user_id = ? AND archived_at IS NULL AND mesocycle_id = ? ORDER BY id DESC')
    .all(userId, mesocycleId);
}

function listActiveExercisesByWorkout(workoutId) {
  return db
    .prepare(`
      SELECT id, name, sets, reps, rir, rm_percent, order_index, movement_id
      FROM workout_exercises
      WHERE workout_id = ? AND archived_at IS NULL
      ORDER BY order_index
    `)
    .all(workoutId);
}

function getLastLogByMovementAndUser(movementId, userId) {
  return db
    .prepare(`
      SELECT weight, reps, date
      FROM exercise_logs
      WHERE movement_id = ? AND user_id = ?
      ORDER BY date DESC
      LIMIT 1
    `)
    .get(movementId, userId);
}

function getActiveWorkoutOwnedByManager(workoutId, managerId) {
  return db
    .prepare('SELECT id, name, user_id, manager_id FROM workouts WHERE id = ? AND manager_id = ? AND archived_at IS NULL')
    .get(workoutId, managerId);
}

function archiveWorkoutAndExercises(workoutId) {
  return db.transaction(() => {
    db.prepare(`
      UPDATE workout_exercises
      SET archived_at = CURRENT_TIMESTAMP,
          order_index = -id
      WHERE workout_id = ? AND archived_at IS NULL
    `).run(workoutId);

    return db.prepare(`
      UPDATE workouts
      SET archived_at = CURRENT_TIMESTAMP,
          name = name || ' [archived #' || id || ']'
      WHERE id = ? AND archived_at IS NULL
    `).run(workoutId);
  })();
}

function renameWorkout(workoutId, name) {
  return db.prepare('UPDATE workouts SET name = ? WHERE id = ?').run(name, workoutId);
}

function getActiveWorkoutById(workoutId) {
  return db
    .prepare('SELECT id, name, user_id, manager_id, mesocycle_id FROM workouts WHERE id = ? AND archived_at IS NULL')
    .get(workoutId);
}

function getMesocycleByIdForUser(mesocycleId, userId) {
  return db
    .prepare('SELECT id FROM mesocycles WHERE id = ? AND user_id = ?')
    .get(mesocycleId, userId);
}

function setWorkoutMesocycle(workoutId, mesocycleId) {
  return db
    .prepare('UPDATE workouts SET mesocycle_id = ? WHERE id = ?')
    .run(mesocycleId, workoutId);
}

module.exports = {
  getUserManagedByManager,
  insertWorkout,
  insertWorkoutWithMesocycle,
  listActiveWorkoutsByUser,
  listManagerWorkoutsByUser,
  listDashboardWorkoutsByUser,
  listActiveExercisesByWorkout,
  getLastLogByMovementAndUser,
  getActiveWorkoutOwnedByManager,
  archiveWorkoutAndExercises,
  renameWorkout,
  getActiveWorkoutById,
  getMesocycleByIdForUser,
  setWorkoutMesocycle
};
