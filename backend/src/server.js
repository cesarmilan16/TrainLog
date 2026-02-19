require('dotenv').config();

const app = require('./app');
const { initSchema, seedExampleData } = require('./config/database/db');

const PORT = process.env.PORT || 3000;
const SHOULD_SEED_ON_BOOT = process.env.SEED_ON_BOOT === 'true';

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET no está definido. Configúralo en backend/.env');
  process.exit(1);
}

initSchema();

if (SHOULD_SEED_ON_BOOT) {
  seedExampleData();
}

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  if (SHOULD_SEED_ON_BOOT) {
    console.log('Seed automático habilitado (SEED_ON_BOOT=true).');
  }
});
