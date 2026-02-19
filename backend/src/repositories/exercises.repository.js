const { db } = require('../config/database/db');
const { parsePositiveInt, isSqliteUniqueError } = require('../shared/utils/data.helpers');

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

function resolveProvidedMovementId(userId, movementId) {
  const parsed = parsePositiveInt(movementId);
  if (!parsed) {
    return null;
  }

  const movement = db
    .prepare('SELECT id FROM movements WHERE id = ? AND user_id = ?')
    .get(parsed, userId);

  return movement ? movement.id : null;
}

// Permite null/empty para campos opcionales (RIR, %RM) y valida rango cuando vienen informados.
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

  // El manager solo puede crear ejercicios en entrenamientos que le pertenecen.
  const workout = db
    .prepare('SELECT id, user_id FROM workouts WHERE id = ? AND manager_id = ? AND archived_at IS NULL')
    .get(workoutId, managerId);

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

    const result = db
      .prepare(`
        INSERT INTO workout_exercises
        (name, sets, reps, rir, rm_percent, order_index, workout_id, movement_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(name, sets, reps, rir.value, rmPercent.value, order, workoutId, movementId);

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

  // Protege acceso cruzado entre managers.
  const ownership = db
    .prepare('SELECT id FROM workouts WHERE id = ? AND manager_id = ? AND archived_at IS NULL')
    .get(id, managerId);

  if (!ownership) {
    return {
      status: 403,
      error: 'Este entrenamiento no pertenece al manager'
    };
  }

  try {
    return db
      .prepare('SELECT * FROM workout_exercises WHERE workout_id = ? AND archived_at IS NULL ORDER BY order_index')
      .all(id);
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

  // Verifica ownership por JOIN con workouts antes de borrar.
  const ownership = db
    .prepare(`
      SELECT we.id
      FROM workout_exercises we
      JOIN workouts w ON we.workout_id = w.id
      WHERE we.id = ? AND w.manager_id = ? AND we.archived_at IS NULL AND w.archived_at IS NULL
    `)
    .get(id, managerId);

  if (!ownership) {
    return {
      status: 403,
      error: 'Este ejercicio no pertenece a este manager'
    };
  }

  try {
    const result = db.prepare(`
      UPDATE workout_exercises
      SET archived_at = CURRENT_TIMESTAMP,
          order_index = -id
      WHERE id = ? AND archived_at IS NULL
    `).run(id);

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

  // Validación de ownership previa a cualquier update parcial.
  const ownership = db
    .prepare(`
      SELECT we.id
      FROM workout_exercises we
      JOIN workouts w ON we.workout_id = w.id
      WHERE we.id = ? AND w.manager_id = ? AND we.archived_at IS NULL AND w.archived_at IS NULL
    `)
    .get(id, managerId);

  if (!ownership) {
    return {
      status: 403,
      error: 'Este ejercicio no pertenece a este manager'
    };
  }

  const updates = [];
  const values = [];

  if (data?.name !== undefined) {
    const name = data.name?.trim();

    if (!name) {
      return {
        status: 400,
        error: 'Nombre inválido'
      };
    }

    updates.push('name = ?');
    values.push(name);
  }

  if (data?.sets !== undefined) {
    const sets = parsePositiveInt(data.sets);

    if (!sets) {
      return {
        status: 400,
        error: 'Sets inválido'
      };
    }

    updates.push('sets = ?');
    values.push(sets);
  }

  if (data?.reps !== undefined) {
    const reps = parsePositiveInt(data.reps);

    if (!reps) {
      return {
        status: 400,
        error: 'Reps inválido'
      };
    }

    updates.push('reps = ?');
    values.push(reps);
  }

  if (data?.order_index !== undefined) {
    const order = parsePositiveInt(data.order_index);

    if (!order) {
      return {
        status: 400,
        error: 'Order inválido'
      };
    }

    updates.push('order_index = ?');
    values.push(order);
  }

  if (data?.rir !== undefined) {
    const rir = parseNullableIntInRange(data.rir, 0, 10);

    if (rir.error) {
      return {
        status: 400,
        error: 'RIR inválido (0-10)'
      };
    }

    updates.push('rir = ?');
    values.push(rir.value);
  }

  if (data?.rm_percent !== undefined) {
    const rmPercent = parseNullableIntInRange(data.rm_percent, 1, 100);

    if (rmPercent.error) {
      return {
        status: 400,
        error: '%RM inválido (1-100)'
      };
    }

    updates.push('rm_percent = ?');
    values.push(rmPercent.value);
  }

  // Se construye SQL dinámico solo con campos válidos presentes en el payload.
  if (updates.length === 0) {
    return {
      status: 400,
      error: 'No hay campos para actualizar'
    };
  }

  try {
    const exerciseOwner = db
      .prepare(`
        SELECT w.user_id
        FROM workout_exercises we
        JOIN workouts w ON we.workout_id = w.id
        WHERE we.id = ?
      `)
      .get(id);

    if (data?.movementId !== undefined) {
      const movementId = resolveProvidedMovementId(exerciseOwner.user_id, data.movementId);

      if (!movementId) {
        return {
          status: 400,
          error: 'movementId inválido'
        };
      }

      updates.push('movement_id = ?');
      values.push(movementId);
    } else if (data?.name !== undefined) {
      const movementId = resolveMovementId(exerciseOwner.user_id, data.name.trim());
      updates.push('movement_id = ?');
      values.push(movementId);
    }

    db.prepare(`UPDATE workout_exercises SET ${updates.join(', ')} WHERE id = ?`).run(...values, id);

    const exercise = db.prepare('SELECT * FROM workout_exercises WHERE id = ? AND archived_at IS NULL').get(id);

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

  const ownership = db
    .prepare('SELECT id FROM users WHERE id = ? AND manager_id = ? AND role = ?')
    .get(id, managerId, 'USER');

  if (!ownership) {
    return {
      status: 403,
      error: 'Este usuario no pertenece al manager'
    };
  }

  const normalizedQuery = normalizeMovementName(query ?? '');

  try {
    if (!normalizedQuery) {
      return db
        .prepare('SELECT id, name FROM movements WHERE user_id = ? ORDER BY name ASC LIMIT 15')
        .all(id);
    }

    return db
      .prepare(`
        SELECT id, name
        FROM movements
        WHERE user_id = ? AND name_normalized LIKE ?
        ORDER BY name ASC
        LIMIT 15
      `)
      .all(id, `%${normalizedQuery}%`);
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
