const { db } = require('../config/database/db');
const { parsePositiveInt } = require('../shared/utils/data.helpers');

function normalizeMovementName(name) {
  return String(name ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ');
}

function resolveMovementId(userId, movementName) {
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

function addLog(data, userId) {
  const exerciseId = parsePositiveInt(data?.exerciseId);
  const weight = parsePositiveInt(data?.weight);
  const reps = parsePositiveInt(data?.reps);

  if (!exerciseId || !weight || !reps) {
    return {
      status: 400,
      error: 'Peso, repeticiones y exerciseId deben ser números válidos'
    };
  }

  const ownership = db
    .prepare(`
      SELECT we.id, we.name, we.movement_id
      FROM workout_exercises we
      JOIN workouts w ON we.workout_id = w.id
      WHERE we.id = ? AND w.user_id = ?
    `)
    .get(exerciseId, userId);

  if (!ownership) {
    return {
      status: 403,
      error: 'Este ejercicio no pertenece al usuario'
    };
  }

  try {
    const movementId = ownership.movement_id || resolveMovementId(userId, ownership.name);

    if (!ownership.movement_id) {
      db.prepare('UPDATE workout_exercises SET movement_id = ? WHERE id = ?').run(movementId, exerciseId);
    }

    const result = db
      .prepare(`
        INSERT INTO exercise_logs (weight, reps, user_id, exercise_id, movement_id)
        VALUES (?, ?, ?, ?, ?)
      `)
      .run(weight, reps, userId, exerciseId, movementId);

    return {
      message: 'Log creado',
      id: result.lastInsertRowid
    };
  } catch (error) {
    console.error(error);
    return {
      status: 500,
      error: 'Error interno'
    };
  }
}

function getLog(exerciseId, userId) {
  const id = parsePositiveInt(exerciseId);

  if (!id) {
    return {
      status: 400,
      error: 'exerciseId inválido'
    };
  }

  const ownership = db
    .prepare(`
      SELECT we.id, we.name, we.movement_id
      FROM workout_exercises we
      JOIN workouts w ON we.workout_id = w.id
      WHERE we.id = ? AND w.user_id = ?
    `)
    .get(id, userId);

  if (!ownership) {
    return {
      status: 403,
      error: 'Este ejercicio no pertenece al usuario'
    };
  }

  try {
    const movementId = ownership.movement_id || resolveMovementId(userId, ownership.name);

    const logs = db
      .prepare(`
        SELECT id, weight, reps, date
        FROM exercise_logs
        WHERE movement_id = ? AND user_id = ?
        ORDER BY date DESC
      `)
      .all(movementId, userId);

    return { data: logs };
  } catch (error) {
    console.error(error);
    return {
      status: 500,
      error: 'Error interno'
    };
  }
}

function getLastLog(exerciseId, userId) {
  const id = parsePositiveInt(exerciseId);

  if (!id) {
    return {
      status: 400,
      error: 'exerciseId inválido'
    };
  }

  const ownership = db
    .prepare(`
      SELECT we.id, we.name, we.movement_id
      FROM workout_exercises we
      JOIN workouts w ON we.workout_id = w.id
      WHERE we.id = ? AND w.user_id = ?
    `)
    .get(id, userId);

  if (!ownership) {
    return {
      status: 403,
      error: 'Este ejercicio no pertenece al usuario'
    };
  }

  try {
    const movementId = ownership.movement_id || resolveMovementId(userId, ownership.name);

    const lastLog = db
      .prepare(`
        SELECT id, weight, reps, date
        FROM exercise_logs
        WHERE movement_id = ? AND user_id = ?
        ORDER BY date DESC
        LIMIT 1
      `)
      .get(movementId, userId);

    return { data: lastLog || null };
  } catch (error) {
    console.error(error);
    return {
      status: 500,
      error: 'Error interno'
    };
  }
}

module.exports = {
  addLog,
  getLog,
  getLastLog
};
