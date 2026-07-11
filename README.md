# CTRLDONE

Marketing site + internal CRM (`/app`) for CTRLDONE.

## Stack

- Next.js App Router (Vercel)
- Supabase (Auth, Postgres, RLS, Storage)
- GSAP / Lenis on marketing only

## Getting started

```bash
npm install
cp .env.example .env.local
# fill Supabase + OAuth keys
npm run dev
```

### Supabase setup (required)

1. Create or link a Supabase project (free-tier limit may block a second project in the same org).
2. Apply migrations under `supabase/migrations/` via CLI (`npx supabase db push` / `migration up --local`) — includes bootstrap + table grants.
3. Create private Storage bucket `csv-imports`.
4. Set env vars from `.env.example`. For Google: Client ID/Secret + redirect URIs `http://127.0.0.1:54321/auth/v1/callback` and `http://localhost:3000/api/oauth/google/callback`.
5. First user: sign up at `/login` — `bootstrap_ctrldone_org` seeds the CTRLDONE org + Inbound pipeline.

### RLS / service-role rule

No client-side code path — no client component, no route handler invoked from the browser — may ever use the service role key. Only the cron worker's server-only invocation uses the service role key. This is a hard rule, not a convention.

Intake uses anon + `submit_intake` (security definer). Never import `@/lib/supabase/admin` from client components.

## Routes

| Path | Purpose |
|------|---------|
| `/` | Marketing |
| `/login` | Auth (email + Continue with Google) |
| `/auth/callback` | Supabase OAuth code exchange |
| `/app/*` | CRM shell (top nav) |
| `/app/contacts` | Contacts list, filters, bulk actions, CSV import, inspector |
| `/app/contacts/[id]` | Contact detail, deals, custom fields, in-app email |
| `/app/pipelines` | Kanban + rich deal cards |
| `/app/tasks` | Dense task list + creation |
| `/app/activity` | Org timeline |
| `/app/settings/email` | Connected mailboxes + one-off send |
| `/app/settings/templates` | Email templates CRUD |
| `/app/settings/fields` | Custom contact fields |
| `/app/settings/suppression` | Suppression list |
| `/app/settings/audit` | Audit log |

## Cron

`vercel.json` schedules:

- `/api/cron/campaigns` every minute (header `Authorization: Bearer $CRON_SECRET`)
- `/api/cron/stale-deals` daily

## Design tokens

- Marketing: `[data-theme]` (Geist) — unchanged
- CRM / login: `data-shell="app"|"login"` — Poppins, 16px card radius, pill buttons/inputs, forest green `#1A3D32`, landing `Logo` (ctrl + badge + one)