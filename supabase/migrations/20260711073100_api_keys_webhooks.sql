-- ROADMAP #16: Public API keys + webhook subscriptions
create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  name text not null,
  key_hash text not null,
  prefix text not null,
  created_by uuid references auth.users(id) on delete set null,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index api_keys_hash_uidx on public.api_keys(key_hash);
create index api_keys_org_idx on public.api_keys(org_id);

create trigger api_keys_updated_at before update on public.api_keys
for each row execute function public.set_updated_at();

alter table public.api_keys enable row level security;

create policy api_keys_all on public.api_keys for all
  using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));

create table public.webhook_subscriptions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  url text not null,
  event_types text[] not null default '{}',
  secret text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index webhook_subscriptions_org_idx on public.webhook_subscriptions(org_id)
  where enabled = true;

create trigger webhook_subscriptions_updated_at before update on public.webhook_subscriptions
for each row execute function public.set_updated_at();

alter table public.webhook_subscriptions enable row level security;

create policy webhook_subscriptions_all on public.webhook_subscriptions for all
  using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));

grant select, insert, update, delete on public.api_keys to authenticated;
grant select, insert, update, delete on public.webhook_subscriptions to authenticated;
