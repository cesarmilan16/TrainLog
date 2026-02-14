const express = require('express');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { addLog, getLog, getLastLog } = require('../data/exerxiseLogs.data');

const router = express.Router();

// Crear log
router.post('/', auth, authorize('USER'), (req, res) => {
    const result = addLog(req.body, req.user.id);

    if (result.error) {
        const status = result.status ?? 400;
        return res.status(status).json({
            message: result.error
        });
    };

    res.status(201).json({
        message: result.message,
        id: result.id
    });
});

// Obtener logs
router.get('/:id', auth, authorize('USER'), (req, res) => {
    const result = getLog(req.params.id, req.user.id);

    if (result.error) {
        const status = result.status ?? 400;
        return res.status(status).json({
            message: result.error
        });
    };

    res.status(200).json({
        message: 'Logs del ejercicio',
        result
    });
});

// Obtener último log
router.get('/:exerciseId/last', auth, authorize('USER'), (req, res) => {
    const result = getLastLog(req.params.exerciseId, req.user.id);

    if (result.error) {
        const status = result.status ?? 400;
        return res.status(status).json({
            message: result.error
        });
    };

    res.status(200).json(result);
});

module.exports = router;
