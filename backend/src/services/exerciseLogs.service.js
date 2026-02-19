const exerciseLogsRepository = require('../repositories/exerciseLogs.repository');

module.exports = {
  addLog: exerciseLogsRepository.addLog,
  getLog: exerciseLogsRepository.getLog,
  getLastLog: exerciseLogsRepository.getLastLog
};
