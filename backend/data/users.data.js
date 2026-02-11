const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');


const db = new Database('trainlog.db');
const JWT_SECRET = process.env.JWT_SECRET;


// Crear tabla si no existe
db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  )
`).run();

const demoHash = bcrypt.hashSync('1234', 10);

// Usuario de prueba
db.prepare(`
  INSERT OR IGNORE INTO users (email, password)
  VALUES (?, ?)
`).run('demo@trainlog.com', demoHash);

// Función para obtener usuarios
function getUsers() {
    return db.prepare('SELECT id, email FROM users').all();
};

// Función para crear usuarios
function addUser(user) {
    const { email, password } = user;

    // Validación de los campos email y password
    if (!email || !password) {
        return {
            status: 400,
            error: 'Email y password son obligatorios'
        };
    }

    try {
        // Preparamos la query
        const stmt = db.prepare(`
            INSERT INTO users (email, password)
            VALUES (?, ?)
    `);

        // Encriptamos la contraseña
        const hashedPassword = bcrypt.hashSync(password, 10);
        // Cogemos el resultado de la query
        const result = stmt.run(email, hashedPassword);

        // Si todo ha salido bien
        return {
            message: 'Usuario creado',
            id: result.lastInsertRowid
        };
    } catch (error) {
        // El mail tiene que ser único
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return {
                status: 409,
                error: 'El email ya está registrado'
            };
        }

        return {
            status: 500,
            error: 'Error interno'
        };
    }
}

function login({ email, password } = {}) {
    if (!email || !password) {
        return {
            status: 400,
            error: 'Email y password son obligatorios'
        }
    }

    try {
        const stmt = db.prepare(`
            SELECT id, email, password FROM users
            WHERE  email = ? 
        `);

        const user = stmt.get(email);

        if (!user) {
            return {
                status: 401,
                error: 'Credenciales incorrectas'
            };
        }

        const valid = bcrypt.compareSync(password, user.password);

        if (!valid) {
            return {
                status: 401,
                error: 'Credenciales incorrectas'
            }
        }

        // 🔐 Generar JWT
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email
            },
            JWT_SECRET,
            { expiresIn: '1h' } // duración
        );

        return {
            message: 'Login correcto',
            id: user.id,
            email: user.email,
            token
        };

    } catch (error) {
        return {
            status: 500,
            error: 'Error interno'
        }
    }
}

module.exports = { getUsers, addUser, login };
