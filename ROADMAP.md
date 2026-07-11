# CTRLDONE Feature Roadmap — 20 features to ship

This is a build-ready spec for the next 20 features, grounded in the actual schema
(`supabase/migrations/20260710015811_phase1_crm_schema.sql`) and code patterns already
in this repo — not a wishlist. Read `DESIGN_SYSTEM.md` before touching any UI.

## How to work through this doc

- **One feature = one PR/branch.** Don't batch unrelated features together.
- **New migrations**: add a new file in `supabase/migrations/` named
  `<timestamp>_<description>.sql` with a timestamp later than the existing
  `20260711030100_grant_table_privileges.sql`. Never edit a migration that's already
  shipped — append a new one, even for a small column addition.
- **Every new table needs**: `org_id uuid not null references public.orgs(id) on
  delete cascade`, an `updated_at` trigger via `public.set_updated_at()`, RLS enabled,
  and an org-scoped policy following the exact pattern already used for every other
  table: `using (public.is_org_member(org_id)) with check (public.is_org_member(org_id))`.
  Copy an existing table's block in the migration file rather than improvising.
- **Every new page/query**: follow the existing pattern of resolving `org_id` via
  `org_members` (see `src/lib/org.ts` `getMembership()`/`ensureOrg()`, or the inline
  `supabase.from("org_members").select("org_id").eq("user_id", user.id).limit(1).maybeSingle()`
  pattern repeated across `contacts/page.tsx`, `pipelines/page.tsx`, `tasks/page.tsx`,
  `activity/page.tsx`) — don't invent a different auth/org-resolution path.
- **Service role stays server-only.** Only `src/app/api/cron/*` and other server
  routes may use `createAdminClient()` (`src/lib/supabase/admin.ts`). Never call it
  from a client component.
- **UI**: use `DESIGN_SYSTEM.md`'s component classes (`.app-card`, `.app-btn`,
  `.status-pill`, `.segmented`, `.empty-inline`, etc.) — don't invent new visual
  patterns for things the system already covers.
- **Audit log**: any mutation a user makes to a record that matters for compliance
  (contact edits, deal stage changes, suppression changes, permission changes)
  should insert into `audit_log` the same way `pipelines/page.tsx`'s `moveDeal`
  already does — `before`/`after` jsonb snapshots, `action`, `entity_type`, `entity_id`.

Suggested ship order is at the bottom. Part 1 rounds out what's already shipped;
Part 2 is net-new.

---

## Part 1 — Round out what's already shipped

### 1. Multi-pipeline support

**Why**: `pipelines` and `pipeline_stages` tables already model multiple pipelines
per org, but `src/app/(app)/app/pipelines/page.tsx` hardcodes `const pipe = pipes?.[0]`
— only the default pipeline is ever reachable.

**Data model**: no schema change needed.

**Backend**: none beyond removing the `[0]` assumption.

**UI**: add a pipeline switcher (a `.segmented` control or a simple `.app-input`
`<select>`, per `DESIGN_SYSTEM.md`) at the top of `pipelines/page.tsx`, next to the
page title. Store the selected `pipelineId` in a query param (`?pipeline=<id>`) so
it's shareable/bookmarkable, mirroring how `contacts/page.tsx` already reads
`search.get("q")`/`search.get("new")` from `useSearchParams`. Add a "New Pipeline"
action in `settings/org` (or a new `settings/pipelines` page) that inserts into
`pipelines` + seeds default stages, reusing the stage list shape from
`bootstrap_ctrldone_org`.

**Edge cases**: deleting/archiving a pipeline with open deals — don't allow hard
delete if `deals` reference it (the FK is `on delete restrict` already via
`deals.stage_id references pipeline_stages(id) on delete restrict`, so this is
already enforced at the DB level — surface the resulting error as a friendly
message instead of a raw Postgres error).

**Acceptance**: creating a second pipeline, switching between them via the URL, and
seeing independent stage columns/deals per pipeline.

---

### 2. Campaign performance analytics

**Why**: the visual campaign builder (`src/app/(app)/app/campaigns/[id]/builder/page.tsx`,
xyflow-based) and `campaign_sends`/`campaign_enrollments` tables exist, but there's
no rollup view — you can't see open/click/reply rate per campaign today.

**Data model**: no new tables — aggregate from `campaign_sends` (status, error) and
`activities` where `type in ('email_opened')` and `meta->>'campaign_id'` matches (add
`campaign_id` to the `activities.meta` jsonb when logging opens/clicks — see feature
#13 for click tracking). Add an index if query volume warrants:
`create index campaign_sends_enrollment_idx on public.campaign_sends(enrollment_id);`
(likely already fast enough via the existing unique index, skip unless profiling
says otherwise).

**Backend**: a server component or API route that runs aggregate queries per
`campaign_id`: total enrolled (`count(campaign_enrollments)`), sent
(`count(campaign_sends) where status='sent'`), failed
(`count(campaign_sends) where status='failed'`), opened/clicked/replied (from
`activities`/`scoring_events` — `scoring_events.event_type in ('open','click','reply')`
already exists as a table, join on `contact_id` + enrollment's `campaign_id`).

**UI**: add a stats row (`.app-card` grid of `.app-stat-value` cells, same pattern as
the dashboard's 3-card row) at the top of the campaign builder page, or a new
`campaigns/[id]/analytics` tab alongside the builder.

**Acceptance**: viewing a campaign shows enrolled/sent/failed/opened/clicked/replied
counts that update as the cron worker processes enrollments.

---

### 3. Reply detection / inbox threading

**Why**: `src/app/api/email/send.ts`-backed sends are one-way. `activities.type`
already includes `email_sent`/`email_opened` but nothing detects inbound replies —
a prospect replying to a campaign email doesn't show up anywhere in-app.

**Data model**: new migration adding a `thread_id`/`provider_thread_id text` column
to `campaign_sends` (to correlate a reply back to the original send), and relying on
`activities` with a new allowed `type` value `email_replied` (extend the existing
`check` constraint — remember: `alter table` to drop and recreate the check
constraint in a new migration, don't edit the original).

**Backend**: a new `src/app/api/oauth/google/callback`-adjacent webhook, or a polling
route under `src/app/api/cron/inbox-poll/route.ts` (same `CRON_SECRET` bearer-auth
pattern as `cron/campaigns/route.ts`) that lists recent messages via the Gmail API
using the stored `access_token_encrypted`/`refresh_token_encrypted` on
`email_accounts`, matches `In-Reply-To`/`References` headers against
`campaign_sends.provider_message_id`, and inserts an `email_replied` activity +
a `scoring_events` row (`event_type: 'reply'`, matching the existing scoring
pattern).

**UI**: show replies inline in the existing `ContactInspector` activity list and the
`activity/page.tsx` timeline — no new UI surface needed, just a new activity type
with distinct styling (a `.status-pill-blue` variant already covers this).

**Edge cases**: rate limits on Gmail API polling — batch and backoff; don't re-poll
messages already matched (track a `last_synced_at` on `email_accounts`).

**Acceptance**: replying to a real campaign send in a connected Gmail inbox creates
an `email_replied` activity within one cron cycle.

---

### 4. Contact merge & dedupe

**Why**: CSV import + manual create both exist (`contacts/page.tsx`) with duplicate
email detection only at creation time — there's no way to reconcile duplicates that
already exist (e.g. imported before the org connected email, or two contacts with
name variants).

**Data model**: no schema change strictly required. If merge history matters, add a
`merged_from_id uuid[]` column to `contacts` to keep a paper trail.

**Backend**: a `mergeContacts(keepId, mergeIds[])` server action / API route that:
re-points `deals.contact_id`, `tasks.contact_id`, `activities.contact_id`,
`contact_attribute_values.contact_id`, `campaign_enrollments.contact_id` (careful —
`campaign_enrollments` has a `unique(campaign_id, contact_id)` constraint, so skip
re-pointing enrollments that would collide, and log those skips) from the merged
contacts onto the kept one, unions `tags`, then deletes the merged rows. Wrap in a
Postgres function (`merge_contacts(p_keep_id uuid, p_merge_ids uuid[])`, `security
definer`, same style as `claim_enrollment`) so it's atomic.

**UI**: in `contacts/page.tsx`, detect likely duplicates (same lowercased email, or
fuzzy name match) and surface a "Possible duplicate" banner/badge; from the bulk
selection bar (`.bulk-bar`, already used for enroll/tag/export), add a "Merge" action
when exactly 2+ contacts are selected, opening a modal (`.modal-backdrop`/`.modal-card`)
to pick which one to keep.

**Acceptance**: selecting two contacts and merging combines their activity/deal/task
history under one contact with no orphaned foreign keys.

---

### 5. Richer custom field types

**Why**: `contact_attributes.field_type` already supports `'text' | 'number' | 'date'
| 'select' | 'boolean'` at the schema level (see the `check` constraint), but
`settings/fields/page.tsx` likely only exposes text input creation today — verify and
extend the UI to match what the schema already allows, rather than adding new field
types to the database.

**Data model**: none — already there. `contact_attributes.options` (jsonb array) is
already the right shape for `select` field choices.

**Backend**: none new — `contact_attribute_values.value` is already jsonb, so any
type (string/number/boolean/date-as-ISO-string) fits without a schema change. The
existing `sync_contact_custom_fields` trigger already keeps `contacts.custom_fields`
in sync regardless of value type.

**UI**: in `settings/fields/page.tsx`, add a `field_type` selector when creating a
field (`.app-input` `<select>` with the 5 options), and conditionally render the
right input type in `ContactInspector.tsx` and `contacts/page.tsx`'s create/edit
forms based on the field's `field_type` — a boolean gets a checkbox, a select gets a
`<select>` populated from `options`, etc.

**Acceptance**: creating a "select" custom field with 3 options, then picking one on
a contact, persists correctly and displays as a dropdown (not free text) everywhere
that field is shown.

---

### 6. Saved / dynamic segments

**Why**: `contacts/page.tsx` already has a solid ad-hoc filter UI (status/stage/tag),
but filters reset on navigation — there's no way to save "Contacts tagged 'hot-lead'
with no open deal" as a reusable, named view.

**Data model**: new table `saved_segments` (`org_id`, `name`, `filters jsonb`,
`created_by`, timestamps) with the standard RLS policy.

**Backend**: none beyond CRUD on `saved_segments`. Segments are **dynamic** (re-run
the filter query on load), not a stored contact-ID snapshot — reuse the existing
client-side filter logic in `contacts/page.tsx` (`filters` state → `filtered` memo),
just serialize/deserialize that `filters` object to/from `saved_segments.filters`.

**UI**: add a "Save as segment" button next to the existing filter panel
(`showFilter` block), and a segment picker (a row of pill buttons, or a `<select>`)
above the contacts table that loads a saved segment's filters into state.

**Acceptance**: saving a filter combination, navigating away, and reloading it by
name reproduces the same filtered contact list.

---

### 7. Recurring & typed tasks

**Why**: `tasks` is intentionally flat today (`title`, `due_at`, `status`) — no
priority, type, or recurrence, which limits it for renewal/check-in workflows.

**Data model**: new migration adding to `tasks`: `priority text not null default
'normal' check (priority in ('low','normal','high'))`, `task_type text`,
`recurrence_rule text` (a simple `'daily'|'weekly'|'monthly'` enum is enough — don't
build full RRULE support unless asked), `parent_task_id uuid references
public.tasks(id) on delete set null` (to chain recurring instances).

**Backend**: extend `src/app/api/cron/` with a small daily job
(`cron/recurring-tasks/route.ts`, same bearer-auth pattern) that, for each `done`
task with a `recurrence_rule`, creates the next occurrence with a new `due_at` and
links it via `parent_task_id`.

**UI**: `tasks/page.tsx` — add priority as a colored dot or badge (reuse
`.stage-dot`-style small indicators), a type selector on task creation, and a
recurrence toggle. Sort/group by priority optionally.

**Acceptance**: creating a weekly recurring task, marking it done, and seeing a new
instance appear with the following week's due date after the cron runs.

---

### 8. Auto-suppression on bounce/complaint

**Why**: `suppression_list` (reason: `unsubscribe | bounce | manual`) exists but is
manually managed — nothing currently listens for bounce/complaint events from the
email provider and adds to it automatically.

**Data model**: none — `suppression_list` already has a `'bounce'` reason.

**Backend**: a new webhook route `src/app/api/email/bounce-webhook/route.ts` that
your email-sending provider posts to (Gmail API doesn't natively push bounce
webhooks the way Postmark/SES do — if sends stay Gmail-API-based, detect bounces via
the same inbox-poll approach as feature #3, matching automated "Mail Delivery
Subsystem" bounce messages; if you introduce a transactional provider later, use its
native webhook). On a detected bounce/complaint, insert into `suppression_list` with
`reason: 'bounce'`, and update the originating `campaign_sends.status` to
`'failed'` with the bounce reason in `error`.

**Backend (worker)**: `cron/campaigns/route.ts` already needs to check
`suppression_list` before sending each step — verify this check exists; if not,
add it (skip/exit the enrollment if the contact's email is suppressed).

**Acceptance**: a bounced send results in the contact's email landing in
`suppression_list` with `reason: 'bounce'`, and no further campaign steps send to
them.

---

### 9. Notification preferences + digest

**Why**: today's "notifications" (`AppShell.tsx` `loadNotifs`) are synthesized
client-side purely from open tasks assigned to the current user — there's no
persisted notification entity, no read/unread state, and no digest email.

**Data model**: new table `notifications` (`org_id`, `user_id`, `type`,
`title`, `body`, `link`, `read_at timestamptz`, `created_at`) with standard RLS
scoped additionally to `user_id = auth.uid()` for select (mirror the org-scoped
pattern but add the extra user check). New table
`notification_preferences` (`org_id`, `user_id`, `channel text check (channel in
('inapp','email_digest'))`, `enabled boolean`).

**Backend**: emit real `notifications` rows from the places that currently only
create `activities` (task assigned, deal moved to your stage, campaign reply
detected) — a small `createNotification()` helper in `src/lib/`. A new
`cron/notification-digest/route.ts` (daily, same bearer pattern) batches unread
notifications per user with `email_digest` enabled and sends one email via the
existing `sendViaAccount`/template pattern in `src/lib/email/send.ts`.

**UI**: `AppShell.tsx`'s bell dropdown (`.notif-panel`/`.notif-item`) switches from
querying `tasks` directly to querying `notifications`; add a "Mark all read" action
and a settings page (`settings/notifications`) using `.app-input` toggles for the
preferences table.

**Acceptance**: an assigned task creates a persisted, markable-as-read notification,
and a user with the digest preference enabled gets one daily summary email.

---

### 10. Global command-palette search (deals + tasks)

**Why**: `CommandPalette.tsx` currently only searches `contacts`
(`name.ilike/email.ilike`) — deals and tasks aren't reachable from ⌘K despite the
keyboard-nav UI already being built out (see the recent command-hint/arrow-nav work).

**Data model**: none.

**Backend**: none — client-side Supabase queries, same as the existing contacts
search.

**UI**: in `CommandPalette.tsx`, add parallel queries against `deals` (`title.ilike`)
and `tasks` (`title.ilike`) alongside the existing `contacts` query, tag each hit
with its `type` (already a discriminated union pattern — extend the `Item` type with
`"deal"` and `"task"` variants), and route to `/app/deals/[id]` / `/app/tasks`
respectively. Group results under small `.app-label`-style headers ("Contacts",
"Deals", "Tasks") in the dropdown list.

**Acceptance**: typing a deal title or task title in ⌘K surfaces and navigates to it,
not just matching contacts.

---

## Part 2 — Net-new features

### 11. Reporting dashboard

**Why**: the dashboard (`src/app/(app)/app/page.tsx`) is 3 stat cards + 2 tables —
there's no pipeline velocity, stage-conversion, or rep-performance view, which is
table stakes for a CRM at this scale.

**Data model**: none required initially — compute from existing tables
(`deals.stage_entered_at` for velocity, `deals.stage_id` grouped by
`pipeline_stages.name` for conversion funnel, `deals.owner_id`/`tasks.assignee_id`
grouped for rep leaderboard). If query cost becomes an issue, add a materialized
view later — don't pre-optimize.

**Backend**: a new server component `src/app/(app)/app/reports/page.tsx` running
aggregate Supabase queries (group-by via `.rpc()` calling small SQL functions is
cleaner than client-side aggregation for this — add
`report_stage_conversion(p_org_id, p_pipeline_id)` and
`report_rep_performance(p_org_id)` as `security definer` SQL functions, same style
as `claim_enrollment`).

**UI**: new nav item "Reports" in `AppShell.tsx`'s `nav` array. Charts: keep it
simple — horizontal bar rows using `.app-card` + inline width percentages (avoid
pulling in a charting library unless asked; a stage-conversion funnel and a
leaderboard table don't need one).

**Acceptance**: Reports page shows average days-in-stage per pipeline stage and a
per-rep table of deals won / tasks completed this month.

---

### 12. Lead scoring rules engine

**Why**: `scoring_events` + `apply_scoring_event` trigger already auto-increment
`contacts.score` (see `submit_intake`'s `'form_submit'` → +10 points) — the
mechanism exists, but the only event that currently fires it is intake form
submission. There's no configurable rule set and no UI to see why a contact has the
score it does.

**Data model**: new table `scoring_rules` (`org_id`, `event_type text` matching
`scoring_events.event_type`'s check constraint values, `points int`, `enabled
boolean`) so points-per-event become admin-configurable instead of hardcoded.

**Backend**: wherever an event happens (email opened/clicked/replied — see features
#2/#3, task completed, deal won), insert into `scoring_events` with a
`points` value looked up from `scoring_rules` for that org/event type instead of a
hardcoded number. Read `scoring_rules` once per cron run / request and cache lightly.

**UI**: new `settings/scoring` page (list of event types as `.app-input` number
fields for points, an enabled toggle each — same list/edit pattern as
`settings/fields/page.tsx`). Show a score breakdown in `ContactInspector.tsx` (list
recent `scoring_events` for that contact, reusing the existing activity-list
pattern).

**Acceptance**: changing the "reply" rule's points in settings changes how much a
future reply adds to a contact's score, and `ContactInspector` shows the event
history that produced the current score.

---

### 13. Meeting/booking links

**Why**: no scheduling surface exists at all — high-value for a sales CRM, and
`contacts`/`deals` already have everything needed to attach a booked meeting to the
right record.

**Data model**: new tables `booking_pages` (`org_id`, `user_id`, `slug` unique per
org, `duration_minutes`, `availability jsonb` — reuse the shape of
`orgs.business_hours_start/end`/`business_days` for a sane default), and `bookings`
(`org_id`, `booking_page_id`, `contact_id` nullable, `start_at`, `end_at`, `guest_name`,
`guest_email`, `status text check (status in ('confirmed','cancelled'))`).

**Backend**: a public (unauthenticated) route `src/app/book/[slug]/page.tsx` +
`src/app/api/bookings/route.ts` (anon-callable via a `security definer` SQL function,
same pattern as `submit_intake`) that checks the booking page's availability against
existing `bookings` for conflicts before inserting. On booking, upsert a `contacts`
row by email (same lookup-or-create pattern `submit_intake` already uses) and log an
`activities` row (`type: 'system'`, body "Booked a meeting").

**UI**: `settings/booking` page to configure a user's slug/duration/availability
(`.app-input` fields, following `settings/org`'s layout). The public booking page
itself is outside `/app` — style it like `/login` (Poppins, light, pill inputs) since
it's a public-facing form, not the marketing site.

**Acceptance**: a public booking link lets an external guest pick an open slot,
creates a `contacts` row if new, and shows up as an activity + (optionally) a task
for the assigned rep.

---

### 14. Multi-channel outreach (SMS)

**Why**: `campaign_steps.type` already includes `'sms'` in its check constraint —
the schema anticipated this, but the campaign worker (`cron/campaigns/route.ts`) and
builder UI only implement `'email'`/`'wait'`/`'condition'` today.

**Data model**: add `phone_provider_account_id` or similar to `email_accounts`
— actually, model this as its own table `sms_accounts` (`org_id`, `provider text
check (provider in ('twilio'))`, credentials encrypted the same way
`email_accounts.access_token_encrypted` is via `src/lib/crypto.ts`) rather than
overloading `email_accounts`.

**Backend**: `src/lib/sms/send.ts` mirroring `src/lib/email/send.ts`'s shape
(`sendViaAccount`, `applyMergeTags` reused as-is since it's channel-agnostic
string templating). Extend `cron/campaigns/route.ts`'s step-type switch to handle
`'sms'` the same way it handles `'email'`. Require `contacts.phone` to be present —
skip/exit the enrollment step with a logged error if missing, don't crash the
worker.

**UI**: the xyflow campaign builder (`campaigns/[id]/builder/page.tsx`) already has a
node-type system for `email`/`wait`/`condition` — add an `sms` node type following
the exact same node-config-panel pattern, with a character-count-aware textarea
instead of subject+body.

**Acceptance**: a campaign with an SMS step sends a real text via the configured
provider and logs a `campaign_sends` row identically to how email steps do.

---

### 15. Embeddable form builder

**Why**: `submit_intake` + `IntakeModal.tsx` already prove the "public form → lead"
path end-to-end for the CTRLDONE marketing site itself — generalize it so any org
using this CRM can embed their own form on their own site.

**Data model**: new table `forms` (`org_id`, `name`, `fields jsonb` — an ordered
array of `{key, label, type, required}`, mapping `type` to the same 5 values
`contact_attributes.field_type` supports), and `form_submissions` (`org_id`,
`form_id`, `payload jsonb`, `contact_id`, `created_at`) for an audit trail separate
from the contact itself.

**Backend**: generalize `submit_intake` into a parameterized
`submit_form(p_form_id uuid, p_payload jsonb)` SQL function (anon-callable,
`security definer`) that maps `payload` keys to `contacts` core fields where they
match (`name`, `email`, `company`, `phone`) and everything else into
`contact_attribute_values` via the existing EAV tables (creating a matching
`contact_attributes` row on first use if one doesn't exist for that key). A
`src/app/api/forms/[id]/submit/route.ts` wraps it for use from an external embed
script.

**UI**: `settings/forms` page — a simple field-list builder (add/remove/reorder
field rows, each an `.app-input` row for label + `<select>` for type), plus a
generated embed snippet (`<script src=".../embed.js" data-form-id="...">`) and a
hosted fallback URL for orgs that can't embed JS.

**Acceptance**: building a 3-field form, embedding it on a test page, and submitting
it creates a contact with the right custom field values attached.

---

### 16. Public API + webhooks

**Why**: there's no way today for a customer's own stack (Zapier, Make, a custom
script) to push/pull contacts or deals — everything is UI-only or the one hardcoded
`submit_intake` path.

**Data model**: new table `api_keys` (`org_id`, `name`, `key_hash text`,
`created_by`, `last_used_at`, `revoked_at`) — store only a hash (same
`src/lib/crypto.ts` approach used for OAuth token encryption, or a one-way hash via
`pgcrypto`'s `digest()`), never the raw key, and show the raw key exactly once at
creation time. New table `webhook_subscriptions` (`org_id`, `url`, `event_types
text[]`, `secret`, `enabled`).

**Backend**: `src/app/api/v1/contacts/route.ts` (+ `[id]/route.ts`, and similarly for
`deals`) — REST endpoints authenticated via `Authorization: Bearer <api_key>`,
looked up against `api_keys` (hash-compare), then scoped by that key's `org_id`
exactly like every other query in this codebase is scoped. A small dispatcher
(`src/lib/webhooks.ts`) fires an HTTP POST (HMAC-signed with the subscription's
`secret`) on contact-created/deal-stage-changed/etc., called from the same places
`activities` rows are already inserted for those events.

**UI**: `settings/api` page — API key management (create/revoke, following the
"show once" pattern), and `settings/webhooks` for subscription CRUD.

**Acceptance**: an API key can list/create contacts via curl, scoped correctly to
its org, and a configured webhook fires (verifiable via a request-bin style test URL)
when a contact is created.

---

### 17. Role-based permissions

**Why**: `org_members.role` already has `'owner' | 'admin' | 'member'` and
`org_role()`/`is_org_member()` RPC helpers exist and gate a few things (org update,
member management) — but every CRM table's RLS policy is a blanket
`is_org_member(org_id)` `for all`, meaning any member can read/write any other
member's contacts, deals, and tasks. There's no rep-scoped visibility.

**Data model**: no new tables. This is entirely an RLS/query-layer change: add an
org-level setting `orgs.visibility_mode text check (visibility_mode in
('open','owner_scoped')) default 'open'` (new migration, `alter table`). When
`'owner_scoped'`, non-admin members should only see contacts/deals/tasks where
they're the `owner_id`/`assignee_id` (fields that already exist on those tables).

**Backend**: new RLS policies (in a new migration — don't drop the existing ones
blindly, replace them) that branch on `org_role()` and the org's
`visibility_mode`: admins/owners keep full org-wide access; members get an
additional `owner_id = auth.uid() or assignee_id = auth.uid()` clause when
`visibility_mode = 'owner_scoped'`.

**UI**: a toggle in `settings/org` for `visibility_mode`, and a note in
`settings/team` clarifying what each role can see once toggled on.

**Acceptance**: with `owner_scoped` enabled, a `member`-role user only sees contacts
and deals they own, while an `admin`/`owner` still sees everything.

---

### 18. Deal/task automation rules

**Why**: stage changes already log `activities`/`audit_log` (see `moveDeal` in
`pipelines/page.tsx`), but nothing *reacts* to them — e.g. auto-creating a follow-up
task when a deal enters "Proposal", or notifying the owner when a deal is won.

**Data model**: new table `automation_rules` (`org_id`, `trigger_type text check
(trigger_type in ('deal_stage_changed','task_completed','contact_created'))`,
`trigger_config jsonb` — e.g. `{"stage_name": "Proposal"}` — `action_type text check
(action_type in ('create_task','send_notification','add_tag'))`, `action_config
jsonb`, `enabled boolean`).

**Backend**: a small rule-evaluation helper (`src/lib/automations.ts`) called from
the same places that already emit the relevant `activities` row (`moveDeal` in
`pipelines/page.tsx` for `deal_stage_changed`, `toggleDone` in `tasks/page.tsx` for
`task_completed`, contact creation in `contacts/page.tsx`) — match enabled rules for
that org/trigger_type against `trigger_config`, then execute `action_type` (insert
into `tasks`, insert into `notifications` per feature #9, or append to
`contacts.tags`).

**UI**: `settings/automations` page listing rules with a plain-language summary
("When a deal enters **Proposal** → create a task **Follow up in 3 days**"),
following the campaign builder's node-config-panel visual style for the rule editor
without needing the full xyflow canvas — a simple trigger/action form pair is
enough for v1.

**Acceptance**: creating a "deal enters Won → create task 'Send onboarding email'"
rule, then moving a deal to Won, results in that task appearing assigned to the
deal's owner.

---

### 19. Activity comments / @mentions

**Why**: `activities.type` already includes `'note'` and the timeline UI
(`activity/page.tsx`, `ContactInspector.tsx`'s note composer) is built — but it's a
one-way log, not a collaboration surface. No way to reply to a note or mention a
teammate.

**Data model**: new table `activity_comments` (`org_id`, `activity_id references
activities(id) on delete cascade`, `author_id`, `body`, timestamps). Mentions can be
derived at render time by regex-matching `@name` against `org_members` — no need for
a separate mentions table unless you want mention-specific notifications, in which
case insert a `notifications` row (feature #9) for each matched member when a
comment is created.

**Backend**: CRUD on `activity_comments`, org-scoped RLS as usual.

**UI**: under each `.timeline-item` in `activity/page.tsx` and each activity list
item in `ContactInspector.tsx`, add a "Reply" affordance that expands a small
`.app-input` + submit button, and render existing comments indented beneath the
parent activity. An `@` in the input triggers a simple inline filter of
`org_members` names (reuse the command-palette's list-filtering pattern, not a full
new component).

**Acceptance**: commenting on an activity and mentioning a teammate creates a
persisted comment visible to all org members, and a notification for the mentioned
person.

---

### 20. Billing & plan management

**Why**: multi-tenant from day one (every table has `org_id`), but there's no
plan/seat concept yet — needed before this can be sold as a real multi-tenant SaaS
product. Sequence this **last**, after the other 19 stabilize, since it touches
signup/org-creation flow broadly.

**Data model**: new table `subscriptions` (`org_id` unique, `stripe_customer_id`,
`stripe_subscription_id`, `plan text check (plan in ('trial','starter','pro'))`,
`seat_limit int`, `status text check (status in
('trialing','active','past_due','canceled'))`, timestamps).

**Backend**: `src/app/api/billing/webhook/route.ts` handling Stripe webhook events
(`checkout.session.completed`, `customer.subscription.updated/deleted`) to keep
`subscriptions` in sync. Gate `org_members` inserts (invites) against
`seat_limit` — extend the existing `org_members_insert` RLS policy check or add an
application-level check in the invite flow in `settings/team`.

**UI**: `settings/billing` page showing current plan/seats/status and a
"Manage billing" link to Stripe's customer portal (don't build a custom billing UI —
use Stripe Checkout + the Billing Portal, consistent with not reinventing what a
provider already solves well).

**Acceptance**: a new org starts on `trial`, upgrading via Stripe Checkout flips
`subscriptions.plan`/`status` via webhook, and inviting a member past `seat_limit`
is blocked with a clear upgrade prompt.

---

## Suggested ship order

Round-out features are lower-risk (extending proven patterns) and mostly
independent — ship in any order based on user demand. A reasonable sequence:

1. **#10** Global search (smallest, no schema change, immediate visible value)
2. **#5** Richer custom field types (mostly UI, schema already supports it)
3. **#1** Multi-pipeline support
4. **#6** Saved segments
5. **#9** Notifications table + preferences (unblocks #12, #18, #19, #3's reply
   surfacing)
6. **#12** Lead scoring rules engine (schema/trigger already exists, mostly UI +
   wiring)
7. **#7** Recurring & typed tasks
8. **#2** Campaign performance analytics
9. **#3** Reply detection (bigger — real OAuth/Gmail API work)
10. **#8** Auto-suppression on bounce (depends on #3's inbox polling)
11. **#4** Contact merge & dedupe
12. **#18** Deal/task automation rules (depends on #9)
13. **#19** Activity comments/@mentions (depends on #9)
14. **#11** Reporting dashboard
15. **#17** Role-based permissions (higher blast radius — touches RLS broadly, test
    thoroughly)
16. **#13** Meeting/booking links (net-new public surface)
17. **#15** Embeddable form builder
18. **#14** Multi-channel outreach / SMS (needs a Twilio-equivalent account/budget)
19. **#16** Public API + webhooks
20. **#20** Billing & plan management (last, broadest blast radius — touches
    signup/org-creation flow)
