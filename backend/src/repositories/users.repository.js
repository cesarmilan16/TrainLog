const { db } = require('../config/database/db');

function listUsers() {
  return db.prepare('SELECT id, email, name, role, manager_id FROM users').all();
}

function insertUser({ email, hashedPassword, name, managerId }) {
  return db
    .prepare('INSERT INTO users (email, password, name, role, manager_id) VALUES (?, ?, ?, ?, ?)')
    .run(email, hashedPassword, name, 'USER', managerId);
}

function getUserAuthByEmail(email) {
  return db
    .prepare('SELECT id, email, password, role, name FROM users WHERE email = ?')
    .get(email);
}

function listClientsByManager(managerId) {
  return db.prepare('SELECT id, email FROM users WHERE manager_id = ?').all(managerId);
}

function listManagerClientRows(managerId) {
  return db
    .prepare('SELECT id, email, name FROM users WHERE manager_id = ?')
    .all(managerId);
}

function countActiveWorkoutsByUser(userId) {
  return db
    .prepare('SELECT COUNT(*) AS total FROM workouts WHERE user_id = ? AND archived_at IS NULL')
    .get(userId);
}

function getLastActivityByUser(userId) {
  return db
    .prepare('SELECT MAX(date) AS last_activity FROM exercise_logs WHERE user_id = ?')
    .get(userId);
}

function getManagerOwnedClient(userId, managerId) {
  return db
    .prepare('SELECT id FROM users WHERE id = ? AND manager_id = ? AND role = ?')
    .get(userId, managerId, 'USER');
}

function updateClientFields(userId, updates) {
  const columns = updates.map((update) => `${update.column} = ?`).join(', ');
  const values = updates.map((update) => update.value);
  return db.prepare(`UPDATE users SET ${columns} WHERE id = ?`).run(...values, userId);
}

function getUserById(userId) {
  return db
    .prepare('SELECT id, email, name, role, manager_id FROM users WHERE id = ?')
    .get(userId);
}

function deleteClientCascade(userId) {
  return db.transaction(() => {
    db.prepare('DELETE FROM exercise_logs WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM movements WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM workouts WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  })();
}

module.exports = {
  listUsers,
  insertUser,
  getUserAuthByEmail,
  listClientsByManager,
  listManagerClientRows,
  countActiveWorkoutsByUser,
  getLastActivityByUser,
  getManagerOwnedClient,
  updateClientFields,
  getUserById,
  deleteClientCascade
};
