-- ROADMAP #19: activity comments / @mentions
create table public.activity_comments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  activity_id uuid not null references public.activities(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index activity_comments_activity_idx
  on public.activity_comments(activity_id, created_at);

create trigger activity_comments_updated_at before update on public.activity_comments
for each row execute function public.set_updated_at();

alter table public.activity_comments enable row level security;

create policy activity_comments_all on public.activity_comments for all
  using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));

grant select, insert, update, delete on public.activity_comments to authenticated;

create or replace function public.org_member_directory(p_org_id uuid)
returns table (
  user_id uuid,
  email text,
  display_name text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_org_member(p_org_id) then
    raise exception 'not_org_member';
  end if;

  return query
  select
    om.user_id,
    u.email::text,
    coalesce(
      nullif(u.raw_user_meta_data->>'full_name', ''),
      nullif(u.raw_user_meta_data->>'name', ''),
      split_part(u.email::text, '@', 1)
    ) as display_name
  from public.org_members om
  join auth.users u on u.id = om.user_id
  where om.org_id = p_org_id;
end;
$$;

grant execute on function public.org_member_directory(uuid) to authenticated;
