const express = require('express');

const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const controller = require('../controllers/users.controller');

const router = express.Router();

router.get('/', controller.getUsers);
router.post('/', auth, authorize('MANAGER'), controller.registrerUser);
router.post('/login', controller.login);
router.get('/clients', auth, authorize('MANAGER'), controller.getClients);
router.get('/profile', auth, controller.getProfile);
router.get('/manager/clients', auth, authorize('MANAGER'), controller.getManagerClients);
router.put('/:userId', auth, authorize('MANAGER'), controller.updateClient);
router.delete('/:userId', auth, authorize('MANAGER'), controller.deleteClient);

module.exports = router;
