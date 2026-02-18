const express = require('express');

const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const {
  getUsers,
  registrerUser,
  login,
  getClients,
  getManagerClients,
  updateClient,
  deleteClient
} = require('../data/users.data');
const { handleResult } = require('../utils/respond');

const router = express.Router();

router.get('/', (_req, res) => {
  const users = getUsers();
  return res.json(users);
});

router.post('/', auth, authorize('MANAGER'), (req, res) => {
  const result = registrerUser(req.body, req.user.id);
  return handleResult(
    res,
    result,
    (data) => ({ message: data.message, id: data.id }),
    201
  );
});

router.post('/login', (req, res) => {
  const result = login(req.body);
  return handleResult(res, result, (data) => ({
    message: data.message,
    id: data.id,
    email: data.email,
    token: data.token
  }));
});

router.get('/clients', auth, authorize('MANAGER'), (req, res) => {
  const data = getClients(req.user.id);

  return res.status(200).json({
    message: 'Lista de clientes',
    data
  });
});

router.get('/profile', auth, (req, res) => {
  return res.json({
    message: 'Acceso permitido',
    user: req.user
  });
});

router.get('/manager/clients', auth, authorize('MANAGER'), (req, res) => {
  const result = getManagerClients(req.user.id);
  return handleResult(res, result, (data) => ({ data }));
});

router.put('/:userId', auth, authorize('MANAGER'), (req, res) => {
  const result = updateClient(req.params.userId, req.body, req.user.id);
  return handleResult(res, result, (data) => ({ message: data.message, data: data.data }));
});

router.delete('/:userId', auth, authorize('MANAGER'), (req, res) => {
  const result = deleteClient(req.params.userId, req.user.id);
  return handleResult(res, result, (data) => ({ message: data.message }));
});

module.exports = router;
