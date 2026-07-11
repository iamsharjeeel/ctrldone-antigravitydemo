-- ROADMAP #13: meeting/booking links
create table public.booking_pages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  slug text not null,
  duration_minutes int not null default 30 check (duration_minutes > 0 and duration_minutes <= 480),
  availability jsonb not null default '{"days":[1,2,3,4,5],"start":"09:00","end":"18:00"}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, slug),
  unique (org_id, user_id)
);

create index booking_pages_slug_idx on public.booking_pages(slug);

create trigger booking_pages_updated_at before update on public.booking_pages
for each row execute function public.set_updated_at();

alter table public.booking_pages enable row level security;

create policy booking_pages_all on public.booking_pages for all
  using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));

grant select, insert, update, delete on public.booking_pages to authenticated;

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  booking_page_id uuid not null references public.booking_pages(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  guest_name text not null,
  guest_email text not null,
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_at > start_at)
);

create index bookings_page_start_idx on public.bookings(booking_page_id, start_at)
  where status = 'confirmed';

create trigger bookings_updated_at before update on public.bookings
for each row execute function public.set_updated_at();

alter table public.bookings enable row level security;

create policy bookings_all on public.bookings for all
  using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));

grant select, insert, update, delete on public.bookings to authenticated;

create or replace function public.get_booking_page(p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_page public.booking_pages%rowtype;
  v_org_name text;
  v_booked jsonb;
begin
  select * into v_page
  from public.booking_pages
  where slug = lower(trim(p_slug))
  limit 1;

  if not found then
    return null;
  end if;

  select name into v_org_name from public.orgs where id = v_page.org_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'start_at', b.start_at,
    'end_at', b.end_at
  ) order by b.start_at), '[]'::jsonb)
  into v_booked
  from public.bookings b
  where b.booking_page_id = v_page.id
    and b.status = 'confirmed'
    and b.start_at >= now() - interval '1 day'
    and b.start_at < now() + interval '60 days';

  return jsonb_build_object(
    'id', v_page.id,
    'slug', v_page.slug,
    'duration_minutes', v_page.duration_minutes,
    'availability', v_page.availability,
    'org_name', coalesce(v_org_name, 'Meeting'),
    'booked', v_booked
  );
end;
$$;

grant execute on function public.get_booking_page(text) to anon, authenticated;

create or replace function public.create_booking(
  p_slug text,
  p_guest_name text,
  p_guest_email text,
  p_start_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_page public.booking_pages%rowtype;
  v_email text := lower(trim(p_guest_email));
  v_name text := trim(p_guest_name);
  v_end_at timestamptz;
  v_contact_id uuid;
  v_booking_id uuid;
  v_days int[];
  v_start_t time;
  v_end_t time;
  v_slot_t time;
  v_dow int;
begin
  if coalesce(v_name, '') = '' or v_email = '' or p_start_at is null then
    raise exception 'missing_fields';
  end if;

  if p_start_at < now() then
    raise exception 'slot_in_past';
  end if;

  select * into v_page
  from public.booking_pages
  where slug = lower(trim(p_slug))
  limit 1;

  if not found then
    raise exception 'page_not_found';
  end if;

  v_end_at := p_start_at + make_interval(mins => v_page.duration_minutes);

  v_days := coalesce(
    (select array_agg(x::int) from jsonb_array_elements_text(v_page.availability->'days') as t(x)),
    array[1,2,3,4,5]
  );
  v_start_t := coalesce((v_page.availability->>'start')::time, '09:00'::time);
  v_end_t := coalesce((v_page.availability->>'end')::time, '18:00'::time);
  v_dow := extract(isodow from p_start_at)::int;
  v_slot_t := p_start_at::time;

  if not (v_dow = any (v_days)) then
    raise exception 'outside_availability';
  end if;

  if v_slot_t < v_start_t
     or (v_slot_t + (v_page.duration_minutes || ' minutes')::interval) > v_end_t then
    raise exception 'outside_availability';
  end if;

  if exists (
    select 1 from public.bookings b
    where b.booking_page_id = v_page.id
      and b.status = 'confirmed'
      and b.start_at < v_end_at
      and b.end_at > p_start_at
  ) then
    raise exception 'slot_taken';
  end if;

  if exists (
    select 1 from public.suppression_list s
    where s.org_id = v_page.org_id and lower(s.email) = v_email
  ) then
    raise exception 'suppressed';
  end if;

  select id into v_contact_id
  from public.contacts
  where org_id = v_page.org_id and lower(email) = v_email
  limit 1;

  if v_contact_id is null then
    insert into public.contacts (org_id, name, email, source, status, owner_id)
    values (v_page.org_id, v_name, v_email, 'booking', 'lead', v_page.user_id)
    returning id into v_contact_id;
  else
    update public.contacts
    set name = v_name,
        source = coalesce(source, 'booking'),
        updated_at = now()
    where id = v_contact_id;
  end if;

  insert into public.bookings (
    org_id, booking_page_id, contact_id, start_at, end_at, guest_name, guest_email, status
  ) values (
    v_page.org_id, v_page.id, v_contact_id, p_start_at, v_end_at, v_name, v_email, 'confirmed'
  )
  returning id into v_booking_id;

  insert into public.activities (org_id, contact_id, type, body, meta)
  values (
    v_page.org_id,
    v_contact_id,
    'system',
    'Booked a meeting',
    jsonb_build_object(
      'source', 'booking',
      'booking_id', v_booking_id,
      'start_at', p_start_at,
      'end_at', v_end_at
    )
  );

  insert into public.tasks (
    org_id, contact_id, title, due_at, assignee_id, status
  ) values (
    v_page.org_id,
    v_contact_id,
    'Meeting with ' || v_name,
    p_start_at,
    v_page.user_id,
    'open'
  );

  return v_booking_id;
end;
$$;

grant execute on function public.create_booking(text, text, text, timestamptz) to anon, authenticated;
