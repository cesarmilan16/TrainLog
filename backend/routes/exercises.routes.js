const express = require('express');

const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { addExercise, getExercises, deleteExercise, updateExercise } = require('../data/exercises.data');
const { handleResult } = require('../utils/respond');

const router = express.Router();

router.post('/', auth, authorize('MANAGER'), (req, res) => {
  const result = addExercise(req.body, req.user.id);
  return handleResult(res, result, (data) => ({ message: data.message, id: data.id }), 201);
});

router.get('/:workoutId', auth, authorize('MANAGER'), (req, res) => {
  const result = getExercises(req.params.workoutId, req.user.id);
  return handleResult(res, result, (data) => ({ message: 'Ejercicios:', data }));
});

router.delete('/:exerciseId', auth, authorize('MANAGER'), (req, res) => {
  const result = deleteExercise(req.params.exerciseId, req.user.id);
  return handleResult(res, result, (data) => ({ message: 'Ejercicio eliminado', data }));
});

router.put('/:exerciseId', auth, authorize('MANAGER'), (req, res) => {
  const result = updateExercise(req.params.exerciseId, req.body, req.user.id);
  return handleResult(res, result, (data) => ({ message: data.message, data: data.data }));
});

module.exports = router;
