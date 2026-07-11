-- ROADMAP #18: deal/task automation rules
create table public.automation_rules (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  name text not null,
  trigger_type text not null check (
    trigger_type in ('deal_stage_changed', 'task_completed', 'contact_created')
  ),
  trigger_config jsonb not null default '{}'::jsonb,
  action_type text not null check (
    action_type in ('create_task', 'send_notification', 'add_tag')
  ),
  action_config jsonb not null default '{}'::jsonb,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index automation_rules_org_trigger_idx
  on public.automation_rules(org_id, trigger_type)
  where enabled = true;

create trigger automation_rules_updated_at before update on public.automation_rules
for each row execute function public.set_updated_at();

alter table public.automation_rules enable row level security;

create policy automation_rules_all on public.automation_rules for all
  using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));

grant select, insert, update, delete on public.automation_rules to authenticated;
