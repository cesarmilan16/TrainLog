const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const usersRepository = require('../repositories/users.repository');
const { parsePositiveInt, isSqliteUniqueError } = require('../shared/utils/data.helpers');

const JWT_SECRET = process.env.JWT_SECRET;

function getUsers() {
  return usersRepository.listUsers();
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
    const hashedPassword = bcrypt.hashSync(password, 10);
    const result = usersRepository.insertUser({
      email,
      hashedPassword,
      name,
      managerId
    });

    return {
      message: 'Usuario creado',
      id: result.lastInsertRowid
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

function login({ email, password } = {}) {
  if (!email || !password) {
    return {
      status: 400,
      error: 'Email y password son obligatorios'
    };
  }

  try {
    const user = usersRepository.getUserAuthByEmail(email);

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return {
        status: 401,
        error: 'Credenciales incorrectas'
      };
    }

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
  return usersRepository.listClientsByManager(managerId);
}

function getManagerClients(managerId) {
  try {
    const users = usersRepository.listManagerClientRows(managerId);

    return users.map((user) => {
      const workoutsCount = usersRepository.countActiveWorkoutsByUser(user.id);
      const lastActivity = usersRepository.getLastActivityByUser(user.id);

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

  const ownedClient = usersRepository.getManagerOwnedClient(id, managerId);
  if (!ownedClient) {
    return {
      status: 403,
      error: 'Este usuario no pertenece al manager'
    };
  }

  const updates = [];

  if (payload?.name !== undefined) {
    const name = payload.name?.trim();

    if (!name) {
      return {
        status: 400,
        error: 'Nombre inválido'
      };
    }

    updates.push({ column: 'name', value: name });
  }

  if (payload?.email !== undefined) {
    const email = payload.email?.trim();

    if (!email) {
      return {
        status: 400,
        error: 'Email inválido'
      };
    }

    updates.push({ column: 'email', value: email });
  }

  if (payload?.password !== undefined) {
    const password = payload.password?.trim();

    if (!password) {
      return {
        status: 400,
        error: 'Password inválido'
      };
    }

    updates.push({ column: 'password', value: bcrypt.hashSync(password, 10) });
  }

  if (updates.length === 0) {
    return {
      status: 400,
      error: 'No hay campos para actualizar'
    };
  }

  try {
    usersRepository.updateClientFields(id, updates);
    const client = usersRepository.getUserById(id);

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

  const ownedClient = usersRepository.getManagerOwnedClient(id, managerId);
  if (!ownedClient) {
    return {
      status: 403,
      error: 'Este usuario no pertenece al manager'
    };
  }

  try {
    usersRepository.deleteClientCascade(id);

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
