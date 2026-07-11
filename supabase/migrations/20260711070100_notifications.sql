-- ROADMAP #9: notifications + preferences
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_unread_idx
  on public.notifications(user_id, created_at desc)
  where read_at is null;

create index notifications_org_user_idx
  on public.notifications(org_id, user_id, created_at desc);

alter table public.notifications enable row level security;

create policy notifications_select on public.notifications for select
  using (public.is_org_member(org_id) and user_id = auth.uid());

create policy notifications_update on public.notifications for update
  using (public.is_org_member(org_id) and user_id = auth.uid())
  with check (public.is_org_member(org_id) and user_id = auth.uid());

create policy notifications_insert on public.notifications for insert
  with check (public.is_org_member(org_id));

create policy notifications_delete on public.notifications for delete
  using (public.is_org_member(org_id) and user_id = auth.uid());

grant select, insert, update, delete on public.notifications to authenticated;

create table public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  channel text not null check (channel in ('inapp', 'email_digest')),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, user_id, channel)
);

create trigger notification_preferences_updated_at
  before update on public.notification_preferences
  for each row execute function public.set_updated_at();

alter table public.notification_preferences enable row level security;

create policy notification_preferences_all on public.notification_preferences for all
  using (public.is_org_member(org_id) and user_id = auth.uid())
  with check (public.is_org_member(org_id) and user_id = auth.uid());

grant select, insert, update, delete on public.notification_preferences to authenticated;
