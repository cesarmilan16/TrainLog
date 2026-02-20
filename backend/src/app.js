// app.js
const express = require('express');
const routeUsers = require('./routes/users.routes');
const routeWorkouts = require('./routes/workouts.routes');
const routeExercises = require('./routes/exercises.routes');
const routeLog = require('./routes/exerciseLogs.routes');
const routeMesocycles = require('./routes/mesocycles.routes');

const app = express();

// Middleware
app.use(express.json());

// Rutas
app.use('/users', routeUsers);
app.use('/workouts', routeWorkouts);
app.use('/exercises', routeExercises);
app.use('/logs', routeLog);
app.use('/mesocycles', routeMesocycles);

app.use((_req, res) => {
  return res.status(404).json({ message: 'Ruta no encontrada' });
});

// eslint-disable-next-line no-unused-vars
app.use((error, _req, res, _next) => {
  console.error(error);

  if (res.headersSent) {
    return;
  }

  return res.status(error?.status || 500).json({
    message: error?.message || 'Error interno'
  });
});

module.exports = app;
