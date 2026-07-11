-- ROADMAP #20: Billing subscriptions
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null unique references public.orgs(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text not null default 'trial' check (plan in ('trial', 'starter', 'pro')),
  seat_limit int not null default 3,
  status text not null default 'trialing'
    check (status in ('trialing', 'active', 'past_due', 'canceled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger subscriptions_updated_at before update on public.subscriptions
for each row execute function public.set_updated_at();

alter table public.subscriptions enable row level security;

create policy subscriptions_select on public.subscriptions for select
  using (public.is_org_member(org_id));

create policy subscriptions_update on public.subscriptions for update
  using (public.org_role(org_id) in ('owner', 'admin'))
  with check (public.org_role(org_id) in ('owner', 'admin'));

create policy subscriptions_insert on public.subscriptions for insert
  with check (public.is_org_member(org_id));

grant select, insert, update on public.subscriptions to authenticated;

create or replace function public.ensure_trial_subscription()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.subscriptions (org_id, plan, seat_limit, status)
  values (new.id, 'trial', 3, 'trialing')
  on conflict (org_id) do nothing;
  return new;
end;
$$;

drop trigger if exists orgs_ensure_trial_subscription on public.orgs;
create trigger orgs_ensure_trial_subscription
  after insert on public.orgs
  for each row execute function public.ensure_trial_subscription();

insert into public.subscriptions (org_id, plan, seat_limit, status)
select o.id, 'trial', 3, 'trialing'
from public.orgs o
where not exists (
  select 1 from public.subscriptions s where s.org_id = o.id
);
