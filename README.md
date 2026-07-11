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
2. Apply migrations under `supabase/migrations/` via CLI (`npx supabase db push` / `migration up --local`) — includes bootstrap + table grants through `20260711073300`.
3. Create private Storage bucket `csv-imports`.
4. Set env vars from `.env.example`. For Google: Client ID/Secret + redirect URIs `http://127.0.0.1:54321/auth/v1/callback` and `http://localhost:3000/api/oauth/google/callback`. Reconnect Gmail after deploy (needs `gmail.readonly` for inbox poll).
5. First user: sign up at `/login` — `bootstrap_ctrldone_org` seeds the CTRLDONE org + Inbound pipeline.
6. Optional: Twilio (Settings → SMS), Stripe (`STRIPE_SECRET_KEY`, price IDs, webhook secret), `BOUNCE_WEBHOOK_SECRET`, `TOKEN_ENCRYPTION_KEY`.

### RLS / service-role rule

No client-side code path — no client component, no route handler invoked from the browser — may ever use the service role key. Only the cron worker's server-only invocation uses the service role key. This is a hard rule, not a convention.

Intake uses anon + `submit_intake` (security definer). Never import `@/lib/supabase/admin` from client components.

## Routes

| Path | Purpose |
|------|---------|
| `/` | Marketing |
| `/login` | Auth (email + Continue with Google) |
| `/auth/callback` | Supabase OAuth code exchange |
| `/book/[slug]` | Public meeting booking |
| `/f/[id]` | Hosted embeddable form |
| `/app/*` | CRM shell (top nav) |
| `/app/contacts` | Contacts, segments, merge, bulk, CSV, inspector |
| `/app/contacts/[id]` | Contact detail, deals, custom fields, in-app email |
| `/app/pipelines` | Multi-pipeline kanban (`?pipeline=`) |
| `/app/tasks` | Typed/priority/recurring tasks |
| `/app/activity` | Org timeline + comments |
| `/app/reports` | Stage conversion + rep performance |
| `/app/campaigns/[id]/builder` | Campaign builder + analytics stats |
| `/app/settings/*` | Email, SMS, Templates, Fields, Pipelines, Automations, Scoring, Booking, Forms, Notifications, Suppression, API, Webhooks, Billing, Audit, Org, Team |
| `/api/v1/contacts` · `/api/v1/deals` | Public REST API (Bearer API key) |

## Cron

`vercel.json` schedules (header `Authorization: Bearer $CRON_SECRET`):

- `/api/cron/campaigns` — campaign step worker (email + SMS)
- `/api/cron/stale-deals` — daily stale deal alerts
- `/api/cron/recurring-tasks` — recurring task spawn
- `/api/cron/notification-digest` — email digests
- `/api/cron/inbox-poll` — Gmail reply + bounce detection (every 15m; Hobby plan may need external scheduler)

Optional: `POST /api/email/bounce-webhook` with `BOUNCE_WEBHOOK_SECRET` or `CRON_SECRET` for provider bounce hooks.

## Design tokens

- Marketing: `[data-theme]` (Geist) — unchanged
- CRM / login: `data-shell="app"|"login"` — Poppins, 16px card radius, pill buttons/inputs, forest green `#1A3D32`, landing `Logo` (ctrl + badge + one)

## Roadmap

See `ROADMAP.md` — all 20 features are implemented on `feature/roadmap-core-batch`.
