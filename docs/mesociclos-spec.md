# Especificación Técnica Corta: Mesociclos (Integración Segura)

## 1. Objetivo
Integrar mesociclos en la app sin romper flujos actuales de:
- autenticación
- gestión de clientes
- workouts
- ejercicios
- logs/progreso

Debe ser una integración incremental y compatible hacia atrás.

## 2. Alcance
### Incluye
- Crear y listar mesociclos por cliente.
- Asignar un workout a un mesociclo.
- Filtrar dashboard del usuario por mesociclo.

### No incluye
- Cambios de arquitectura mayores.
- Refactors no relacionados.
- Reemplazar modelos existentes de progreso/logs.

## 3. Requisitos de Compatibilidad
- Endpoints actuales deben seguir funcionando si no se envía `mesocycleId`.
- La UI debe comportarse igual que hoy cuando no existen mesociclos.
- Migraciones DB deben ser idempotentes y no destructivas.

## 4. Modelo de Datos Propuesto
### Tabla `mesocycles`
- `id` INTEGER PK
- `name` TEXT NOT NULL
- `goal` TEXT NOT NULL
- `start_date` TEXT NOT NULL (YYYY-MM-DD)
- `end_date` TEXT NOT NULL (YYYY-MM-DD)
- `status` TEXT CHECK IN (`PLANNED`, `ACTIVE`, `COMPLETED`)
- `user_id` INTEGER NOT NULL FK -> `users.id`

### Relación en `workouts`
- Columna nullable `mesocycle_id` FK -> `mesocycles.id` (`ON DELETE SET NULL`)

## 5. API (Contrato)
### Manager
- `POST /mesocycles`
  - body: `{ name, goal, startDate, endDate, status, userId }`
- `GET /mesocycles/user/:userId`
- `PUT /mesocycles/:mesocycleId`
- `DELETE /mesocycles/:mesocycleId`

### User
- `GET /mesocycles/my`
- `GET /workouts/dashboard?mesocycleId=<id|none>` (opcional)

### Reglas de validación
- `userId`, `mesocycleId` enteros positivos.
- `endDate >= startDate`.
- Manager solo opera sobre usuarios que le pertenecen.
- Un workout solo puede asignarse a mesociclo del mismo usuario.

## 6. Fases de Implementación (obligatorias)
1. DB/migración compatible + seed mínimo.
2. Repositorios y servicios backend.
3. Rutas/controladores backend.
4. Integración manager UI (listar/crear/asignar).
5. Integración user UI (filtro en dashboard).
6. Pruebas y validación de no-regresión.

No avanzar de fase sin validar la anterior.

## 7. Estrategia de No-Regresión
- Mantener rutas y payloads actuales.
- Evitar cambiar firmas públicas existentes.
- Introducir comportamiento nuevo detrás de campos opcionales.
- Si aparece regresión: rollback parcial de la fase actual, no hotfix acumulado.

## 8. Criterios de Aceptación
- Se puede crear mesociclo desde manager para un cliente propio.
- Se listan mesociclos de cliente en manager.
- Se puede asociar workout a mesociclo.
- El usuario puede filtrar dashboard por mesociclo.
- Sin mesociclos, dashboard y workouts funcionan como hoy.
- Tests backend pasan y flujos manuales clave pasan.

## 9. Checklist de Validación
- Login manager/user OK.
- CRUD cliente OK.
- CRUD workout OK (con y sin `mesocycleId`).
- CRUD ejercicio/log OK.
- Dashboard user sin filtro OK.
- Dashboard user con filtro mesociclo OK.
- Dashboard manager de cliente OK.

## 10. Entrega
- Commits pequeños por fase.
- Resumen por fase: cambios, riesgo, resultado de pruebas.
- No hacer `push` final sin aprobación explícita.
