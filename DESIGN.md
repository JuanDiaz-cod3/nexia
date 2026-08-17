---
name: InnovaLab
description: Plataforma institucional para gestionar el ciclo de vida de proyectos de grado 11
colors:
  primary: "#1e3a8a"
  primary-hover: "#1e40af"
  accent: "#b45309"
  accent-bg: "#fef3e2"
  bg: "#ffffff"
  bg-subtle: "#f8fafc"
  border: "#e2e8f0"
  text: "#1e293b"
  text-muted: "#64748b"
  text-on-primary: "#ffffff"
  error: "#b91c1c"
typography:
  display:
    fontFamily: "system-ui, 'Segoe UI', Roboto, sans-serif"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: 1.2
  title:
    fontFamily: "system-ui, 'Segoe UI', Roboto, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.3
  body:
    fontFamily: "system-ui, 'Segoe UI', Roboto, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "system-ui, 'Segoe UI', Roboto, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.4
rounded:
  md: "8px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.text-on-primary}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  card:
    backgroundColor: "{colors.bg}"
    rounded: "{rounded.md}"
    padding: "{spacing.lg}"
  input:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
---

# Design System: InnovaLab

## Overview

**Creative North Star: "The Academic Archive"**

InnovaLab reads like the registrar's office of a well-run school: formal enough to hold institutional
weight — grades, evaluations, minors' data — but never cold enough to intimidate the 16-17 year
old students who log in to manage their own capstone project. Every surface is built from a small,
disciplined vocabulary (one primary color, one reserved accent, one type family, one radius) so
that per-school theming later is a token swap, not a redesign.

The system is deliberately quiet at rest. Structure and whitespace carry the hierarchy; color is
spent sparingly and with intent. The one confirmed visual rejection so far: no third color, no
decorative flourishes competing with the primary blue.

**Key Characteristics:**
- Single institutional blue as the only color with real visual weight.
- Amber accent reserved for state/attention, never decoration — rare by design.
- One type family, differentiated by size and weight, not by swapping fonts.
- Flat by default; a two-step shadow vocabulary signals elevation only where it's earned.
- Approachable-but-authoritative tone: professional documents, not a playful consumer app.

## Colors

A one-accent palette: institutional blue carries the system, amber is held in reserve.

### Primary
- **Archive Navy** (`#1e3a8a`): primary actions, links, focus rings, brand presence (buttons,
  active states, the auth side panel's gradient origin). This is the only color allowed to
  dominate a screen.
- **Archive Navy, Bright** (`#1e40af`): hover state for Archive Navy surfaces only. Never used at
  rest.

### Secondary
- **Registrar Amber** (`#b45309`) / **Amber Parchment** (`#fef3e2`, background tint): reserved for
  state and attention — pending-review flags, warnings, status badges. Not yet consumed by any
  shipped component; it exists in tokens ahead of the feature that needs it (defense scheduling,
  evaluation status) so that feature doesn't invent a new color when it lands.

### Neutral
- **Paper** (`#ffffff`): base surface for cards, inputs, the login container.
- **Cool Mist** (`#f8fafc`): page background, disabled-field fill — sits just off Paper so cards
  read as lifted without needing a shadow to prove it.
- **Hairline** (`#e2e8f0`): borders on cards, inputs, secondary buttons.
- **Ink** (`#1e293b`): primary text.
- **Faded Ink** (`#64748b`): labels, muted/secondary text.
- **Ink Red** (`#b91c1c`): form error text. Currently a hardcoded value in `AuthLayout.css`, not
  yet promoted to a CSS custom property — see Do's and Don'ts.

### Named Rules
**The Amber Reserve Rule.** Registrar Amber appears on less than 10% of any given screen, and only
to mean "this needs attention" (status, pending, warning). It never decorates. Its rarity is what
makes it legible as a signal.

## Typography

**Body Font:** system-ui, 'Segoe UI', Roboto, sans-serif (single family for every role)

**Character:** One typeface used at four sizes/weights rather than a font pairing — keeps the
system feeling like consistent institutional paperwork, not a marketing site borrowing a display
face.

### Hierarchy
- **Display** (700, 28px, 1.2): page-level headings ("InnovaLab", "Iniciar sesión"). Token exists
  (`--font-size-xl`) but no heading currently opts into it explicitly — see Do's and Don'ts.
- **Title** (700, 20px, 1.3): secondary headings (auth side-panel `h2`).
- **Body** (400, 16px, 1.5): running text, form inputs, buttons.
- **Label** (400, 14px, 1.4): input labels, helper/error text.

## Layout

Single-column, centered content. General pages cap at 960px (`.page`); the auth surface is a
fixed 768px card centered in the viewport. Spacing runs on a 5-step scale — 4 / 8 / 16 / 24 / 40px
— used consistently for internal padding (components), gaps (form fields), and page margins
(largest step). No breakpoint system has been established yet; nothing in the codebase branches
on viewport width.

## Elevation & Depth

Flat by default, with a two-step shadow vocabulary applied consistently wherever a surface needs
to lift off the page — not reserved for rare moments, just scaled to how much a surface needs to
separate. Both steps share the same ink tint (`rgba(15, 23, 42, ...)`), so they read as one family
at different diffusion, not two unrelated effects.

### Shadow Vocabulary
- **Resting** (`box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15, 23, 42, 0.06)`):
  default for cards and other content surfaces sitting on Cool Mist.
- **Floating** (`box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08)`): larger, more diffuse — for
  surfaces that need to read as clearly above the page, currently the auth container.

## Shapes

One shared corner radius (8px, `--radius`) covers buttons, inputs, and cards — the system doesn't
vary radius by component type. The auth container steps up to 16px as a self-contained exception
for that one larger surface. The auth side panel's 80px asymmetric corner is a one-off signature
of that specific component (see Components and Do's and Don'ts) — not a system-wide shape rule.

## Components

### Buttons
- **Shape:** 8px radius, 1px transparent border (visible only on the secondary variant).
- **Feel:** tactile and confident — solid fill for primary actions, decisive hover feedback,
  nothing ornamental.
- **Primary:** Archive Navy fill, white text, padding `8px 16px`. Hover → Archive Navy Bright.
- **Secondary:** transparent fill, Archive Navy text, Hairline border. Hover → Cool Mist fill.
- **Focus:** 2px Archive Navy outline, 2px offset, on `:focus-visible` only.
- **Disabled:** 0.6 opacity, `cursor: not-allowed`.

### Cards
- **Corner Style:** 8px radius.
- **Background:** Paper.
- **Shadow Strategy:** Resting (see Elevation & Depth).
- **Border:** 1px Hairline.
- **Internal Padding:** `--space-lg` (24px).

### Inputs / Fields
- **Style:** Paper background, 1px Hairline border, 8px radius, label in Faded Ink above the
  field.
- **Focus:** border shifts to Archive Navy plus a 2px Archive Navy outline (1px offset).
- **Disabled:** Cool Mist background, `cursor: not-allowed`.

### Auth Panel (auth-specific, not a system signature)
Two absolutely-positioned form panels (login / reset password) occupying the same 768px container,
switched by sliding + cross-fading over 600ms — never by a user-clickable toggle. The transition
is driven strictly by backend state (`must_change_password`): once a user is routed to the reset
panel there is intentionally no UI path back to login, so a forced password change can't be
dismissed. A gradient side panel (Archive Navy → Archive Navy Bright) carries the 80px asymmetric
corner and flips sides with the active step. This pattern is confirmed as specific to the
login/reset surface for now — see Do's and Don'ts before reusing it elsewhere.

## Do's and Don'ts

### Do:
- **Do** keep Registrar Amber under 10% of any screen, reserved for status/attention only (**The
  Amber Reserve Rule**).
- **Do** use the two-step shadow vocabulary (Resting / Floating) for any new elevated surface
  instead of inventing a new shadow value.
- **Do** give `h1` an explicit `--font-size-xl` (Display, 28px/700) instead of relying on the
  browser's default heading size — right now no heading opts into the token that already exists
  for it.
- **Do** promote Ink Red (`#b91c1c`) to a `--color-error` custom property before reusing it outside
  `AuthLayout.css` — it's real, used, and about to be needed elsewhere (form validation on the
  project CRUD screens).

### Don't:
- **Don't** extend the Auth Panel's 80px asymmetric radius or sliding-panel treatment to other
  screens yet — it's a confirmed auth-only pattern, not a system-wide signature (revisit only with
  a deliberate decision, not by copy-paste).
- **Don't** add a third color with real visual weight. The palette is Primary + Neutral, with
  Registrar Amber held in reserve — not a growing set of accents.
- **Don't** let the reset-password panel gain a "back to login" affordance from the UI layer; the
  no-escape behavior is a security decision (see `LoginPage.tsx`), not an oversight to fix.
