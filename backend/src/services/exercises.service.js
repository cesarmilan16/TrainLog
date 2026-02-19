const exercisesRepository = require('../repositories/exercises.repository');
const { parsePositiveInt, isSqliteUniqueError } = require('../shared/utils/data.helpers');

function normalizeMovementName(name) {
  return String(name ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ');
}

function parseNullableIntInRange(value, min, max) {
  if (value === undefined) {
    return { present: false, value: null };
  }

  if (value === null || value === '') {
    return { present: true, value: null };
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    return { present: true, error: true };
  }

  return { present: true, value: parsed };
}

function resolveMovementId(userId, movementName) {
  const normalizedName = normalizeMovementName(movementName);
  const existing = exercisesRepository.getMovementByNormalized(userId, normalizedName);

  if (existing) {
    return existing.id;
  }

  return exercisesRepository.createMovement({
    userId,
    name: movementName.trim(),
    normalizedName
  }).lastInsertRowid;
}

function resolveProvidedMovementId(userId, movementId) {
  const parsed = parsePositiveInt(movementId);
  if (!parsed) {
    return null;
  }

  const movement = exercisesRepository.getMovementByIdForUser(parsed, userId);
  return movement ? movement.id : null;
}

function addExercise(data, managerId) {
  const name = data?.name?.trim();
  const sets = parsePositiveInt(data?.sets);
  const reps = parsePositiveInt(data?.reps);
  const order = parsePositiveInt(data?.order_index);
  const workoutId = parsePositiveInt(data?.workoutId);
  const rir = parseNullableIntInRange(data?.rir, 0, 10);
  const rmPercent = parseNullableIntInRange(data?.rm_percent, 1, 100);
  const providedMovementId = data?.movementId;

  if (!name || !sets || !reps || !order || !workoutId) {
    return {
      status: 400,
      error: 'Falta algún campo o tiene formato inválido'
    };
  }

  if (rir.error) {
    return {
      status: 400,
      error: 'RIR inválido (0-10)'
    };
  }

  if (rmPercent.error) {
    return {
      status: 400,
      error: '%RM inválido (1-100)'
    };
  }

  const workout = exercisesRepository.getWorkoutOwnedByManager(workoutId, managerId);

  if (!workout) {
    return {
      status: 403,
      error: 'Este entrenamiento no pertenece al manager'
    };
  }

  try {
    let movementId;
    if (providedMovementId !== undefined) {
      movementId = resolveProvidedMovementId(workout.user_id, providedMovementId);
      if (!movementId) {
        return {
          status: 400,
          error: 'movementId inválido'
        };
      }
    } else {
      movementId = resolveMovementId(workout.user_id, name);
    }

    const result = exercisesRepository.insertExercise({
      name,
      sets,
      reps,
      rir: rir.value,
      rmPercent: rmPercent.value,
      order,
      workoutId,
      movementId
    });

    return {
      message: 'Ejercicio creado',
      id: result.lastInsertRowid
    };
  } catch (error) {
    if (isSqliteUniqueError(error)) {
      return {
        status: 409,
        error: 'El orden debe ser único por workout'
      };
    }

    console.error(error);
    return {
      status: 500,
      error: 'Error interno'
    };
  }
}

function getExercises(workoutId, managerId) {
  const id = parsePositiveInt(workoutId);

  if (!id) {
    return {
      status: 400,
      error: 'Falta workoutId válido'
    };
  }

  const ownership = exercisesRepository.getWorkoutOwnedByManager(id, managerId);
  if (!ownership) {
    return {
      status: 403,
      error: 'Este entrenamiento no pertenece al manager'
    };
  }

  try {
    return exercisesRepository.listExercisesByWorkout(id);
  } catch (error) {
    console.error(error);
    return {
      status: 500,
      error: 'Error interno'
    };
  }
}

function deleteExercise(exerciseId, managerId) {
  const id = parsePositiveInt(exerciseId);

  if (!id) {
    return {
      status: 400,
      error: 'Id inválido'
    };
  }

  const ownership = exercisesRepository.getExerciseOwnedByManager(id, managerId);
  if (!ownership) {
    return {
      status: 403,
      error: 'Este ejercicio no pertenece a este manager'
    };
  }

  try {
    const result = exercisesRepository.archiveExercise(id);
    return {
      message: 'Ejercicio eliminado',
      changes: result.changes
    };
  } catch (error) {
    console.error(error);
    return {
      status: 500,
      error: 'Error interno'
    };
  }
}

function updateExercise(exerciseId, data, managerId) {
  const id = parsePositiveInt(exerciseId);

  if (!id) {
    return {
      status: 400,
      error: 'Id inválido'
    };
  }

  const ownership = exercisesRepository.getExerciseOwnedByManager(id, managerId);
  if (!ownership) {
    return {
      status: 403,
      error: 'Este ejercicio no pertenece a este manager'
    };
  }

  const fields = [];

  if (data?.name !== undefined) {
    const name = data.name?.trim();

    if (!name) {
      return {
        status: 400,
        error: 'Nombre inválido'
      };
    }

    fields.push({ column: 'name', value: name });
  }

  if (data?.sets !== undefined) {
    const sets = parsePositiveInt(data.sets);
    if (!sets) {
      return {
        status: 400,
        error: 'Sets inválido'
      };
    }

    fields.push({ column: 'sets', value: sets });
  }

  if (data?.reps !== undefined) {
    const reps = parsePositiveInt(data.reps);
    if (!reps) {
      return {
        status: 400,
        error: 'Reps inválido'
      };
    }

    fields.push({ column: 'reps', value: reps });
  }

  if (data?.order_index !== undefined) {
    const order = parsePositiveInt(data.order_index);
    if (!order) {
      return {
        status: 400,
        error: 'Order inválido'
      };
    }

    fields.push({ column: 'order_index', value: order });
  }

  if (data?.rir !== undefined) {
    const rir = parseNullableIntInRange(data.rir, 0, 10);
    if (rir.error) {
      return {
        status: 400,
        error: 'RIR inválido (0-10)'
      };
    }

    fields.push({ column: 'rir', value: rir.value });
  }

  if (data?.rm_percent !== undefined) {
    const rmPercent = parseNullableIntInRange(data.rm_percent, 1, 100);
    if (rmPercent.error) {
      return {
        status: 400,
        error: '%RM inválido (1-100)'
      };
    }

    fields.push({ column: 'rm_percent', value: rmPercent.value });
  }

  if (data?.movementId !== undefined) {
    const movementId = resolveProvidedMovementId(ownership.user_id, data.movementId);
    if (!movementId) {
      return {
        status: 400,
        error: 'movementId inválido'
      };
    }

    fields.push({ column: 'movement_id', value: movementId });
  } else if (data?.name !== undefined) {
    const movementId = resolveMovementId(ownership.user_id, data.name.trim());
    fields.push({ column: 'movement_id', value: movementId });
  }

  if (fields.length === 0) {
    return {
      status: 400,
      error: 'No hay campos para actualizar'
    };
  }

  try {
    exercisesRepository.updateExerciseFields(id, fields);
    const exercise = exercisesRepository.getExerciseById(id);

    return {
      message: 'Ejercicio actualizado',
      data: exercise
    };
  } catch (error) {
    if (isSqliteUniqueError(error)) {
      return {
        status: 409,
        error: 'El orden debe ser único por workout'
      };
    }

    console.error(error);
    return {
      status: 500,
      error: 'Error interno'
    };
  }
}

function getMovementSuggestions(userId, managerId, query = '') {
  const id = parsePositiveInt(userId);

  if (!id) {
    return {
      status: 400,
      error: 'userId inválido'
    };
  }

  const ownership = exercisesRepository.getManagerOwnedUser(id, managerId);
  if (!ownership) {
    return {
      status: 403,
      error: 'Este usuario no pertenece al manager'
    };
  }

  const normalizedQuery = normalizeMovementName(query ?? '');

  try {
    return exercisesRepository.listMovementSuggestions(id, normalizedQuery);
  } catch (error) {
    console.error(error);
    return {
      status: 500,
      error: 'Error interno'
    };
  }
}

module.exports = {
  addExercise,
  getExercises,
  deleteExercise,
  updateExercise,
  getMovementSuggestions
};
