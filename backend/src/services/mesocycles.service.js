const mesocyclesRepository = require('../repositories/mesocycles.repository');
const { parsePositiveInt } = require('../shared/utils/data.helpers');

const VALID_STATUSES = new Set(['PLANNED', 'ACTIVE', 'COMPLETED']);

function parseIsoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : value;
}

function validatePayload(payload) {
  const name = payload?.name?.trim();
  const goal = payload?.goal?.trim();
  const startDate = parseIsoDate(payload?.startDate);
  const endDate = parseIsoDate(payload?.endDate);
  const status = String(payload?.status ?? '').toUpperCase();

  if (!name || !goal || !startDate || !endDate || !VALID_STATUSES.has(status)) {
    return {
      error: {
        status: 400,
        error: 'Datos de mesociclo inválidos'
      }
    };
  }

  if (new Date(`${endDate}T00:00:00Z`) < new Date(`${startDate}T00:00:00Z`)) {
    return {
      error: {
        status: 400,
        error: 'La fecha de fin no puede ser anterior a inicio'
      }
    };
  }

  return {
    value: { name, goal, startDate, endDate, status }
  };
}

function createMesocycle(payload, managerId) {
  const userId = parsePositiveInt(payload?.userId);
  if (!userId) {
    return {
      status: 400,
      error: 'userId inválido'
    };
  }

  const validation = validatePayload(payload);
  if (validation.error) {
    return validation.error;
  }

  const ownedUser = mesocyclesRepository.getManagerOwnedUser(userId, managerId);
  if (!ownedUser) {
    return {
      status: 403,
      error: 'Este usuario no pertenece al manager'
    };
  }

  try {
    const result = mesocyclesRepository.insertMesocycle({
      ...validation.value,
      userId
    });

    return {
      message: 'Mesociclo creado',
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

function getMesocyclesForUser(userId) {
  return mesocyclesRepository.listMesocyclesByUser(userId).map((item) => ({
    id: item.id,
    name: item.name,
    goal: item.goal,
    startDate: item.start_date,
    endDate: item.end_date,
    status: item.status,
    userId: item.user_id
  }));
}

function getMesocyclesForManagerUser(userId, managerId) {
  const parsedUserId = parsePositiveInt(userId);
  if (!parsedUserId) {
    return {
      status: 400,
      error: 'userId inválido'
    };
  }

  const ownedUser = mesocyclesRepository.getManagerOwnedUser(parsedUserId, managerId);
  if (!ownedUser) {
    return {
      status: 403,
      error: 'Este usuario no pertenece al manager'
    };
  }

  return getMesocyclesForUser(parsedUserId);
}

function updateMesocycle(mesocycleId, payload, managerId) {
  const id = parsePositiveInt(mesocycleId);
  if (!id) {
    return {
      status: 400,
      error: 'mesocycleId inválido'
    };
  }

  const validation = validatePayload(payload);
  if (validation.error) {
    return validation.error;
  }

  const ownedMesocycle = mesocyclesRepository.getMesocycleByIdForManager(id, managerId);
  if (!ownedMesocycle) {
    return {
      status: 403,
      error: 'Este mesociclo no pertenece al manager'
    };
  }

  try {
    mesocyclesRepository.updateMesocycle({
      mesocycleId: id,
      ...validation.value
    });

    return {
      message: 'Mesociclo actualizado'
    };
  } catch (error) {
    console.error(error);
    return {
      status: 500,
      error: 'Error interno'
    };
  }
}

function deleteMesocycle(mesocycleId, managerId) {
  const id = parsePositiveInt(mesocycleId);
  if (!id) {
    return {
      status: 400,
      error: 'mesocycleId inválido'
    };
  }

  const ownedMesocycle = mesocyclesRepository.getMesocycleByIdForManager(id, managerId);
  if (!ownedMesocycle) {
    return {
      status: 403,
      error: 'Este mesociclo no pertenece al manager'
    };
  }

  try {
    mesocyclesRepository.clearWorkoutsMesocycle(id);
    mesocyclesRepository.deleteMesocycle(id);

    return {
      message: 'Mesociclo eliminado'
    };
  } catch (error) {
    console.error(error);
    return {
      status: 500,
      error: 'Error interno'
    };
  }
}

function getMyMesocycleWorkouts(mesocycleId, userId) {
  const id = parsePositiveInt(mesocycleId);
  if (!id) {
    return {
      status: 400,
      error: 'mesocycleId inválido'
    };
  }

  const owned = mesocyclesRepository.getMesocycleByIdForUser(id, userId);
  if (!owned) {
    return {
      status: 403,
      error: 'Este mesociclo no pertenece al usuario'
    };
  }

  return mesocyclesRepository.listWorkoutsByMesocycle(userId, id);
}

function getManagerUserMesocycleWorkouts(userId, mesocycleId, managerId) {
  const parsedUserId = parsePositiveInt(userId);
  const parsedMesocycleId = parsePositiveInt(mesocycleId);

  if (!parsedUserId) {
    return {
      status: 400,
      error: 'userId inválido'
    };
  }

  if (!parsedMesocycleId) {
    return {
      status: 400,
      error: 'mesocycleId inválido'
    };
  }

  const ownedUser = mesocyclesRepository.getManagerOwnedUser(parsedUserId, managerId);
  if (!ownedUser) {
    return {
      status: 403,
      error: 'Este usuario no pertenece al manager'
    };
  }

  const mesocycle = mesocyclesRepository.getMesocycleByIdForUser(parsedMesocycleId, parsedUserId);
  if (!mesocycle) {
    return {
      status: 404,
      error: 'Mesociclo no encontrado para este usuario'
    };
  }

  return mesocyclesRepository.listManagerUserWorkoutsByMesocycle(parsedUserId, managerId, parsedMesocycleId);
}

module.exports = {
  createMesocycle,
  getMesocyclesForUser,
  getMesocyclesForManagerUser,
  updateMesocycle,
  deleteMesocycle,
  getMyMesocycleWorkouts,
  getManagerUserMesocycleWorkouts
};
