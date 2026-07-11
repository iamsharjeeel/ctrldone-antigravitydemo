-- ROADMAP #7: recurring & typed tasks
alter table public.tasks
  add column if not exists priority text not null default 'normal';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'tasks_priority_check'
  ) then
    alter table public.tasks
      add constraint tasks_priority_check
      check (priority in ('low', 'normal', 'high'));
  end if;
end $$;

alter table public.tasks
  add column if not exists task_type text;

alter table public.tasks
  add column if not exists recurrence_rule text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'tasks_recurrence_rule_check'
  ) then
    alter table public.tasks
      add constraint tasks_recurrence_rule_check
      check (recurrence_rule is null or recurrence_rule in ('daily', 'weekly', 'monthly'));
  end if;
end $$;

alter table public.tasks
  add column if not exists parent_task_id uuid references public.tasks(id) on delete set null;

create index if not exists tasks_parent_idx on public.tasks(parent_task_id);
create index if not exists tasks_recurrence_idx on public.tasks(org_id, status)
  where recurrence_rule is not null;
