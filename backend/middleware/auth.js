const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

function auth(req, res, next) {
    const authHeader = req.headers.authorization;

    // Formato esperado: Bearer TOKEN
    if (!authHeader) {
        return res.status(401).json({
            message: 'Token requerido'
        });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            message: 'Token inválido'
        });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        // Guardamos el usuario en la request
        req.user = decoded;

        next(); // deja pasar a la ruta

    } catch (error) {
        console.error(error);
        return res.status(401).json({
            message: 'Token inválido o expirado'
        });
    }
}

module.exports = auth;