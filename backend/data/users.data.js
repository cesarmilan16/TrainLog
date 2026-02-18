const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const { db } = require('./db');
const { parsePositiveInt, isSqliteUniqueError } = require('../utils/data.helpers');

const JWT_SECRET = process.env.JWT_SECRET;

function getUsers() {
  return db.prepare('SELECT id, email, name, role, manager_id FROM users').all();
}

function registrerUser(user, managerId) {
  const { email, password, name } = user;

  if (!email || !password || !name) {
    return {
      status: 400,
      error: 'Email, password y name son obligatorios'
    };
  }

  try {
    // Nunca se guarda password en texto plano.
    const hashedPassword = bcrypt.hashSync(password, 10);

    const result = db
      .prepare('INSERT INTO users (email, password, name, role, manager_id) VALUES (?, ?, ?, ?, ?)')
      .run(email, hashedPassword, name, 'USER', managerId);

    return {
      message: 'Usuario creado',
      id: result.lastInsertRowid
    };
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return {
        status: 409,
        error: 'El email ya está registrado'
      };
    }

    console.error(error);
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
    };
  }

  try {
    const user = db
      .prepare('SELECT id, email, password, role FROM users WHERE email = ?')
      .get(email);

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return {
        status: 401,
        error: 'Credenciales incorrectas'
      };
    }

    // El frontend usa el role del JWT para decidir el dashboard.
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return {
      message: 'Login correcto',
      id: user.id,
      email: user.email,
      token
    };
  } catch (error) {
    console.error(error);
    return {
      status: 500,
      error: 'Error interno'
    };
  }
}

function getClients(managerId) {
  return db.prepare('SELECT id, email FROM users WHERE manager_id = ?').all(managerId);
}

function getManagerClients(managerId) {
  try {
    const users = db
      .prepare('SELECT id, email, name FROM users WHERE manager_id = ?')
      .all(managerId);

    // Evita N+1 de consultas preparándolas una sola vez.
    const workoutsCountStmt = db.prepare('SELECT COUNT(*) AS total FROM workouts WHERE user_id = ?');
    const lastActivityStmt = db.prepare('SELECT MAX(date) AS last_activity FROM exercise_logs WHERE user_id = ?');

    return users.map((user) => {
      const workoutsCount = workoutsCountStmt.get(user.id);
      const lastActivity = lastActivityStmt.get(user.id);

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        workouts_count: workoutsCount.total,
        last_activity: lastActivity.last_activity || null
      };
    });
  } catch (error) {
    console.error(error);
    return {
      status: 500,
      error: 'Error interno'
    };
  }
}

function updateClient(userId, payload, managerId) {
  const id = parsePositiveInt(userId);

  if (!id) {
    return {
      status: 400,
      error: 'userId inválido'
    };
  }

  // El manager solo puede editar usuarios con role USER bajo su manager_id.
  const ownedClient = db
    .prepare('SELECT id FROM users WHERE id = ? AND manager_id = ? AND role = ?')
    .get(id, managerId, 'USER');

  if (!ownedClient) {
    return {
      status: 403,
      error: 'Este usuario no pertenece al manager'
    };
  }

  const updates = [];
  const values = [];

  if (payload?.name !== undefined) {
    const name = payload.name?.trim();

    if (!name) {
      return {
        status: 400,
        error: 'Nombre inválido'
      };
    }

    updates.push('name = ?');
    values.push(name);
  }

  if (payload?.email !== undefined) {
    const email = payload.email?.trim();

    if (!email) {
      return {
        status: 400,
        error: 'Email inválido'
      };
    }

    updates.push('email = ?');
    values.push(email);
  }

  if (payload?.password !== undefined) {
    const password = payload.password?.trim();

    if (!password) {
      return {
        status: 400,
        error: 'Password inválido'
      };
    }

    updates.push('password = ?');
    values.push(bcrypt.hashSync(password, 10));
  }

  if (updates.length === 0) {
    return {
      status: 400,
      error: 'No hay campos para actualizar'
    };
  }

  try {
    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values, id);

    const client = db
      .prepare('SELECT id, email, name, role, manager_id FROM users WHERE id = ?')
      .get(id);

    return {
      message: 'Cliente actualizado',
      data: client
    };
  } catch (error) {
    if (isSqliteUniqueError(error)) {
      return {
        status: 409,
        error: 'El email ya está registrado'
      };
    }

    console.error(error);
    return {
      status: 500,
      error: 'Error interno'
    };
  }
}

function deleteClient(userId, managerId) {
  const id = parsePositiveInt(userId);

  if (!id) {
    return {
      status: 400,
      error: 'userId inválido'
    };
  }

  // Confirma ownership antes del borrado cascada manual.
  const ownedClient = db
    .prepare('SELECT id FROM users WHERE id = ? AND manager_id = ? AND role = ?')
    .get(id, managerId, 'USER');

  if (!ownedClient) {
    return {
      status: 403,
      error: 'Este usuario no pertenece al manager'
    };
  }

  try {
    // Se ejecuta en transacción para evitar estado intermedio inconsistente.
    const tx = db.transaction(() => {
      db.prepare('DELETE FROM exercise_logs WHERE user_id = ?').run(id);
      db.prepare('DELETE FROM workouts WHERE user_id = ?').run(id);
      db.prepare('DELETE FROM users WHERE id = ?').run(id);
    });

    tx();

    return {
      message: 'Cliente eliminado'
    };
  } catch (error) {
    console.error(error);
    return {
      status: 500,
      error: 'Error interno'
    };
  }
}

module.exports = {
  getUsers,
  registrerUser,
  login,
  getClients,
  getManagerClients,
  updateClient,
  deleteClient
};
