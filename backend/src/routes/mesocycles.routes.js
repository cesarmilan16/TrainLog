const express = require('express');

const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const controller = require('../controllers/mesocycles.controller');

const router = express.Router();

router.post('/', auth, authorize('MANAGER'), controller.createMesocycle);
router.get('/my', auth, authorize('USER'), controller.getMyMesocycles);
router.get('/my/:mesocycleId/workouts', auth, authorize('USER'), controller.getMyMesocycleWorkouts);
router.get('/user/:userId', auth, authorize('MANAGER'), controller.getManagerUserMesocycles);
router.get('/user/:userId/:mesocycleId/workouts', auth, authorize('MANAGER'), controller.getManagerUserMesocycleWorkouts);
router.put('/:mesocycleId', auth, authorize('MANAGER'), controller.updateMesocycle);
router.delete('/:mesocycleId', auth, authorize('MANAGER'), controller.deleteMesocycle);

module.exports = router;
