grant execute on function public.bootstrap_ctrldone_org(uuid, text) to authenticated;

create or replace function public.bootstrap_ctrldone_org(
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

  return v_org_id;
end;
$$;

grant execute on function public.bootstrap_ctrldone_org(uuid, text) to authenticated;
