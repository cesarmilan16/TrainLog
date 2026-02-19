const workoutsService = require('../services/workouts.service');
const { handleResult } = require('../shared/utils/respond');

function newWorkout(req, res) {
  const result = workoutsService.newWorkout(req.body, req.user.id);
  return handleResult(res, result, (data) => ({ message: data.message, id: data.id }), 201);
}

function getMyWorkouts(req, res) {
  const result = workoutsService.getMyWorkouts(req.user.id);
  return handleResult(res, result, (data) => ({ message: 'Entrenamientos del usuario', data }));
}

function getWorkoutsManager(req, res) {
  const result = workoutsService.getWorkoutsManager(req.params.userId, req.user.id);
  return handleResult(res, result, (data) => ({ message: 'Entrenamientos del manager', data }));
}

function getUserDashboard(req, res) {
  const result = workoutsService.getUserDashboard(req.user.id);
  return handleResult(res, result, (data) => ({ data }));
}

function getManagerDashboard(req, res) {
  const result = workoutsService.getManagerDashboard(req.params.userId, req.user.id);
  return handleResult(res, result, (data) => ({ data }));
}

function deleteWorkout(req, res) {
  const result = workoutsService.deleteWorkout(req.params.workoutId, req.user.id);
  return handleResult(res, result, (data) => ({ data }));
}

function updateWorkout(req, res) {
  const result = workoutsService.updateWorkout(req.params.workoutId, req.body, req.user.id);
  return handleResult(res, result, (data) => ({ message: data.message, data: data.data }));
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
