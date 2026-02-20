const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');

const { DB_PATH } = require('./db-path');

const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');

function normalizeMovementName(name) {
  return String(name ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ');
}

function getOrCreateMovementId(userId, movementName) {
  const normalized = normalizeMovementName(movementName);

  const existing = db
    .prepare('SELECT id FROM movements WHERE user_id = ? AND name_normalized = ?')
    .get(userId, normalized);

  if (existing) {
    return existing.id;
  }

  return db
    .prepare('INSERT INTO movements (name, name_normalized, user_id) VALUES (?, ?, ?)')
    .run(movementName.trim(), normalized, userId).lastInsertRowid;
}

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
      mesocycle_id INTEGER,
      archived_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (manager_id) REFERENCES users(id),
      FOREIGN KEY (mesocycle_id) REFERENCES mesocycles(id) ON DELETE SET NULL,
      UNIQUE(user_id, name)
    );

    CREATE TABLE IF NOT EXISTS mesocycles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      goal TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PLANNED',
      user_id INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id),
      CHECK (status IN ('PLANNED', 'ACTIVE', 'COMPLETED'))
    );

    CREATE TABLE IF NOT EXISTS movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      name_normalized TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, name_normalized)
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
      movement_id INTEGER,
      archived_at DATETIME,
      FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE,
      FOREIGN KEY (movement_id) REFERENCES movements(id),
      UNIQUE (workout_id, order_index)
    );

    CREATE TABLE IF NOT EXISTS exercise_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      weight INTEGER NOT NULL,
      reps INTEGER NOT NULL,
      date DATETIME DEFAULT CURRENT_TIMESTAMP,
      user_id INTEGER NOT NULL,
      exercise_id INTEGER NOT NULL,
      movement_id INTEGER,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (exercise_id) REFERENCES workout_exercises(id) ON DELETE CASCADE,
      FOREIGN KEY (movement_id) REFERENCES movements(id)
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

  const workoutColumns = db.prepare('PRAGMA table_info(workouts)').all();
  const hasWorkoutArchivedAt = workoutColumns.some((column) => column.name === 'archived_at');
  const hasWorkoutMesocycleId = workoutColumns.some((column) => column.name === 'mesocycle_id');
  if (!hasWorkoutArchivedAt) {
    db.exec('ALTER TABLE workouts ADD COLUMN archived_at DATETIME');
  }
  if (!hasWorkoutMesocycleId) {
    db.exec('ALTER TABLE workouts ADD COLUMN mesocycle_id INTEGER');
  }

  const hasMesocyclesTable = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'mesocycles'")
    .get();
  if (!hasMesocyclesTable) {
    db.exec(`
      CREATE TABLE mesocycles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        goal TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'PLANNED',
        user_id INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id),
        CHECK (status IN ('PLANNED', 'ACTIVE', 'COMPLETED'))
      );
    `);
  }

  const hasMovementTable = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'movements'")
    .get();
  if (!hasMovementTable) {
    db.exec(`
      CREATE TABLE movements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        name_normalized TEXT NOT NULL,
        user_id INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(user_id, name_normalized)
      );
    `);
  }

  const workoutExerciseColumns = db.prepare('PRAGMA table_info(workout_exercises)').all();
  const hasMovementIdInWorkoutExercises = workoutExerciseColumns.some((column) => column.name === 'movement_id');
  const hasWorkoutExerciseArchivedAt = workoutExerciseColumns.some((column) => column.name === 'archived_at');

  if (!hasMovementIdInWorkoutExercises) {
    db.exec('ALTER TABLE workout_exercises ADD COLUMN movement_id INTEGER');
  }

  if (!hasWorkoutExerciseArchivedAt) {
    db.exec('ALTER TABLE workout_exercises ADD COLUMN archived_at DATETIME');
  }

  const exerciseLogColumns = db.prepare('PRAGMA table_info(exercise_logs)').all();
  const hasMovementIdInLogs = exerciseLogColumns.some((column) => column.name === 'movement_id');
  if (!hasMovementIdInLogs) {
    db.exec('ALTER TABLE exercise_logs ADD COLUMN movement_id INTEGER');
  }

  const exercisesWithoutMovement = db
    .prepare(`
      SELECT we.id, we.name, w.user_id
      FROM workout_exercises we
      JOIN workouts w ON w.id = we.workout_id
      WHERE we.movement_id IS NULL
    `)
    .all();

  const updateExerciseMovementStmt = db.prepare('UPDATE workout_exercises SET movement_id = ? WHERE id = ?');
  exercisesWithoutMovement.forEach((exercise) => {
    const movementId = getOrCreateMovementId(exercise.user_id, exercise.name);
    updateExerciseMovementStmt.run(movementId, exercise.id);
  });

  db.prepare(`
    UPDATE exercise_logs
    SET movement_id = (
      SELECT movement_id
      FROM workout_exercises we
      WHERE we.id = exercise_logs.exercise_id
    )
    WHERE movement_id IS NULL
  `).run();
}

function seedExampleData({ reset = false } = {}) {
  const usersCount = db.prepare('SELECT COUNT(*) AS total FROM users').get().total;

  if (!reset && usersCount > 0) {
    ensureDemoMesocycleForExistingData();
    return;
  }

  const seedTx = db.transaction(() => {
    if (reset) {
      db.exec(`
        DELETE FROM exercise_logs;
        DELETE FROM workout_exercises;
        DELETE FROM workouts;
        DELETE FROM mesocycles;
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

    const createWorkout = db.prepare('INSERT INTO workouts (name, user_id, manager_id, mesocycle_id) VALUES (?, ?, ?, ?)');
    const createExercise = db.prepare(
      `INSERT INTO workout_exercises
      (name, sets, reps, rir, rm_percent, order_index, workout_id, movement_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const createLog = db.prepare(
      'INSERT INTO exercise_logs (weight, reps, user_id, exercise_id, movement_id) VALUES (?, ?, ?, ?, ?)'
    );
    const createLogWithDate = db.prepare(
      'INSERT INTO exercise_logs (weight, reps, date, user_id, exercise_id, movement_id) VALUES (?, ?, ?, ?, ?, ?)'
    );

    const fullBodyA = createWorkout.run('Full Body A', userId, managerId, null).lastInsertRowid;
    const lowerBody = createWorkout.run('Lower Body', userId, managerId, null).lastInsertRowid;
    const upperPush = createWorkout.run('Upper Push', userId, managerId, null).lastInsertRowid;

    const activeMesocycleId = db
      .prepare(`
        INSERT INTO mesocycles (name, goal, start_date, end_date, status, user_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .run(
        'Hipertrofia Base 8 semanas',
        'Hipertrofia',
        '2026-01-05',
        '2026-03-01',
        'ACTIVE',
        userId
      ).lastInsertRowid;

    const mesoUpper = createWorkout
      .run('Meso Upper A', userId, managerId, activeMesocycleId).lastInsertRowid;
    const mesoLower = createWorkout
      .run('Meso Lower B', userId, managerId, activeMesocycleId).lastInsertRowid;

    const squatMovementId = getOrCreateMovementId(userId, 'Sentadilla');
    const benchMovementId = getOrCreateMovementId(userId, 'Press Banca');
    const rowMovementId = getOrCreateMovementId(userId, 'Remo con barra');
    const rdlMovementId = getOrCreateMovementId(userId, 'Peso muerto rumano');
    const pressMovementId = getOrCreateMovementId(userId, 'Prensa');
    const curlFemoralMovementId = getOrCreateMovementId(userId, 'Curl femoral');
    const inclineMovementId = getOrCreateMovementId(userId, 'Press inclinado');
    const militarMovementId = getOrCreateMovementId(userId, 'Press militar');
    const fondosMovementId = getOrCreateMovementId(userId, 'Fondos en paralelas');

    const squatId = createExercise.run('Sentadilla', 4, 6, 2, 82, 1, fullBodyA, squatMovementId).lastInsertRowid;
    const benchId = createExercise.run('Press Banca', 4, 8, 1, 75, 2, fullBodyA, benchMovementId).lastInsertRowid;
    const rowId = createExercise.run('Remo con barra', 3, 10, 2, null, 3, fullBodyA, rowMovementId).lastInsertRowid;

    const rdlId = createExercise.run('Peso muerto rumano', 4, 8, 2, 78, 1, lowerBody, rdlMovementId).lastInsertRowid;
    createExercise.run('Prensa', 4, 10, 1, 72, 2, lowerBody, pressMovementId);
    createExercise.run('Curl femoral', 3, 12, 1, null, 3, lowerBody, curlFemoralMovementId);

    const inclineId = createExercise.run('Press inclinado', 4, 8, 2, 74, 1, upperPush, inclineMovementId).lastInsertRowid;
    createExercise.run('Press militar', 3, 8, 2, 76, 2, upperPush, militarMovementId);
    createExercise.run('Fondos en paralelas', 3, 10, 1, null, 3, upperPush, fondosMovementId);

    const createPushPullLegForUser = (targetUserId, targetManagerId) => {
      const pushId = createWorkout.run('Push', targetUserId, targetManagerId, null).lastInsertRowid;
      const pullId = createWorkout.run('Pull', targetUserId, targetManagerId, null).lastInsertRowid;
      const legId = createWorkout.run('Leg', targetUserId, targetManagerId, null).lastInsertRowid;

      const pressBancaMovementId = getOrCreateMovementId(targetUserId, 'Press banca');
      const pressMilitarMovementId = getOrCreateMovementId(targetUserId, 'Press militar');
      const fondosMovementId = getOrCreateMovementId(targetUserId, 'Fondos');
      const dominadasMovementId = getOrCreateMovementId(targetUserId, 'Dominadas asistidas');
      const remoMovementId = getOrCreateMovementId(targetUserId, 'Remo con barra');
      const facePullMovementId = getOrCreateMovementId(targetUserId, 'Face pull');
      const sentadillaMovementId = getOrCreateMovementId(targetUserId, 'Sentadilla');
      const prensaMovementId = getOrCreateMovementId(targetUserId, 'Prensa');
      const rdlMovementId = getOrCreateMovementId(targetUserId, 'Peso muerto rumano');

      createExercise.run('Press banca', 4, 8, 2, 75, 1, pushId, pressBancaMovementId);
      createExercise.run('Press militar', 3, 10, 2, 70, 2, pushId, pressMilitarMovementId);
      createExercise.run('Fondos', 3, 12, 1, null, 3, pushId, fondosMovementId);

      const pullupId = createExercise.run('Dominadas asistidas', 4, 8, 1, null, 1, pullId, dominadasMovementId).lastInsertRowid;
      createExercise.run('Remo con barra', 4, 10, 2, 72, 2, pullId, remoMovementId);
      createExercise.run('Face pull', 3, 15, 2, null, 3, pullId, facePullMovementId);

      const squatId = createExercise.run('Sentadilla', 4, 6, 2, 82, 1, legId, sentadillaMovementId).lastInsertRowid;
      createExercise.run('Prensa', 4, 10, 1, 74, 2, legId, prensaMovementId);
      createExercise.run('Peso muerto rumano', 3, 8, 2, 78, 3, legId, rdlMovementId);

      createLog.run(35, 8, targetUserId, pullupId, dominadasMovementId);
      createLog.run(90, 6, targetUserId, squatId, sentadillaMovementId);
    };

    createPushPullLegForUser(alegriaId, cesarId);
    createPushPullLegForUser(albaId, cesarId);
    createPushPullLegForUser(joseId, cesarId);

    // Serie histórica para que el cliente vea una progresión real en la UI.
    const formatDateDaysAgo = (daysAgo, hour = 18, minute = 0) => {
      const date = new Date();
      date.setHours(hour, minute, 0, 0);
      date.setDate(date.getDate() - daysAgo);
      return date.toISOString().slice(0, 19).replace('T', ' ');
    };

    const addProgressLogs = (exerciseId, logs) => {
      logs.forEach((log) => {
        createLogWithDate.run(
          log.weight,
          log.reps,
          formatDateDaysAgo(log.daysAgo, log.hour ?? 18, log.minute ?? 0),
          userId,
          exerciseId,
          db.prepare('SELECT movement_id FROM workout_exercises WHERE id = ?').get(exerciseId).movement_id
        );
      });
    };

    addProgressLogs(squatId, [
      { weight: 82, reps: 8, daysAgo: 84, minute: 3 },
      { weight: 85, reps: 8, daysAgo: 77, minute: 7 },
      { weight: 87, reps: 7, daysAgo: 70, minute: 10 },
      { weight: 90, reps: 7, daysAgo: 63, minute: 4 },
      { weight: 92, reps: 6, daysAgo: 56, minute: 11 },
      { weight: 95, reps: 6, daysAgo: 49, minute: 13 },
      { weight: 97, reps: 5, daysAgo: 42, minute: 9 },
      { weight: 100, reps: 5, daysAgo: 35, minute: 12 },
      { weight: 102, reps: 5, daysAgo: 28, minute: 15 },
      { weight: 105, reps: 4, daysAgo: 21, minute: 10 },
      { weight: 107, reps: 4, daysAgo: 14, minute: 16 },
      { weight: 110, reps: 4, daysAgo: 7, minute: 18 }
    ]);

    addProgressLogs(benchId, [
      { weight: 62, reps: 10, daysAgo: 82, hour: 19, minute: 0 },
      { weight: 64, reps: 10, daysAgo: 74, hour: 19, minute: 5 },
      { weight: 66, reps: 9, daysAgo: 66, hour: 19, minute: 7 },
      { weight: 68, reps: 9, daysAgo: 58, hour: 19, minute: 10 },
      { weight: 70, reps: 8, daysAgo: 50, hour: 19, minute: 12 },
      { weight: 72, reps: 8, daysAgo: 42, hour: 19, minute: 14 },
      { weight: 74, reps: 7, daysAgo: 34, hour: 19, minute: 9 },
      { weight: 76, reps: 7, daysAgo: 26, hour: 19, minute: 13 },
      { weight: 78, reps: 6, daysAgo: 18, hour: 19, minute: 11 },
      { weight: 80, reps: 6, daysAgo: 10, hour: 19, minute: 15 }
    ]);

    addProgressLogs(rowId, [
      { weight: 55, reps: 12, daysAgo: 79, minute: 40 },
      { weight: 57, reps: 12, daysAgo: 69, minute: 42 },
      { weight: 60, reps: 11, daysAgo: 59, minute: 44 },
      { weight: 62, reps: 10, daysAgo: 49, minute: 46 },
      { weight: 65, reps: 10, daysAgo: 39, minute: 48 },
      { weight: 67, reps: 9, daysAgo: 29, minute: 50 },
      { weight: 70, reps: 9, daysAgo: 19, minute: 52 },
      { weight: 72, reps: 8, daysAgo: 9, minute: 54 }
    ]);

    const mesoInclineMovementId = getOrCreateMovementId(userId, 'Press inclinado mancuernas');
    const mesoPulldownMovementId = getOrCreateMovementId(userId, 'Jalón al pecho');
    const mesoHackMovementId = getOrCreateMovementId(userId, 'Hack squat');
    const mesoHipThrustMovementId = getOrCreateMovementId(userId, 'Hip thrust');

    const mesoInclineId = createExercise
      .run('Press inclinado mancuernas', 4, 10, 2, 72, 1, mesoUpper, mesoInclineMovementId).lastInsertRowid;
    const mesoPulldownId = createExercise
      .run('Jalón al pecho', 4, 10, 2, 70, 2, mesoUpper, mesoPulldownMovementId).lastInsertRowid;
    const mesoHackId = createExercise
      .run('Hack squat', 4, 8, 2, 78, 1, mesoLower, mesoHackMovementId).lastInsertRowid;
    const mesoHipThrustId = createExercise
      .run('Hip thrust', 4, 10, 1, 75, 2, mesoLower, mesoHipThrustMovementId).lastInsertRowid;

    addProgressLogs(mesoInclineId, [
      { weight: 24, reps: 11, daysAgo: 41, hour: 18, minute: 25 },
      { weight: 26, reps: 10, daysAgo: 30, hour: 18, minute: 22 },
      { weight: 28, reps: 9, daysAgo: 18, hour: 18, minute: 20 }
    ]);
    addProgressLogs(mesoHackId, [
      { weight: 90, reps: 10, daysAgo: 38, hour: 19, minute: 11 },
      { weight: 95, reps: 9, daysAgo: 26, hour: 19, minute: 8 },
      { weight: 100, reps: 8, daysAgo: 13, hour: 19, minute: 6 }
    ]);
    createLog.run(55, 11, userId, mesoPulldownId, mesoPulldownMovementId);
    createLog.run(110, 8, userId, mesoHipThrustId, mesoHipThrustMovementId);

    // Mantiene algunos logs sueltos para el resto de ejercicios.
    createLog.run(90, 8, userId, rdlId, rdlMovementId);
    createLog.run(60, 8, userId, inclineId, inclineMovementId);
  });

  seedTx();
}

function ensureDemoMesocycleForExistingData() {
  const demoManager = db
    .prepare("SELECT id FROM users WHERE email = 'demo@trainlog.com' AND role = 'MANAGER'")
    .get();
  const demoUser = db
    .prepare("SELECT id FROM users WHERE email = 'cliente@trainlog.com' AND role = 'USER'")
    .get();

  if (!demoUser) {
    return;
  }

  const mesocycleCount = db
    .prepare('SELECT COUNT(*) AS total FROM mesocycles WHERE user_id = ?')
    .get(demoUser.id).total;

  if (mesocycleCount > 0) {
    return;
  }

  const backfillTx = db.transaction(() => {
    const mesocycleId = db
      .prepare(`
        INSERT INTO mesocycles (name, goal, start_date, end_date, status, user_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .run(
        'Mesociclo Demo Base',
        'Hipertrofia',
        '2026-02-02',
        '2026-03-29',
        'ACTIVE',
        demoUser.id
      ).lastInsertRowid;

    const existingWorkout = db
      .prepare('SELECT id FROM workouts WHERE user_id = ? AND archived_at IS NULL ORDER BY id DESC LIMIT 1')
      .get(demoUser.id);

    if (existingWorkout) {
      db.prepare('UPDATE workouts SET mesocycle_id = ? WHERE id = ?')
        .run(mesocycleId, existingWorkout.id);
      return;
    }

    if (demoManager) {
      db.prepare('INSERT INTO workouts (name, user_id, manager_id, mesocycle_id) VALUES (?, ?, ?, ?)')
        .run('Meso Full Body Demo', demoUser.id, demoManager.id, mesocycleId);
    }
  });

  backfillTx();
}

function closeDb() {
  db.close();
}

module.exports = {
  db,
  DB_PATH,
  initSchema,
  seedExampleData,
  closeDb
};
