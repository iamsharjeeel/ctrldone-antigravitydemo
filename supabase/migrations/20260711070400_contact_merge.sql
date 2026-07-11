-- ROADMAP #4: contact merge & dedupe
alter table public.contacts
  add column if not exists merged_from_id uuid[] not null default '{}';

create or replace function public.merge_contacts(
  p_keep_id uuid,
  p_merge_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_keep_tags text[];
  v_merge_id uuid;
  v_merge_tags text[];
  v_merge_history uuid[];
  v_all_merged uuid[] := '{}';
begin
  if p_merge_ids is null or array_length(p_merge_ids, 1) is null then
    raise exception 'merge_ids_required';
  end if;

  if p_keep_id = any (p_merge_ids) then
    raise exception 'keep_id_in_merge_ids';
  end if;

  select org_id, tags, coalesce(merged_from_id, '{}')
    into v_org_id, v_keep_tags, v_all_merged
  from public.contacts
  where id = p_keep_id;

  if v_org_id is null then
    raise exception 'keep_contact_not_found';
  end if;

  if not public.is_org_member(v_org_id) then
    raise exception 'not_org_member';
  end if;

  if exists (
    select 1
    from public.contacts c
    where c.id = any (p_merge_ids)
      and c.org_id <> v_org_id
  ) then
    raise exception 'cross_org_merge';
  end if;

  if (
    select count(*) from public.contacts where id = any (p_merge_ids)
  ) <> array_length(p_merge_ids, 1) then
    raise exception 'merge_contact_not_found';
  end if;

  foreach v_merge_id in array p_merge_ids
  loop
    update public.deals
      set contact_id = p_keep_id
    where contact_id = v_merge_id
      and org_id = v_org_id;

    update public.tasks
      set contact_id = p_keep_id
    where contact_id = v_merge_id
      and org_id = v_org_id;

    update public.activities
      set contact_id = p_keep_id
    where contact_id = v_merge_id
      and org_id = v_org_id;

    update public.scoring_events
      set contact_id = p_keep_id
    where contact_id = v_merge_id
      and org_id = v_org_id;

    update public.contact_attribute_values cav
      set contact_id = p_keep_id
    where cav.contact_id = v_merge_id
      and not exists (
        select 1
        from public.contact_attribute_values keep_cav
        where keep_cav.contact_id = p_keep_id
          and keep_cav.attribute_id = cav.attribute_id
      );

    delete from public.contact_attribute_values
    where contact_id = v_merge_id;

    update public.campaign_enrollments ce
      set contact_id = p_keep_id
    where ce.contact_id = v_merge_id
      and ce.org_id = v_org_id
      and not exists (
        select 1
        from public.campaign_enrollments keep_ce
        where keep_ce.campaign_id = ce.campaign_id
          and keep_ce.contact_id = p_keep_id
      );

    delete from public.campaign_enrollments
    where contact_id = v_merge_id
      and org_id = v_org_id;

    select tags, coalesce(merged_from_id, '{}')
      into v_merge_tags, v_merge_history
    from public.contacts
    where id = v_merge_id;

    v_keep_tags := (
      select coalesce(array_agg(distinct t), '{}')
      from unnest(coalesce(v_keep_tags, '{}') || coalesce(v_merge_tags, '{}')) as t
    );
    v_all_merged := v_all_merged || v_merge_id || coalesce(v_merge_history, '{}');
  end loop;

  update public.contacts
  set
    tags = v_keep_tags,
    merged_from_id = (
      select coalesce(array_agg(distinct x), '{}')
      from unnest(v_all_merged) as x
    ),
    updated_at = now()
  where id = p_keep_id;

  delete from public.contacts
  where id = any (p_merge_ids)
    and org_id = v_org_id;
end;
$$;

grant execute on function public.merge_contacts(uuid, uuid[]) to authenticated;
