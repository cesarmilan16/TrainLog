// app.js
const express = require('express');
const Database = require('better-sqlite3');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());

// ======================
// Base de datos
// ======================
const db = new Database('trainlog.db');

// Crear tabla si no existe
db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  )
`).run();

// Usuario de prueba
db.prepare(`
  INSERT OR IGNORE INTO users (email, password)
  VALUES (?, ?)
`).run('demo@trainlog.com', '1234');

// ======================
// Rutas
// ======================

// Ruta de prueba
app.get('/', (req, res) => {
  res.send('TrainLog API funcionando');
});

// Obtener todos los usuarios
app.get('/users', (req, res) => {
  const users = db.prepare('SELECT id, email FROM users').all();
  res.json(users);
});

// Crear usuario
app.post('/users', (req, res) => {
  const { email, password } = req.body;

  try {
    const stmt = db.prepare(`
      INSERT INTO users (email, password)
      VALUES (?, ?)
    `);

    const result = stmt.run(email, password);

    res.json({
      message: 'Usuario creado',
      id: result.lastInsertRowid
    });
  } catch (error) {
    res.status(400).json({
      error: 'El usuario ya existe o datos inválidos'
    });
  }
});

// ======================
// Servidor
// ======================
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
