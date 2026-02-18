const express = require('express');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { addExercise, getExercises, deleteExercise } = require('../data/exercises.data');


const router = express.Router();

//Crear ejercicio
router.post('/', auth, authorize('MANAGER'), (req, res) => {
    const result = addExercise(req.body, req.user.id);

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

// Ver ejercicios
router.get('/:workoutId', auth, authorize('MANAGER'), (req, res) => {
    const result = getExercises(req.params.workoutId, req.user.id);

    if (result.error) {
        const status = result.status ?? 400;
        return res.status(status).json({
            message: result.error
        });
    }

    res.status(200).json({
        message: "Ejercicios:",
        data: result
    })
});

// Borrar ejercicios
router.delete('/:exerciseId', auth, authorize('MANAGER'), (req, res) => {
    const result = deleteExercise(req.params.exerciseId, req.user.id);

    if (result.error) {
        const status = result.status ?? 400;
        return res.status(status).json({
            message: result.error
        });
    }

    res.status(200).json({
        message: "Ejercicio eliminado",
        data: result
    })
});

module.exports = router;