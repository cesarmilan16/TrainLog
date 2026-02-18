const { db } = require('./db');
const { parsePositiveInt } = require('../utils/data.helpers');

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
      SELECT we.id
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
    const result = db
      .prepare('INSERT INTO exercise_logs (weight, reps, user_id, exercise_id) VALUES (?, ?, ?, ?)')
      .run(weight, reps, userId, exerciseId);

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
      SELECT we.id
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
    const logs = db
      .prepare('SELECT id, weight, reps, date FROM exercise_logs WHERE exercise_id = ? AND user_id = ? ORDER BY date DESC')
      .all(id, userId);

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
      SELECT we.id
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
    const lastLog = db
      .prepare('SELECT id, weight, reps, date FROM exercise_logs WHERE exercise_id = ? AND user_id = ? ORDER BY date DESC LIMIT 1')
      .get(id, userId);

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
