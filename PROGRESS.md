# Progreso de InnovaLab

> Documento vivo. Se actualiza al final de cada sesión de trabajo relevante — no es un
> registro histórico exhaustivo (para eso está `git log`), sino una foto de "dónde estamos"
> y "qué sigue" para retomar rápido.

Última actualización: 2026-08-17 (sesión 2)

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

## Qué falta — dentro del alcance de este corte

- [x] Pantalla real para "Estudiantes" en el sidebar — resuelto como "Mi Proyecto"
  (`MyProjectPage`), separada de `ProjectsPage`.
- [x] UX de "ya tengo proyecto" vs "no tengo proyecto todavía" — resuelto en
  `MyProjectPage` con los tres estados explícitos.
- [x] `DELETE /projects/{id}` — implementado, cualquier integrante puede borrar.
- [x] Expiración del access token + refresh token — implementados y verificados en vivo
  (ver arriba).
- [ ] Testing: no hay ningún test todavía, ni backend (pytest) ni frontend. Decidir el
  mínimo razonable para este corte antes de seguir agregando features.
- [ ] CI: no hay pipeline configurado (ni lint ni tests corren automáticamente).
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
