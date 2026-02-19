const { db } = require('../config/database/db');
const { parsePositiveInt, isSqliteUniqueError } = require('../shared/utils/data.helpers');

function newWorkout(data, managerId) {
  const { name, userId } = data;

  if (!name || !name.trim()) {
    return {
      status: 400,
      error: 'Nombre de entrenamiento obligatorio'
    };
  }

  const parsedUserId = parsePositiveInt(userId);

  if (!parsedUserId) {
    return {
      status: 400,
      error: 'userId inválido'
    };
  }

  const user = db
    .prepare('SELECT id FROM users WHERE id = ? AND manager_id = ?')
    .get(parsedUserId, managerId);

  if (!user) {
    return {
      status: 403,
      error: 'Este usuario no pertenece a tu cuenta'
    };
  }

  try {
    const result = db
      .prepare('INSERT INTO workouts (name, user_id, manager_id) VALUES (?, ?, ?)')
      .run(name.trim(), parsedUserId, managerId);

    return {
      message: 'Entrenamiento creado',
      id: result.lastInsertRowid
    };
  } catch (error) {
    if (isSqliteUniqueError(error)) {
      return {
        status: 409,
        error: 'El usuario ya tiene un entrenamiento con ese nombre'
      };
    }

    console.error(error);
    return {
      status: 500,
      error: 'Error interno'
    };
  }
}

function getMyWorkouts(userId) {
  return db
    .prepare('SELECT id, name FROM workouts WHERE user_id = ? AND archived_at IS NULL ORDER BY id DESC')
    .all(userId);
}

function getWorkoutsManager(userId, managerId) {
  const parsedUserId = parsePositiveInt(userId);

  if (!parsedUserId) {
    return {
      status: 400,
      error: 'userId inválido'
    };
  }

  const workouts = db
    .prepare(`
      SELECT
        workouts.id,
        workouts.name,
        users.email AS name_user,
        COUNT(workout_exercises.id) AS exercises_count
      FROM workouts
      JOIN users ON workouts.user_id = users.id
      LEFT JOIN workout_exercises ON workout_exercises.workout_id = workouts.id
      WHERE workouts.user_id = ? AND workouts.manager_id = ? AND workouts.archived_at IS NULL
        AND (workout_exercises.archived_at IS NULL OR workout_exercises.id IS NULL)
      GROUP BY workouts.id, workouts.name, users.email
      ORDER BY workouts.id DESC
    `)
    .all(parsedUserId, managerId);

  if (workouts.length === 0) {
    return {
      status: 404,
      error: 'Este usuario no tiene entrenamientos'
    };
  }

  return workouts;
}

function getUserDashboard(userId) {
  const workoutsStmt = db.prepare(
    'SELECT id, name FROM workouts WHERE user_id = ? AND archived_at IS NULL ORDER BY id DESC'
  );
  const exercisesStmt = db.prepare(`
    SELECT id, name, sets, reps, rir, rm_percent, order_index, movement_id
    FROM workout_exercises
    WHERE workout_id = ? AND archived_at IS NULL
    ORDER BY order_index
  `);
  const lastLogStmt = db.prepare(`
    SELECT weight, reps, date
    FROM exercise_logs
    WHERE movement_id = ? AND user_id = ?
    ORDER BY date DESC
    LIMIT 1
  `);

  try {
    const workouts = workoutsStmt.all(userId);

    return workouts.map((workout) => ({
      id: workout.id,
      name: workout.name,
      exercises: exercisesStmt.all(workout.id).map((exercise) => ({
        ...exercise,
        last_log: lastLogStmt.get(exercise.movement_id, userId) || null
      }))
    }));
  } catch (error) {
    console.error(error);
    return {
      status: 500,
      error: 'Error interno'
    };
  }
}

function getManagerDashboard(userId, managerId) {
  const parsedUserId = parsePositiveInt(userId);

  if (!parsedUserId) {
    return {
      status: 400,
      error: 'userId inválido'
    };
  }

  const user = db
    .prepare('SELECT id FROM users WHERE id = ? AND manager_id = ?')
    .get(parsedUserId, managerId);

  if (!user) {
    return {
      status: 403,
      error: 'Este usuario no pertenece al manager'
    };
  }

  return getUserDashboard(parsedUserId);
}

function deleteWorkout(workoutId, managerId) {
  const id = parsePositiveInt(workoutId);

  if (!id) {
    return {
      status: 400,
      error: 'Id inválido'
    };
  }

  const ownership = db
    .prepare('SELECT id, name FROM workouts WHERE id = ? AND manager_id = ? AND archived_at IS NULL')
    .get(id, managerId);

  if (!ownership) {
    return {
      status: 403,
      error: 'Este entrenamiento no pertenece a este manager'
    };
  }

  try {
    const result = db.transaction(() => {
      db.prepare(`
        UPDATE workout_exercises
        SET archived_at = CURRENT_TIMESTAMP,
            order_index = -id
        WHERE workout_id = ? AND archived_at IS NULL
      `).run(id);

      return db.prepare(`
        UPDATE workouts
        SET archived_at = CURRENT_TIMESTAMP,
            name = name || ' [archived #' || id || ']'
        WHERE id = ? AND archived_at IS NULL
      `).run(id);
    })();

    return {
      message: 'Entrenamiento eliminado',
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

function updateWorkout(workoutId, payload, managerId) {
  const id = parsePositiveInt(workoutId);
  const name = payload?.name?.trim();

  if (!id) {
    return {
      status: 400,
      error: 'Id inválido'
    };
  }

  if (!name) {
    return {
      status: 400,
      error: 'Nombre de entrenamiento obligatorio'
    };
  }

  const ownership = db
    .prepare('SELECT id, user_id FROM workouts WHERE id = ? AND manager_id = ? AND archived_at IS NULL')
    .get(id, managerId);

  if (!ownership) {
    return {
      status: 403,
      error: 'Este entrenamiento no pertenece a este manager'
    };
  }

  try {
    db.prepare('UPDATE workouts SET name = ? WHERE id = ?').run(name, id);

    const workout = db
      .prepare('SELECT id, name, user_id, manager_id FROM workouts WHERE id = ? AND archived_at IS NULL')
      .get(id);

    return {
      message: 'Entrenamiento actualizado',
      data: workout
    };
  } catch (error) {
    if (isSqliteUniqueError(error)) {
      return {
        status: 409,
        error: 'El usuario ya tiene un entrenamiento con ese nombre'
      };
    }

    console.error(error);
    return {
      status: 500,
      error: 'Error interno'
    };
  }
}

module.exports = {
  newWorkout,
  getMyWorkouts,
  getWorkoutsManager,
  getUserDashboard,
  getManagerDashboard,
  deleteWorkout,
  updateWorkout
};
