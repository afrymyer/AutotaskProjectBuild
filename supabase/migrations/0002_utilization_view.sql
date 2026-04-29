-- 0002_utilization_view.sql
-- Per-resource per-week utilization view that drives the heatmap.
-- Only PS, only active resources. Weeks anchored to Monday America/New_York.

create or replace view utilization_weekly as
with weeks as (
  -- 12-week forward window, anchored to the current ET week
  select generate_series(
    week_start_et(now()),
    week_start_et(now()) + interval '11 weeks',
    interval '1 week'
  )::date as week_start_et
),
ps_resources as (
  select * from autotask_resources
  where is_active and department = 'Professional Services'
),
scheduled as (
  select
    s.resource_id,
    week_start_et(s.start_at) as week_start_et,
    sum(s.hours) as scheduled_hours
  from autotask_schedule_entries s
  where s.start_at >= week_start_et(now())
    and s.start_at <  week_start_et(now()) + interval '12 weeks'
  group by s.resource_id, week_start_et(s.start_at)
)
select
  r.autotask_id                           as resource_id,
  r.first_name,
  r.last_name,
  w.week_start_et,
  coalesce(s.scheduled_hours, 0)          as scheduled_hours,
  coalesce(o.pto_hours, 0)                as pto_hours,
  coalesce(o.unavailable_hours, 0)        as unavailable_hours,
  coalesce(cd.weekly_capacity_hours,
           r.weekly_capacity_hours, 40)   as weekly_capacity_hours
from ps_resources r
cross join weeks w
left join scheduled s
  on s.resource_id = r.autotask_id and s.week_start_et = w.week_start_et
left join weekly_overrides o
  on o.resource_id = r.autotask_id and o.week_start_et = w.week_start_et
left join weekly_capacity_defaults cd
  on cd.resource_id = r.autotask_id;

-- Inherit RLS from underlying tables; views in Postgres run as the invoker
-- by default, so policies on autotask_resources etc. apply.
