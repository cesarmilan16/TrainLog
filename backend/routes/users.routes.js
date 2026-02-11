const express = require('express');
const { getUsers, addUser, login } = require('../data/users.data');
const router = express.Router();

//Obtener todos los usuarios
router.get('/', (req, res) => {
    const users = getUsers();
    res.json(users);
});

// Crear usuario
router.post('/', (req, res) => {
    const result = addUser(req.body);

    // Errores de validación o negocio
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

router.post('/login', (req, res) => {
    const result = login(req.body);

    // Errores de validación o negocio
    if (result.error) {
        const status = result.status ?? 400;
        return res.status(status).json({ 
            message: result.error 
        });
    };

    res.status(200).json({
        message: result.message,
        id: result.id,
        email: result.email,
        token: result.token
    })
});

module.exports = router;
