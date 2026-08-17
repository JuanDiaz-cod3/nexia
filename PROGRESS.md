# Progreso de InnovaLab

> Documento vivo. Se actualiza al final de cada sesión de trabajo relevante — no es un
> registro histórico exhaustivo (para eso está `git log`), sino una foto de "dónde estamos"
> y "qué sigue" para retomar rápido.

Última actualización: 2026-08-16

## Dónde estamos

Corte vertical simple en construcción (ver `CLAUDE.md` → "Fase actual del desarrollo"):
login con cuentas preexistentes, roles `admin`/`student` activos, estudiantes pueden
crear/editar su propio proyecto y ver los demás. Todo lo de sustentación, evaluación,
jurados, documentos y premios queda fuera de este corte a propósito.

## Últimos avances

- **Backend:** FastAPI + PostgreSQL (Supabase) funcionando. Modelos base (`schools`,
  `users`, `roles`, `user_roles`, `academic_years`, `projects`, `project_members`) con
  una migración baseline en Alembic. Auth con JWT (access token) y hashing argon2.
- **Endpoints activos:** `POST /auth/login`, `POST /auth/change-password`,
  `GET /users/me`, `GET /projects`, `GET /projects/{id}`, `POST /projects`,
  `PATCH /projects/{id}`.
- **Regla de negocio ya aplicada:** un estudiante no puede pertenecer a dos proyectos en
  el mismo año académico — enforced por `UNIQUE(user_id, academic_year_id)` en
  `project_members`, no solo en UI (409 con código `already_in_project` si se viola).
- **Frontend:** Login conectado al backend, con flujo de cambio de clave obligatorio en
  dos pasos (`must_change_password`). Listado de proyectos y formulario de
  creación/edición conectados al backend. `AppShell` con sidebar de navegación (solo
  "Proyectos" habilitado; el resto queda visible pero deshabilitado como preview de lo
  que falta).
- **Diseño:** tokens del sistema de diseño del Instituto La Salle - Bilingual School Barranquilla
  centralizados en un solo archivo CSS (colores, tipografías). Fondo de LoginPage con estilo
  "archivo" trabajado con el skill de `frontend-design`.
- **Documentación:** `PRODUCT.md` y `DESIGN.md` creados y razonablemente al día;
  `CLAUDE.md` define alcance y reglas de negocio con detalle.

## Qué falta — dentro del alcance de este corte

- [ ] Pantalla real para "Estudiantes" en el sidebar, o decidir explícitamente si no
  entra en este corte (hoy el nav la deja visible pero deshabilitada).
- [ ] Definir si hace falta `DELETE /projects/{id}` (borrar el proyecto propio) — hoy
  no existe ese endpoint.
- [ ] Revisar el estado del access token cuando expira en el frontend: hoy no hay
  manejo explícito (¿redirige a login limpio, muestra error, reintenta?).
- [ ] Refresh token: `PRODUCT.md` lo marca como "diseñado pero no construido" — decidir
  si entra en este corte (afecta cuánto dura una sesión sin volver a loguearse) o queda
  para después.
- [ ] Testing: no hay ningún test todavía, ni backend (pytest) ni frontend. Decidir el
  mínimo razonable para este corte antes de seguir agregando features.
- [ ] CI: no hay pipeline configurado (ni lint ni tests corren automáticamente).
- [ ] Deploy real: nada desplegado aún. Vercel/Render/Supabase están decididos como plan
  en `CLAUDE.md` pero no ejecutados — sigue corriendo todo en local.
- [ ] Revisar responsive y accesibilidad de `ProjectsPage` y `AppShell` (el login ya se
  trabajó explícitamente en el commit de fondo/responsive; las pantallas nuevas, no).
- [ ] UX de "ya tengo proyecto" vs "no tengo proyecto todavía" en `ProjectsPage`: validar
  que el flujo de crear/editar sea claro cuando el estudiante ya pertenece a uno.

## Fuera de alcance (recordatorio, no hacer todavía)

Documentado en detalle en `CLAUDE.md`. Se deja aquí solo como recordatorio de qué *no*
hay que empezar a construir por accidente:

- `documents`, `awards`.
- `defense_sessions`, `session_judges`, `evaluations`, `evaluation_criteria`,
  `evaluation_audit` — todo el bloque de sustentación/evaluación/jurados (ejercicio
  conceptual, no comprometido como parte del plan).
- Roles `teacher` y `judge` funcionales (existen en la tabla `roles`, sin flujo).
- Multi-tenancy real (el esquema ya lo prepara, pero no se implementa todavía).
