# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Multi-actor — no single primary user; each role is central during its own stage of the
capstone lifecycle:

- **Admin:** bulk-creates accounts, coordinates the process school-wide.
- **Student:** registers and manages their own grade-11 capstone project (one per academic
  year, DB-enforced); can view every project registered by other students.
- **Teacher (advisor):** guides projects where they're the assigned advisor. Not yet functional
  in the current build phase.
- **Judge:** evaluates projects at a defense session (internal or external — external judges use
  their full email as username). Not yet functional in the current build phase.

## Product Purpose

Manage the complete lifecycle of grade-11 capstone research projects: registration, review,
defense, judge evaluation, publication of results, and historical archive. Success means
replacing ad hoc coordination with one system that has clear permissions and a fully traceable
record of the process.

## Positioning

Centralizes what the school currently coordinates through spreadsheets, shared drives, email,
and chat into one system with role-based permissions and an auditable evaluation trail (every
score change records who, when, and the previous/new value). Built from day one so it can become
multi-school SaaS later without a redesign (per-school uniqueness already in the schema,
per-school theming via design tokens), without implementing full multi-tenancy before it's
needed.

## Operating Context

- Pilot: Instituto La Salle - Bilingual School Barranquilla (Colombia).
- Academic cycle: grade-11 capstone projects, one per student per academic year.
- Admin bulk-creates accounts with a temporary password; first login forces a password change.
- External judges: `account_type = external`, username is their full email (no institutional
  domain).
- Full project lifecycle: draft → submitted → under_review → needs_revision → approved →
  defended → evaluated → published → archived.
- Any project member has equal permissions — no single project "owner".
- A teacher only sees/edits projects where they're the assigned advisor.
- Judges are assigned to a defense session, not to an individual project — a project inherits
  its judges from the session it belongs to.
- Evaluation criteria and their weights change per academic year.
- Evaluations are editable until a project is published; after that they're immutable, and every
  change is audited.
- Public visibility of a student's project data requires their explicit consent
  (`publication_consent`) — Colombian Ley 1581 de 2013, data belonging to minors.

## Capabilities and Constraints

- REST API, JSON, `/api/v1` prefix, JWT auth (short-lived access token implemented; refresh
  token designed but not yet built), argon2 password hashing.
- Storage: Supabase Storage for documents and images — **no video, a conscious decision**.
- Multi-tenancy: schema already prepared (school-scoped uniqueness constraints) but not
  implemented as real SaaS yet — single pilot school today.
- Current build phase is intentionally narrow (see project `CLAUDE.md` → "Fase actual del
  desarrollo"): login with preset accounts, only `admin`/`student` roles active, students can
  create/edit their own project and view others'. Defense sessions, evaluations, judges, and
  documents/awards remain designed but explicitly out of scope until work resumes on them.

## Brand Commitments

No official logo or brand colors confirmed yet for the pilot school. The design tokens in use
today (institutional blue + amber accent) are an explicit placeholder, free to change once real
brand assets exist.

## Evidence on Hand

No real user data, testimonials, or case studies — the pilot hasn't launched yet. Two seeded
accounts exist in the dev database for internal testing only (not real evidence to design
around).

## Product Principles

- One system of record replaces scattered spreadsheets/drives/chat coordination.
- Every evaluation change is traceable (who, when, previous/new value) — trust through
  auditability, not just function.
- Equal permissions among project teammates; no artificial "owner" hierarchy blocking
  collaboration.
- Multi-tenant-ready by construction (school-scoped uniqueness, token-based theming) without
  paying the cost of building multi-tenancy before it's needed.
- Minors' data stays private by default; public visibility is opt-in per student.

## Accessibility & Inclusion

No product-specific accessibility requirement established yet beyond standard web practice; not
confirmed with the school.
