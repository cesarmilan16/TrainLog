const { initSchema, seedExampleData, closeDb } = require('../config/database/db');

initSchema();
seedExampleData();
closeDb();

console.log('Seed ejecutado (solo si la DB estaba vacía).');
