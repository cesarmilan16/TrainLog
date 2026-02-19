const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', '..', '..', 'trainlog.db');

module.exports = { DB_PATH };
