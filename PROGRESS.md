# Progreso de InnovaLab

> Documento vivo. Se actualiza al final de cada sesión de trabajo relevante — no es un
> registro histórico exhaustivo (para eso está `git log`), sino una foto de "dónde estamos"
> y "qué sigue" para retomar rápido.

Última actualización: 2026-08-18 (sesión 6)

## Dónde estamos

Corte vertical simple en construcción (ver `CLAUDE.md` → "Fase actual del desarrollo"):
login con cuentas preexistentes, roles `admin`/`student` activos, estudiantes pueden
crear/editar su propio proyecto y ver los demás. Todo lo de sustentación, evaluación,
jurados, documentos y premios queda fuera de este corte a propósito.

## Últimos avances

- **Backend:** FastAPI + PostgreSQL (Supabase) funcionando. Modelos base (`schools`,
  `users`, `roles`, `user_roles`, `academic_years`, `projects`, `project_members`) con
  una migración baseline en Alembic. Auth con JWT (access token) y hashing argon2.
- **Endpoints activos:** `POST /auth/login`, `POST /auth/refresh`,
  `POST /auth/change-password`, `GET /users/me`, `GET /projects`, `GET /projects/{id}`,
  `POST /projects`, `PATCH /projects/{id}`, `DELETE /projects/{id}`.
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
- **Rebrand a InnovaLab:** el nombre del producto pasa de Nexia a InnovaLab en toda la
  documentación, la API y el frontend (Instituto La Salle se referencia siempre como
  "Instituto La Salle - Bilingual School Barranquilla"). Se agregan los SVG de marca
  (ícono circular y logo horizontal), aplicados en `AppShell` y login.
- **Pantalla "Inicio":** hero, stats reales (proyectos registrados/publicados) con
  placeholders explícitos donde todavía no hay dato (estudiantes activos,
  notificaciones, ranking), y proyectos recientes con "el sello" en los publicados.
  Navegación Inicio/Proyectos vía estado simple en `App.tsx`, sin agregar router
  todavía.
- **Vidrio (glassmorphism):** adoptado en Inicio, `AppShell` y login vía tokens
  `--glass-*` centralizados en `index.css`.
- **Ronda de `impeccable` sobre `LoginPage`:** subió de 21/40 a 25/40 — fixes de
  contraste del panel lateral, `role="alert"` en errores, reordenado móvil (formulario
  antes del pliegue), labels persistentes y toggle de mostrar/ocultar contraseña en
  `Input`.
- **`MyProjectPage` nueva, separada de `ProjectsPage`:** `ProjectsPage` quedó solo-lectura
  (explorar el archivo del colegio); crear/editar el proyecto propio del estudiante vive
  ahora en `MyProjectPage`, con los tres estados resueltos explícitamente ("no tengo
  proyecto todavía" → formulario de creación, "tengo proyecto" → detalle con asesor e
  integrantes, y edición in-place). En el sidebar, "Estudiantes" (deshabilitado) se
  reemplazó por "Mi Proyecto" (funcional). No existe `GET /projects/me` — se reutiliza el
  listado completo y se filtra en el cliente por membresía (decisión consciente: no vale
  la pena el endpoint dedicado a esta escala).
- **Backend:** `Project` expone ahora `advisor` (relación explícita `foreign_keys=[advisor_id]`,
  viewonly, para no chocar con la relación a `User` vía `project_members`), serializado en
  `ProjectOut`. Lo consume `MyProjectPage` para mostrar el asesor del proyecto.
- **`DELETE /projects/{id}`:** cualquier integrante puede borrar su proyecto (mismo criterio
  que `PATCH`, no hay "dueño" único), 404/403 con el mismo patrón que los demás endpoints,
  `204 No Content` si funciona. Borrado duro — `project_members` ya tenía
  `ondelete="CASCADE"` hacia `projects`, así que no hizo falta migración. En `MyProjectPage`,
  botón "Borrar" con confirmación inline en la tarjeta ("¿Seguro? Sí, borrar / Cancelar"),
  no diálogo nativo del navegador.
- **Refresh token (implementado y verificado en vivo):** el access token seguía durando
  15 minutos sin ninguna forma de renovarse — al expirar, el usuario solo veía errores
  genéricos en pantalla. Ahora `login` devuelve también un `refresh_token` (JWT stateless,
  7 días, sin tabla nueva ni revocación — decisión consciente para no sobre-construir en
  este corte), y hay un endpoint nuevo `POST /auth/refresh`. Los JWT ahora llevan un claim
  `"type": "access"|"refresh"` para que uno no se pueda usar donde va el otro. En el
  frontend, `apiFetch` (`api/client.ts`) intercepta un `401` con `code: "invalid_token"`,
  refresca en silencio y reintenta la llamada una vez; si el refresh también falla, limpia
  `localStorage` y dispara `onSessionExpired` — `App.tsx` se suscribe a eso para mandar al
  usuario de vuelta al login limpio. Refresh token guardado en `localStorage` junto al
  access token (mismo patrón ya existente, se evaluó cookie `httpOnly` y se decidió
  posponerla al momento del deploy real, cuando de todas formas hay que tocar CORS entre
  dominios). Verificado por `curl` (login, refresh, y los 4 casos de error — incluida la
  protección de tipo: un access token no sirve como refresh y viceversa) y en el navegador
  vía Chrome DevTools (access token corrupto → `401` → refresh silencioso → reintento
  exitoso, confirmado en la pestaña Network; ambos tokens corruptos → logout limpio a la
  pantalla de login, `localStorage` queda vacío).
- **Testing backend arrancado (pytest + Postgres real vía Docker):** `docker-compose.test.yml`
  levanta una Postgres 16 efímera (puerto `5433`, datos en `tmpfs`, sin volumen — se
  descarta al bajar el contenedor) para no correr tests contra el Supabase real de
  `.env`. `backend/conftest.py` fija `DATABASE_URL` a esa DB *antes* de importar `app`
  (el `Settings()` se instancia al importar `app.core.config`, así que hacerlo después
  sería tarde), crea el esquema con `Base.metadata.create_all()` una vez por sesión
  (se evaluó correr `alembic upgrade head` en su lugar; se descartó por ahora — el
  mínimo razonable para este corte, se reconsidera si migraciones y modelos llegan a
  desincronizarse), y aísla cada test en una transacción con rollback automático al
  final. El fixture de sesión usa `join_transaction_mode="create_savepoint"`: sin esto,
  un test que dispara un `IntegrityError` a propósito (como los de abajo) deja la
  transacción externa deasociada y el rollback del teardown tira un `SAWarning`.
  Dos archivos de test: `test_project_membership.py` prueba el `UNIQUE(user_id,
  academic_year_id)` de `project_members` directo a nivel de modelo/DB (caso que
  rompe y caso que no rompe), y `test_projects_api.py` prueba el mismo constraint
  pero a través de `POST /api/v1/projects` de punta a punta, confirmando que el
  `IntegrityError` se traduce en `409` con `code: "already_in_project"`. Todavía no
  hay tests de auth (login/refresh) ni de frontend — decisión consciente de parar acá
  por ahora y seguir sumando cobertura en próximas sesiones.
- **La app ahora tiene un frente público de verdad:** hasta esta sesión, `App.tsx` mandaba
  a cualquiera sin token directo al login — ni Inicio ni Proyectos eran visitables sin
  cuenta. Cambio de regla de negocio (decisión explícita, no técnica): los proyectos son
  públicos desde que existen, no hace falta `publication_consent` ni login para verlos.
  `GET /projects` y `GET /projects/{id}` ya no requieren autenticación (sin filtro por
  `school_id` — un solo colegio en este piloto, no hace falta todavía). `publication_consent`
  sigue en la tabla `projects`, sin uso.
- **`LandingPage` nueva:** puerta pública del sitio, sello + wordmark INNOVALAB con los
  colores institucionales, SVG sin `rect` de fondo propio (queda transparente, se funde
  con la página sin caja visible), botón "Entrar". `App.tsx` gana un estado `entered`
  (persistido en `localStorage` igual que el token — si no, un refresh te mandaba de
  vuelta a la landing aunque la sesión siguiera activa) que separa la landing del resto.
  Única pantalla que sigue exigiendo login: "Mi Proyecto" — si no hay token, clickearla
  muestra `LoginPage` completo en vez de esa pantalla, y al autenticarse aterriza ahí
  directo (`loginTarget` en `App.tsx`). `AppShell` oculta "Cerrar sesión" cuando no hay
  sesión iniciada.
- **Rol `admin` con control total sobre el repositorio:** puede editar y borrar
  cualquier proyecto, sea integrante o no (antes solo podían los integrantes). `User.roles`
  (relación nueva hacia `Role` vía `user_roles`), `deps.is_admin(user)` — función simple,
  no un `Depends`, porque `PATCH`/`DELETE /projects/{id}` la usan como OR sobre el chequeo
  de membresía existente, no como gate duro. `GET /users/me` expone `roles: string[]`.
  En el frontend, `ProjectsPage` (la pantalla pública de solo-lectura) muestra
  "Editar"/"Borrar" por tarjeta si el usuario logueado es admin, reutilizando el patrón de
  formulario inline de `MyProjectPage`. Gestión de usuarios queda fuera de alcance por
  ahora (a pedido explícito). 3 tests nuevos en `test_projects_admin.py`.
- **Frases rotativas en Inicio:** el banner de cita (antes una sola, fija, con layout a
  dos puntas que se veía desbalanceado) ahora rota entre 4 frases cada 10s con fundido
  suave, sin ningún costo de servidor (array estático + `setInterval` en el navegador).
  Layout rediseñado: columna centrada, caja angosta (no una barra azul de ancho completo).
- **Fix de N+1 en `list_projects`/`get_project`:** `ProjectOut` serializa `members` y
  `advisor` de cada proyecto, y sin eager loading eso disparaba una consulta SQL aparte
  por proyecto (lazy loading default de SQLAlchemy) — confirmado empíricamente: 3
  consultas para 2 proyectos, habría sido ~41-81 con 40. Con `.options(selectinload
  (Project.members), joinedload(Project.advisor))` queda fijo en 2 consultas sin
  importar cuántos proyectos haya. El tiempo de reloj en local sigue siendo notorio
  (~100-150ms por consulta, viaje de red hasta el Supabase en us-east-2) — eso no lo
  arregla el código, se resuelve cuando el backend quede desplegado cerca de la DB.
- **Secciones y grupos de estudiantes (`sections`, `student_groups`,
  `student_group_members`):** el admin puede pre-crear cuentas de estudiantes agrupadas
  por sección (11°A/B/C) antes de que exista un proyecto real. `sections` se crea sola la
  primera vez que un admin la usa (sin pantalla de gestión aparte). Cuando uno del grupo
  crea su proyecto (`POST /projects`), el backend agrega automáticamente al resto como
  integrantes; `projects.section_id` se copia del creador (mismo patrón que
  `school_id`/`academic_year_id`). Endpoints nuevos bajo `/admin`: `POST
  /admin/student-groups` (crear grupo + cuentas), `GET /admin/sections`, `GET
  /admin/student-groups`, `GET /admin/students/search`, `POST
  /admin/student-groups/{id}/members` (agregar después a un grupo existente — si el grupo
  ya tiene proyecto, también suma al nuevo integrante ahí). Contraseñas temporales
  generadas con `secrets`, nunca persistidas en texto plano. Migración Alembic
  `95708202ea_secciones_y_grupos_de_estudiantes`.
- **Pantalla "Estudiantes" en el admin (`AdminStudentsPage`):** crear grupo nuevo o
  agregar a uno existente, con selector de sección/grupo y buscador de estudiantes ya
  registrados. Reemplaza el placeholder deshabilitado que tenía el sidebar.
- **Identidad en el sidebar:** `GET /users/me` expone ahora `section_name` y
  `group_label`; el sidebar los muestra junto al username, y "Cerrar sesión" bajó al pie,
  sticky a toda la altura de la pantalla.
- **Ronda de `impeccable` sobre Landing/Inicio/admin:** botón danger para borrar,
  encabezado en el formulario de edición, foco movido a la tarjeta que cambia de estado,
  contraste WCAG corregido (`--color-accent-text`, `--color-accent-light`), "el sello"
  real reemplazando el checkmark genérico en proyectos publicados, crossfade real en las
  frases rotativas de Inicio, responsive en `ProjectsPage.css`.
- **Tests nuevos:** `test_admin_student_groups.py`, `test_admin_student_groups_extra.py`,
  `test_projects_group_mates.py`, `test_users_me.py`.
- **Testing de auth (`test_auth.py`, 11 tests nuevos, 38 en total):** cubre `login`
  (credenciales correctas, usuario inexistente y password incorrecta devolviendo el mismo
  `401 invalid_credentials` sin delatar cuál falló), `refresh` (token válido, token
  corrupto, y el caso del claim `"type"` — un access token no sirve como refresh token),
  `change-password` (caso exitoso verificado de punta a punta: el login viejo deja de
  funcionar y el nuevo sí, más contraseña actual incorrecta), y las dependencias de
  `deps.py` detrás de todo lo anterior vía `GET /users/me` como endpoint de referencia
  (token corrupto, usuario borrado con token todavía válido, `must_change_password`
  bloqueando con `403`). Al escribir los tests salió a la luz que el formato de error real
  es `{"detail": "...", "code": "..."}` plano (un `exception_handler` en `main.py` aplana
  el `HTTPException(detail={...})` a ese formato) — los primeros intentos asumieron
  `detail` anidado y fallaron hasta corregir la aserción, no un bug del código.
- **Testing de frontend arrancado (Vitest + jsdom):** primer test del frontend, nunca
  había ninguno. Se instaló `vitest`+`jsdom` como devDependencies (mínimo necesario —
  todavía sin React Testing Library, se suma cuando ataquemos un componente real) y se
  agregó `test: { environment: 'jsdom' }` a `vite.config.ts`. Primer archivo:
  `src/api/client.test.ts`, cubriendo `apiFetch`/`fetchWithRefresh` — la lógica de
  refresh-en-silencio-y-reintento que hasta ahora solo se había verificado a mano (curl +
  DevTools). 6 tests: pedido exitoso, error no-401 con `code` del backend, `204 No
  Content` sin intentar parsear body, 401 `invalid_token` → refresca y reintenta con el
  token nuevo (se verifica explícitamente el header `Authorization` del reintento), fallo
  de refresh → limpia `localStorage` y dispara `onSessionExpired`, y 401 con otro `code`
  (ej. `invalid_credentials`) que NO dispara el refresh. `fetch` se mockea con
  `vi.stubGlobal` — a diferencia de la regla de "no mockear la DB" en el backend, acá
  mockear `fetch` es la frontera de red estándar en testing de frontend, no una
  desviación de esa regla.
- **Primer test de componente (`LoginPage.test.tsx`, 5 tests):** se suma React Testing
  Library (`@testing-library/react` + `user-event` + `jest-dom`). A diferencia de
  `client.test.ts` (que mockea `fetch`), acá se mockea el módulo `../api/auth` completo
  con `vi.mock` — la capa de red ya está probada, este archivo prueba la lógica y el
  render del componente. Cubre: login exitoso, credenciales incorrectas (mensaje de
  error visible), transición al panel de "Nueva contraseña" cuando
  `must_change_password` es true (verificando que el foco se mueve al `h1`, no solo que
  el texto exista — las dos secciones están siempre montadas en el DOM, el swap es CSS),
  contraseñas que no coinciden en el reset, y reset exitoso confirmando que
  `changePassword` reusa la clave temporal ya tipeada como `current_password`. Bug de
  configuración encontrado y arreglado en el camino: el auto-cleanup de Testing Library
  depende de un `afterEach` global que Vitest no expone por defecto (sin `test.globals`),
  así que sin un `afterEach(cleanup)` explícito en `src/test/setup.ts` cada test dejaba
  el DOM del render anterior montado y el siguiente encontraba inputs duplicados.
- **Testing de frontend, resto de pantallas (32 tests en total):** mismo patrón que
  `LoginPage` — mockear el módulo `api/*` correspondiente con `vi.mock`, nunca `fetch`
  directo. `AppShell.test.tsx` (5): navegación, item "Estudiantes" condicionado a
  `isAdmin`, pie de sesión condicionado a `isAuthenticated`. `ProjectsPage.test.tsx` (6):
  carga/error/lista vacía, controles de admin ocultos para no-admin, editar y borrar
  (con el paso de confirmación) para admin. `MyProjectPage.test.tsx` (5): estado "sin
  proyecto" → formulario de creación, estado "con proyecto" → detalle con
  integrantes/asesor, un proyecto ajeno no cuenta como propio, editar y borrar.
  `AdminStudentsPage.test.tsx` (5, alcance reducido a propósito dado el tamaño de la
  pantalla — dos modos con mucho estado): modo "grupo nuevo" (la cantidad de estudiantes
  agrega/quita filas, creación exitosa muestra la tabla de contraseñas, error del
  backend se muestra), modo "agregar a grupo existente" (carga secciones → grupos →
  agrega un integrante nuevo, y el caso de una sección sin grupos todavía). Quedó fuera
  de esta ronda: el flujo de buscar/seleccionar un estudiante *existente* dentro de ese
  segundo modo, y los botones "Copiar" (usan `navigator.clipboard`, no mockeado).
- **CI arrancado (`.github/workflows/ci.yml`):** dos jobs en paralelo, disparan en push a
  `main` y en cada PR. `backend`: levanta Postgres 16 como *service* de Actions (mismo
  concepto que `docker-compose.test.yml`, pero declarado en YAML — el mapeo de puerto
  `5433:5432` es a propósito, coincide con el `DATABASE_URL` hardcodeado en
  `conftest.py`), instala `requirements-dev.txt` (que ya trae `requirements.txt` adentro
  via `-r`) y corre `pytest`. `frontend`: `npm ci`, `npm run lint` (oxlint) y
  `vitest run`. No se agregó linter de Python — no había ninguno configurado en el
  backend y sumar uno es una dependencia nueva que no se pidió.
- **Auditoría de seguridad (skill `cyber-neo`) y primeras correcciones:** corrida completa
  (5 subagentes en paralelo: dependencias, código, secretos, config/infra, supply
  chain/CI) sobre todo el repo. Riesgo medio (29/100), sin críticos — reporte completo en
  `~/Desktop/cyber-neo-report-NEXIA-2026-08-18.md`. Se corrigieron las 3 prioridades:
  - **Logging de fallos de auth:** `logging.basicConfig` en `main.py`, y
    `logger.warning(...)` en `auth.py` (login, refresh, change-password) y `deps.py`
    (token inválido/vencido, usuario no encontrado) — antes un intento de fuerza bruta
    o un token corrupto no dejaba ningún rastro en el servidor.
  - **Security headers:** `SecurityHeadersMiddleware` nuevo en `main.py`
    (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`) — sin HSTS a
    propósito, no tiene sentido hasta que la app corra sobre HTTPS real.
  - **CI hardening (`ci.yml`):** bloque `permissions: contents: read` a nivel de
    workflow; las 3 GitHub Actions pineadas a SHA completo (resuelto contra el remoto
    real de GitHub, no inventado) en vez de tag mutable; paso nuevo de `pip-audit` en el
    job de backend.
  - **CVE real encontrado y arreglado:** `pip-audit` detectó `PYSEC-2026-1845` en
    `pytest==8.4.2` (dependencia de dev). Se subió a `pytest==9.0.3` — probado que no
    rompe nada (38/38 tests) antes de fijarlo en `requirements-dev.txt`.
  - Quedan pendientes del reporte (bajo impacto, no urgentes): rate limiting en
    `/auth/login`, contraseña hardcodeada en `backend/scripts/create_admin.py`, puerto
    de la Postgres de test bound a `0.0.0.0` en vez de `127.0.0.1`.
  - **Incidente durante esta ronda:** se detectó que `AdminStudentsPage.tsx` había
    perdido todo el modo "agregar a grupo existente" (imports, estado, handlers, JSX) —
    edición accidental en el editor, no relacionada con la auditoría. Restaurado con
    `git checkout -- ...` antes de seguir; verificado que los 32 tests de frontend
    siguen pasando.

## Qué falta — dentro del alcance de este corte

- [x] Pantalla real para "Estudiantes" en el sidebar — resuelto como "Mi Proyecto"
  (`MyProjectPage`), separada de `ProjectsPage`.
- [x] UX de "ya tengo proyecto" vs "no tengo proyecto todavía" — resuelto en
  `MyProjectPage` con los tres estados explícitos.
- [x] `DELETE /projects/{id}` — implementado, cualquier integrante puede borrar.
- [x] Expiración del access token + refresh token — implementados y verificados en vivo
  (ver arriba).
- [x] Testing de auth (`test_auth.py`) y de frontend (Vitest + RTL, 32 tests) —
  ver arriba. Falta: búsqueda de estudiante existente en `AdminStudentsPage`, botones
  de "Copiar" (clipboard), `HomePage`/`LandingPage`, y resto de endpoints de `projects`.
- [x] CI (`ci.yml`, dos jobs en paralelo + `pip-audit`) — ver arriba. Falta confirmar
  que corre bien en GitHub tras el próximo push.
- [x] Auditoría de seguridad (`cyber-neo`) y correcciones de las 3 prioridades — ver
  arriba. Quedan pendientes de bajo impacto: rate limiting en login, contraseña
  hardcodeada en `create_admin.py`, puerto de la Postgres de test.
- [ ] Deploy real: nada desplegado aún. Vercel/Render/Supabase están decididos como plan
  en `CLAUDE.md` pero no ejecutados — sigue corriendo todo en local.
- [ ] Revisar responsive y accesibilidad de `ProjectsPage`, `MyProjectPage` y `AppShell`
  (el login ya se trabajó explícitamente en el commit de fondo/responsive; las pantallas
  nuevas, no).
- [ ] Ronda de `impeccable` sobre el resto de la app (más allá del login, que ya tuvo la
  suya) — planeado para cuando se cierren los demás ítems de esta lista, no antes.

## Fuera de alcance (recordatorio, no hacer todavía)

Documentado en detalle en `CLAUDE.md`. Se deja aquí solo como recordatorio de qué *no*
hay que empezar a construir por accidente:

- `documents`, `awards`.
- `defense_sessions`, `session_judges`, `evaluations`, `evaluation_criteria`,
  `evaluation_audit` — todo el bloque de sustentación/evaluación/jurados (ejercicio
  conceptual, no comprometido como parte del plan).
- Roles `teacher` y `judge` funcionales (existen en la tabla `roles`, sin flujo).
- Multi-tenancy real (el esquema ya lo prepara, pero no se implementa todavía).
