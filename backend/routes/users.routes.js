const express = require('express');
const { getUsers, registrerUser, login } = require('../data/users.data');
const auth = require('../middleware/auth');

const router = express.Router();

//Obtener todos los usuarios
router.get('/', (req, res) => {
    const users = getUsers();
    res.json(users);
});

// Crear usuario
router.post('/', auth, (req, res) => {
    const result = registrerUser(req.body, req.user.id);

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

router.get('/profile', auth, (req, res) => {
    res.json({
        message: 'Acceso permitido',
        user: req.user
    });
});

module.exports = router;
