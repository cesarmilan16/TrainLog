const { db } = require('../config/database/db');

function getManagerOwnedUser(userId, managerId) {
  return db
    .prepare('SELECT id FROM users WHERE id = ? AND manager_id = ? AND role = ?')
    .get(userId, managerId, 'USER');
}

function insertMesocycle({ name, goal, startDate, endDate, status, userId }) {
  return db
    .prepare(`
      INSERT INTO mesocycles (name, goal, start_date, end_date, status, user_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    .run(name, goal, startDate, endDate, status, userId);
}

function listMesocyclesByUser(userId) {
  return db
    .prepare(`
      SELECT id, name, goal, start_date, end_date, status, user_id
      FROM mesocycles
      WHERE user_id = ?
      ORDER BY start_date DESC, id DESC
    `)
    .all(userId);
}

function getMesocycleByIdForManager(mesocycleId, managerId) {
  return db
    .prepare(`
      SELECT m.id, m.user_id
      FROM mesocycles m
      JOIN users u ON u.id = m.user_id
      WHERE m.id = ? AND u.manager_id = ? AND u.role = 'USER'
    `)
    .get(mesocycleId, managerId);
}

function getMesocycleByIdForUser(mesocycleId, userId) {
  return db
    .prepare('SELECT id, user_id FROM mesocycles WHERE id = ? AND user_id = ?')
    .get(mesocycleId, userId);
}

function updateMesocycle({ mesocycleId, name, goal, startDate, endDate, status }) {
  return db
    .prepare(`
      UPDATE mesocycles
      SET name = ?, goal = ?, start_date = ?, end_date = ?, status = ?
      WHERE id = ?
    `)
    .run(name, goal, startDate, endDate, status, mesocycleId);
}

function clearWorkoutsMesocycle(mesocycleId) {
  return db
    .prepare('UPDATE workouts SET mesocycle_id = NULL WHERE mesocycle_id = ?')
    .run(mesocycleId);
}

function deleteMesocycle(mesocycleId) {
  return db.prepare('DELETE FROM mesocycles WHERE id = ?').run(mesocycleId);
}

function listWorkoutsByMesocycle(userId, mesocycleId) {
  return db
    .prepare(`
      SELECT id, name, mesocycle_id
      FROM workouts
      WHERE user_id = ? AND archived_at IS NULL AND mesocycle_id = ?
      ORDER BY id DESC
    `)
    .all(userId, mesocycleId);
}

function listManagerUserWorkoutsByMesocycle(userId, managerId, mesocycleId) {
  return db
    .prepare(`
      SELECT w.id, w.name, w.mesocycle_id
      FROM workouts w
      JOIN users u ON u.id = w.user_id
      WHERE w.user_id = ?
        AND w.archived_at IS NULL
        AND w.mesocycle_id = ?
        AND u.manager_id = ?
        AND u.role = 'USER'
      ORDER BY w.id DESC
    `)
    .all(userId, mesocycleId, managerId);
}

module.exports = {
  getManagerOwnedUser,
  insertMesocycle,
  listMesocyclesByUser,
  getMesocycleByIdForManager,
  getMesocycleByIdForUser,
  updateMesocycle,
  clearWorkoutsMesocycle,
  deleteMesocycle,
  listWorkoutsByMesocycle,
  listManagerUserWorkoutsByMesocycle
};
