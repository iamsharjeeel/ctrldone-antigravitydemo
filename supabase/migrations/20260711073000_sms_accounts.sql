-- ROADMAP #14: SMS accounts (Twilio)
create table public.sms_accounts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  provider text not null default 'twilio' check (provider in ('twilio')),
  account_sid text not null,
  auth_token_encrypted text not null,
  from_number text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index sms_accounts_org_uidx on public.sms_accounts(org_id);

create trigger sms_accounts_updated_at before update on public.sms_accounts
for each row execute function public.set_updated_at();

alter table public.sms_accounts enable row level security;

create policy sms_accounts_all on public.sms_accounts for all
  using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));

grant select, insert, update, delete on public.sms_accounts to authenticated;
