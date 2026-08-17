---
target: frontend/src/pages/LoginPage.tsx
total_score: 25
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 3
timestamp: 2026-08-17T06-05-15Z
slug: frontend-src-pages-loginpage-tsx
---
Method: dual-agent (A: design-review subagent · B: detector-evidence subagent)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Submit only disables/dims the button — no spinner or text change during the async request. |
| 2 | Match Between System and Real World | 4 | Plain, appropriately-pitched Spanish copy for a 16-17 year old audience. |
| 3 | User Control and Freedom | 2 | No "olvidé mi contraseña" or any recovery path; the reset step's no-escape is an intentional security decision, not counted against. |
| 4 | Consistency and Standards | 3 | Shares Button/Input/tokens well, but `.auth-container` is 24px radius in code vs. 16px documented in `DESIGN.md` as the container's "self-contained exception" — doc/code drift. |
| 5 | Error Prevention | 2 | New-password field shows no complexity/length hint before submit; only check is match-vs-confirm at submit time. |
| 6 | Recognition Rather Than Recall | 2 | All 4 fields (Usuario, Contraseña, Nueva contraseña, Confirmar contraseña) are placeholder-only — `Input.tsx` already has a working `label` prop, just not passed. |
| 7 | Flexibility and Efficiency of Use | 3 | Correct `autoComplete` values on all 4 fields enable password managers. |
| 8 | Aesthetic and Minimalist Design | 3 | Clean single-card focus, but grain + gradient + blur + two amber rings + archive stamp is a lot of simultaneous device for a 2-field form, in tension with `DESIGN.md`'s own "quiet at rest" principle. |
| 9 | Error Recovery | 2 | Error text is specific ("Usuario o contraseña incorrectos") but `.auth-error` has no `role="alert"`/`aria-live` — unlike the step-change region, it's never announced to screen readers. |
| 10 | Help and Documentation | 1 | Zero help/contact affordance anywhere for a locked-out student. |
| **Total** | | **25/40** | **Acceptable** |

## Design Specificity Verdict

**LLM assessment**: Partially solves the problem this session set out to fix, and the part that fails is that exact part. The archive identity survives and reads as genuinely InnovaLab-specific — the corner catalog stamp, serif display type, calm institutional copy, and the two new brand SVGs. But the glass treatment itself does not deliver what the code comment claims ("el grano de papel sigue visible por debajo"): the paper-grain layer sits at `opacity: 0.035` while the panels on top apply `backdrop-filter: blur(20px) saturate(160%)` — blur is precisely the operation that erases high-frequency texture like this grain. Zoomed screenshots show flat, textureless cream and navy-gradient surfaces with no perceptible grain through the glass. So today's "glass conviviendo con identidad de archivo" premise doesn't actually happen visually — the archive identity is carried entirely by elements *outside* the glass, not by the stated fusion. Not a bad idea, just two opacity values that cancel each other out.

**Deterministic scan**: CLI scan (`detect.mjs` against `LoginPage.tsx`) came back clean — exit 0, no markup-level anti-patterns. Browser-injected runtime scan against the live page found 5 items, three of which are false positives once cross-checked against this project's own established design system rather than generic templates: the "cream-palette" flag on `<body>` is `#FAF7F1`, the literally-documented Background/"Paper" token; the "dark-glow" box-shadow flag is `rgba(18,41,75,...)`, the documented Primary/navy token; the "wide-tracking" flag on `.auth-archive-code` is the intentional 0.08em letter-spacing used for the mono "catalog code" convention. A fourth (thin border reading as 0.8px instead of the authored 1px) traces to 125% OS display scaling in the test environment rounding a 1px border to the nearest device pixel — a measurement artifact, not an authored bug. The fifth is real and substantive: **the side-panel welcome text renders at 3.6:1 contrast (white on a sampled `#7889a1` point within the navy glass gradient), against a 4.5:1 requirement** — and this is on the exact panel Assessment A independently flagged as visually flat. The detector caught a concrete, measurable symptom of the same root problem the design review reached by eye.

**Visual overlays**: Browser injection and mutation succeeded during Assessment B's run and the console confirmed "5 anti-patterns found," but that assessment closed its tab at the end of its own run per its cleanup instructions — there is no overlay currently left open in your browser to view. A screenshot with overlay annotations was saved to a local temp path during that session if you want it recovered, but nothing is live right now.

## Overall Impression

The archive identity is doing real work and is specific to this product — nobody would mistake the catalog stamp, the serif type, or the new InnovaLab logos for a generic template. But the headline experiment of this session (glass + archive grain coexisting) doesn't survive contact with the browser: the blur mathematically erases the grain, so the panels render flat, and that flatness isn't just an aesthetic letdown — it produces a real, measured WCAG contrast failure on the side panel. Below that top-line issue there's a second, consistent pattern: the forced-reset flow (the harder, security-sensitive problem) got real accessibility engineering — focus management, `aria-live`, backend-truth-only state — while the "easy" baseline login next to it didn't get the same care: placeholder-only fields despite `Input.tsx` already supporting labels, silent errors, no password-reveal toggle, and on a real 375px phone the submit button sits at or past the fold beneath pure decoration. 25/40 lands in the "Acceptable" band — functional, but with a clear gap between the flow's best moment and its baseline.

## What's Working

1. **The archive identity is specific, not generic** — the catalog stamp, serif display type, mono metadata convention, and the two new InnovaLab SVG logos all trace directly back to `DESIGN.md`'s stated "Academic Archive" north star. The detector's "false positives" (cream background, navy shadow) double as confirmation these are documented, intentional brand tokens, not templated defaults.
2. **The forced-reset transition is genuinely rigorous**: focus moves programmatically to the reset `h1`, an `aria-live="polite"` region announces the step change, and the no-escape behavior is driven purely by backend truth (`must_change_password`) rather than a client-side toggle — more accessibility care than most login flows bother with.
3. **`autoComplete` is correctly wired on all 4 fields** (`username`, `current-password`, `new-password`) — a small, easy-to-skip win for password-manager users that wasn't skipped.
4. **Markup itself is clean** — the CLI scan found zero structural anti-patterns in `LoginPage.tsx`.

## Priority Issues

**[P0] The glass treatment doesn't deliver its own premise, and it's not just cosmetic**
- **Why it matters**: `backdrop-filter: blur(20px)` sits directly on top of a 0.035-opacity grain layer — blur erases exactly that kind of texture. The result renders flat and generic (confirmed by direct screenshot inspection), and on the navy side panel this flatness measurably fails contrast (see next issue) — so the unresolved aesthetic question became a real accessibility bug.
- **Fix**: either raise the grain's visual weight specifically behind the glass panels, reduce/remove `backdrop-filter` on the auth surfaces so the tint reads as a flat translucent color (which is close to what's already rendering), or accept the flat glass and stop claiming grain-through-glass in the code comment.
- **Suggested command**: `/impeccable overdrive` or `/impeccable polish`

**[P1] Side-panel welcome text fails WCAG AA contrast**
- **Why it matters**: measured at 3.6:1 (white text over a sampled point in the navy glass gradient) against a 4.5:1 requirement for body text. This is the same panel flagged as visually flat above — real users with any vision impairment lose readability on the one paragraph that welcomes a first-time user.
- **Fix**: darken the gradient's lighter stop, or add a semi-opaque scrim behind the text specifically, and re-measure.
- **Suggested command**: `/impeccable harden`

**[P1] Primary CTA sits at or past the fold on real mobile viewports**
- **Why it matters**: measured against a true 375×700 viewport, not simulated — the decorative welcome block (icon + heading + paragraph) alone runs ~271px, pushing "Iniciar sesión" to ~596-640px from the top against a ~667px visible viewport on an iPhone-SE-class device. The primary action requires scrolling past pure decoration first, on the device most students will actually use.
- **Fix**: collapse the welcome block to a slim strap (logo + one line) below 640px, or reorder so the form leads on mobile.
- **Suggested command**: `/impeccable adapt`

**[P1] No visible field labels despite the component already supporting them**
- **Why it matters**: `Usuario`, `Contraseña`, `Nueva contraseña`, `Confirmar contraseña` are placeholder-only in `LoginPage.tsx`, even though `Input.tsx` has a working `label` prop with `htmlFor` already wired. Worst on the reset step, where two visually similar password fields lose their distinguishing text the instant the user starts typing.
- **Fix**: pass `label="Usuario"`, `label="Contraseña"`, etc. — the component-level work is already done.
- **Suggested command**: `/impeccable clarify`

**[P2] Errors are invisible to assistive tech**
- **Why it matters**: `.auth-error` has no `role="alert"`/`aria-live`, unlike the step-change status region right next to it in the same file. A screen-reader user who fails login gets no notification anything happened.
- **Fix**: add `role="alert"` to the error `<p>`.
- **Suggested command**: `/impeccable harden`

## Persona Red Flags

**Jordan (Confused First-Timer, 16-17yo)**: Hits a wrong-password error with zero next step beyond "try again." On the forced-reset screen, must invent and blind-retype a new password twice — no reveal toggle, no complexity hint before submitting. If interrupted mid-form, returns to filled-but-unlabeled fields with no way to confirm which box is which.

**Sam (Accessibility-Dependent User)**: Placeholder-as-name isn't a reliable accessible-name source across all AT/browser combinations — Sam may hear only "edit text," not the field's purpose. The `.auth-error` message is silent to a screen reader. Notably Sam *is* well served specifically on the login→reset transition (focus + `aria-live` wired correctly there) — the accommodation gap is inconsistent, not absent everywhere.

**Casey (Distracted Mobile User)**: On a real short-viewport phone, submit sits at/near the fold beneath a purely decorative welcome block (measured, see P1 above). Autofilled fields showed browser-default blue/lavender tinting that clashes with the glass aesthetic and reduces legibility outdoors.

## Minor Observations

- `.auth-container` border-radius is 24px in code vs. 16px documented in `DESIGN.md` as the intentional exception value — doc/code drift, may predate this session.
- No loading spinner or text change on submit, only disabled+dimmed — risk of double-submit on a slow connection.
- Both new InnovaLab SVG logos carry permanently-decorative amber rings, consistent with how the Home screen already spends amber decoratively (the "LAB" half of the wordmark) — not a new violation, but it further stretches `DESIGN.md`'s own "Amber Reserve Rule" (amber reserved for state/attention, <10% of any screen, never decoration).
- No password-reveal toggle on either password field, most costly on the reset step's blind double-entry.
- No help/recovery affordance anywhere for a student who genuinely can't get in.
- The reported 0.8px border (vs. authored 1px) is a 125%-display-scaling rendering artifact in the test environment, not a code bug — noted for completeness, not actionable.

## Questions to Consider

- If the grain is inaudible under a 20px blur, is "the glass coexisting with the archive" a real design decision, or two ideas placed in the same file that never actually interact visually — would anyone who hadn't read the code comment guess the grain was meant to still be there?
- The forced-reset flow is measurably more accessible than the baseline login flow sitting right next to it — was the harder problem simply given more attention than the "easy" one, and does that suggest where the next accessibility pass should start?
- Two new permanent decorative amber rings, plus Home already spending amber on "LAB" and a label — at what point does the Amber Reserve Rule stop constraining the product and become documentation that no longer describes it?
