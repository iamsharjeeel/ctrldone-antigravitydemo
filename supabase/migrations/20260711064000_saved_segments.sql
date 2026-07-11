-- ROADMAP #6: saved / dynamic contact segments
create table public.saved_segments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  name text not null,
  filters jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, name)
);

create trigger saved_segments_updated_at before update on public.saved_segments
for each row execute function public.set_updated_at();

alter table public.saved_segments enable row level security;

create policy saved_segments_all on public.saved_segments for all
  using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));

grant select, insert, update, delete on public.saved_segments to authenticated;
