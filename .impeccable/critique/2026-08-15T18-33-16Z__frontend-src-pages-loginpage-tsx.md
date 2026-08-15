---
target: LoginPage (frontend/src/pages/LoginPage.tsx)
total_score: 21
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
timestamp: 2026-08-15T18-33-16Z
slug: frontend-src-pages-loginpage-tsx
---
Method: dual-agent (A: design-review subagent · B: detector-evidence subagent)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Loading state is only `disabled` + cursor change; the 600ms step transition has no status announcement of any kind. |
| 2 | Match Between System and Real World | 3 | Clear Spanish copy, but placeholder-only inputs lose their "name" the moment the user starts typing. |
| 3 | User Control and Freedom | 1 | Reset step has zero escape hatch by design — a real security decision, but combined with generic errors it can strand a user. |
| 4 | Consistency and Standards | 3 | Good token reuse, but skips the `label` prop `Input.tsx` already supports, in favor of placeholder-only fields. |
| 5 | Error Prevention | 1 | No password policy shown before submit; mismatch only checked at submit time. |
| 6 | Recognition Rather Than Recall | 3 | Minimal field count; temp password reused silently instead of re-prompted — but nothing names *whose* password is being changed. |
| 7 | Flexibility and Efficiency of Use | 2 | No `autoFocus`, no shortcuts, single rigid path — acceptable for MVP scope. |
| 8 | Aesthetic and Minimalist Design | 4 | Clean, disciplined token usage, no clutter. |
| 9 | Error Recovery | 1 | Both `catch` blocks discard the real `ApiError.message`/`code` and replace it with one hardcoded string per step. |
| 10 | Help and Documentation | 1 | No password-rule hint, no support affordance, for an audience of first-time 16-17 year old users. |
| **Total** | | **21/40** | **Acceptable** |

## Design Specificity Verdict

**LLM assessment**: Split verdict — the chrome is generic, the content and logic are not. `AuthLayout.css` line 1-6 admits the panel/side-panel shell is *"Adaptado de una plantilla publica de referencia (AsmrProg)"* — one of the most recognizable free tutorial login patterns on the web. Strip the copy back out and this shell drops unchanged into any SaaS product. What rescues it: the step transition is driven strictly by backend truth (`must_change_password`), never a UI click; the side-panel copy is genuinely localized and explains *why* the reset is happening; and `DESIGN.md` already quarantines the 80px radius/slide as auth-only, not a system signature, so the borrowed shell is a conscious, contained decision rather than an accident bleeding into the rest of the product. Net: the "Academic Archive" identity currently lives entirely in the words and the state machine — nothing about the geometry itself says "school," "colegio," "archive," or "registrar."

**Deterministic scan**: Clean. `detect.mjs --json` against `LoginPage.tsx`, `AuthLayout.css`, `App.tsx`, `Button.tsx/css`, `Input.tsx/css` returned exit code 0 and an empty findings array — no slop patterns (gradient text, low contrast, generic eyebrows, etc.) detected. This isn't a contradiction with Assessment A: the mechanical detector checks visual-pattern classes it has rules for, not UX/accessibility logic (missing `aria-live`, absent responsive breakpoints, swallowed error messages) — those require the design-review pass to surface.

**Visual overlays**: Not available this run. No browser-automation tool (MCP browser/Playwright/Puppeteer) was exposed in this session — only the read-only `WebFetch` tool, which can't inject scripts or screenshot. No live-server injection was attempted; there is no `[Human]` tab to check.

## Overall Impression

The flow's *logic* is more mature than its *shell*. The backend-driven step transition and the reassurance copy on the forced-reset step are genuinely good, security-aware UX writing — better than what a template clone usually gets. But the borrowed visual shell has zero responsive handling (a real P0 given the actual audience logs in from phones), and the error/accessibility layer wasn't built out to match the sophistication of the state machine: errors lie about what broke, and the step transition is invisible to assistive tech. The single biggest opportunity is closing that gap between "the flow is secure and well-reasoned" and "the flow tells the user what's happening and why it failed" — right now the second half is missing.

## What's Working

1. **Backend-truth-only state transition** — `step` is set exclusively by `result.must_change_password` from the server, never by a client click, with no code path that ever reverts it to `'login'`. A correctly implemented security decision, not just visual polish.
2. **Context-aware reassurance copy** — the side panel explains *why* the user is being forced through a reset ("Por seguridad, debes reemplazar tu contraseña temporal...") instead of just commanding. The single best piece of UX writing on the surface, landing exactly when it's needed.
3. **Token discipline even in a borrowed shell** — every color/spacing/radius value in the new `AuthLayout.css` routes through the shared CSS custom properties rather than hardcoding, so a future per-school theming pass can restyle this screen without touching structure.

## Priority Issues

**[P0] No responsive handling on a screen students will hit on phones**
- **Why it matters**: `.auth-form-panel` and `.auth-side-panel` are hardcoded to `width: 50%` with fixed pixel padding (48px / 40px), and the 80px asymmetric corner never adapts — with zero media queries anywhere in the file (DESIGN.md itself confirms no breakpoint system exists yet). On a ~375px phone, each half nets under 100px of usable width for a heading, two inputs, and a button. This can make login genuinely hard to complete on the device most students will actually use to log in.
- **Fix**: Below ~640px, stack the panels vertically, drop the 80px asymmetric radius, and let `.auth-container` go full-bleed.
- **Suggested command**: `/impeccable adapt`

**[P1] Errors lie about what went wrong**
- **Why it matters**: Both `handleLogin` and `handleReset` catch every failure — wrong password, expired token, weak new password, dead backend — and overwrite it with one hardcoded string each, discarding the real `ApiError.message`/`code` that `client.ts` already parses from the backend's `{detail, code}` response. Since the reset step has no way back out by design, a misdiagnosed error here isn't a minor annoyance — it can strand a user in a dead end with no idea what to fix.
- **Fix**: Surface `error.message` when the caught error is an `ApiError`; reserve the hardcoded fallback for genuinely unknown errors (e.g. JSON parse failures or network failure).
- **Suggested command**: `/impeccable harden`

**[P1] Step transition is silent for assistive tech**
- **Why it matters**: The login → reset panel swap is pure CSS transform/opacity with no `aria-live` region and no focus move — a screen-reader user gets no cue anything happened, and keyboard focus stays on the now-disabled login button.
- **Fix**: Add a visually-hidden `aria-live="polite"` status node that updates on step change, and move focus into the reset panel once the transition completes.
- **Suggested command**: `/impeccable harden`

**[P2] Placeholder-as-label, despite the component already supporting real labels**
- **Why it matters**: `Input.tsx` already has a working `label` prop with `htmlFor`/`useId` wiring, but `LoginPage.tsx` never passes it — every field relies on placeholder text alone, which disappears the instant the user starts typing. Real cost for low-vision users and anyone who glances away mid-form.
- **Fix**: Pass `label="Usuario"`, `label="Contraseña"`, `label="Nueva contraseña"`, `label="Confirmar contraseña"` — the component-level work is already done.
- **Suggested command**: `/impeccable clarify`

**[P2] Password policy is never disclosed, only enforced after the fact**
- **Why it matters**: Nothing on the reset panel states the length/complexity rules before submit. Combined with the generic-error issue above, a student whose password gets rejected has no information about what would actually work.
- **Fix**: Add static helper text under "Nueva contraseña" stating the actual backend-enforced policy.
- **Suggested command**: `/impeccable clarify`

## Persona Red Flags

**Jordan (Confused First-Timer)**: Logs in with a temp password written on paper by a teacher, gets auto-routed to the reset step. The side panel explains *why* she's there, but the form offers no rules for the new password. She picks something too short, submits, and hits the exact same string a network outage would produce — no back button, no help link anywhere. Breaks at: the generic `catch` in `handleReset` combined with the absence of policy text near "Nueva contraseña."

**Sam (Accessibility-Dependent User)**: Submits the login form for a must-change-password account. The panel swap is pure CSS with no `aria-live` region and no focus move. Sam's screen reader keeps reporting the old, now-disabled login form — there's nothing to Tab into on the new panel until manually re-exploring with a virtual cursor. Breaks at: the missing `aria-live`/`.focus()` call at the `setStep('reset')` branch.

**Casey (Distracted Mobile User)**: Opens the login link on a phone between classes. `.auth-container` shrinks correctly, but the two 50%-width panels and the 80px corner do not respond to viewport width at all — under 100px of usable content width on a 375px screen. Breaks at: the fixed-pixel padding in `AuthLayout.css`, with zero media queries anywhere in the file.

## Minor Observations

- Both `<h1>` elements exist in the DOM simultaneously at all times; only one is visually active — a mild semantic nit, not a functional bug.
- No `autoFocus` on the username field — small, avoidable friction on first load.
- No password-visibility toggle on either blind password field in the reset step, raising mistype risk on mobile keyboards (partially mitigated by the confirm field).
- `#b91c1c` for error text is still a hardcoded literal in `AuthLayout.css` rather than a `--color-error` token — already flagged as outstanding in `DESIGN.md`, still true.
- `h1` still relies on the browser default size instead of the `--font-size-xl` Display token `DESIGN.md` calls out as unclaimed — also still true.
- The success path lands on a placeholder sentence in `App.tsx` — reasonable for this build phase, but it's currently where the reset flow's "relief" moment dead-ends with zero acknowledgment.

## Questions to Consider

- If `DESIGN.md` already declares the 80px sliding-panel treatment a one-off that will never extend elsewhere in the system, is continuing to invest in polishing a borrowed tutorial shell the best use of effort here — or would a plainer, single-card "official document" treatment read as more "registrar's office" than a marketing-template slider ever will?
- The no-escape reset step is a deliberate security choice — but paired with content-free error messages, doesn't it just relocate the failure mode from "user bypasses the mandatory reset" to "user is trapped with a dead-end error and zero support path"?
- This is likely a 16-year-old's very first interaction with the system holding their grades and project data, right after the most stressful screen in the flow. Should that moment really resolve into a bare placeholder sentence?
