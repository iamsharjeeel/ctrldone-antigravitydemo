# CTRLDONE Design System

This is the canonical reference for how this product actually looks and is built —
as shipped in code, not as originally envisioned. Read this before styling anything.
If you're an AI coding assistant (Cursor, Claude, etc.) working in this repo: **treat
this file as ground truth for tokens and components. Extend the system below; don't
invent a parallel one.**

> **Note on `design-spec.md`**: that file documents an earlier design consultation
> for the marketing site that specified `Fredoka` as the font family. That direction
> was superseded — the shipped marketing site uses **Geist**, and the shipped CRM
> uses **Poppins** (see `HANDOVER.md` for the decision). Don't reintroduce Fredoka.
> `design-spec.md`'s color/spacing/radius/motion sections for the *marketing* site
> are still accurate; its typography section is not.

## Two surfaces, intentionally different

This codebase ships two distinct visual languages on purpose — don't blend them.

| | Marketing (`/`) | App + Login (`/app/*`, `/login`) |
|---|---|---|
| Font | Geist | Poppins |
| Theme | Dark by default, light toggle | Light only |
| Feel | Cinematic, glow shadows, long-scroll | Dense SaaS/CRM — cards, tables, pills |
| Root selector | `html[data-theme]` | `html[data-shell="app"\|"login"]` |
| Stylesheet | `src/app/globals.css` | `src/app/app.css` |

## Typography

### App + Login — Poppins
Loaded via `next/font/google` in `src/app/(app)/layout.tsx` and `src/app/login/layout.tsx`
(weights 400–700). Both layouts wrap `{children}` in a `<div className={poppins.variable}>`.

### Marketing — Geist
`Geist` / `Geist_Mono` loaded in the root `src/app/layout.tsx` and applied directly on
`<html className={...}>`.

**Never introduce a third font family anywhere in this app.**

### ⚠️ The font-variable gotcha — read before touching either layout file

`next/font`'s `.variable` only defines a CSS custom property (e.g. `--font-poppins`)
on whatever element you attach the className to — it does **not** set `font-family`.
`app.css` redeclares `--font-sans: var(--font-poppins), ui-sans-serif, system-ui, sans-serif;`
scoped to `[data-shell="app"]` / `[data-shell="login"]`, which match `<html>` (via a
script that sets the attribute on `document.documentElement`).

The wrapper `<div className={poppins.variable}>` is a **descendant** of `<html>`. If
`--font-sans` is only *declared* at `<html>` (where `--font-poppins` doesn't exist),
it resolves to the CSS "guaranteed-invalid" value right there — and that invalidity
**inherits down the tree**, poisoning every descendant's `--font-sans` regardless of
what's declared lower down. Setting `font-family: var(--font-sans)` on the wrapper
div does **not** fix this — you have to redeclare the **custom property itself**:

```tsx
<div
  className={poppins.variable}
  style={{
    "--font-sans": "var(--font-poppins), ui-sans-serif, system-ui, sans-serif",
    fontFamily: "var(--font-sans)",
  } as React.CSSProperties}
>
```

If text ever starts rendering in a serif fallback font again, this is almost
certainly why. Verify with a browser devtools computed-style check on `--font-sans`,
not just visually.

## Color tokens

### App shell (`src/app/app.css`, `[data-shell="app"]` / `[data-shell="login"]`)

| Token | Value | Use |
|---|---|---|
| `--bg` | `#f7f7f5` | Page background (striped) |
| `--surface` | `#ffffff` | Cards, inputs, panels |
| `--surface-2` | `#f3f4f6` | Table headers, chip backgrounds |
| `--surface-hover` | `#f9fafb` | Hover state on rows/buttons |
| `--border` | `#e5e7eb` | Default hairline border |
| `--border-strong` | `#d1d5db` | Emphasized border (hover states) |
| `--forest` / `--forest-deep` | `#1a3d32` / `#063322` | Primary brand fill (avatars, primary buttons, "won" states) |
| `--signal-blue` | `#4459e0` | Info accent, links |
| `--signal-lime` | `#b8ce1e` | Secondary accent |
| `--signal-red` | `#b91c1c` | Errors, destructive/lost states |
| `--text` | `#111111` | Primary text |
| `--text-secondary` | `#374151` | Secondary text, meta |
| `--text-muted` | `#6b7280` | Placeholder, tertiary text |
| `--radius-app` | `16px` | Cards, inputs, modals |
| `--radius-pill` | `999px` | Buttons, search, avatars, tags |

### Marketing (`src/app/globals.css`, `:root[data-theme]`)

Dark (default) / light pair — see `--bg`, `--surface`, `--surface-hover`,
`--signal-blue`/`-hover`, `--signal-lime`, `--signal-amber`, `--text`/`-secondary`/`-muted`,
`--hairline` in `globals.css`. Spacing scale: `--space-1` through `--space-8`
(8/16/24/32/48/64/96/128px). Radii: `--radius-sm` 2px, `--radius-md` 4px, `--radius-lg`
6px, `--radius-full` 999px.

**Marketing shadows (`--shadow-md`/`-lg`/`-lime`) are currently hardcoded to `none`**,
which flattens the glow-based depth `design-spec.md` calls for. This looks intentional
in the code but contradicts the design spec — if you're asked to add "depth" or
"glow" back to marketing cards, ask before re-enabling; don't silently flip it.

## Elevation

App-shell cards use a subtle rest-state shadow (`0 1px 2px rgba(17,24,39,.04)`) plus a
stronger shadow + border-color shift on hover for draggable/interactive cards (see
`.deal-card:hover`). Keep new interactive cards consistent with this — subtle at
rest, slightly more pronounced on hover. Don't add heavy drop shadows or borders as
a substitute for the tint/shadow pattern already established.

## Icons

`lucide-react` only, monochrome (`currentColor`). Don't mix in another icon set.

## Component class reference (`src/app/app.css`)

Reuse these before writing new inline styles or new one-off classes.

| Class | Purpose |
|---|---|
| `.app-shell`, `.top-nav*`, `.app-main` | Page chrome / nav |
| `.app-page-title`, `.app-page-sub` | Page header pair |
| `.app-card`, `.app-card-header` | Bordered container + standardized header row |
| `.app-section-title`, `.app-label`, `.field-label`, `.text-meta` | Text hierarchy: section heading (17px/600) → uppercase eyebrow label (12px/600) → form field label (12px/600, not uppercase) → secondary/meta body text |
| `.app-stat-value` | Large tabular-number stat |
| `.app-btn`, `.app-btn-primary` | Pill buttons |
| `.app-input` (+ `select`/`textarea` variants) | Pill inputs |
| `.app-table` (+ `.dense`) | Data tables |
| `.status-pill` (+ `-blue`/`-lime`/`-red`) | Status chips |
| `.stage-dot` (+ `-won`/`-lost`) | Inline stage indicator |
| `.pagination-btn` | Circular pagination control, has a real `:disabled` style |
| `.segmented`, `.segmented-btn[data-active]` | Segmented tab control (e.g. Mine/Team) — use instead of toggling `.app-btn-primary`, which reads as a second CTA |
| `.empty-row` | Muted text for an empty `<td>` row |
| `.empty-inline`, `.empty-inline-icon` | Full empty-state block: icon chip + message (+ optional CTA) |
| `.skeleton-line` | Shimmer loading placeholder |
| `.task-title--done`, `.task-due--overdue` | Task state modifiers |
| `.kanban-board`, `.kanban-col` (`.drag-over`), `.kanban-col-head/-title/-meta` (`--won`), `.kanban-empty` | Kanban board + drag feedback + empty column |
| `.deal-card` (`--won`), `.deal-card-title/-value/-meta/-footer` | Deal cards, hover elevation built in |
| `.avatar-circle` | Initials avatar |
| `.notif-panel`, `.notif-item(-title/-sub)` | Notification dropdown |
| `.settings-subnav` | Pill sub-navigation |
| `.bulk-bar` | Bulk-action bar |
| `.modal-backdrop`, `.modal-card` | Modal system |
| `.command-hint`, `.command-kbd` | Command palette shortcut hints |
| `.timeline`, `.timeline-item` | Activity timeline |
| `.contact-detail-grid` | 320px + 1fr detail layout |
| `.inspector-backdrop`, `.inspector-panel` | Slide-over inspector |
| `.login-*` | Login screen equivalents of the above |

## Empty states

Two patterns, pick by context:
- **Inside a table row** (`<td colSpan>`): `.empty-row` — just muted text, optionally
  with an inline action link/button.
- **Standalone block** (a whole card/section is empty): `.empty-inline` wrapping an
  `.empty-inline-icon` (a Lucide icon in a 44px rounded chip) + message + optional
  primary button. See `contacts/page.tsx` or `activity/page.tsx` for reference.

## Interaction states

- Every interactive element gets a visible focus ring already (global
  `*:focus-visible { outline: 2px solid var(--signal-blue); outline-offset: 3px; }`)
  — don't override or remove this.
- Buttons/rows use `--surface-hover` on hover, not opacity changes.
- Disabled controls should have a real dimmed + `cursor: not-allowed` state (see
  `.pagination-btn:disabled`) — don't rely on the native disabled look alone.
- Draggable elements (kanban cards) get a hover elevation change; valid drop targets
  get a `.drag-over` outline + tint (see `pipelines/page.tsx`).

## Rules for extending this system

1. **Reuse tokens and classes above before adding new ones.** If you need a new
   component, compose it from `--radius-app`/`--radius-pill`, the existing color
   tokens, and the existing spacing scale — don't hardcode hex colors or magic
   pixel values in TSX.
2. **Don't add a third font**, don't change Poppins → something else in the app
   shell, and don't change Geist on marketing.
3. **New app-shell CSS goes in `app.css` under `[data-shell="app"]` or
   `[data-shell="login"]`** — matching the existing pattern, not a new stylesheet.
4. **If you touch `src/app/(app)/layout.tsx` or `src/app/login/layout.tsx`**, keep
   the `--font-sans` custom-property redeclaration on the wrapper div (see the
   gotcha above) — don't simplify it back to a plain `font-family` line.
5. **Keep marketing and app-shell visually separate.** Don't bring glow shadows,
   dark theme, or Geist into `/app` or `/login`, and don't bring pill-button/light
   SaaS chrome into the marketing site.
6. When in doubt about a token value or component's intended look, grep `app.css` /
   `globals.css` for the existing pattern rather than guessing — this file is a
   summary, the CSS is the source of truth.
