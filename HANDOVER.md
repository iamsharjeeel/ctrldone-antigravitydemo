# HANDOVER — CTRLDONE Phase 1 CRM (chat continuity)

## One-line status

Roadmap branches: `#10` global search · `#5` custom fields · `#1` multi-pipeline (current: `feature/1-multi-pipeline`). Next suggested: `#6` saved segments.

## Manual steps (do now if Google needed)

1. Put `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` in `.env.local` (never commit).
2. Google Cloud OAuth redirect URIs:
   - `http://127.0.0.1:54321/auth/v1/callback` (Supabase Auth login)
   - `http://localhost:3000/api/oauth/google/callback` (Gmail send connect)
3. Restart local Supabase after setting Google env: `npx supabase stop` → `npx supabase start`.

## Local stack

- Supabase: `npx supabase start` (API `http://127.0.0.1:54321`, Studio `http://127.0.0.1:54323`)
- App: `npm run dev` → `http://localhost:3000`
- First-run: `/login` → Create account → org + Inbound pipeline

---

## Chat vision — exact UI prompts (do not dilute)

Source session: App UI polish + 10 features. Keep these as the visual north star for `/app` and `/login`.

### Prompt 1 — Logo + surfaces (with 5 screenshots)

> attached 1 is the logo to be used in-app as well. you made this for the landing page, re-use that whole app-wide.
>
> attached 2: let's give a classy corner curve to all cards being used in-app, with TEXT being a big issue, A - text needs to be uniform through and use Google Sans as the font whole app wide. Make sure the font is clear everywhere on each device. Figure our weight, boldness, per card, per heading, per subheadline, smallest text should be clear to view on the app.
>
> attached 3: again follow the rounded or pill shape containers for contacts and throughout. Text not clear here too.
>
> attached 4: Pipeline cards are very very basic. Again following the graceful curve philosophy make sure the deal and pipeline has a lot more detail to add and then being displayed too. text not clear too.
>
> attached 5: Activity needs graceful corners / pill shapes and clear text treatments too.

**Attachments (vision refs):**
1. Landing logo — `ctrl` + lime check badge + `one`
2. Dashboard — sharp cards, weak muted labels, serif titles
3. Contacts — sharp table/search/buttons, unclear text
4. Pipeline — basic deal cards, need more detail + curves
5. Activity — sharp Timeline / My tasks cards, unclear text

### Prompt 2 — Tasks + font choice

> there is no task view, tasks should have it own button in nav and own page and then it's own task creation and dense list.
> Is poppins available?

**Locked decision:** Poppins via `next/font/google` (Google Sans not available via next/font; Poppins chosen as the ship font).

### Prompt 3 — Scope expansion

> let's do all 10

(5 easy wire-ups + 5 new features listed in plan — notifications, deal↔contact links, real filters, ContactInspector, deal contact picker, email templates, bulk contacts, in-app email, custom fields, suppression + audit.)

### Visual principles distilled from prompts

| Principle | Ship rule |
|-----------|-----------|
| Logo | Reuse landing `Logo.tsx` app-wide (nav + login); lime/blue badge, not forest-remapped |
| Corners | Classy / graceful curves on cards (`16px`); pill shapes on buttons, inputs, search (`999px`) |
| Type | One family app-wide (Poppins); clear weight hierarchy; smallest labels readable on every device |
| Pipeline | Deal cards must show real detail (contact, company, value, close, days in stage) — not title+price only |
| Tasks | First-class nav item + own page + creation + dense list (not buried in Activity) |
| Activity | Graceful cards; timeline-focused; link out to Tasks for creation |

---

## What changed (this pass)

- **ROADMAP #1:** Pipeline switcher via `?pipeline=` + `.segmented`; Settings → Pipelines create/default/delete (friendly FK error)
- **ROADMAP #5:** Shared `CustomFieldsEditor` (text/number/date/boolean/select) in ContactInspector + contact detail; settings/fields validates select options
- **ROADMAP #10:** `CommandPalette` searches contacts, deals, and tasks (org-scoped), grouped under Actions / Contacts / Deals / Tasks headers; deal → `/app/deals/[id]`, task → `/app/tasks`
- **Brand:** `Logo` in AppShell + login; lime/blue badge tokens restored under app/login shells
- **Type:** Poppins (400–700); clearer hierarchy; no Playfair/Inter in CRM
- **Shape:** cards 16px; buttons/inputs/search pills
- **Nav:** Dashboard · Contacts · Pipeline · **Tasks** · Activity; settings subnav; notifications dropdown
- **Pipeline:** richer deal cards (contact, close, days in stage); filters; contact picker on create
- **Contacts:** real filters, CSV as Import, ContactInspector, bulk enroll/tag/export
- **Contact detail:** score, deals, custom fields, in-app email compose + templates
- **Settings:** Templates, Fields, Pipelines, Suppression, Audit pages
- **Activity:** timeline + “Open Tasks” link (no duplicate task create sidebar)
- **Docs:** `DESIGN_SYSTEM.md`, `ROADMAP.md`, `.cursor/rules/*`

## Hard rules (do not regress)

1. Service role only in cron workers — never client/browser paths.
2. Contacts = full detail page; deals = `/app/deals/[id]`.
3. EAV write SoT; never write `contacts.custom_fields` jsonb directly.
4. Wait/send TZ: contact TZ else org default + business hours.
5. Active campaigns: pause before edit.
6. Auth failure → `needs_reauth` + pause campaigns on that account.
7. **Design:** `/app` + `/login` use Poppins + Logo; marketing keeps Geist. Wordmark is ctrl + badge + one. Honor the exact prompts above on any UI revisit.

## Key paths

- Shell/CSS: `src/components/app/AppShell.tsx`, `src/app/app.css`
- Logo: `src/components/Logo.tsx`
- Settings: `src/app/(app)/app/settings/*`, `src/components/app/SettingsSubnav.tsx`
- Tasks: `src/app/(app)/app/tasks/page.tsx`
- Plan ref (local): `.cursor/plans/app_ui_polish_6b3fe445.plan.md` (do not treat as source of truth over this file’s prompts)

## Pending / next

- Connect Google OAuth env if Continuity with Google / Gmail send needed
- Hosted Supabase may still be blocked by org free-tier — local Docker is the working path
- Optional: denser empty states, real team invite, campaign condition steps
