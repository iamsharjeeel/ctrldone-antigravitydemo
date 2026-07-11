-- ROADMAP #3: reply detection / inbox threading
alter table public.campaign_sends
  add column if not exists provider_thread_id text;

alter table public.email_accounts
  add column if not exists last_synced_at timestamptz;

alter table public.activities drop constraint if exists activities_type_check;

alter table public.activities
  add constraint activities_type_check check (type in (
    'note',
    'email_sent',
    'email_opened',
    'email_replied',
    'stage_change',
    'task_done',
    'import',
    'system'
  ));
