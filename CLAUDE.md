# InnovaLab — Contexto del proyecto

Plataforma web para colegios que gestiona el ciclo de vida completo de proyectos de investigación
de grado 11: registro, revisión, sustentación, evaluación por jurados, publicación de resultados
y archivo histórico. Piloto para el Instituto La Salle - Bilingual School Barranquilla, diseñado
desde el día uno
para poder convertirse en un producto SaaS multi-colegio más adelante (sin implementar
multi-tenancy completo todavía).

## Objetivo de aprendizaje — LEE ESTO PRIMERO

Juan es estudiante de Ingeniería de Sistemas y está usando este proyecto para aprender desarrollo
profesional. **No construyas features completas de una sola vez.** Antes de implementar algo:

1. Explica qué vamos a construir y por qué.
2. Explica el concepto detrás (si aplica) y las alternativas.
3. Recomienda una opción con su razón.
4. Implementa, en pasos pequeños y probables.
5. Explica las partes importantes del código generado — no lo escondas.
6. Deja que Juan participe en las decisiones; si está tomando una mala decisión técnica, dilo.

No cambies arquitectura, no introduzcas dependencias, ni hagas cambios masivos sin avisar primero
y explicar el porqué. No sobreingeniería: evita abstracciones que todavía no hacen falta.

## Fase actual del desarrollo

Estamos construyendo un primer corte vertical simple, no el sistema completo de una sola vez.
El alcance de esta fase es únicamente:

- Login con usuarios preestablecidos (el admin precrea las cuentas, sin autorregistro).
- Dos roles activos por ahora: `admin` y `student`. Los roles `teacher` y `judge` existen en
  la tabla `roles` pero todavía no tienen flujo funcional.
- Los estudiantes pueden crear/editar su propio proyecto y ver los proyectos que ya existen
  (registrados por otros usando el mismo login).
- Los estudiantes pueden subir/borrar documentos (PDF, Word, PowerPoint) de su propio
  proyecto; cualquiera puede verlos y descargarlos sin necesidad de login.
- El objetivo de este corte es demostrar el funcionamiento del almacenamiento y visualización
  de proyectos y sus documentos, nada más.

**Explícitamente fuera de alcance en esta fase** (no implementar):

- `awards` — pendiente de modelar cuando lleguemos ahí.
- `defense_sessions`, `session_judges`, `evaluations`, `evaluation_criteria`,
  `evaluation_audit`, y cualquier flujo de sustentación, evaluación o jurados — este bloque
  es una posible oportunidad de ampliación a futuro, cuya viabilidad habría que evaluar por
  separado. No forma parte del plan de InnovaLab tal como está; ver nota en "Modelo de datos —
  entidades principales".

## Convención de idioma

**Todo identificador de código va en inglés**: nombres de tablas, columnas, endpoints, variables,
funciones, componentes. La documentación y los comentarios pueden estar en español. No mezclar
idiomas dentro del código (nunca `estado` junto a `status` en el mismo esquema).

## Stack

- **Frontend:** React + TypeScript + Vite
- **Backend:** Python + FastAPI
- **Base de datos:** PostgreSQL
- **Storage:** Supabase Storage (documentos e imágenes — sin video, decisión consciente)
- **Deploy MVP:** Vercel (frontend) + Render/Railway (backend) + Supabase (Postgres + Storage)
- **Auth:** JWT (access token corto + refresh token), hashing con bcrypt o argon2

## Modelo de datos — entidades principales

**Núcleo:** `schools` → `users` (con `username`, `email`, `account_type`: institutional/external,
`must_change_password`, `section_id` nullable) → `user_roles` (many-to-many con `roles`: admin,
teacher, judge, student) → `projects` (con `advisor_id` FK a users, `academic_year_id`, `status`,
`publication_consent`, `section_id` nullable) → `project_members` (join users–projects).

**Secciones y grupos (11°A/B/C):** `sections` (school_id, academic_year_id, name — ej. "11°A";
se crea sola la primera vez que un admin la usa, sin pantalla de gestión aparte todavía) es el
salón completo, distinto de un "grupo" de proyecto (2-4 estudiantes). Un grupo de proyecto
**puede mezclar integrantes de secciones distintas** — es una decisión de negocio explícita,
no una laguna: cada estudiante tiene su propia `section_id` en `users` (fuente de verdad real),
y `student_groups.section_id` (school_id, academic_year_id, section_id, NOT NULL) es solo una
"sección de referencia" — la del primer estudiante de la lista al crear el grupo — que organiza
la navegación del admin (`GET /admin/student-groups?section_id=` filtra "grupos con algún
integrante en esa sección", no "grupos cuya sección de referencia es esa"; el label "Grupo N"
también se basa en ella) pero no restringe a los demás integrantes. `student_group_members`
(join, con la misma regla de "un estudiante por año académico" que `project_members`) existe
para que el admin pueda pre-crear cuentas de estudiantes agrupadas ANTES de que exista un
proyecto real — cuando uno de ellos crea su proyecto (`POST /projects`), el backend agrega
automáticamente al resto del grupo como integrantes del mismo proyecto, sin importar su
sección. `projects.section_id` se copia de la sección individual de quien crea el proyecto en
ese momento (denormalizado, mismo patrón que `school_id`/`academic_year_id` en `projects`) —
es informativo sobre el creador puntual, no representa a todo el equipo si el grupo es mixto.

**Sustentación y evaluación** (ejercicio conceptual, no comprometido como parte del plan de
InnovaLab — ver nota abajo): `defense_sessions` (date, time, location) ← `session_judges`
(join con users) — los jurados se asignarían a la sesión, no al proyecto individual, y el
proyecto heredaría sus jurados de la sesión a la que pertenece (`projects.session_id`).
`evaluation_criteria` colgaría de `academic_years` (los pesos cambian cada año). `evaluations`
(project_id, judge_id, criteria_id, score, comment) con `evaluation_audit` registrando cada
cambio (quién, cuándo, valor anterior/nuevo).

> Este modelo se diseñó como ejercicio conceptual para explorar cómo se vería un flujo de
> sustentación y evaluación por jurados. No está planeado como parte de lo que se va a
> construir en InnovaLab — no compromete una "fase 2". Queda documentado aquí como referencia,
> por si en el futuro se evalúa por separado la viabilidad de ampliar el alcance en esa
> dirección.

**Documentos:** `documents` (`project_id` FK a `projects`, `file_name`, `file_type`,
`size_bytes`, `storage_path`, `uploaded_by` FK a `users`, `uploaded_at`) — archivos en
Supabase Storage asociados a un proyecto. Mismo criterio de permisos que editar el
proyecto: cualquier integrante puede subir/borrar, admin también sobre cualquier proyecto.
Descarga pública, sin login (mismo criterio que `GET /projects` — el archivo de
investigación es abierto). Tipos permitidos: PDF, Word (`.doc`/`.docx`), PowerPoint
(`.ppt`/`.pptx`). Tamaño máximo 25MB por archivo. El navegador sube el archivo al backend
(no directo a Supabase con URL firmada) — más simple de validar y depurar en este corte;
se reevalúa si el volumen/tamaño lo justifica más adelante.

**Pendientes de modelar cuando lleguemos ahí** (fuera de alcance en la fase actual, ver
"Fase actual del desarrollo"): `awards` (resultados/menciones).

## Reglas de negocio críticas

- Un estudiante pertenece a **un solo proyecto por año académico** — constraint en base de datos
  (`UNIQUE(student_id, academic_year_id)` en `project_members`), no solo regla de UI.
- Unicidad de `username` y `email` es **por colegio** (`UNIQUE(username, school_id)`), no global —
  prepara el terreno para multi-tenant sin implementarlo todavía.
- Cualquier integrante de un proyecto tiene los mismos permisos sobre archivos y edición — no hay
  un "dueño" único del proyecto.
- El rol `admin` tiene control total sobre el repositorio de proyectos del colegio: puede editar y
  borrar cualquier proyecto, sea integrante o no (`PATCH`/`DELETE /projects/{id}` lo permiten via
  `is_admin()` en `deps.py`, ademas de la regla normal de "cualquier integrante puede"). No incluye
  gestión de usuarios todavía — queda fuera de alcance hasta que se necesite.
- Un profesor solo ve/edita proyectos donde `advisor_id` = su propio usuario (no existe tabla de
  asignación profesor-grupo separada — se descartó por redundante).
- Evaluaciones **editables mientras `projects.status` no sea `published`**; después quedan
  inmutables. Todo cambio queda auditado en `evaluation_audit`.
- Cuentas creadas en lote por el admin con contraseña temporal; `must_change_password` fuerza
  cambio obligatorio en el primer login.
- Jurados externos: `account_type = 'external'`, `username` = su correo completo (no tienen
  dominio institucional).
- Los proyectos son públicos desde que existen: `GET /projects` (listado y detalle) no requiere
  login — es el archivo abierto de investigación del colegio, pensado para consultarse sin cuenta.
  Crear/editar/borrar el propio proyecto sigue requiriendo autenticación. `publication_consent`
  queda como columna en `projects` sin uso por ahora (decisión consciente: ya no gatea
  visibilidad; se retira el campo en una migración aparte si se confirma que no hace falta).
- Documentos de un proyecto: mismo criterio de permisos que editar el proyecto (cualquier
  integrante puede subir/borrar, admin también sobre cualquier proyecto). Descarga pública,
  sin login. Tipos permitidos: PDF, Word, PowerPoint. Tamaño máximo 25MB por archivo.

## Ciclo de vida de un proyecto (`projects.status`)

```
draft → submitted → under_review → needs_revision → approved → defended → evaluated → published → archived
```

## API

REST, prefijo `/api/v1`, JSON. Auth por header `Authorization: Bearer <token>`. Formato de error
estándar: `{ "detail": "...", "code": "..." }`. Endpoints concretos se definen módulo por módulo,
no de antemano.

## Sistema de diseño

Identidad anclada en los colores reales del Instituto La Salle - Bilingual School Barranquilla
(verificados por inspección de su sitio institucional, no inventados):

- Primary (azul institucional): #12294B
- Accent (ámbar/dorado): #E8A23A
- Background (fondo cálido tipo papel, no blanco clínico): #FAF7F1
- Surface (tarjetas): #FFFFFF
- Success (estados "publicado"/validado): #3B6E4F
- Ink (texto principal): #1C1B18
- Ink muted (texto secundario): #5B584F
- Border (líneas sutiles): #E4DCC8

NOTA: Primary y Accent son una aproximación visual tomada de una captura de
pantalla del sitio real, no un valor de pixel exacto — pueden ajustarse cuando
se confirme el valor preciso con el gotero de DevTools. Por eso TODO color debe
vivir como variable CSS en un único archivo de tokens, nunca hardcodeado en
componentes individuales — así un ajuste futuro es un cambio en un solo lugar.

Tipografía:
- Display/títulos: Source Serif 4 (evoca peso de documento oficial — nombres de
  proyecto, encabezados)
- Body/UI: Inter (formularios, botones, texto funcional)
- Utilitaria/metadatos: IBM Plex Mono (códigos de proyecto, año, categoría —
  evoca catalogación de archivo)

Elemento de firma — "el sello": un emblema circular en el color accent, con
doble borde, que aparece únicamente sobre projects con status = "published".
Reemplaza cualquier ícono genérico de check/palomita para ese estado. Se
implementa cuando construyamos la vista de tarjeta de proyecto — no es
necesario ahora.

Personalización por colegio vía las mismas CSS variables (Primary, Accent,
logo). Estos valores del Instituto La Salle - Bilingual School Barranquilla son el default del
colegio piloto, no un hardcode permanente.

Antes de tomar cualquier decisión de diseño visual que no esté ya fijada arriba
(layout de una pantalla nueva, jerarquía de una vista, espaciado, cualquier
elección estética no cubierta explícitamente por estos tokens), consulta primero
.claude/skills/frontend-design/SKILL.md y sigue su proceso antes de decidir. Los
tokens de esta sección (colores, tipografías, el sello) son la restricción de
partida, no negociable — el skill se usa para decidir todo lo que todavía no está
definido, nunca para cambiar lo ya decidido aquí.

## Secretos y configuración

Nunca commitear credenciales, claves de API, ni connection strings al repositorio. Todo va en
variables de entorno (`.env`, ignorado en `.gitignore`), con un `.env.example` documentando qué
variables hacen falta sin exponer valores reales.

## Cómo avanzar

Repo en Git/GitHub desde el inicio. Primeras sesiones de Claude Code: solo scaffold (estructura de
carpetas, `.gitignore`, README, configuración inicial) — no features todavía. Cada etapa se prueba
antes de seguir a la siguiente.
