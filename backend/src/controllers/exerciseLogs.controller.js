const exerciseLogsService = require('../services/exerciseLogs.service');
const { handleResult } = require('../shared/utils/respond');

function addLog(req, res) {
  const result = exerciseLogsService.addLog(req.body, req.user.id);
  return handleResult(res, result, (data) => ({ message: data.message, id: data.id }), 201);
}

function updateLog(req, res) {
  const result = exerciseLogsService.updateLog(req.params.logId, req.body, req.user.id);
  return handleResult(res, result, (data) => ({ message: data.message }));
}

function deleteLog(req, res) {
  const result = exerciseLogsService.deleteLog(req.params.logId, req.user.id);
  return handleResult(res, result, (data) => ({ message: data.message }));
}

function getLog(req, res) {
  const result = exerciseLogsService.getLog(req.params.id, req.user.id);
  return handleResult(res, result, (data) => ({ message: 'Logs del ejercicio', result: data }));
}

function getLastLog(req, res) {
  const result = exerciseLogsService.getLastLog(req.params.exerciseId, req.user.id);
  return handleResult(res, result, (data) => data);
}

module.exports = {
  addLog,
  updateLog,
  deleteLog,
  getLog,
  getLastLog
};
