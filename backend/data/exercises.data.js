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

function deleteExercise(exerciseId, managerId) {

    const id = Number(exerciseId);

    if (!id) {
        return {
            status: 400,
            error: 'Id inválido'
        };
    }

    // 1. Validar ownership
    const ownershipStmt = db.prepare(`
        SELECT we.id
        FROM workout_exercises we
        JOIN workouts w ON we.workout_id = w.id
        WHERE we.id = ?
        AND w.manager_id = ?
    `);

    const ownership = ownershipStmt.get(id, managerId);

    if (!ownership) {
        return {
            status: 403,
            error: 'Este ejercicio no pertenece a este manager'
        };
    }

    try {
        // 2. Borrar ejercicio
        const deleteStmt = db.prepare(`
            DELETE FROM workout_exercises
            WHERE id = ?
        `);

        const result = deleteStmt.run(id);

        return {
            message: 'Ejercicio eliminado',
            changes: result.changes
        };

    } catch (error) {
        console.error(error);
        return {
            status: 500,
            error: 'Error interno'
        };
    }
};

function updateExercise(exerciseId, data, managerId) {
    const id = Number(exerciseId);

    if (!id) {
        return {
            status: 400,
            error: 'Id inválido'
        };
    }

    // 1. Validar ownership
    const ownershipStmt = db.prepare(`
        SELECT we.id
        FROM workout_exercises we
        JOIN workouts w ON we.workout_id = w.id
        WHERE we.id = ?
        AND w.manager_id = ?
    `);

    const ownership = ownershipStmt.get(id, managerId);

    if (!ownership) {
        return {
            status: 403,
            error: 'Este ejercicio no pertenece a este manager'
        };
    }

    const updates = [];
    const values = [];

    if (data.name !== undefined) {
        if (!data.name || !data.name.trim()) {
            return {
                status: 400,
                error: 'Nombre inválido'
            };
        }

        updates.push('name = ?');
        values.push(data.name.trim());
    }

    if (data.sets !== undefined) {
        const sets = Number(data.sets);

        if (!Number.isInteger(sets) || sets <= 0) {
            return {
                status: 400,
                error: 'Sets inválido'
            };
        }

        updates.push('sets = ?');
        values.push(sets);
    }

    if (data.reps !== undefined) {
        const reps = Number(data.reps);

        if (!Number.isInteger(reps) || reps <= 0) {
            return {
                status: 400,
                error: 'Reps inválido'
            };
        }

        updates.push('reps = ?');
        values.push(reps);
    }

    if (data.order_index !== undefined) {
        const order = Number(data.order_index);

        if (!Number.isInteger(order) || order <= 0) {
            return {
                status: 400,
                error: 'Order inválido'
            };
        }

        updates.push('order_index = ?');
        values.push(order);
    }

    if (updates.length === 0) {
        return {
            status: 400,
            error: 'No hay campos para actualizar'
        };
    }

    try {
        const stmt = db.prepare(`
            UPDATE workout_exercises
            SET ${updates.join(', ')}
            WHERE id = ?
        `);

        stmt.run(...values, id);

        const selectStmt = db.prepare(`
            SELECT *
            FROM workout_exercises
            WHERE id = ?
        `);

        const exercise = selectStmt.get(id);

        return {
            message: 'Ejercicio actualizado',
            data: exercise
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


module.exports = { addExercise, getExercises, deleteExercise, updateExercise }
