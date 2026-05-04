-- 0006_active_statuses.sql
-- Adds the three Autotask "active" project statuses observed in the IMIX export
-- so they map to app_bucket = 'active' (and therefore count toward utilization).
--
-- New                    — kicked off, not yet executing
-- Planning - On Track    — in planning phase
-- Execution - On Track   — actively being delivered

insert into status_mappings (entity_type, autotask_status, app_bucket, counts_toward_utilization)
values
  ('project', 'New',                    'active', true),
  ('project', 'Planning - On Track',    'active', true),
  ('project', 'Execution - On Track',   'active', true)
on conflict (entity_type, autotask_status) do nothing;
