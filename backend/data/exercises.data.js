const Database = require('better-sqlite3');


const db = new Database('trainlog.db');

// Crear tabla si no existe
db.prepare(`
  CREATE TABLE IF NOT EXISTS workout_exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    sets INTEGER NOT NULL,
    reps INTEGER NOT NULL,
    order_index INTEGER NOT NULL,
    workout_id INTEGER NOT NULL,
    FOREIGN KEY (workout_id) REFERENCES workouts(id),
    UNIQUE (workout_id, order_index)
    )
`).run();

function addExercise(data, managerId) {
    const { name, sets, reps, order_index: order, workoutId } = data

    if (!name || !name.trim() || sets == null || reps == null || order == null || !workoutId) {
        return {
            status: 400,
            error: 'Falta algún campo'
        };
    };

    // Preparamos la query
    const stmt = db.prepare(`
            SELECT id FROM workouts
            WHERE id = ? AND manager_id = ?
        `);

    const result = stmt.get(workoutId, managerId);

    if (!result) {
        return {
            status: 403,
            error: 'Este entrenamiento no pertenece al manager'
        };
    };

    try {
        const stmt = db.prepare(`
            INSERT INTO workout_exercises (name, sets, reps, order_index, workout_id)
            VALUES (?, ?, ?, ?, ?)
        `);

        const result = stmt.run(name, sets, reps, order, workoutId);

        return {
            message: 'Ejercicio creado',
            id: result.lastInsertRowid
        };

    } catch (error) {
        console.error(error);
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return {
                status: 409,
                error: "El orden debe ser único por workout"
            };
        };

        return {
            status: 500,
            error: 'Error interno'
        };
    };
};

function getExercises(workoutId, managerId) {

    if (!workoutId) {
        return {
            status: 400,
            error: 'Falta workoutId'
        };
    };

    // Preparamos la query
    const stmt = db.prepare(`
            SELECT id FROM workouts
            WHERE id = ? AND manager_id = ?
        `);

    const ownership = stmt.get(workoutId, managerId);

    if (!ownership) {
        return {
            status: 403,
            error: 'Este entrenamiento no pertenece al manager'
        };
    };

    try {
        const stmt = db.prepare(`
            SELECT * FROM workout_exercises
            WHERE workout_id = ?
            ORDER BY order_index
        `);

        const result = stmt.all(workoutId);

        return result

    } catch (error) {

        console.error(error);
        return {
            status: 500,
            message: 'Error interno'
        }
    }
}

module.exports = { addExercise, getExercises }