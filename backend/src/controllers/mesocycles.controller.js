const mesocyclesService = require('../services/mesocycles.service');
const { handleResult } = require('../shared/utils/respond');

function createMesocycle(req, res) {
  const result = mesocyclesService.createMesocycle(req.body, req.user.id);
  return handleResult(res, result, (data) => ({ message: data.message, id: data.id }), 201);
}

function getMyMesocycles(req, res) {
  const result = mesocyclesService.getMesocyclesForUser(req.user.id);
  return handleResult(res, result, (data) => ({ data }));
}

function getManagerUserMesocycles(req, res) {
  const result = mesocyclesService.getMesocyclesForManagerUser(req.params.userId, req.user.id);
  return handleResult(res, result, (data) => ({ data }));
}

function updateMesocycle(req, res) {
  const result = mesocyclesService.updateMesocycle(req.params.mesocycleId, req.body, req.user.id);
  return handleResult(res, result, (data) => ({ message: data.message }));
}

function deleteMesocycle(req, res) {
  const result = mesocyclesService.deleteMesocycle(req.params.mesocycleId, req.user.id);
  return handleResult(res, result, (data) => ({ message: data.message }));
}

function getMyMesocycleWorkouts(req, res) {
  const result = mesocyclesService.getMyMesocycleWorkouts(req.params.mesocycleId, req.user.id);
  return handleResult(res, result, (data) => ({ data }));
}

function getManagerUserMesocycleWorkouts(req, res) {
  const result = mesocyclesService.getManagerUserMesocycleWorkouts(
    req.params.userId,
    req.params.mesocycleId,
    req.user.id
  );
  return handleResult(res, result, (data) => ({ data }));
}

module.exports = {
  createMesocycle,
  getMyMesocycles,
  getManagerUserMesocycles,
  updateMesocycle,
  deleteMesocycle,
  getMyMesocycleWorkouts,
  getManagerUserMesocycleWorkouts
};
