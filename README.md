# TrainLog

TrainLog es una aplicación para gestionar entrenamientos entre manager y clientes.

## Requisitos
- Node.js 20+ (recomendado LTS)
- npm
- Docker + Docker Compose (opcional, para despliegue en contenedores)

## Ejecutar en local

### Backend
```bash
cd backend
npm install
npm run reset:db   # borra y recrea la base con datos de ejemplo
npm run dev
```

Backend disponible en `http://localhost:3000`.

### Frontend (Angular 21)
```bash
cd frontend
npm install
npm start
```

Frontend disponible en `http://localhost:4200`.

## Despliegue con Docker Compose

El proyecto incluye:
- `backend` en puerto interno `3000`
- `frontend` servido por Nginx en **`http://localhost:4002`**
- proxy de `/users`, `/workouts`, `/exercises`, `/logs` desde frontend hacia backend

### Levantar servicios
```bash
docker compose up --build -d
```

### Parar servicios
```bash
docker compose down
```

## Credenciales demo (seed)
- Manager demo: `demo@trainlog.com` / `1234`
- Cliente demo: `cliente@trainlog.com` / `1234`

## Notas
- El backend usa SQLite (`backend/trainlog.db`).
- Si necesitas regenerar datos demo en local: `cd backend && npm run reset:db`.
