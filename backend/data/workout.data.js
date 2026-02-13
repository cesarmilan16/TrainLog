const Database = require('better-sqlite3');


const db = new Database('trainlog.db');

// Crear tabla si no existe
db.prepare(`
  CREATE TABLE IF NOT EXISTS workouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    user_id INTEGER NOT NULL,
    manager_id INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (manager_id) REFERENCES users(id)
    )
`).run();

function newWorkout(data, managerId) {
    const { name, userId } = data;

    // Preparamos la query
    const stmt = db.prepare(`
            SELECT id, manager_id FROM users
            WHERE id = ? AND manager_id = ?
        `);

    const result = stmt.get(userId, managerId)

    // Si el usuario no lo pertenece al manager salta error
    if (!result) {
        return {
            status: 403,
            error: 'Este usuario no pertenece a tu cuenta'
        };
    };

    try {
        const stmt = db.prepare(`
                INSERT INTO workouts (name, user_id, manager_id)
                VALUES (?, ?, ?)
            `);

        const result = stmt.run(name, userId, managerId);

        return {
            message: 'Entrenamiento creado',
            id: result.lastInsertRowid
        };
    } catch (error) {
        console.error(error)
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return {
                status: 409,
                error: 'El entrenamiento ya está registrado'
            };
        }

        return {
            status: 500,
            error: 'Error interno'
        };
    }

}

module.exports = { newWorkout };