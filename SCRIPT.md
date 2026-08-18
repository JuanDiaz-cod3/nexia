# InnovaLab — Guion del proyecto

> Documento resumen para pasar al cuaderno a mano. Junta lo esencial de `CLAUDE.md`,
> `PRODUCT.md`, `DESIGN.md` y `PROGRESS.md` en un solo lugar. Fecha de corte: 2026-08-18.

---

## 1. Qué es InnovaLab

Plataforma web para colegios que gestiona el ciclo de vida completo de proyectos de
investigación de grado 11: registro → revisión → sustentación → evaluación por jurados →
publicación → archivo histórico.

- **Piloto:** Instituto La Salle - Bilingual School Barranquilla.
- **Visión a futuro:** producto SaaS multi-colegio (el esquema ya lo prepara — unicidad
  por colegio, theming por tokens — pero **no** se implementa multi-tenancy completo todavía).
- **Por qué existe:** hoy el colegio coordina esto con hojas de cálculo, drive compartido,
  correo y chat. InnovaLab centraliza eso en un sistema con permisos claros y un rastro de
  auditoría (quién, cuándo, valor anterior/nuevo en cada cambio de evaluación).

## 2. Por qué lo estoy construyendo así

Es mi proyecto de aprendizaje de Ingeniería de Sistemas. Reglas que me impuse para el proceso:

- No construir features completas de un solo golpe — pasos pequeños y probados.
- Entender el concepto detrás de cada pieza antes de implementarla, no copiar sin más.
- No sobreingeniería: nada de abstracciones para necesidades que todavía no existen.
- Cada etapa se prueba antes de pasar a la siguiente.

## 3. Alcance del corte actual (lo que se está construyendo AHORA)

**Sí incluye:**
- Login con cuentas preestablecidas (admin las precrea, sin autorregistro).
- Roles activos: `admin` y `student`. (`teacher` y `judge` existen en la tabla `roles`
  pero sin flujo funcional todavía.)
- Estudiantes crean/editan su propio proyecto y ven los proyectos de los demás.
- Objetivo de este corte: demostrar el almacenamiento y visualización de proyectos. Nada más.

**Explícitamente fuera de alcance ahora** (ver sección 8 para el detalle):
- `documents`, `awards`.
- Todo el bloque de sustentación/evaluación/jurados.
- Roles `teacher`/`judge` funcionales.
- Multi-tenancy real.

## 4. Stack técnico

| Capa | Tecnología |
|---|---|
| Frontend | React + TypeScript + Vite |
| Backend | Python + FastAPI |
| Base de datos | PostgreSQL |
| Storage | Supabase Storage (documentos e imágenes — **sin video**, decisión consciente) |
| Deploy (plan, aún no ejecutado) | Vercel (frontend) + Render/Railway (backend) + Supabase (DB + Storage) |
| Auth | JWT (access token corto + refresh token), hashing argon2 |

Convención: todo identificador de código en inglés (tablas, columnas, endpoints, variables).
Documentación y comentarios pueden ir en español.

## 5. Modelo de datos — entidades

**Núcleo:**
`schools` → `users` (username, email, account_type: institutional/external,
must_change_password, section_id nullable) → `user_roles` (N:M con `roles`: admin, teacher,
judge, student) → `projects` (advisor_id FK a users, academic_year_id, status,
publication_consent sin uso, section_id nullable) → `project_members` (join users–projects).

**Secciones y grupos (11°A/B/C):**
- `sections` = el salón completo (school_id, academic_year_id, name). Se crea sola la
  primera vez que un admin la usa.
- `student_groups` + `student_group_members` = grupos de proyecto (2-4 estudiantes),
  pre-creados por el admin ANTES de que exista un proyecto real. Cuando uno del grupo crea
  su proyecto (`POST /projects`), el backend agrega automáticamente al resto como
  integrantes.
- `projects.section_id` se copia del creador al momento de crear el proyecto (mismo patrón
  que `school_id`/`academic_year_id`).

**Sustentación y evaluación** (ejercicio conceptual — **no comprometido como parte del
plan**, solo documentado por si se evalúa ampliar el alcance más adelante):
`defense_sessions` (date, time, location) ← `session_judges` (join con users, los jurados
se asignan a la sesión, no al proyecto) — `evaluation_criteria` (cuelga de `academic_years`,
pesos cambian cada año) — `evaluations` (project_id, judge_id, criteria_id, score, comment)
con `evaluation_audit` (quién, cuándo, valor anterior/nuevo).

**Pendientes de modelar cuando lleguemos ahí:** `documents`, `awards`.

## 6. Reglas de negocio críticas

- Un estudiante pertenece a **un solo proyecto por año académico** — constraint en DB
  (`UNIQUE(student_id, academic_year_id)` en `project_members`), no solo en la UI.
- `username`/`email` únicos **por colegio**, no globalmente (prepara multi-tenant sin
  implementarlo).
- Cualquier integrante de un proyecto tiene los mismos permisos — no hay "dueño" único.
- `admin` tiene control total: puede editar/borrar cualquier proyecto, sea integrante o no.
  No incluye gestión de usuarios todavía.
- Un profesor solo ve/edita proyectos donde `advisor_id` = su propio usuario.
- Evaluaciones editables mientras `status != published`; después inmutables, todo cambio
  auditado.
- Cuentas creadas en lote por admin con contraseña temporal; `must_change_password` fuerza
  cambio en el primer login.
- Jurados externos: `account_type = external`, `username` = correo completo.
- **Proyectos públicos desde que existen:** `GET /projects` no requiere login (archivo
  abierto de investigación). Crear/editar/borrar el propio sí requiere autenticación.
  `publication_consent` queda en la tabla sin uso por ahora.

## 7. Ciclo de vida de un proyecto

```
draft → submitted → under_review → needs_revision → approved → defended → evaluated → published → archived
```

## 8. Fuera de alcance — recordatorio de qué NO construir todavía

- `documents` (archivos por proyecto), `awards` (resultados/menciones).
- `defense_sessions`, `session_judges`, `evaluations`, `evaluation_criteria`,
  `evaluation_audit` — todo el flujo de sustentación/jurados.
- Roles `teacher` y `judge` funcionales.
- Multi-tenancy real (el esquema lo prepara, no se implementa).

## 9. Lo que ya llevamos ✅

**Backend**
- [x] FastAPI + PostgreSQL (Supabase) funcionando.
- [x] Modelos base + migración baseline en Alembic.
- [x] Auth con JWT (access + refresh token, verificado en vivo) y argon2.
- [x] Endpoints: `POST /auth/login`, `POST /auth/refresh`, `POST /auth/change-password`,
  `GET /users/me`, `GET /projects`, `GET /projects/{id}`, `POST /projects`,
  `PATCH /projects/{id}`, `DELETE /projects/{id}`.
- [x] Regla "un proyecto por año académico" enforced en DB (409 `already_in_project`).
- [x] Rol `admin` con control total sobre proyectos (`deps.is_admin`).
- [x] `GET /projects` y `GET /projects/{id}` públicos (sin login).
- [x] Fix de consulta N+1 en listado de proyectos (eager loading).
- [x] Secciones y grupos de estudiantes (`sections`, `student_groups`,
  `student_group_members`) — auto-agregar integrantes del grupo al crear el proyecto.
- [x] Testing arrancado: pytest + Postgres real vía Docker (`docker-compose.test.yml`).
  Cubre: constraint de membership, endpoints de proyectos, admin.
- [x] Testing de auth (`test_auth.py`, 38 tests en total): login, refresh (incluye el
  claim `"type"` que impide usar un access token como refresh), change-password, y las
  dependencias `get_current_user`/`require_password_changed` de `deps.py`.
- [x] Testing de frontend (Vitest + jsdom + React Testing Library): 32 tests en total.
  `client.test.ts` (6, el interceptor de refresh), `LoginPage.test.tsx` (5),
  `AppShell.test.tsx` (5), `ProjectsPage.test.tsx` (6), `MyProjectPage.test.tsx` (5),
  `AdminStudentsPage.test.tsx` (5, alcance reducido — ver `PROGRESS.md` para lo que
  quedó afuera). Patrón: mockear el módulo `api/*` con `vi.mock`, nunca `fetch` directo.
- [x] CI (`.github/workflows/ci.yml`): dos jobs en paralelo (backend con Postgres como
  service de Actions + pytest; frontend con lint + vitest), corren en push a `main` y en
  cada PR. Falta verificar que corra bien una vez pusheado (todavía no probado en GitHub).

**Frontend**
- [x] Login conectado al backend, cambio de clave obligatorio en dos pasos.
- [x] Listado de proyectos (`ProjectsPage`, solo lectura) y `MyProjectPage` (crear/editar/
  borrar el propio) conectados al backend.
- [x] `AppShell` con sidebar de navegación e identidad de marca (username, sección y
  grupo del usuario logueado; "Cerrar sesión" sticky al pie).
- [x] `AdminStudentsPage`: pantalla para que el admin cree grupos de estudiantes nuevos
  o agregue integrantes a uno existente (selector de sección/grupo + buscador).
- [x] `LandingPage` pública + navegación Inicio/Proyectos sin necesidad de login.
- [x] Refresh token: interceptor en `apiFetch` que renueva en silencio y reintenta.
- [x] Admin puede editar/borrar cualquier proyecto desde `ProjectsPage`.
- [x] Frases rotativas en Inicio, stats reales con placeholders explícitos.

**Diseño**
- [x] Tokens del sistema de diseño (colores, tipografías) centralizados en CSS.
- [x] Rebrand completo a InnovaLab (nombre, SVGs de marca, docs).
- [x] Glassmorphism vía tokens `--glass-*`.
- [x] Dos rondas de `impeccable` corridas (login, y sidebar/identidad en el último commit).

**Documentación**
- [x] `CLAUDE.md`, `PRODUCT.md`, `DESIGN.md`, `PROGRESS.md` razonablemente al día.

## 10. To-Do — qué falta dentro de este corte

- [ ] **Testing:** las 6 piezas principales del frontend ya tienen cobertura básica.
  Falta: el flujo de "buscar estudiante existente" en `AdminStudentsPage`, los botones
  de "Copiar" (clipboard), `HomePage`/`LandingPage` (sin tests), y en el backend el
  resto de endpoints de `projects` que aún no tienen test dedicado.
- [x] **CI:** pipeline escrito (ver arriba). Falta el primer push para confirmar que
  corre bien en GitHub de verdad, no solo localmente.
- [ ] **Deploy real:** nada desplegado — Vercel/Render/Supabase decididos en el plan pero
  no ejecutados, todo sigue en local.
- [ ] **Responsive y accesibilidad** de `ProjectsPage`, `MyProjectPage` y `AppShell` (el
  login ya se trabajó explícitamente; estas pantallas, no).
- [ ] **Ronda de `impeccable`** sobre el resto de la app — planeada para cuando se cierren
  los ítems anteriores.

## 11. Ideas a futuro (fuera del corte actual, no priorizadas)

- Gestión de usuarios desde el rol admin (crear/editar cuentas en bloque).
- Cookie `httpOnly` para tokens en vez de `localStorage` (se pospuso al momento del deploy
  real, cuando hay que tocar CORS entre dominios de todas formas).
- Evaluar si vale la pena ampliar el alcance hacia sustentación/evaluación/jurados
  (ejercicio conceptual ya modelado en la sección 5, sin compromiso todavía).
- Multi-tenancy real si se decide convertir esto en SaaS multi-colegio.
