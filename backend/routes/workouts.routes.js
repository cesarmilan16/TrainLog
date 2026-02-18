const express = require('express');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { newWorkout, getMyWorkouts, getWorkoutsManager, getUserDashboard, getManagerDashboard } = require('../data/workouts.data');

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
    });
});

//Obtener entrenamientos del usuario
router.get('/my', auth, authorize('USER'), (req, res) => {
    const result = getMyWorkouts(req.user.id);

    if (result.error) {
        const status = result.status ?? 400;
        return res.status(status).json({
            message: result.error
        });
    };

    res.status(200).json({
        message: "Entrenamientos del usuario",
        data: result
    });
});

router.get('/user/:userId', auth, authorize('MANAGER'), (req, res) => {
    const result = getWorkoutsManager(req.params.userId, req.user.id);    

    if (result.error) {
        const status = result.status ?? 400;
        return res.status(status).json({
            message: result.error
        });
    };

    res.status(200).json({
        message: "Entrenamientos del manager",
        data: result
    });
});

router.get('/dashboard', auth, authorize('USER'), (req, res) => {
    const result = getUserDashboard(req.user.id);

    if (result.error) {
        const status = result.status ?? 400;
        return res.status(status).json({
            message: result.error
        });
    };

    res.status(200).json({
        data: result
    });
});

router.get('/manager/:userId/dashboard', auth, authorize('MANAGER'), (req, res) => {
    const result = getManagerDashboard(req.params.userId, req.user.id);

    if (result.error) {
        const status = result.status ?? 400;
        return res.status(status).json({
            message: result.error
        });
    };

    res.status(200).json({
        data: result
    });
});

// Ruta para eliminar


module.exports = router;