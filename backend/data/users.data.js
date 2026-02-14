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
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'USER',
    manager_id INTEGER,
    FOREIGN KEY (manager_id) REFERENCES users(id)
    )
`).run();

const demoHash = bcrypt.hashSync('1234', 10);

// Usuario de prueba
db.prepare(`
  INSERT OR IGNORE INTO users (email, password, name, role)
  VALUES (?, ?, ?, ?)
`).run('demo@trainlog.com', demoHash, 'Demo', 'MANAGER');

// Función para obtener usuarios
function getUsers() {
    return db.prepare('SELECT id, email, name, role, manager_id FROM users').all();
};

// Función para crear usuarios
function registrerUser(user, managerId) {
    const { email, password, name } = user;

    // Validación de los campos email y password
    if (!email || !password || !name) {
        return {
            status: 400,
            error: 'Email, password y name son obligatorios'
        };
    }

    try {
        // Preparamos la query
        const stmt = db.prepare(`
            INSERT INTO users (email, password, name, role, manager_id)
            VALUES (?, ?, ?, 'USER', ?)
        `);

        // Encriptamos la contraseña
        const hashedPassword = bcrypt.hashSync(password, 10);
        // Cogemos el resultado de la query
        const result = stmt.run(email, hashedPassword, name, managerId);

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
            SELECT id, email, password, role FROM users
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

        // Generar JWT
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role
            },
            JWT_SECRET,
            { expiresIn: '7d' } // duración
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

function getClients(managerId) {
    // Preparamos la query
    const stmt = db.prepare(`
            SELECT id, email FROM users
            WHERE  manager_id = ? 
        `);

    const result = stmt.all(managerId)

    if (!result) {
        return {
            status: 400,
            error: 'No hay usuarios'
        }
    }

    return result;
};

module.exports = { getUsers, registrerUser, login, getClients };
