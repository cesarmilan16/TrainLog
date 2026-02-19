const express = require('express');

const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const controller = require('../controllers/exerciseLogs.controller');

const router = express.Router();

router.post('/', auth, authorize('USER'), controller.addLog);
router.put('/item/:logId', auth, authorize('USER'), controller.updateLog);
router.delete('/item/:logId', auth, authorize('USER'), controller.deleteLog);
router.get('/:id', auth, authorize('USER'), controller.getLog);
router.get('/:exerciseId/last', auth, authorize('USER'), controller.getLastLog);

module.exports = router;
