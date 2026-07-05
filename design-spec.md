# CTRLDONE Design Specification

> Generated from a `design` consultation with `oiloil-ui-ux-guide`.
> Style family: `brand-driven` (pure — no other family blended in).
> Validated against `ctrldone-business-mockup.html` (locked iteration).

## 1. Design direction

- **Product**: CTRLDONE is a growth and brand strategy partner. Otomate, its sister company, executes the technical build (site, product, campaigns). Primary audience: founders/marketing leads evaluating an agency partner.
- **Style family**: `brand-driven`. All tokens derive from the CTRLDONE logo (wordmark ink, ring blue, checkmark lime) — nothing borrowed from `premium-luxury` or `tech-cyberpunk`, per explicit choice.
- **References**: none named directly; direction was set by the logo itself plus "dark cinematic, single long-scroll" from an earlier conversation.
- **Tone**: confident, plain-spoken, specific. No vague agency-speak.
- **Hard constraints**: light-mode toggle required (dark is default). No formal WCAG AA mandate was requested, but an accessibility floor was applied anyway — see Section 10.
- **Locale**: primary `en`, no secondary locale planned.

## 2. Color

### Brand — dark mode (default)
- `--color-bg`: `#0A0C10` — page background
- `--color-surface`: `#1B2430` — cards, panels (the logo's wordmark ink)
- `--color-surface-hover`: `#232F3F`
- `--color-blue` (primary): `#5B6EF3` — the logo's ring color. Primary CTA, links, focus rings, brand accent
- `--color-blue-hover`: `#7A8BFF`
- `--color-lime` (secondary/"done" accent): `#D6EE3C` — the logo's checkmark color. Spotlight only: completion states, the Otomate section, the checkmark motif. Never a large fill, never body text.

### Brand — light mode
- `--color-bg`: `#F5F6F8`
- `--color-surface`: `#FFFFFF`
- `--color-surface-hover`: `#FBFBFD`
- `--color-blue`: `#4459E0` — deepened from the dark-mode value specifically so it passes AA as text on a white background (the dark-mode `#5B6EF3` does not, at normal text sizes)
- `--color-blue-hover`: `#5B6EF3`
- `--color-lime`: `#B8CE1E` — deepened for the same reason; still restricted to fills with dark text on top, never used as light-mode body/link text

### Neutrals (cool-tinted, matching the logo's undertone — not "true gray")
| | Dark | Light |
|---|---|---|
| `--color-text` | `#EDEEF2` | `#1B2430` |
| `--color-text-secondary` | `#B8BEC9` | `#4A5568` |
| `--color-text-muted` | `#7C8494` | `#8A93A3` |
| `--hairline` | `rgba(237,238,242,.12)` | `rgba(27,36,48,.10)` |

**Contrast note**: `--color-text-muted` on `--color-surface` measures ~3.87:1 in dark mode — under AA for normal-size text. Use `--color-text-secondary` instead for any text under 18px sitting on a card surface (this was an actual bug in the first mockup iteration, fixed before lock).

### Semantic
Not exercised in the current mockup (no form states exist yet). Proposed, extrapolated from brand palette — verify against a real component before shipping:
- `--color-success`: `#D6EE3C` (dark) / `#7A9A1C` (light) — reuses the "done" lime, thematically consistent
- `--color-warning`: `#E8B65A`
- `--color-error`: `#FF6B57`
- `--color-info`: `#5B6EF3` (dark) / `#4459E0` (light) — same as primary

## 3. Typography

| Role | Font | Weights | Source |
|---|---|---|---|
| Display, body, UI — all one family | Fredoka | 300 / 500 / 600 / 700 | Google Fonts, OFL, self-host via `next/font/google` |

No second typeface anywhere, including status/mono labels — this was an explicit brand instruction, not a default. The signature typographic device is **weight-contrast inside a single headline** (300 for the sentence, 700 for the emphasis words) rather than a font pairing.

### Type scale
- Hero H1: `clamp(2.75rem, 6.6vw, 5.5rem)`, weight 300, line-height 1.04
- Section H2: `clamp(2rem, 3.6vw, 3.25rem)`, weight 300, line-height 1.1
- Body: `1.0625rem`, weight 300, line-height 1.65
- Eyebrow/label: `0.8125rem`, weight 600, uppercase, letter-spacing `0.16em`

### Body measure
- Target ~65-75 characters per line — enforced via `max-width: 620-640px` on body paragraphs, not a `ch` unit (Fredoka's rounded forms read slightly wider than a typical grotesk at the same character count).
- Line-height 1.65 for body, 1.04-1.1 for display sizes.

## 4. Spacing

- Base unit: `4px`
- Scale: `4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96 / 128`
- Density: **balanced** (not spacious — corrected from an earlier draft that assumed a more spacious rhythm before this was actually decided)
- Section vertical rhythm: **96–128px** desktop, **48–64px** mobile

## 5. Radius

- `--radius-sm`: `8px` — tags, small chips
- `--radius-md`: `16px` — cards, inputs
- `--radius-full`: `999px` — buttons, pills, avatars

**Deviation note**: radius was not asked as an open choice — it was read directly off the logo's rounded letterforms and terminals, the same way `containerStrategy` gets read from brand collateral in a `brand-driven` project. Flagging this so a future contributor knows it's a brand-derived default, not a tested preference.

## 6. Elevation / shadow

- `--shadow-md` (rest state on stat cards, buttons): `0 0 40px rgba(91,110,243,.35)` dark / `0 0 30px rgba(68,89,224,.18)` light
- `--shadow-lg` (hover state): `0 0 70px rgba(91,110,243,.4)` dark / `0 0 50px rgba(68,89,224,.22)` light
- `--shadow-lime` (Otomate-context glow only): `0 0 40px rgba(214,238,60,.28)` dark / `0 0 30px rgba(184,206,30,.20)` light
- No hard drop shadows anywhere — glow only, always color-tinted, never neutral gray.

## 7. Motion

- Vocabulary: **expressive**
- Durations: micro-interactions (hover lift/glow) `250ms`; scroll reveals `800ms`; theme toggle icon swap `instant swap, no crossfade` (kept intentionally snappy so it doesn't compete with the reveal choreography)
- Easing: `cubic-bezier(.16,1,.3,1)` throughout — a soft ease-out, used for every transition on the page for consistency
- Allowed patterns: staggered fade+translateY scroll reveals (60ms stagger between siblings), hover lift+glow on cards/buttons, continuous slow rotation + mouse-parallax on the Control Ring signature, scroll-scrubbed particle assembly (Three.js layer — see the Cursor build brief for implementation, not reproducible in a static mockup)
- Forbidden: bounce/elastic easing, scroll-jacking beyond the one pinned hero→why sequence, more than one gradient glow per page section
- `prefers-reduced-motion: reduce`: disable the pinned scroll sequence and continuous rotation; render the Control Ring in its final resolved state; swap all `.reveal` transitions for instant `opacity: 1`

## 7a. Container strategy

**Hybrid, by explicit choice — not a single pure strategy.**

- **Base**: `tinted-surface` — cards use `background: var(--color-surface)` against `var(--color-bg)`. No border, ever.
- **Layered on top**: a pronounced glow shadow (`--shadow-md` at rest, `--shadow-lg` on hover) — normally `tinted-surface` implies *no* shadow at all, but the brand direction explicitly wanted both the soft tint separation and dramatic glow depth. Resolved as: **tint handles resting-state separation, glow handles emphasis/interaction** — cards are not glowing at full intensity by default, they light up on hover.
- Applies globally; this project has one surface type (marketing), so there are no per-surface overrides to define yet.

## 7b. Icon system

- **Set**: `lucide`
- **Weight**: regular
- **Treatment**: monochrome, `currentColor`
- **Sizes**: `16px` for inline link arrows, `24px` baseline for nav/UI, `40px` for the four service-card feature icons (a deliberate size step up from baseline — feature icons vs. UI icons, common marketing-page distinction, not an inconsistency)
- **Mixing**: none. If a needed icon isn't in Lucide, substitute the closest match rather than pulling from another set.

## 7c. Decoration

Boldness is spent in exactly two places — everywhere else stays clean, per the "spend your boldness in one place" principle.

| Surface | Gradients | Textures | Motifs |
|---|---|---|---|
| Hero | `subtle` — one radial blue glow behind the headline | `none` | `geometric` — the Control Ring |
| Otomate section | `subtle` — one radial lime glow behind the copy | `none` | `geometric` — the checkmark badge |
| Why / Services / Process / Outcomes / CTA / Footer | `none` | `none` | `none` |

No photography, no illustration, no noise/paper/dot-grid textures anywhere on this project.

## 8. Component conventions

### Buttons
- Primary: `--color-blue` fill, white text, `999px` radius, `12px 22px` padding, `--shadow-md` at rest, `--shadow-lg` + `translateY(-2px)` on hover
- Ghost: transparent, `--color-text-secondary`, no background ever, text brightens to `--color-text` on hover
- Sizes: default `14px` text / `12px 22px` padding; small (`btn-sm`, used in nav) `13px` text / `9px 16px` padding

### Inputs
Not yet built — no real form exists on the current page (the CTA section links to a call-booking flow and a mailto link, not an inline form). Define input tokens when a real contact form is built; don't improvise off-scale values in the meantime.

### Cards
- Use only for genuinely grouped content (service capabilities, process steps' text block, the three operating-model stats) — never nested.
- `16px` radius, `32px` internal padding, tinted-surface + hover glow per 7a.

## 9. Surfaces

Only one surface exists in this project:

- **Marketing landing (the entire site)**: single long-scroll page, asymmetric hero (content left-aligned ~45vw, not centered), 96–128px section rhythm, tinted-surface cards throughout, the Control Ring as the sole 3D/motion signature.

No dashboard, form, or pricing surfaces exist yet.

## 10. Accessibility floor (applied even without a formal AA mandate)

- Visible focus ring on every interactive element: `2px solid var(--color-blue)`, `3px` offset. This was missing in the first mockup iteration and added before lock.
- `--color-text-muted` is restricted from sitting under 18px on `--color-surface` backgrounds (see contrast note in Section 2).
- All decorative SVGs (logo mark, icons) are `aria-hidden="true"` since they sit beside real text that already conveys the same information.
- `prefers-reduced-motion` handling is mandatory, not optional — see Section 7.

## 11. Anti-patterns for this project

- No stock photography, no illustration — this is a `brand-driven` project with a `geometric`-only motif policy.
- No second typeface, under any framing ("just for labels," "just for the mono numbers," etc.) — one family, weight-contrast is the device.
- **No fabricated client results.** The "How We Operate" section deliberately uses true operating-model commitments (2 companies/one contract, 14-day discovery, 0 handoffs) instead of invented case-study percentages precisely so nothing on the page is a claim that could mislead a prospective client. Any future "results" section must use real, verifiable client data — not illustrative numbers dressed up as case studies.
- Cards never switch to a `border` strategy — stay tinted-surface + glow, everywhere.
- No bounce/elastic motion easing anywhere on the site.
- Lime never appears as body text or a large fill — spotlight only.

## 12. Open questions

- Real client logos/testimonials for a future proof section, once available.
- Confirm the real contact email / booking link (mockup uses a placeholder `hello@ctrldone.com`).
- Whether otomate.biz should visually inherit this system or keep a distinct sub-brand identity — not addressed in this consultation.
- Exact brand hex values were read visually off a PNG logo file, not sourced from a brand book or Figma file. Worth a final check against the original vector source if one exists.
- Input/form component tokens — deferred until a real contact form is designed.
