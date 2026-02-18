const Database = require('better-sqlite3');


const db = new Database('trainlog.db');

// Crear tabla si no existe
db.prepare(`
  CREATE TABLE IF NOT EXISTS exercise_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    weight INTEGER NOT NULL,
    reps INTEGER NOT NULL,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER NOT NULL,
    exercise_id INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (exercise_id) REFERENCES workout_exercises(id) ON DELETE CASCADE
  )
`).run();

function addLog(data, userId) {
  const { exerciseId } = data;

  const weight = Number(data.weight);
  const reps = Number(data.reps);

  if (!exerciseId || isNaN(weight) || isNaN(reps)) {
    return {
      status: 400,
      error: 'Peso o repeticiones no son números válidos'
    };
  };

  if (weight <= 0 || reps <= 0) {
    return {
      status: 400,
      error: 'Número invalido de peso o repes'
    };
  }

  // Preparamos la query
  const ownershipStmt = db.prepare(`
            SELECT we.id
            FROM workout_exercises we
            JOIN workouts w ON we.workout_id = w.id
            WHERE we.id = ?
            AND w.user_id = ?
        `);

  const ownership = ownershipStmt.get(exerciseId, userId);

  if (!ownership) {
    return {
      status: 403,
      error: 'Este ejercicio no pertenece al usuario'
    };
  };

  try {

    // Preparamos la query
    const insertStmt = db.prepare(`
            INSERT INTO exercise_logs (weight, reps, user_id, exercise_id)
            VALUES (?, ?, ?, ?)
        `);

    const insertResults = insertStmt.run(weight, reps, userId, exerciseId);

    return {
      message: 'Log creado',
      id: insertResults.lastInsertRowid
    };

  } catch (error) {
    console.error(error);
    return {
      status: 500,
      error: 'Error interno'
    };
  };
};

function getLog(exerciseId, userId) {

  // Validar exerciseId
  const id = Number(exerciseId);

  if (!id || isNaN(id)) {
    return {
      status: 400,
      error: 'exerciseId inválido'
    };
  }

  // Validar ownership
  const ownershipStmt = db.prepare(`
    SELECT we.id
    FROM workout_exercises we
    JOIN workouts w ON we.workout_id = w.id
    WHERE we.id = ?
    AND w.user_id = ?
  `);

  const ownership = ownershipStmt.get(id, userId);

  if (!ownership) {
    return {
      status: 403,
      error: 'Este ejercicio no pertenece al usuario'
    };
  }

  try {
    const logsStmt = db.prepare(`
      SELECT id, weight, reps, date
      FROM exercise_logs
      WHERE exercise_id = ?
      AND user_id = ?
      ORDER BY date DESC
    `);

    const logs = logsStmt.all(id, userId);

    return {
      data: logs
    };

  } catch (error) {
    console.error(error);
    return {
      status: 500,
      error: 'Error interno'
    };
  }
}

function getLastLog(exerciseId, userId) {
  // Validar exerciseId
  const id = Number(exerciseId);

  if (!id || isNaN(id)) {
    return {
      status: 400,
      error: 'exerciseId inválido'
    };
  }

  // Validar ownership
  const ownershipStmt = db.prepare(`
    SELECT we.id
    FROM workout_exercises we
    JOIN workouts w ON we.workout_id = w.id
    WHERE we.id = ?
    AND w.user_id = ?
  `);

  const ownership = ownershipStmt.get(id, userId);

  if (!ownership) {
    return {
      status: 403,
      error: 'Este ejercicio no pertenece al usuario'
    };
  }

  try {
    const logsStmt = db.prepare(`
      SELECT id, weight, reps, date
      FROM exercise_logs
      WHERE exercise_id = ?
      AND user_id = ?
      ORDER BY date DESC
      LIMIT 1
    `);

    const logs = logsStmt.all(id, userId);

    return {
      data: logs || null
    };

  } catch (error) {
    console.error(error);
    return {
      status: 500,
      error: 'Error interno'
    };
  }
}


module.exports = { addLog, getLog, getLastLog }