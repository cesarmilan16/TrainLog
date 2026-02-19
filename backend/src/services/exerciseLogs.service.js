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

function parseOptionalLogDate(value) {
  if (value === undefined || value === null || value === '') {
    return { value: null };
  }

  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { error: true };
  }

  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return { error: true };
  }

  return { value: `${value} 12:00:00` };
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
  const parsedDate = parseOptionalLogDate(payload?.date);

  if (!exerciseId || !weight || !reps) {
    return {
      status: 400,
      error: 'Peso, repeticiones y exerciseId deben ser números válidos'
    };
  }

  if (parsedDate.error) {
    return {
      status: 400,
      error: 'Fecha inválida (usa formato YYYY-MM-DD)'
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
      movementId,
      date: parsedDate.value
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

function updateLog(logId, payload, userId) {
  const id = parsePositiveInt(logId);
  const weight = parsePositiveInt(payload?.weight);
  const reps = parsePositiveInt(payload?.reps);
  const parsedDate = parseOptionalLogDate(payload?.date);

  if (!id || !weight || !reps) {
    return {
      status: 400,
      error: 'logId, peso y repeticiones deben ser números válidos'
    };
  }

  if (parsedDate.error || !parsedDate.value) {
    return {
      status: 400,
      error: 'Fecha inválida (usa formato YYYY-MM-DD)'
    };
  }

  const ownedLog = exerciseLogsRepository.getLogOwnedByUser(id, userId);
  if (!ownedLog) {
    return {
      status: 403,
      error: 'Este log no pertenece al usuario'
    };
  }

  try {
    exerciseLogsRepository.updateLog({
      logId: id,
      weight,
      reps,
      date: parsedDate.value
    });

    return {
      message: 'Log actualizado'
    };
  } catch (error) {
    console.error(error);
    return {
      status: 500,
      error: 'Error interno'
    };
  }
}

function deleteLog(logId, userId) {
  const id = parsePositiveInt(logId);
  if (!id) {
    return {
      status: 400,
      error: 'logId inválido'
    };
  }

  const ownedLog = exerciseLogsRepository.getLogOwnedByUser(id, userId);
  if (!ownedLog) {
    return {
      status: 403,
      error: 'Este log no pertenece al usuario'
    };
  }

  try {
    exerciseLogsRepository.deleteLog(id);
    return {
      message: 'Log eliminado'
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
  updateLog,
  deleteLog,
  getLog,
  getLastLog
};
