-- ROADMAP #17: Role-based visibility (open vs owner_scoped)
alter table public.orgs
  add column if not exists visibility_mode text not null default 'open'
  check (visibility_mode in ('open', 'owner_scoped'));

drop policy if exists contacts_all on public.contacts;
create policy contacts_all on public.contacts for all
  using (
    public.is_org_member(org_id)
    and (
      public.org_role(org_id) in ('owner', 'admin')
      or exists (
        select 1 from public.orgs o
        where o.id = contacts.org_id and o.visibility_mode = 'open'
      )
      or contacts.owner_id = auth.uid()
    )
  )
  with check (
    public.is_org_member(org_id)
    and (
      public.org_role(org_id) in ('owner', 'admin')
      or exists (
        select 1 from public.orgs o
        where o.id = contacts.org_id and o.visibility_mode = 'open'
      )
      or contacts.owner_id = auth.uid()
      or contacts.owner_id is null
    )
  );

drop policy if exists deals_all on public.deals;
create policy deals_all on public.deals for all
  using (
    public.is_org_member(org_id)
    and (
      public.org_role(org_id) in ('owner', 'admin')
      or exists (
        select 1 from public.orgs o
        where o.id = deals.org_id and o.visibility_mode = 'open'
      )
      or deals.owner_id = auth.uid()
    )
  )
  with check (
    public.is_org_member(org_id)
    and (
      public.org_role(org_id) in ('owner', 'admin')
      or exists (
        select 1 from public.orgs o
        where o.id = deals.org_id and o.visibility_mode = 'open'
      )
      or deals.owner_id = auth.uid()
      or deals.owner_id is null
    )
  );

drop policy if exists tasks_all on public.tasks;
create policy tasks_all on public.tasks for all
  using (
    public.is_org_member(org_id)
    and (
      public.org_role(org_id) in ('owner', 'admin')
      or exists (
        select 1 from public.orgs o
        where o.id = tasks.org_id and o.visibility_mode = 'open'
      )
      or tasks.assignee_id = auth.uid()
    )
  )
  with check (
    public.is_org_member(org_id)
    and (
      public.org_role(org_id) in ('owner', 'admin')
      or exists (
        select 1 from public.orgs o
        where o.id = tasks.org_id and o.visibility_mode = 'open'
      )
      or tasks.assignee_id = auth.uid()
      or tasks.assignee_id is null
    )
  );
