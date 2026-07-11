-- CTRLDONE Phase 1 CRM schema
-- Multi-tenant from day one: every table has org_id (except auth helpers)

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Helpers (set_updated_at only — membership helpers after org_members exists)
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Orgs
-- ---------------------------------------------------------------------------
create table public.orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  default_timezone text not null default 'UTC',
  business_hours_start time not null default '09:00',
  business_hours_end time not null default '18:00',
  business_days int[] not null default array[1,2,3,4,5],
  stale_deal_days int not null default 14,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger orgs_updated_at before update on public.orgs
for each row execute function public.set_updated_at();

create table public.org_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, user_id)
);

create trigger org_members_updated_at before update on public.org_members
for each row execute function public.set_updated_at();

create index org_members_user_idx on public.org_members(user_id);

create or replace function public.is_org_member(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.org_members m
    where m.org_id = p_org_id and m.user_id = auth.uid()
  );
$$;

create or replace function public.org_role(p_org_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select m.role from public.org_members m
  where m.org_id = p_org_id and m.user_id = auth.uid()
  limit 1;
$$;

-- ---------------------------------------------------------------------------
-- Contacts + EAV custom fields
-- ---------------------------------------------------------------------------
create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  company text,
  status text not null default 'lead',
  tags text[] not null default '{}',
  source text,
  owner_id uuid references auth.users(id) on delete set null,
  timezone text,
  custom_fields jsonb not null default '{}'::jsonb,
  score int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger contacts_updated_at before update on public.contacts
for each row execute function public.set_updated_at();

create index contacts_org_idx on public.contacts(org_id);
create index contacts_email_idx on public.contacts(org_id, lower(email));
create index contacts_custom_fields_gin on public.contacts using gin (custom_fields);
create index contacts_tags_gin on public.contacts using gin (tags);

create table public.contact_attributes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  key text not null,
  label text not null,
  field_type text not null check (field_type in ('text', 'number', 'date', 'select', 'boolean')),
  options jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, key)
);

create trigger contact_attributes_updated_at before update on public.contact_attributes
for each row execute function public.set_updated_at();

create table public.contact_attribute_values (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  attribute_id uuid not null references public.contact_attributes(id) on delete cascade,
  value jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (contact_id, attribute_id)
);

create trigger contact_attribute_values_updated_at before update on public.contact_attribute_values
for each row execute function public.set_updated_at();

-- Rebuild contacts.custom_fields from EAV (source of truth)
create or replace function public.sync_contact_custom_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contact_id uuid;
  v_org_id uuid;
  v_cache jsonb;
begin
  v_contact_id := coalesce(new.contact_id, old.contact_id);
  v_org_id := coalesce(new.org_id, old.org_id);

  select coalesce(jsonb_object_agg(a.key, v.value), '{}'::jsonb)
  into v_cache
  from public.contact_attribute_values v
  join public.contact_attributes a on a.id = v.attribute_id
  where v.contact_id = v_contact_id;

  update public.contacts
  set custom_fields = coalesce(v_cache, '{}'::jsonb),
      updated_at = now()
  where id = v_contact_id and org_id = v_org_id;

  return coalesce(new, old);
end;
$$;

create trigger contact_attribute_values_sync
after insert or update or delete on public.contact_attribute_values
for each row execute function public.sync_contact_custom_fields();

-- ---------------------------------------------------------------------------
-- Pipelines / deals
-- ---------------------------------------------------------------------------
create table public.pipelines (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  name text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger pipelines_updated_at before update on public.pipelines
for each row execute function public.set_updated_at();

create table public.pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  pipeline_id uuid not null references public.pipelines(id) on delete cascade,
  name text not null,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger pipeline_stages_updated_at before update on public.pipeline_stages
for each row execute function public.set_updated_at();

create index pipeline_stages_pipeline_idx on public.pipeline_stages(pipeline_id, position);

create table public.deals (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  pipeline_id uuid not null references public.pipelines(id) on delete cascade,
  stage_id uuid not null references public.pipeline_stages(id) on delete restrict,
  contact_id uuid references public.contacts(id) on delete set null,
  title text not null,
  value numeric(14,2) not null default 0,
  currency text not null default 'USD',
  expected_close date,
  owner_id uuid references auth.users(id) on delete set null,
  stage_entered_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger deals_updated_at before update on public.deals
for each row execute function public.set_updated_at();

create index deals_org_idx on public.deals(org_id);
create index deals_stage_idx on public.deals(stage_id);

-- ---------------------------------------------------------------------------
-- Tasks / activities
-- ---------------------------------------------------------------------------
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  title text not null,
  due_at timestamptz,
  assignee_id uuid references auth.users(id) on delete set null,
  contact_id uuid references public.contacts(id) on delete set null,
  deal_id uuid references public.deals(id) on delete set null,
  status text not null default 'open' check (status in ('open', 'done', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger tasks_updated_at before update on public.tasks
for each row execute function public.set_updated_at();

create index tasks_org_due_idx on public.tasks(org_id, due_at);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete cascade,
  deal_id uuid references public.deals(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  type text not null check (type in (
    'note', 'email_sent', 'email_opened', 'stage_change', 'task_done', 'import', 'system'
  )),
  body text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger activities_updated_at before update on public.activities
for each row execute function public.set_updated_at();

create index activities_contact_idx on public.activities(contact_id, created_at desc);
create index activities_deal_idx on public.activities(deal_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Email accounts
-- ---------------------------------------------------------------------------
create table public.email_accounts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  provider text not null check (provider in ('google', 'microsoft')),
  from_email text not null,
  access_token_encrypted text,
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  status text not null default 'disconnected'
    check (status in ('connected', 'disconnected', 'needs_reauth')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger email_accounts_updated_at before update on public.email_accounts
for each row execute function public.set_updated_at();

create unique index email_accounts_org_email_uidx on public.email_accounts(org_id, from_email);

-- ---------------------------------------------------------------------------
-- Campaigns
-- ---------------------------------------------------------------------------
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  name text not null,
  status text not null default 'draft'
    check (status in ('draft', 'active', 'paused', 'archived')),
  email_account_id uuid references public.email_accounts(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger campaigns_updated_at before update on public.campaigns
for each row execute function public.set_updated_at();

create table public.campaign_steps (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  type text not null check (type in ('email', 'sms', 'wait', 'condition')),
  config jsonb not null default '{}'::jsonb,
  position int not null default 0,
  next_step_id uuid references public.campaign_steps(id) on delete set null,
  canvas_x numeric not null default 0,
  canvas_y numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger campaign_steps_updated_at before update on public.campaign_steps
for each row execute function public.set_updated_at();

create index campaign_steps_campaign_idx on public.campaign_steps(campaign_id, position);

create table public.campaign_enrollments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  current_step_id uuid references public.campaign_steps(id) on delete set null,
  next_run_at timestamptz,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'waiting', 'completed', 'exited', 'failed')),
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, contact_id)
);

create trigger campaign_enrollments_updated_at before update on public.campaign_enrollments
for each row execute function public.set_updated_at();

create index campaign_enrollments_due_idx
  on public.campaign_enrollments(status, next_run_at)
  where status in ('pending', 'waiting');

create table public.campaign_sends (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  enrollment_id uuid not null references public.campaign_enrollments(id) on delete cascade,
  step_id uuid not null references public.campaign_steps(id) on delete cascade,
  provider_message_id text,
  status text not null default 'sent',
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (enrollment_id, step_id)
);

create trigger campaign_sends_updated_at before update on public.campaign_sends
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- CSV imports
-- ---------------------------------------------------------------------------
create table public.csv_imports (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  storage_path text not null,
  mapping jsonb not null default '{}'::jsonb,
  row_errors jsonb not null default '[]'::jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'preview', 'committed', 'failed')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger csv_imports_updated_at before update on public.csv_imports
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Proactive / required Phase-1 tables
-- ---------------------------------------------------------------------------
create table public.suppression_list (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  email text not null,
  reason text not null check (reason in ('unsubscribe', 'bounce', 'manual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger suppression_list_updated_at before update on public.suppression_list
for each row execute function public.set_updated_at();

create unique index suppression_list_email_uidx on public.suppression_list(org_id, lower(email));

create table public.email_templates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  name text not null,
  subject text not null,
  body text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger email_templates_updated_at before update on public.email_templates
for each row execute function public.set_updated_at();

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger audit_log_updated_at before update on public.audit_log
for each row execute function public.set_updated_at();

create index audit_log_org_idx on public.audit_log(org_id, created_at desc);

create table public.scoring_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  event_type text not null check (event_type in ('open', 'click', 'reply', 'form_submit')),
  points int not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger scoring_events_updated_at before update on public.scoring_events
for each row execute function public.set_updated_at();

create or replace function public.apply_scoring_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.contacts
  set score = score + new.points,
      updated_at = now()
  where id = new.contact_id;
  return new;
end;
$$;

create trigger scoring_events_apply
after insert on public.scoring_events
for each row execute function public.apply_scoring_event();

-- ---------------------------------------------------------------------------
-- Atomic claim helper for campaign worker
-- ---------------------------------------------------------------------------
create or replace function public.claim_enrollment(p_id uuid)
returns public.campaign_enrollments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.campaign_enrollments;
begin
  update public.campaign_enrollments
  set status = 'processing', locked_at = now(), updated_at = now()
  where id = p_id and status in ('pending', 'waiting')
  returning * into v_row;
  return v_row;
end;
$$;

-- ---------------------------------------------------------------------------
-- Seed helper: create CTRLDONE org + inbound pipeline for a user
-- ---------------------------------------------------------------------------
create or replace function public.bootstrap_ctrldone_org(
  p_user_id uuid,
  p_timezone text default 'UTC'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_pipeline_id uuid;
  v_stage_ids uuid[];
begin
  insert into public.orgs (name, default_timezone)
  values ('CTRLDONE', coalesce(nullif(p_timezone, ''), 'UTC'))
  returning id into v_org_id;

  insert into public.org_members (org_id, user_id, role)
  values (v_org_id, p_user_id, 'owner');

  insert into public.pipelines (org_id, name, is_default)
  values (v_org_id, 'Inbound', true)
  returning id into v_pipeline_id;

  insert into public.pipeline_stages (org_id, pipeline_id, name, position)
  values
    (v_org_id, v_pipeline_id, 'New', 0),
    (v_org_id, v_pipeline_id, 'Qualified', 1),
    (v_org_id, v_pipeline_id, 'Proposal', 2),
    (v_org_id, v_pipeline_id, 'Won', 3),
    (v_org_id, v_pipeline_id, 'Lost', 4);

  return v_org_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.orgs enable row level security;
alter table public.org_members enable row level security;
alter table public.contacts enable row level security;
alter table public.contact_attributes enable row level security;
alter table public.contact_attribute_values enable row level security;
alter table public.pipelines enable row level security;
alter table public.pipeline_stages enable row level security;
alter table public.deals enable row level security;
alter table public.tasks enable row level security;
alter table public.activities enable row level security;
alter table public.email_accounts enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_steps enable row level security;
alter table public.campaign_enrollments enable row level security;
alter table public.campaign_sends enable row level security;
alter table public.csv_imports enable row level security;
alter table public.suppression_list enable row level security;
alter table public.email_templates enable row level security;
alter table public.audit_log enable row level security;
alter table public.scoring_events enable row level security;

create policy orgs_select on public.orgs for select
  using (public.is_org_member(id));
create policy orgs_update on public.orgs for update
  using (public.org_role(id) in ('owner', 'admin'));

create policy org_members_select on public.org_members for select
  using (public.is_org_member(org_id));
create policy org_members_insert on public.org_members for insert
  with check (public.org_role(org_id) in ('owner', 'admin'));
create policy org_members_update on public.org_members for update
  using (public.org_role(org_id) in ('owner', 'admin'));
create policy org_members_delete on public.org_members for delete
  using (public.org_role(org_id) in ('owner', 'admin'));

-- Generic org-scoped CRUD policies
create policy contacts_all on public.contacts for all
  using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));
create policy contact_attributes_all on public.contact_attributes for all
  using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));
create policy contact_attribute_values_all on public.contact_attribute_values for all
  using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));
create policy pipelines_all on public.pipelines for all
  using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));
create policy pipeline_stages_all on public.pipeline_stages for all
  using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));
create policy deals_all on public.deals for all
  using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));
create policy tasks_all on public.tasks for all
  using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));
create policy activities_all on public.activities for all
  using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));
create policy email_accounts_all on public.email_accounts for all
  using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));
create policy campaigns_all on public.campaigns for all
  using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));
create policy campaign_steps_all on public.campaign_steps for all
  using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));
create policy campaign_enrollments_all on public.campaign_enrollments for all
  using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));
create policy campaign_sends_all on public.campaign_sends for all
  using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));
create policy csv_imports_all on public.csv_imports for all
  using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));
create policy suppression_list_all on public.suppression_list for all
  using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));
create policy email_templates_all on public.email_templates for all
  using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));
create policy audit_log_select on public.audit_log for select
  using (public.is_org_member(org_id));
create policy audit_log_insert on public.audit_log for insert
  with check (public.is_org_member(org_id));
create policy scoring_events_all on public.scoring_events for all
  using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));

-- CSV storage bucket: create via Supabase dashboard or `supabase storage` after link.
-- Bucket id: csv-imports (private)

-- Public intake (anon-callable). Service role must NOT be used from browser-invoked routes.
create or replace function public.submit_intake(
  p_name text,
  p_email text,
  p_company text default null,
  p_message text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_contact_id uuid;
  v_pipeline_id uuid;
  v_stage_id uuid;
  v_email text := lower(trim(p_email));
begin
  if coalesce(trim(p_name), '') = '' or v_email = '' then
    raise exception 'missing_fields';
  end if;

  select id into v_org_id from public.orgs where name = 'CTRLDONE' limit 1;
  if v_org_id is null then
    raise exception 'org_not_seeded';
  end if;

  if exists (
    select 1 from public.suppression_list s
    where s.org_id = v_org_id and lower(s.email) = v_email
  ) then
    return null;
  end if;

  select id into v_contact_id
  from public.contacts
  where org_id = v_org_id and lower(email) = v_email
  limit 1;

  if v_contact_id is null then
    insert into public.contacts (org_id, name, email, company, source, status)
    values (v_org_id, trim(p_name), v_email, nullif(trim(p_company), ''), 'intake', 'lead')
    returning id into v_contact_id;
  else
    update public.contacts
    set name = trim(p_name),
        company = coalesce(nullif(trim(p_company), ''), company),
        source = 'intake',
        updated_at = now()
    where id = v_contact_id;
  end if;

  insert into public.scoring_events (org_id, contact_id, event_type, points)
  values (v_org_id, v_contact_id, 'form_submit', 10);

  select id into v_pipeline_id
  from public.pipelines
  where org_id = v_org_id and is_default = true
  limit 1;

  if v_pipeline_id is not null then
    select id into v_stage_id
    from public.pipeline_stages
    where pipeline_id = v_pipeline_id
    order by position
    limit 1;

    if v_stage_id is not null then
      insert into public.deals (org_id, pipeline_id, stage_id, contact_id, title, value)
      values (
        v_org_id,
        v_pipeline_id,
        v_stage_id,
        v_contact_id,
        coalesce(nullif(trim(p_company), ''), trim(p_name)) || ' — inbound',
        0
      );
    end if;
  end if;

  insert into public.activities (org_id, contact_id, type, body, meta)
  values (
    v_org_id,
    v_contact_id,
    'system',
    coalesce(nullif(trim(p_message), ''), 'Intake form submitted'),
    jsonb_build_object('source', 'intake')
  );

  return v_contact_id;
end;
$$;

grant execute on function public.submit_intake(text, text, text, text) to anon, authenticated;
