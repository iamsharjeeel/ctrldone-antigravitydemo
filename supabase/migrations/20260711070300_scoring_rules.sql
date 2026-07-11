-- ROADMAP #12: lead scoring rules engine
create table public.scoring_rules (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  event_type text not null check (event_type in ('open', 'click', 'reply', 'form_submit')),
  points int not null default 0,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, event_type)
);

create trigger scoring_rules_updated_at before update on public.scoring_rules
for each row execute function public.set_updated_at();

alter table public.scoring_rules enable row level security;

create policy scoring_rules_all on public.scoring_rules for all
  using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));

grant select, insert, update, delete on public.scoring_rules to authenticated;

insert into public.scoring_rules (org_id, event_type, points, enabled)
select o.id, v.event_type, v.points, true
from public.orgs o
cross join (
  values
    ('form_submit', 10),
    ('open', 1),
    ('click', 3),
    ('reply', 5)
) as v(event_type, points)
on conflict (org_id, event_type) do nothing;

drop function if exists public.bootstrap_ctrldone_org(uuid, text);

create function public.bootstrap_ctrldone_org(
  p_user_id uuid,
  p_timezone text default 'UTC'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_pipeline_id uuid;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'bootstrap_ctrldone_org: caller must match p_user_id';
  end if;

  select om.org_id into v_org_id
  from public.org_members om
  where om.user_id = p_user_id
  limit 1;

  if v_org_id is not null then
    return v_org_id;
  end if;

  insert into public.orgs (name, default_timezone)
  values ('CTRLDONE', coalesce(nullif(p_timezone, ''), 'UTC'))
  returning id into v_org_id;

  insert into public.org_members (org_id, user_id, role)
  values (v_org_id, p_user_id, 'owner');

  insert into public.pipelines (org_id, name, is_default)
  values (v_org_id, 'Inbound', true)
  returning id into v_pipeline_id;

  insert into public.pipeline_stages (org_id, pipeline_id, name, position)
  values
    (v_org_id, v_pipeline_id, 'Lead', 0),
    (v_org_id, v_pipeline_id, 'Qualified', 1),
    (v_org_id, v_pipeline_id, 'Proposal', 2),
    (v_org_id, v_pipeline_id, 'Won', 3),
    (v_org_id, v_pipeline_id, 'Lost', 4);

  insert into public.scoring_rules (org_id, event_type, points, enabled)
  values
    (v_org_id, 'form_submit', 10, true),
    (v_org_id, 'open', 1, true),
    (v_org_id, 'click', 3, true),
    (v_org_id, 'reply', 5, true);

  return v_org_id;
end;
$$;

grant execute on function public.bootstrap_ctrldone_org(uuid, text) to authenticated;

drop function if exists public.submit_intake(text, text, text, text);

create function public.submit_intake(
  p_name text,
  p_email text,
  p_company text default null,
  p_message text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_contact_id uuid;
  v_pipeline_id uuid;
  v_stage_id uuid;
  v_email text := lower(trim(p_email));
  v_points int := 10;
  v_enabled boolean;
begin
  if coalesce(trim(p_name), '') = '' or v_email = '' then
    raise exception 'missing_fields';
  end if;

  select id into v_org_id from public.orgs where name = 'CTRLDONE' limit 1;
  if v_org_id is null then
    raise exception 'org_not_seeded';
  end if;

  if exists (
    select 1 from public.suppression_list s
    where s.org_id = v_org_id and lower(s.email) = v_email
  ) then
    return null;
  end if;

  select id into v_contact_id
  from public.contacts
  where org_id = v_org_id and lower(email) = v_email
  limit 1;

  if v_contact_id is null then
    insert into public.contacts (org_id, name, email, company, source, status)
    values (v_org_id, trim(p_name), v_email, nullif(trim(p_company), ''), 'intake', 'lead')
    returning id into v_contact_id;
  else
    update public.contacts
    set name = trim(p_name),
        company = coalesce(nullif(trim(p_company), ''), company),
        source = 'intake',
        updated_at = now()
    where id = v_contact_id;
  end if;

  select sr.points, sr.enabled into v_points, v_enabled
  from public.scoring_rules sr
  where sr.org_id = v_org_id
    and sr.event_type = 'form_submit'
  limit 1;

  if not found then
    insert into public.scoring_events (org_id, contact_id, event_type, points)
    values (v_org_id, v_contact_id, 'form_submit', 10);
  elsif v_enabled then
    insert into public.scoring_events (org_id, contact_id, event_type, points)
    values (v_org_id, v_contact_id, 'form_submit', coalesce(v_points, 10));
  end if;

  select id into v_pipeline_id
  from public.pipelines
  where org_id = v_org_id and is_default = true
  limit 1;

  if v_pipeline_id is not null then
    select id into v_stage_id
    from public.pipeline_stages
    where pipeline_id = v_pipeline_id
    order by position
    limit 1;

    if v_stage_id is not null then
      insert into public.deals (org_id, pipeline_id, stage_id, contact_id, title, value)
      values (
        v_org_id,
        v_pipeline_id,
        v_stage_id,
        v_contact_id,
        coalesce(nullif(trim(p_company), ''), trim(p_name)) || ' — inbound',
        0
      );
    end if;
  end if;

  insert into public.activities (org_id, contact_id, type, body, meta)
  values (
    v_org_id,
    v_contact_id,
    'system',
    coalesce(nullif(trim(p_message), ''), 'Intake form submitted'),
    jsonb_build_object('source', 'intake')
  );

  return v_contact_id;
end;
$$;

grant execute on function public.submit_intake(text, text, text, text) to anon, authenticated;
