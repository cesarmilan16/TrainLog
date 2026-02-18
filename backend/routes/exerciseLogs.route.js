const express = require('express');

const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { addLog, getLog, getLastLog } = require('../data/exerciseLogs.data');
const { handleResult } = require('../utils/respond');

const router = express.Router();

router.post('/', auth, authorize('USER'), (req, res) => {
  const result = addLog(req.body, req.user.id);
  return handleResult(res, result, (data) => ({ message: data.message, id: data.id }), 201);
});

router.get('/:id', auth, authorize('USER'), (req, res) => {
  const result = getLog(req.params.id, req.user.id);
  return handleResult(res, result, (data) => ({ message: 'Logs del ejercicio', result: data }));
});

router.get('/:exerciseId/last', auth, authorize('USER'), (req, res) => {
  const result = getLastLog(req.params.exerciseId, req.user.id);
  return handleResult(res, result, (data) => data);
});

module.exports = router;
