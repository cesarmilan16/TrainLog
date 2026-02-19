const express = require('express');

const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const controller = require('../controllers/workouts.controller');

const router = express.Router();

router.post('/', auth, authorize('MANAGER'), controller.newWorkout);
router.get('/my', auth, authorize('USER'), controller.getMyWorkouts);
router.get('/user/:userId', auth, authorize('MANAGER'), controller.getWorkoutsManager);
router.get('/dashboard', auth, authorize('USER'), controller.getUserDashboard);
router.get('/manager/:userId/dashboard', auth, authorize('MANAGER'), controller.getManagerDashboard);
router.delete('/:workoutId', auth, authorize('MANAGER'), controller.deleteWorkout);
router.put('/:workoutId', auth, authorize('MANAGER'), controller.updateWorkout);

module.exports = router;
