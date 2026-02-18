const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');

const { DB_PATH } = require('./db-path');

const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'USER',
      manager_id INTEGER,
      FOREIGN KEY (manager_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS workouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      manager_id INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (manager_id) REFERENCES users(id),
      UNIQUE(user_id, name)
    );

    CREATE TABLE IF NOT EXISTS workout_exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      sets INTEGER NOT NULL,
      reps INTEGER NOT NULL,
      rir INTEGER,
      rm_percent INTEGER,
      order_index INTEGER NOT NULL,
      workout_id INTEGER NOT NULL,
      FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE,
      UNIQUE (workout_id, order_index)
    );

    CREATE TABLE IF NOT EXISTS exercise_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      weight INTEGER NOT NULL,
      reps INTEGER NOT NULL,
      date DATETIME DEFAULT CURRENT_TIMESTAMP,
      user_id INTEGER NOT NULL,
      exercise_id INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (exercise_id) REFERENCES workout_exercises(id) ON DELETE CASCADE
    );
  `);

  // Compatibilidad con DBs creadas antes de añadir RIR y %RM.
  const exerciseColumns = db.prepare('PRAGMA table_info(workout_exercises)').all();
  const hasRir = exerciseColumns.some((column) => column.name === 'rir');
  const hasRmPercent = exerciseColumns.some((column) => column.name === 'rm_percent');

  if (!hasRir) {
    db.exec('ALTER TABLE workout_exercises ADD COLUMN rir INTEGER');
  }

  if (!hasRmPercent) {
    db.exec('ALTER TABLE workout_exercises ADD COLUMN rm_percent INTEGER');
  }
}

function seedExampleData({ reset = false } = {}) {
  const usersCount = db.prepare('SELECT COUNT(*) AS total FROM users').get().total;

  if (!reset && usersCount > 0) {
    return;
  }

  const seedTx = db.transaction(() => {
    if (reset) {
      db.exec(`
        DELETE FROM exercise_logs;
        DELETE FROM workout_exercises;
        DELETE FROM workouts;
        DELETE FROM users;
        DELETE FROM sqlite_sequence;
      `);
    }

    const managerPassword = bcrypt.hashSync('1234', 10);
    const userPassword = bcrypt.hashSync('1234', 10);

    const managerResult = db
      .prepare('INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)')
      .run('demo@trainlog.com', managerPassword, 'Demo Manager', 'MANAGER');

    const managerId = managerResult.lastInsertRowid;

    const userResult = db
      .prepare('INSERT INTO users (email, password, name, role, manager_id) VALUES (?, ?, ?, ?, ?)')
      .run('cliente@trainlog.com', userPassword, 'Cliente Demo', 'USER', managerId);

    const userId = userResult.lastInsertRowid;

    const cesarResult = db
      .prepare('INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)')
      .run('cesar@trainlog.com', managerPassword, 'Cesar', 'MANAGER');

    const cesarId = cesarResult.lastInsertRowid;

    const alegriaId = db
      .prepare('INSERT INTO users (email, password, name, role, manager_id) VALUES (?, ?, ?, ?, ?)')
      .run('alegria@trainlog.com', userPassword, 'Alegría', 'USER', cesarId).lastInsertRowid;
    const albaId = db
      .prepare('INSERT INTO users (email, password, name, role, manager_id) VALUES (?, ?, ?, ?, ?)')
      .run('alba@trainlog.com', userPassword, 'Alba', 'USER', cesarId).lastInsertRowid;
    const joseId = db
      .prepare('INSERT INTO users (email, password, name, role, manager_id) VALUES (?, ?, ?, ?, ?)')
      .run('jose@trainlog.com', userPassword, 'Jose', 'USER', cesarId).lastInsertRowid;

    const createWorkout = db.prepare('INSERT INTO workouts (name, user_id, manager_id) VALUES (?, ?, ?)');
    const createExercise = db.prepare(
      `INSERT INTO workout_exercises
      (name, sets, reps, rir, rm_percent, order_index, workout_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    const createLog = db.prepare(
      'INSERT INTO exercise_logs (weight, reps, user_id, exercise_id) VALUES (?, ?, ?, ?)'
    );

    const fullBodyA = createWorkout.run('Full Body A', userId, managerId).lastInsertRowid;
    const lowerBody = createWorkout.run('Lower Body', userId, managerId).lastInsertRowid;
    const upperPush = createWorkout.run('Upper Push', userId, managerId).lastInsertRowid;

    const squatId = createExercise.run('Sentadilla', 4, 6, 2, 82, 1, fullBodyA).lastInsertRowid;
    const benchId = createExercise.run('Press Banca', 4, 8, 1, 75, 2, fullBodyA).lastInsertRowid;
    const rowId = createExercise.run('Remo con barra', 3, 10, 2, null, 3, fullBodyA).lastInsertRowid;

    const rdlId = createExercise.run('Peso muerto rumano', 4, 8, 2, 78, 1, lowerBody).lastInsertRowid;
    createExercise.run('Prensa', 4, 10, 1, 72, 2, lowerBody);
    createExercise.run('Curl femoral', 3, 12, 1, null, 3, lowerBody);

    const inclineId = createExercise.run('Press inclinado', 4, 8, 2, 74, 1, upperPush).lastInsertRowid;
    createExercise.run('Press militar', 3, 8, 2, 76, 2, upperPush);
    createExercise.run('Fondos en paralelas', 3, 10, 1, null, 3, upperPush);

    const createPushPullLegForUser = (targetUserId, targetManagerId) => {
      const pushId = createWorkout.run('Push', targetUserId, targetManagerId).lastInsertRowid;
      const pullId = createWorkout.run('Pull', targetUserId, targetManagerId).lastInsertRowid;
      const legId = createWorkout.run('Leg', targetUserId, targetManagerId).lastInsertRowid;

      createExercise.run('Press banca', 4, 8, 2, 75, 1, pushId);
      createExercise.run('Press militar', 3, 10, 2, 70, 2, pushId);
      createExercise.run('Fondos', 3, 12, 1, null, 3, pushId);

      const pullupId = createExercise.run('Dominadas asistidas', 4, 8, 1, null, 1, pullId).lastInsertRowid;
      createExercise.run('Remo con barra', 4, 10, 2, 72, 2, pullId);
      createExercise.run('Face pull', 3, 15, 2, null, 3, pullId);

      const squatId = createExercise.run('Sentadilla', 4, 6, 2, 82, 1, legId).lastInsertRowid;
      createExercise.run('Prensa', 4, 10, 1, 74, 2, legId);
      createExercise.run('Peso muerto rumano', 3, 8, 2, 78, 3, legId);

      createLog.run(35, 8, targetUserId, pullupId);
      createLog.run(90, 6, targetUserId, squatId);
    };

    createPushPullLegForUser(alegriaId, cesarId);
    createPushPullLegForUser(albaId, cesarId);
    createPushPullLegForUser(joseId, cesarId);

    createLog.run(100, 6, userId, squatId);
    createLog.run(82, 8, userId, benchId);
    createLog.run(70, 10, userId, rowId);
    createLog.run(90, 8, userId, rdlId);
    createLog.run(60, 8, userId, inclineId);
  });

  seedTx();
}

function closeDb() {
  db.close();
}

// Garantiza que cualquier proceso que importe la DB tenga esquema y migraciones aplicadas.
initSchema();

module.exports = {
  db,
  DB_PATH,
  initSchema,
  seedExampleData,
  closeDb
};
