const usersService = require('../services/users.service');
const { handleResult } = require('../shared/utils/respond');

function getUsers(_req, res) {
  const users = usersService.getUsers();
  return res.json(users);
}

function registrerUser(req, res) {
  const result = usersService.registrerUser(req.body, req.user.id);
  return handleResult(
    res,
    result,
    (data) => ({ message: data.message, id: data.id }),
    201
  );
}

function login(req, res) {
  const result = usersService.login(req.body);
  return handleResult(res, result, (data) => ({
    message: data.message,
    id: data.id,
    email: data.email,
    token: data.token
  }));
}

function getClients(req, res) {
  const data = usersService.getClients(req.user.id);

  return res.status(200).json({
    message: 'Lista de clientes',
    data
  });
}

function getProfile(req, res) {
  return res.json({
    message: 'Acceso permitido',
    user: req.user
  });
}

function getManagerClients(req, res) {
  const result = usersService.getManagerClients(req.user.id);
  return handleResult(res, result, (data) => ({ data }));
}

function updateClient(req, res) {
  const result = usersService.updateClient(req.params.userId, req.body, req.user.id);
  return handleResult(res, result, (data) => ({ message: data.message, data: data.data }));
}

function deleteClient(req, res) {
  const result = usersService.deleteClient(req.params.userId, req.user.id);
  return handleResult(res, result, (data) => ({ message: data.message }));
}

module.exports = {
  getUsers,
  registrerUser,
  login,
  getClients,
  getProfile,
  getManagerClients,
  updateClient,
  deleteClient
};
