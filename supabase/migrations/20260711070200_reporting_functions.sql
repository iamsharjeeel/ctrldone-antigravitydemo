-- ROADMAP #11: reporting dashboard RPCs
create or replace function public.report_stage_conversion(
  p_org_id uuid,
  p_pipeline_id uuid
)
returns table (
  stage_id uuid,
  stage_name text,
  stage_position int,
  deal_count bigint,
  avg_days numeric
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
    ps.id as stage_id,
    ps.name as stage_name,
    ps.position as stage_position,
    count(d.id)::bigint as deal_count,
    coalesce(
      round(avg(extract(epoch from (now() - d.stage_entered_at)) / 86400.0)::numeric, 1),
      0
    ) as avg_days
  from public.pipeline_stages ps
  left join public.deals d
    on d.stage_id = ps.id
   and d.org_id = p_org_id
  where ps.org_id = p_org_id
    and ps.pipeline_id = p_pipeline_id
  group by ps.id, ps.name, ps.position
  order by ps.position;
end;
$$;

create or replace function public.report_rep_performance(p_org_id uuid)
returns table (
  user_id uuid,
  deals_won bigint,
  tasks_done bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_month_start timestamptz := date_trunc('month', now());
begin
  if not public.is_org_member(p_org_id) then
    raise exception 'not_org_member';
  end if;

  return query
  with reps as (
    select om.user_id
    from public.org_members om
    where om.org_id = p_org_id
  ),
  won as (
    select d.owner_id as user_id, count(*)::bigint as cnt
    from public.deals d
    join public.pipeline_stages ps on ps.id = d.stage_id
    where d.org_id = p_org_id
      and d.owner_id is not null
      and lower(ps.name) = 'won'
      and d.stage_entered_at >= v_month_start
    group by d.owner_id
  ),
  done as (
    select t.assignee_id as user_id, count(*)::bigint as cnt
    from public.tasks t
    where t.org_id = p_org_id
      and t.assignee_id is not null
      and t.status = 'done'
      and t.updated_at >= v_month_start
    group by t.assignee_id
  )
  select
    r.user_id,
    coalesce(w.cnt, 0)::bigint as deals_won,
    coalesce(td.cnt, 0)::bigint as tasks_done
  from reps r
  left join won w on w.user_id = r.user_id
  left join done td on td.user_id = r.user_id
  where coalesce(w.cnt, 0) > 0 or coalesce(td.cnt, 0) > 0
  order by coalesce(w.cnt, 0) desc, coalesce(td.cnt, 0) desc;
end;
$$;

grant execute on function public.report_stage_conversion(uuid, uuid) to authenticated;
grant execute on function public.report_rep_performance(uuid) to authenticated;
