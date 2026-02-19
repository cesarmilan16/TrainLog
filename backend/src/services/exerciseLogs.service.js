const exerciseLogsRepository = require('../repositories/exerciseLogs.repository');
const { parsePositiveInt } = require('../shared/utils/data.helpers');

function normalizeMovementName(name) {
  return String(name ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ');
}

function resolveMovementIdForExercise(exercise, userId) {
  if (exercise.movement_id) {
    return exercise.movement_id;
  }

  const normalizedName = normalizeMovementName(exercise.name);
  const existingMovement = exerciseLogsRepository.getMovementByNormalized(userId, normalizedName);

  if (existingMovement) {
    exerciseLogsRepository.setExerciseMovementId(exercise.id, existingMovement.id);
    return existingMovement.id;
  }

  const inserted = exerciseLogsRepository.createMovement({
    userId,
    name: exercise.name,
    normalizedName
  });

  const movementId = inserted.lastInsertRowid;
  exerciseLogsRepository.setExerciseMovementId(exercise.id, movementId);
  return movementId;
}

function addLog(payload, userId) {
  const exerciseId = parsePositiveInt(payload?.exerciseId);
  const weight = parsePositiveInt(payload?.weight);
  const reps = parsePositiveInt(payload?.reps);

  if (!exerciseId || !weight || !reps) {
    return {
      status: 400,
      error: 'Peso, repeticiones y exerciseId deben ser números válidos'
    };
  }

  const exercise = exerciseLogsRepository.getExerciseOwnedByUser(exerciseId, userId);
  if (!exercise) {
    return {
      status: 403,
      error: 'Este ejercicio no pertenece al usuario'
    };
  }

  try {
    const movementId = resolveMovementIdForExercise(exercise, userId);

    const result = exerciseLogsRepository.insertLog({
      weight,
      reps,
      userId,
      exerciseId,
      movementId
    });

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

  const exercise = exerciseLogsRepository.getExerciseOwnedByUser(id, userId);
  if (!exercise) {
    return {
      status: 403,
      error: 'Este ejercicio no pertenece al usuario'
    };
  }

  try {
    const movementId = resolveMovementIdForExercise(exercise, userId);
    const logs = exerciseLogsRepository.listLogsByMovementAndUser(movementId, userId);

    return {
      data: logs
    };
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

  const exercise = exerciseLogsRepository.getExerciseOwnedByUser(id, userId);
  if (!exercise) {
    return {
      status: 403,
      error: 'Este ejercicio no pertenece al usuario'
    };
  }

  try {
    const movementId = resolveMovementIdForExercise(exercise, userId);

    return {
      data: exerciseLogsRepository.getLastLogByMovementAndUser(movementId, userId) || null
    };
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
