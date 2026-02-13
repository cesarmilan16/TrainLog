const express = require('express');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { newWorkout } = require('../data/workout.data');

const router = express.Router();

//Crear entrenamiento
router.post('/', auth, authorize('MANAGER'), (req, res) => {
    const result = newWorkout(req.body, req.user.id);

    if (result.error) {
        const status = result.status ?? 400;
        return res.status(status).json({
            message: result.error
        });
    };

    res.status(201).json({
        message: result.message,
        id: result.id
    })

});

module.exports = router;