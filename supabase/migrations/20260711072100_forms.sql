-- ROADMAP #15: embeddable form builder
create table public.forms (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  name text not null,
  fields jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index forms_org_idx on public.forms(org_id);

create trigger forms_updated_at before update on public.forms
for each row execute function public.set_updated_at();

alter table public.forms enable row level security;

create policy forms_all on public.forms for all
  using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));

grant select, insert, update, delete on public.forms to authenticated;

create table public.form_submissions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  form_id uuid not null references public.forms(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  contact_id uuid references public.contacts(id) on delete set null,
  created_at timestamptz not null default now()
);

create index form_submissions_form_idx on public.form_submissions(form_id, created_at desc);
create index form_submissions_org_idx on public.form_submissions(org_id, created_at desc);

alter table public.form_submissions enable row level security;

create policy form_submissions_all on public.form_submissions for all
  using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));

grant select, insert, update, delete on public.form_submissions to authenticated;

create or replace function public.get_form(p_form_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_form public.forms%rowtype;
begin
  select * into v_form from public.forms where id = p_form_id;
  if not found then
    return null;
  end if;
  return jsonb_build_object(
    'id', v_form.id,
    'name', v_form.name,
    'fields', v_form.fields
  );
end;
$$;

grant execute on function public.get_form(uuid) to anon, authenticated;

create or replace function public.submit_form(
  p_form_id uuid,
  p_payload jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_form public.forms%rowtype;
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
  v_field jsonb;
  v_key text;
  v_label text;
  v_type text;
  v_required boolean;
  v_val text;
  v_name text;
  v_email text;
  v_company text;
  v_phone text;
  v_contact_id uuid;
  v_attr_id uuid;
  v_json_val jsonb;
  v_core text[] := array['name', 'email', 'company', 'phone'];
begin
  select * into v_form from public.forms where id = p_form_id;
  if not found then
    raise exception 'form_not_found';
  end if;

  for v_field in select * from jsonb_array_elements(coalesce(v_form.fields, '[]'::jsonb))
  loop
    v_key := v_field->>'key';
    v_required := coalesce((v_field->>'required')::boolean, false);
    v_val := nullif(trim(coalesce(v_payload->>v_key, '')), '');
    if v_required and v_val is null then
      raise exception 'missing_field:%', v_key;
    end if;
  end loop;

  v_name := nullif(trim(coalesce(v_payload->>'name', '')), '');
  v_email := lower(nullif(trim(coalesce(v_payload->>'email', '')), ''));
  v_company := nullif(trim(coalesce(v_payload->>'company', '')), '');
  v_phone := nullif(trim(coalesce(v_payload->>'phone', '')), '');

  if v_email is null then
    raise exception 'missing_fields';
  end if;

  if v_name is null then
    v_name := split_part(v_email, '@', 1);
  end if;

  if exists (
    select 1 from public.suppression_list s
    where s.org_id = v_form.org_id and lower(s.email) = v_email
  ) then
    return null;
  end if;

  select id into v_contact_id
  from public.contacts
  where org_id = v_form.org_id and lower(email) = v_email
  limit 1;

  if v_contact_id is null then
    insert into public.contacts (org_id, name, email, company, phone, source, status)
    values (
      v_form.org_id,
      v_name,
      v_email,
      v_company,
      v_phone,
      'form',
      'lead'
    )
    returning id into v_contact_id;
  else
    update public.contacts
    set name = coalesce(v_name, name),
        company = coalesce(v_company, company),
        phone = coalesce(v_phone, phone),
        source = coalesce(source, 'form'),
        updated_at = now()
    where id = v_contact_id;
  end if;

  for v_field in select * from jsonb_array_elements(coalesce(v_form.fields, '[]'::jsonb))
  loop
    v_key := lower(trim(v_field->>'key'));
    if v_key = any (v_core) then
      continue;
    end if;
    v_label := coalesce(nullif(trim(v_field->>'label'), ''), v_key);
    v_type := coalesce(nullif(trim(v_field->>'type'), ''), 'text');
    if v_type not in ('text', 'number', 'date', 'select', 'boolean') then
      v_type := 'text';
    end if;
    v_val := nullif(trim(coalesce(
      v_payload->>v_key,
      v_payload->>(v_field->>'key'),
      ''
    )), '');
    if v_val is null then
      continue;
    end if;

    select id into v_attr_id
    from public.contact_attributes
    where org_id = v_form.org_id and key = v_key
    limit 1;

    if v_attr_id is null then
      insert into public.contact_attributes (org_id, key, label, field_type)
      values (v_form.org_id, v_key, v_label, v_type)
      returning id into v_attr_id;
    end if;

    if v_type = 'number' then
      v_json_val := to_jsonb(v_val::numeric);
    elsif v_type = 'boolean' then
      v_json_val := to_jsonb(lower(v_val) in ('true', '1', 'yes', 'on'));
    else
      v_json_val := to_jsonb(v_val);
    end if;

    insert into public.contact_attribute_values (org_id, contact_id, attribute_id, value)
    values (v_form.org_id, v_contact_id, v_attr_id, v_json_val)
    on conflict (contact_id, attribute_id) do update
      set value = excluded.value, updated_at = now();
  end loop;

  insert into public.form_submissions (org_id, form_id, payload, contact_id)
  values (v_form.org_id, v_form.id, v_payload, v_contact_id);

  insert into public.activities (org_id, contact_id, type, body, meta)
  values (
    v_form.org_id,
    v_contact_id,
    'system',
    'Form submitted: ' || v_form.name,
    jsonb_build_object('source', 'form', 'form_id', v_form.id)
  );

  insert into public.scoring_events (org_id, contact_id, event_type, points)
  select
    v_form.org_id,
    v_contact_id,
    'form_submit',
    coalesce(
      (select sr.points from public.scoring_rules sr
       where sr.org_id = v_form.org_id and sr.event_type = 'form_submit' and sr.enabled
       limit 1),
      10
    )
  where not exists (
    select 1 from public.scoring_rules sr
    where sr.org_id = v_form.org_id and sr.event_type = 'form_submit' and not sr.enabled
  );

  return v_contact_id;
end;
$$;

grant execute on function public.submit_form(uuid, jsonb) to anon, authenticated;
