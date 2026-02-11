const app = require('./app');

const PORT = 3000;

// ======================
// Servidor
// ======================
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
