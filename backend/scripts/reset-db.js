const fs = require('fs');

const { DB_PATH } = require('../data/db-path');

if (fs.existsSync(DB_PATH)) {
  fs.unlinkSync(DB_PATH);
}

const { initSchema, seedExampleData, closeDb } = require('../data/db');

initSchema();
seedExampleData({ reset: true });
closeDb();

console.log(`Base de datos recreada en: ${DB_PATH}`);
