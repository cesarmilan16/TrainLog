const workoutsRepository = require('../repositories/workouts.repository');
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

  const user = workoutsRepository.getUserManagedByManager(parsedUserId, managerId);
  if (!user) {
    return {
      status: 403,
      error: 'Este usuario no pertenece a tu cuenta'
    };
  }

  try {
    const result = workoutsRepository.insertWorkout({
      name: name.trim(),
      userId: parsedUserId,
      managerId
    });

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
  return workoutsRepository.listActiveWorkoutsByUser(userId);
}

function getWorkoutsManager(userId, managerId) {
  const parsedUserId = parsePositiveInt(userId);
  if (!parsedUserId) {
    return {
      status: 400,
      error: 'userId inválido'
    };
  }

  const workouts = workoutsRepository.listManagerWorkoutsByUser(parsedUserId, managerId);
  if (workouts.length === 0) {
    return {
      status: 404,
      error: 'Este usuario no tiene entrenamientos'
    };
  }

  return workouts;
}

function getUserDashboard(userId) {
  try {
    const workouts = workoutsRepository.listDashboardWorkoutsByUser(userId);

    return workouts.map((workout) => ({
      id: workout.id,
      name: workout.name,
      exercises: workoutsRepository.listActiveExercisesByWorkout(workout.id).map((exercise) => ({
        ...exercise,
        last_log: workoutsRepository.getLastLogByMovementAndUser(exercise.movement_id, userId) || null
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

  const user = workoutsRepository.getUserManagedByManager(parsedUserId, managerId);
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

  const ownership = workoutsRepository.getActiveWorkoutOwnedByManager(id, managerId);
  if (!ownership) {
    return {
      status: 403,
      error: 'Este entrenamiento no pertenece a este manager'
    };
  }

  try {
    const result = workoutsRepository.archiveWorkoutAndExercises(id);
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

  const ownership = workoutsRepository.getActiveWorkoutOwnedByManager(id, managerId);
  if (!ownership) {
    return {
      status: 403,
      error: 'Este entrenamiento no pertenece a este manager'
    };
  }

  try {
    workoutsRepository.renameWorkout(id, name);

    const workout = workoutsRepository.getActiveWorkoutById(id);

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
