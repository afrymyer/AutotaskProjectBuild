-- 0004_pipeline_statuses.sql
-- Adds 'pipeline' as an app_bucket value on status_mappings and seeds the
-- four Autotask project statuses that PS treats as pipeline:
--   - On Hold
--   - Opportunity - On Track
--   - Opportunity - Off Track
--   - Discovery
--
-- Also adds estimated_hours to autotask_projects so pipeline projects can
-- be aggregated against available team capacity per month.

alter table status_mappings drop constraint status_mappings_app_bucket_check;
alter table status_mappings add constraint status_mappings_app_bucket_check
  check (app_bucket in ('active','inactive','complete','pipeline'));

alter table autotask_projects
  add column estimated_hours numeric(8,2) not null default 0;

-- Seed the pipeline statuses (idempotent via unique index on (entity_type, autotask_status)).
insert into status_mappings (entity_type, autotask_status, app_bucket, counts_toward_utilization)
values
  ('project', 'On Hold',                  'pipeline', false),
  ('project', 'Opportunity - On Track',   'pipeline', false),
  ('project', 'Opportunity - Off Track',  'pipeline', false),
  ('project', 'Discovery',                'pipeline', false)
on conflict (entity_type, autotask_status) do nothing;
