require('dotenv').config();

const app = require('./app');
const { initSchema, seedExampleData } = require('./data/db');

const PORT = 3000;

initSchema();
seedExampleData();

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
