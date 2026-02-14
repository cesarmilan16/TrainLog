// app.js
const express = require('express');
const routeUsers = require('./routes/users.routes');
const routeWorkouts = require('./routes/workouts.routes');
const routeExercises = require('./routes/exercises.routes');
const routeLog = require('./routes/exerciseLogs.route');


const app = express();

// Middleware
app.use(express.json());

// Rutas
app.use('/users', routeUsers);
app.use('/workouts', routeWorkouts);
app.use('/exercises', routeExercises);
app.use('/logs', routeLog);

module.exports = app;
