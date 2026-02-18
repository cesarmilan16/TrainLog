const express = require('express');

const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const {
  newWorkout,
  getMyWorkouts,
  getWorkoutsManager,
  getUserDashboard,
  getManagerDashboard,
  deleteWorkout,
  updateWorkout
} = require('../data/workouts.data');
const { handleResult } = require('../utils/respond');

const router = express.Router();

router.post('/', auth, authorize('MANAGER'), (req, res) => {
  const result = newWorkout(req.body, req.user.id);
  return handleResult(res, result, (data) => ({ message: data.message, id: data.id }), 201);
});

router.get('/my', auth, authorize('USER'), (req, res) => {
  const result = getMyWorkouts(req.user.id);
  return handleResult(res, result, (data) => ({ message: 'Entrenamientos del usuario', data }));
});

router.get('/user/:userId', auth, authorize('MANAGER'), (req, res) => {
  const result = getWorkoutsManager(req.params.userId, req.user.id);
  return handleResult(res, result, (data) => ({ message: 'Entrenamientos del manager', data }));
});

router.get('/dashboard', auth, authorize('USER'), (req, res) => {
  const result = getUserDashboard(req.user.id);
  return handleResult(res, result, (data) => ({ data }));
});

router.get('/manager/:userId/dashboard', auth, authorize('MANAGER'), (req, res) => {
  const result = getManagerDashboard(req.params.userId, req.user.id);
  return handleResult(res, result, (data) => ({ data }));
});

router.delete('/:workoutId', auth, authorize('MANAGER'), (req, res) => {
  const result = deleteWorkout(req.params.workoutId, req.user.id);
  return handleResult(res, result, (data) => ({ data }));
});

router.put('/:workoutId', auth, authorize('MANAGER'), (req, res) => {
  const result = updateWorkout(req.params.workoutId, req.body, req.user.id);
  return handleResult(res, result, (data) => ({ message: data.message, data: data.data }));
});

module.exports = router;
