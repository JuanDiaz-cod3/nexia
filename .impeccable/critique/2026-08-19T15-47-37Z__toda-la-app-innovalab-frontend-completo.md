---
target: toda la app InnovaLab (frontend completo)
total_score: 23
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
timestamp: 2026-08-19T15-47-37Z
slug: toda-la-app-innovalab-frontend-completo
---
Method: dual-agent (A: design review · B: detector scan)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Document-delete failures are silently swallowed (`ProjectsPage.tsx:141-146`, `MyProjectPage.tsx:178-185`) — no user-facing error |
| 2 | Match System / Real World | 2 | Raw backend enum leaks into Spanish UI: `project.status` renders literal `under_review` etc. (`ProjectsPage.tsx:222`, `MyProjectPage.tsx:341`) |
| 3 | User Control and Freedom | 3 | Good cancel/back coverage; the no-back-button reset flow is a deliberate security choice, not a gap |
| 4 | Consistency and Standards | 2 | Delete-own-project confirm uses the default button, not `variant="danger"`, unlike identical actions elsewhere; plus two competing visual systems live at once |
| 5 | Error Prevention | 3 | Two-step delete confirms, password-match check, group-size clamp, file-type `accept` — solid |
| 6 | Recognition Rather Than Recall | 2 | Free-text "Sección" field with no picklist against existing sections — a typo silently forks a new section |
| 7 | Flexibility and Efficiency | 1 | No roster/CSV import; `MAX_GROUP_SIZE = 8` with one-row-at-a-time entry forces ~4 repeated submissions to onboard a real class |
| 8 | Aesthetic and Minimalist Design | 2 | Two simultaneous design systems (glass vs. solid-paper) plus 3 permanent placeholder panels on the first screen |
| 9 | Error Recovery | 3 | `ApiError` messages surfaced with sane fallbacks; undercut by the raw-enum leak in #2 |
| 10 | Help and Documentation | 2 | No password-policy hint on the forced-reset screen; acceptable floor for MVP, no more |
| **Total** | | **23/40** | **Acceptable** |

## Design Specificity Verdict

**LLM assessment**: Mixed, undermined by inconsistency rather than a lack of ideas. The archive-specific vocabulary is real and well-executed — the Seal component (rule-gated to `status === 'published'`), the landing "EST. 2026" crest, the mono-font "catalog code" footer, Source Serif 4 on titles, rotating research quotes. None of that is generic-CRUD boilerplate. But roughly half the app (`HomePage.css`, `AppShell.css` sidebar/topbar, `AuthLayout.css`) runs a second, undocumented "glassmorphism" system — blurred translucent panels, gradient hero, glowing background orbs — one of the most generic, trend-driven looks in consumer SaaS today, and nothing like a school archive. The codebase's own comments (`index.css:62-68`, `HomePage.css:5-7`) confirm this is a live, half-finished migration. Right now the app has two competing identities sharing one navigation, and the more "authored" one (ProjectsPage/MyProjectPage/AdminStudentsPage) is the one being migrated away from.

**Deterministic scan**: `node detect.mjs --json frontend/src` (51 files, no narrowing needed) returned exit code 0 — a bare `[]`, zero findings. No inline `impeccable-disable` comments and no `.impeccable/config.json` ignore rules exist that could be suppressing results, so the clean run is genuine, not an artifact of configuration.

**Reconciliation**: no disagreement or false positives to resolve — the detector simply doesn't operate at the layer where this app's real problems live. Everything Assessment A flagged (two competing visual systems, hardcoded colors bypassing an existing `--color-danger` token, an inconsistent danger-button variant, an untranslated backend enum) is a semantic/contextual judgment call, not a mechanical pattern the regex-based scanner is built to catch. A clean detector run here should be read as "no anti-pattern-shaped red flags," not "no design problems."

**Visual overlays**: not available this session — Claude in Chrome is disconnected, so no live browser inspection or on-page overlay evidence was collected. Both assessments worked from source code (TSX + CSS) only.

## Overall Impression

InnovaLab has real design intent — the Seal, the archive-code footer, the serif/mono typographic split — but it's currently two products stitched at the sidebar seam: a disciplined "academic archive" paper-and-ink system on the working CRUD screens, and an undocumented glassmorphism system on Home/Auth/the app chrome. That split, not any single missing feature, is the biggest opportunity here. Underneath it, the functional layer (focus management, two-step destructive confirms, `aria-live` announcements) is genuinely above-average for an MVP — this isn't a shallow build, it's an unfinished migration wearing a half-finished coat.

## What's Working

1. **The Seal** (`components/Seal.tsx`) — a real, bespoke, rule-gated signature element that only appears on `published` projects. Exactly the kind of product-specific detail that makes an interface feel authored rather than templated.
2. **Accessibility discipline in the interaction layer** — programmatic focus movement on CSS-only panel swaps (`ProjectsPage.tsx:44-50`, `LoginPage.tsx:29-33`), `aria-live` announcements, and correct Escape/focus-return handling on the mobile drawer (`AppShell.tsx:55-65`). Above-average care for this build phase.
3. **Two-step destructive confirms** as a consistent interaction pattern almost everywhere they appear — nothing deletes on a single click, cancel is always offered.

## Priority Issues

**[P0] Delete-my-project confirm isn't styled as danger**
- **Why it matters**: This is the single most irreversible action a student can take — permanently deleting their own capstone project — and it's the one place in the app where the destructive-action visual language (red/danger button) is missing, even though the identical action elsewhere (`ProjectsPage.tsx:250-257`, `DocumentList.tsx:57-67`) uses it correctly.
- **Fix**: Add `variant="danger"` to the confirm button in `MyProjectPage.tsx:333`.
- **Suggested command**: `/impeccable harden`

**[P1] Raw backend status enum leaks into the Spanish UI**
- **Why it matters**: `project.status` / `myProject.status` render literal English snake_case (`under_review`, `needs_revision`) directly into an otherwise all-Spanish interface (`ProjectsPage.tsx:222`, `MyProjectPage.tsx:341`) — visible on the public, no-login `/projects` archive that parents and external evaluators browse. Undercuts the "official institutional archive" credibility the design system is explicitly going for.
- **Fix**: Add a status → Spanish-label map, ideally paired with a small visual state indicator, not just translated text.
- **Suggested command**: `/impeccable clarify`

**[P1] Two competing design systems live simultaneously**
- **Why it matters**: The solid-paper "archive" aesthetic (Projects/MyProject/AdminStudents) and an undocumented glassmorphism system (Home/AppShell chrome/Auth) coexist mid-migration. This is the single biggest lever on the design-specificity verdict — a school research archive should read as one coherent object, not two different products stitched together at the sidebar boundary.
- **Fix**: Pick one direction and finish the migration instead of leaving it split; update DESIGN.md to match whichever wins.
- **Suggested command**: `/impeccable distill`

**[P2] Three permanent placeholder panels compete with real content on the first screen**
- **Why it matters**: The placeholder stat tile ("Estudiantes activos") and the two "Próximamente" side panels (Notificaciones, Ranking) render in identical `glass-panel` styling to live, working content on the very first screen a user sees — signaling "unfinished product," and building shell UI for features CLAUDE.md explicitly scopes out of this phase (awards/ranking, evaluation), which runs against the project's own "no sobreingeniería" instruction.
- **Fix**: Remove the placeholders, or visually demote them (smaller, clearly inert) until the features they represent actually ship.
- **Suggested command**: `/impeccable quieter`

**[P3] Error-red token drift**
- **Why it matters**: `--color-danger: #b91c1c` exists as a token — DESIGN.md's own "Do" was to promote it — but `AuthLayout.css:200`, `ProjectsPage.css:56`, and `MyProjectPage.css:139` hardcode the same hex instead of referencing it, and `HomePage.css:65` hardcodes a visually different red (`#b3261e`) for the same semantic meaning.
- **Fix**: Replace all four hardcoded reds with `var(--color-danger)`.
- **Suggested command**: `/impeccable harden`

## Persona Red Flags

**Jordan (First-Timer)**: Lands on Home and sees 2 of 5 visible content modules ("Notificaciones", "Ranking de proyectos") are dead placeholders styled identically to real content — nothing distinguishes "not loaded yet" from "doesn't exist" without reading a small "Próximamente" tag.

**Riley (Stress-Tester)**: The existing-group picker in `AdminStudentsPage` is an unbounded radio list with no scroll/search affordance as a section accumulates groups over a school year. The free-text "Sección" field has no duplicate detection, so "11°A" and "11 A" can silently fork into two sections that the admin's own section filter would then treat as unrelated.

**Project-specific — "Valentina, 16, first login on a shared school-lab computer during class"**: She receives a temp password from a printed list and hits the forced-reset screen with zero visible password requirements. If the backend rejects her attempt, she gets no guidance on what rule she broke, and cannot back out (a deliberate choice, not a bug — but it raises the stakes of the missing guidance). On a shared lab machine, the password-visibility "Mostrar/Ocultar" toggle — a good feature generally — raises exposure risk with classmates walking by, and no session-timeout is visible in this code to mitigate it.

## Minor Observations

- Sidebar nav section header reads "Siempre disponible" directly above two `aria-disabled="true"`, greyed-out nav items (`AppShell.tsx:154-160`) — the label contradicts the state.
- `--color-success` (`#3b6e4f`) is defined but never referenced anywhere — a fully dead token, despite being documented as the color for "publicado"/validated states (the Seal and status pill both use accent instead).
- `--font-size-xl` (the "Display" typography token) is used exactly once in the whole codebase, on a stat number (`HomePage.css:83`) — never on any `h1`, confirming DESIGN.md's own documented gap.
- `HomePage.css:46-50` hardcodes `font-size: 48px` on the hero title instead of using any typographic token.
- No upload progress indicator for files up to 25MB — just a button-text swap to "Subiendo…", which can read as a stall on school wifi.
- `landing-archive-code` and `auth-archive-code` are near-duplicate decorative footer patterns defined separately in two CSS files instead of shared.

## Questions to Consider

- What job is the Landing page's one-time "Entrar" gate actually doing, since Home is already public and unauthenticated — is it worth the extra click before the real product?
- Per CLAUDE.md's own "no sobreingeniería" rule: would Home look more finished with fewer, all-working parts than with five modules where two are permanently inert?
- Which visual system — glass or solid-paper — would a 16-year-old actually describe as "my school's research archive," and which reads as a generic SaaS trial? That's the real tiebreaker for the migration.
- Would a parent or visiting evaluator browsing the public `/projects` archive trust the site more with a small Spanish-labeled status indicator instead of a raw English enum string?
- How different would the real first day of onboarding 30 students feel if `AdminStudentsPage` accepted a pasted roster instead of one manually-typed row at a time, capped at 8?
