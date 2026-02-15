const express = require('express');
const { getUsers, registrerUser, login, getClients, getManagerClients } = require('../data/users.data');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

const router = express.Router();

//Obtener todos los usuarios
router.get('/', (req, res) => {
    const users = getUsers();
    res.json(users);
});

// Crear usuario
router.post('/', auth, authorize('MANAGER'), (req, res) => {
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

// Inicia sesión
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

router.get('/clients', auth, authorize('MANAGER'), (req, res) => {
    const data = getClients(req.user.id);

    if (data.length === 0) {
        return res.status(data.status).json({ 
            message: data.error 
        });
    };

    res.status(200).json({
        message: 'Lista de clientes',
        data
    });
});

// endpoint para ver los datos del jwt
router.get('/profile', auth, (req, res) => {
    res.json({
        message: 'Acceso permitido',
        user: req.user
    });
});

router.get('/manager/clients', auth, authorize('MANAGER'), (req, res) => {

    const result = getManagerClients(req.user.id);

    if (result.error) {
        const status = result.status ?? 500;
        return res.status(status).json({
            message: result.error
        });
    }

    res.status(200).json({
        data: result
    });
});


module.exports = router;
