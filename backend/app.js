// app.js
const express = require('express');
const routeUsers = require('./routes/users.routes')
const routeWorkouts = require('./routes/workout.routes')

const app = express();

// Middleware
app.use(express.json());

// Rutas
app.use('/users', routeUsers);
app.use('/workouts', routeWorkouts);

module.exports = app;
