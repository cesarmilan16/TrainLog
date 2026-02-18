const { initSchema, seedExampleData, closeDb } = require('../data/db');

initSchema();
seedExampleData();
closeDb();

console.log('Seed ejecutado (solo si la DB estaba vacía).');
