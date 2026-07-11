grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant usage, select on sequences to authenticated;

grant select on public.orgs to authenticated;
grant select, insert, update, delete on public.org_members to authenticated;
grant select, insert, update, delete on public.contacts to authenticated;
grant select, insert, update, delete on public.contact_attributes to authenticated;
grant select, insert, update, delete on public.contact_attribute_values to authenticated;
grant select, insert, update, delete on public.pipelines to authenticated;
grant select, insert, update, delete on public.pipeline_stages to authenticated;
grant select, insert, update, delete on public.deals to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;
grant select, insert, update, delete on public.activities to authenticated;
grant select, insert, update, delete on public.email_accounts to authenticated;
grant select, insert, update, delete on public.campaigns to authenticated;
grant select, insert, update, delete on public.campaign_steps to authenticated;
grant select, insert, update, delete on public.campaign_enrollments to authenticated;
grant select, insert, update, delete on public.campaign_sends to authenticated;
grant select, insert, update, delete on public.csv_imports to authenticated;
grant select, insert, update, delete on public.suppression_list to authenticated;
grant select, insert, update, delete on public.email_templates to authenticated;
grant select, insert on public.audit_log to authenticated;
grant select, insert on public.scoring_events to authenticated;
