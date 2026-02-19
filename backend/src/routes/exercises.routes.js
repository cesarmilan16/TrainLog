const express = require('express');

const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const controller = require('../controllers/exercises.controller');

const router = express.Router();

router.get('/movements/:userId', auth, authorize('MANAGER'), controller.getMovementSuggestions);
router.post('/', auth, authorize('MANAGER'), controller.addExercise);
router.get('/:workoutId', auth, authorize('MANAGER'), controller.getExercises);
router.delete('/:exerciseId', auth, authorize('MANAGER'), controller.deleteExercise);
router.put('/:exerciseId', auth, authorize('MANAGER'), controller.updateExercise);

module.exports = router;
