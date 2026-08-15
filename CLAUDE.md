# Nexia — Contexto del proyecto

Plataforma web para colegios que gestiona el ciclo de vida completo de proyectos de investigación
de grado 11: registro, revisión, sustentación, evaluación por jurados, publicación de resultados
y archivo histórico. Piloto para un colegio de la comunidad La Salle, diseñado desde el día uno
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
- El objetivo de este corte es demostrar el funcionamiento del almacenamiento y visualización
  de proyectos, nada más.

**Explícitamente fuera de alcance en esta fase** (no implementar aunque el resto de este
documento lo describa como parte del diseño — sigue siendo el diseño final del proyecto,
solo pendiente hasta que se pida explícitamente avanzar a esa fase):

- `defense_sessions`, `session_judges`
- `evaluations`, `evaluation_criteria`, `evaluation_audit`
- `documents`, `awards`
- Cualquier flujo de sustentación, evaluación o jurados

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
`must_change_password`) → `user_roles` (many-to-many con `roles`: admin, teacher, judge,
student) → `projects` (con `advisor_id` FK a users, `academic_year_id`, `status`,
`publication_consent`) → `project_members` (join users–projects).

**Sustentación y evaluación** (diseño final — fuera de alcance en la fase actual, ver
"Fase actual del desarrollo"): `defense_sessions` (date, time, location) ← `session_judges`
(join con users) — los jurados se asignan a la sesión, no al proyecto individual, y el proyecto
hereda sus jurados de la sesión a la que pertenece (`projects.session_id`). `evaluation_criteria`
cuelga de `academic_years` (los pesos cambian cada año). `evaluations` (project_id, judge_id,
criteria_id, score, comment) con `evaluation_audit` registrando cada cambio (quién, cuándo, valor
anterior/nuevo).

**Pendientes de modelar cuando lleguemos ahí** (fuera de alcance en la fase actual, ver
"Fase actual del desarrollo"): `documents` (archivos por proyecto), `awards`
(resultados/menciones).

## Reglas de negocio críticas

- Un estudiante pertenece a **un solo proyecto por año académico** — constraint en base de datos
  (`UNIQUE(student_id, academic_year_id)` en `project_members`), no solo regla de UI.
- Unicidad de `username` y `email` es **por colegio** (`UNIQUE(username, school_id)`), no global —
  prepara el terreno para multi-tenant sin implementarlo todavía.
- Cualquier integrante de un proyecto tiene los mismos permisos sobre archivos y edición — no hay
  un "dueño" único del proyecto.
- Un profesor solo ve/edita proyectos donde `advisor_id` = su propio usuario (no existe tabla de
  asignación profesor-grupo separada — se descartó por redundante).
- Evaluaciones **editables mientras `projects.status` no sea `published`**; después quedan
  inmutables. Todo cambio queda auditado en `evaluation_audit`.
- Cuentas creadas en lote por el admin con contraseña temporal; `must_change_password` fuerza
  cambio obligatorio en el primer login.
- Jurados externos: `account_type = 'external'`, `username` = su correo completo (no tienen
  dominio institucional).
- Visibilidad pública de datos de un estudiante requiere `publication_consent = true`
  (Ley 1581 de 2013, datos de menores).

## Ciclo de vida de un proyecto (`projects.status`)

```
draft → submitted → under_review → needs_revision → approved → defended → evaluated → published → archived
```

## API

REST, prefijo `/api/v1`, JSON. Auth por header `Authorization: Bearer <token>`. Formato de error
estándar: `{ "detail": "...", "code": "..." }`. Endpoints concretos se definen módulo por módulo,
no de antemano.

## Sistema de diseño

Minimalista, institucional, profesional. Fondos blancos/grises claros, azul institucional + un
solo color de acento, tipografía moderna, cards limpias, espaciado generoso. Máximo 2 colores
simultáneos por componente. Personalización por colegio vía CSS variables / design tokens (logo,
color primario, color de acento) — la estructura y componentes base son siempre de Nexia.

## Secretos y configuración

Nunca commitear credenciales, claves de API, ni connection strings al repositorio. Todo va en
variables de entorno (`.env`, ignorado en `.gitignore`), con un `.env.example` documentando qué
variables hacen falta sin exponer valores reales.

## Cómo avanzar

Repo en Git/GitHub desde el inicio. Primeras sesiones de Claude Code: solo scaffold (estructura de
carpetas, `.gitignore`, README, configuración inicial) — no features todavía. Cada etapa se prueba
antes de seguir a la siguiente.
