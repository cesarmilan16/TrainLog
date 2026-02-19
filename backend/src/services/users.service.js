const usersRepository = require('../repositories/users.repository');

module.exports = {
  getUsers: usersRepository.getUsers,
  registrerUser: usersRepository.registrerUser,
  login: usersRepository.login,
  getClients: usersRepository.getClients,
  getManagerClients: usersRepository.getManagerClients,
  updateClient: usersRepository.updateClient,
  deleteClient: usersRepository.deleteClient
};
