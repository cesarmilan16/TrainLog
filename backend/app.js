// app.js
const express = require('express');
const routeUsers = require('./routes/users.routes')

const app = express();

// Middleware
app.use(express.json());

// Rutas
app.use('/users', routeUsers);

module.exports = app;
