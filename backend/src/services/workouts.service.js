const workoutsRepository = require('../repositories/workouts.repository');
const { parsePositiveInt, isSqliteUniqueError } = require('../shared/utils/data.helpers');

function newWorkout(data, managerId) {
  const { name, userId, mesocycleId } = data;

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
    const parsedMesocycleId = mesocycleId === undefined || mesocycleId === null
      ? null
      : parsePositiveInt(mesocycleId);

    if (mesocycleId !== undefined && mesocycleId !== null && !parsedMesocycleId) {
      return {
        status: 400,
        error: 'mesocycleId inválido'
      };
    }

    if (parsedMesocycleId) {
      const mesocycle = workoutsRepository.getMesocycleByIdForUser(parsedMesocycleId, parsedUserId);
      if (!mesocycle) {
        return {
          status: 400,
          error: 'Este mesociclo no pertenece al usuario'
        };
      }
    }

    const result = parsedMesocycleId
      ? workoutsRepository.insertWorkoutWithMesocycle({
        name: name.trim(),
        userId: parsedUserId,
        managerId,
        mesocycleId: parsedMesocycleId
      })
      : workoutsRepository.insertWorkout({
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

function parseDashboardMesocycleFilter(value) {
  if (value === undefined || value === null || value === '') {
    return { value: undefined };
  }

  if (String(value).toLowerCase() === 'none') {
    return { value: null };
  }

  const parsed = parsePositiveInt(value);
  if (!parsed) {
    return { error: 'mesocycleId inválido' };
  }

  return { value: parsed };
}

function getUserDashboard(userId, mesocycleId) {
  const parsedFilter = parseDashboardMesocycleFilter(mesocycleId);
  if (parsedFilter.error) {
    return {
      status: 400,
      error: parsedFilter.error
    };
  }

  try {
    const workouts = workoutsRepository.listDashboardWorkoutsByUser(userId, parsedFilter.value);

    return workouts.map((workout) => ({
      id: workout.id,
      name: workout.name,
      mesocycle_id: workout.mesocycle_id ?? null,
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

function getManagerDashboard(userId, managerId, mesocycleId) {
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

  return getUserDashboard(parsedUserId, mesocycleId);
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

    if (payload?.mesocycleId !== undefined) {
      const parsedMesocycleId = payload.mesocycleId === null
        ? null
        : parsePositiveInt(payload.mesocycleId);

      if (payload.mesocycleId !== null && !parsedMesocycleId) {
        return {
          status: 400,
          error: 'mesocycleId inválido'
        };
      }

      if (parsedMesocycleId) {
        const mesocycle = workoutsRepository.getMesocycleByIdForUser(parsedMesocycleId, ownership.user_id);
        if (!mesocycle) {
          return {
            status: 400,
            error: 'Este mesociclo no pertenece al usuario'
          };
        }
      }

      workoutsRepository.setWorkoutMesocycle(id, parsedMesocycleId);
    }

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
