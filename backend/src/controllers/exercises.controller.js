const exercisesService = require('../services/exercises.service');
const { handleResult } = require('../shared/utils/respond');

function addExercise(req, res) {
  const result = exercisesService.addExercise(req.body, req.user.id);
  return handleResult(res, result, (data) => ({ message: data.message, id: data.id }), 201);
}

function getExercises(req, res) {
  const result = exercisesService.getExercises(req.params.workoutId, req.user.id);
  return handleResult(res, result, (data) => ({ message: 'Ejercicios:', data }));
}

function deleteExercise(req, res) {
  const result = exercisesService.deleteExercise(req.params.exerciseId, req.user.id);
  return handleResult(res, result, (data) => ({ message: 'Ejercicio eliminado', data }));
}

function updateExercise(req, res) {
  const result = exercisesService.updateExercise(req.params.exerciseId, req.body, req.user.id);
  return handleResult(res, result, (data) => ({ message: data.message, data: data.data }));
}

function getMovementSuggestions(req, res) {
  const result = exercisesService.getMovementSuggestions(
    req.params.userId,
    req.user.id,
    req.query.q
  );
  return handleResult(res, result, (data) => ({ data }));
}

module.exports = {
  addExercise,
  getExercises,
  deleteExercise,
  updateExercise,
  getMovementSuggestions
};
