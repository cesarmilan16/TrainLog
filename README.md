# TrainLog

TrainLog es una aplicación full stack para la gestión de entrenamientos entre un `manager` y sus clientes. Permite planificar rutinas, definir ejercicios con parámetros de trabajo, registrar logs de ejecución y consultar progreso desde una interfaz separada por roles.

Demo desplegada: `https://trainlog.cesarmilandev.com/`

![Pantalla de login](<docs/screenshots/login-screen.png>)

## Qué resuelve

- Autenticación con JWT y acceso por roles `MANAGER` y `USER`.
- Gestión de clientes por parte del manager.
- Creación y mantenimiento de entrenamientos por cliente.
- Configuración de ejercicios con `sets`, `reps`, `RIR`, `%RM` y orden.
- Registro de logs de entrenamiento por parte del usuario.
- Consulta del último log y evolución histórica del ejercicio.
- API preparada para trabajar también con mesociclos desde backend.

## Demo funcional

Aplicación disponible online en:

- `https://trainlog.cesarmilandev.com/`

Credenciales incluidas en el seed:

- Manager demo: `demo@trainlog.com` / `1234`
- Usuario demo: `cliente@trainlog.com` / `1234`

También se generan más usuarios de ejemplo para validar escenarios con varios clientes.

## Stack

### Frontend

- Angular 21
- Standalone components
- Angular Router
- Reactive Forms
- HttpClient + interceptor JWT
- CSS custom con layouts específicos para manager y usuario

### Backend

- Node.js
- Express 5
- SQLite con `better-sqlite3`
- JWT para autenticación
- `bcrypt` para contraseñas

### Infraestructura

- Docker
- Docker Compose
- Nginx en frontend para servir la app compilada

## Módulos principales

### Login y sesión

El usuario inicia sesión en `/login`. El backend devuelve un token JWT, el frontend lo guarda en `localStorage` y extrae el `role` desde el propio token para enrutar al dashboard correcto.

### Dashboard de manager

El manager puede:

- Ver su cartera de clientes.
- Crear, editar y eliminar clientes.
- Consultar los entrenamientos de cada cliente.
- Crear, editar y eliminar entrenamientos.
- Crear, editar y eliminar ejercicios.
- Reutilizar sugerencias de movimientos por usuario para mantener consistencia en los nombres.

> [!NOTE]
> Captura integrada debajo: dashboard de manager mostrando lista de clientes, workouts y detalle de ejercicios.

![Dashboard de manager](<docs/screenshots/manager-dashboard.png>)

### Dashboard de usuario

El usuario puede:

- Ver sus entrenamientos asignados.
- Consultar los ejercicios de cada rutina.
- Registrar un log con peso, repeticiones y fecha/hora.
- Editar o eliminar logs anteriores.
- Consultar progreso por ejercicio con distintas ventanas temporales (`7`, `30`, `90` días o histórico completo).
- Alternar métricas de seguimiento como peso, e1RM estimado y volumen.

> [!NOTE]
> Captura integrada debajo: dashboard de usuario con las rutinas asignadas y acceso a registro de logs.

![Dashboard de usuario](<docs/screenshots/user-dashboard.png>)

### Mesociclos

El backend ya expone endpoints para crear, listar, editar y eliminar mesociclos, así como consultar sus entrenamientos asociados. A día de hoy este módulo no está integrado en la UI principal del frontend, así que conviene tratarlo como capacidad de API en desarrollo o lista para futura integración.

## Arquitectura del proyecto

```text
TrainLog/
├── backend/                  # API REST, lógica de negocio y persistencia SQLite
│   ├── src/
│   │   ├── config/           # DB, path de SQLite, bootstrap
│   │   ├── controllers/      # Adaptadores HTTP
│   │   ├── middleware/       # auth y autorización por rol
│   │   ├── repositories/     # Acceso a datos
│   │   ├── routes/           # Endpoints REST
│   │   ├── scripts/          # seed y reset de base de datos
│   │   ├── services/         # Casos de uso
│   │   └── shared/utils/     # helpers comunes
│   └── tests/                # tests con node:test
├── frontend/                 # Aplicación Angular
│   ├── src/app/core/         # modelos, guards, interceptor y servicios
│   ├── src/app/features/     # auth, manager y user
│   └── proxy.conf.json       # proxy local hacia backend
├── docker-compose.yml
└── README.md
```

## Modelo de datos

La base de datos SQLite trabaja sobre estas entidades principales:

- `users`: usuarios con rol, credenciales y relación `manager_id`.
- `workouts`: rutinas asignadas a un usuario y creadas por un manager.
- `movements`: catálogo por usuario para normalizar nombres de movimientos.
- `workout_exercises`: ejercicios de una rutina con orden y parámetros de trabajo.
- `exercise_logs`: registros históricos de ejecución por ejercicio.

Esto permite separar:

- la planificación, que vive en `workouts` y `workout_exercises`
- del histórico real de rendimiento, que vive en `exercise_logs`

## Requisitos

- Node.js 20 o superior
- npm
- Docker + Docker Compose si quieres levantarlo en contenedores

## Puesta en marcha en local

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
npm run reset:db
npm run dev
```

Variables relevantes en `backend/.env`:

```env
PORT=3000
JWT_SECRET=change-me
SEED_ON_BOOT=false
# DB_PATH=./trainlog.db
```

Notas:

- `JWT_SECRET` es obligatorio para arrancar el servidor.
- `npm run reset:db` recrea la base y carga los datos demo.
- Si activas `SEED_ON_BOOT=true`, el backend intenta sembrar datos al arrancar cuando la base está vacía.

Backend disponible en `http://localhost:3000`.

### 2. Frontend

```bash
cd frontend
npm install
npm start
```

Frontend disponible en `http://localhost:4200`.

En desarrollo, Angular usa `frontend/proxy.conf.json` para redirigir `/users`, `/workouts`, `/exercises` y `/logs` al backend local.

## Despliegue con Docker Compose

Levantar:

```bash
docker compose up --build -d
```

Parar:

```bash
docker compose down
```

Servicios expuestos:

- `backend`: contenedor Express en puerto interno `3000`
- `frontend`: app Angular servida por Nginx en `http://localhost:4002`
- volumen persistente `trainlog_data` para SQLite

## Scripts útiles

### Backend

```bash
npm run dev
npm run start
npm run seed:db
npm run reset:db
npm test
```

### Frontend

```bash
npm start
npm run build
npm run watch
```

## API principal

Resumen de endpoints más relevantes:

### Usuarios y auth

- `POST /users/login`
- `POST /users` `MANAGER`
- `GET /users/profile`
- `GET /users/manager/clients` `MANAGER`
- `PUT /users/:userId` `MANAGER`
- `DELETE /users/:userId` `MANAGER`

### Workouts

- `POST /workouts` `MANAGER`
- `GET /workouts/user/:userId` `MANAGER`
- `GET /workouts/dashboard` `USER`
- `PUT /workouts/:workoutId` `MANAGER`
- `DELETE /workouts/:workoutId` `MANAGER`

### Exercises

- `GET /exercises/movements/:userId?q=...` `MANAGER`
- `POST /exercises` `MANAGER`
- `GET /exercises/:workoutId` `MANAGER`
- `PUT /exercises/:exerciseId` `MANAGER`
- `DELETE /exercises/:exerciseId` `MANAGER`

### Logs

- `POST /logs` `USER`
- `GET /logs/:exerciseId` `USER`
- `PUT /logs/item/:logId` `USER`
- `DELETE /logs/item/:logId` `USER`

### Mesociclos

- `POST /mesocycles` `MANAGER`
- `GET /mesocycles/my` `USER`
- `GET /mesocycles/user/:userId` `MANAGER`
- `PUT /mesocycles/:mesocycleId` `MANAGER`
- `DELETE /mesocycles/:mesocycleId` `MANAGER`

## Calidad y pruebas

El backend incluye tests con `node:test` para cubrir al menos:

- login válido e inválido
- middleware de autenticación
- comportamiento de rutas protegidas
- respuesta `404`
- datos y reglas de `exercise_logs`

Ejecución:

```bash
cd backend
npm test
```

## Estado actual del proyecto

El proyecto está funcional de extremo a extremo para el flujo principal:

1. Un manager inicia sesión.
2. Gestiona clientes.
3. Crea entrenamientos y ejercicios.
4. Un usuario inicia sesión.
5. Registra sus sesiones y consulta progreso.

Capacidades ya presentes pero todavía no reflejadas completamente en la interfaz:

- gestión de mesociclos vía API

## Capturas recomendadas para completar este README

- Formulario o modal de creación/edición de ejercicio
- Vista de progreso con gráfica o histórico del ejercicio

## Licencia

Este repositorio incluye un archivo [LICENSE](./LICENSE).
