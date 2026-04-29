-- 0001_initial_schema.sql
-- Imix Projects — initial schema.
-- See docs/architecture.md §2 for the model rationale.

-- ─────────────────────────────────────────────────────────────────────────────
-- Helpers
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists "uuid-ossp";

-- Anchor weeks to Monday in America/New_York (the IMIX sprint cadence).
create or replace function week_start_et(ts timestamptz)
returns date
language sql
immutable
as $$
  select (date_trunc('week', ts at time zone 'America/New_York'))::date;
$$;

-- Returns the app role of the current Clerk-authenticated user.
-- `auth.jwt()` is populated by the Clerk JWT in the Authorization header.
create or replace function auth_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from app_users where clerk_user_id = (auth.jwt() ->> 'sub')),
    'none'
  );
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- App-managed tables
-- ─────────────────────────────────────────────────────────────────────────────

create table app_users (
  clerk_user_id text primary key,
  email text not null,
  role text not null default 'manager' check (role in ('manager','admin','none')),
  linked_resource_id bigint, -- FK added after autotask_resources is created
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Autotask mirror tables
-- ─────────────────────────────────────────────────────────────────────────────

create table autotask_resources (
  autotask_id bigint primary key,
  first_name text not null,
  last_name text not null,
  email text,
  is_active boolean not null default true,
  department text,
  weekly_capacity_hours numeric(5,2) not null default 40,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table app_users
  add constraint app_users_linked_resource_fk
  foreign key (linked_resource_id) references autotask_resources(autotask_id) on delete set null;

create table autotask_projects (
  autotask_id bigint primary key,
  name text not null,
  status text,
  account_id bigint,
  start_date date,
  end_date date,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table autotask_tasks (
  autotask_id bigint primary key,
  project_id bigint not null references autotask_projects(autotask_id) on delete cascade,
  title text not null,
  assigned_resource_id bigint references autotask_resources(autotask_id) on delete set null,
  estimated_hours numeric(6,2) not null default 0,
  status text,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index autotask_tasks_project_idx on autotask_tasks(project_id);
create index autotask_tasks_resource_idx on autotask_tasks(assigned_resource_id);

create table autotask_schedule_entries (
  autotask_id bigint primary key,
  resource_id bigint not null references autotask_resources(autotask_id) on delete cascade,
  task_id bigint references autotask_tasks(autotask_id) on delete set null,
  project_id bigint references autotask_projects(autotask_id) on delete set null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  hours numeric(6,2) not null,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index schedule_entries_resource_start_idx
  on autotask_schedule_entries(resource_id, start_at);
create index schedule_entries_start_idx
  on autotask_schedule_entries(start_at);

create table autotask_time_entries (
  autotask_id bigint primary key,
  resource_id bigint not null references autotask_resources(autotask_id) on delete cascade,
  task_id bigint references autotask_tasks(autotask_id) on delete set null,
  project_id bigint references autotask_projects(autotask_id) on delete set null,
  entry_date date not null,
  hours numeric(6,2) not null,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index time_entries_resource_date_idx
  on autotask_time_entries(resource_id, entry_date);

-- ─────────────────────────────────────────────────────────────────────────────
-- Capacity, overrides, status mappings
-- ─────────────────────────────────────────────────────────────────────────────

create table weekly_capacity_defaults (
  resource_id bigint primary key references autotask_resources(autotask_id) on delete cascade,
  weekly_capacity_hours numeric(5,2) not null,
  updated_at timestamptz not null default now(),
  updated_by_clerk_user_id text
);

create table weekly_overrides (
  id uuid primary key default uuid_generate_v4(),
  resource_id bigint not null references autotask_resources(autotask_id) on delete cascade,
  week_start_et date not null,
  pto_hours numeric(5,2) not null default 0 check (pto_hours >= 0),
  unavailable_hours numeric(5,2) not null default 0 check (unavailable_hours >= 0),
  note text,
  updated_by_clerk_user_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (resource_id, week_start_et)
);

create table status_mappings (
  id uuid primary key default uuid_generate_v4(),
  entity_type text not null check (entity_type in ('project','task')),
  autotask_status text not null,
  app_bucket text not null check (app_bucket in ('active','inactive','complete')),
  counts_toward_utilization boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by_clerk_user_id text,
  unique (entity_type, autotask_status)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Audit + sync history
-- ─────────────────────────────────────────────────────────────────────────────

create table audit_log (
  id uuid primary key default uuid_generate_v4(),
  actor_clerk_user_id text not null,
  actor_email text not null,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  before_jsonb jsonb,
  after_jsonb jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_entity_idx on audit_log(entity_type, entity_id);
create index audit_log_actor_idx on audit_log(actor_clerk_user_id);

create table sync_runs (
  id uuid primary key default uuid_generate_v4(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null check (status in ('running','success','partial','failed')),
  entities_synced jsonb not null default '{}'::jsonb,
  error_message text
);

create index sync_runs_started_idx on sync_runs(started_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────────────────────
-- v1 policy: managers and admins read everything; admins additionally write
-- status_mappings and weekly_capacity_defaults. Override edits go through the
-- upsert_weekly_override RPC (defined in migration 0003) which enforces audit.

alter table app_users enable row level security;
alter table autotask_resources enable row level security;
alter table autotask_projects enable row level security;
alter table autotask_tasks enable row level security;
alter table autotask_schedule_entries enable row level security;
alter table autotask_time_entries enable row level security;
alter table weekly_capacity_defaults enable row level security;
alter table weekly_overrides enable row level security;
alter table status_mappings enable row level security;
alter table audit_log enable row level security;
alter table sync_runs enable row level security;

-- Read for managers + admins
create policy "managers read app_users self"
  on app_users for select
  using (clerk_user_id = (auth.jwt() ->> 'sub') or auth_role() = 'admin');

create policy "managers read autotask_resources"
  on autotask_resources for select
  using (auth_role() in ('manager','admin'));

create policy "managers read autotask_projects"
  on autotask_projects for select
  using (auth_role() in ('manager','admin'));

create policy "managers read autotask_tasks"
  on autotask_tasks for select
  using (auth_role() in ('manager','admin'));

create policy "managers read autotask_schedule_entries"
  on autotask_schedule_entries for select
  using (auth_role() in ('manager','admin'));

create policy "managers read autotask_time_entries"
  on autotask_time_entries for select
  using (auth_role() in ('manager','admin'));

create policy "managers read weekly_capacity_defaults"
  on weekly_capacity_defaults for select
  using (auth_role() in ('manager','admin'));

create policy "managers read weekly_overrides"
  on weekly_overrides for select
  using (auth_role() in ('manager','admin'));

create policy "managers read status_mappings"
  on status_mappings for select
  using (auth_role() in ('manager','admin'));

create policy "admins read audit_log"
  on audit_log for select
  using (auth_role() = 'admin');

create policy "managers read sync_runs"
  on sync_runs for select
  using (auth_role() in ('manager','admin'));

-- Admin writes
create policy "admins write status_mappings"
  on status_mappings for all
  using (auth_role() = 'admin')
  with check (auth_role() = 'admin');

create policy "admins write weekly_capacity_defaults"
  on weekly_capacity_defaults for all
  using (auth_role() = 'admin')
  with check (auth_role() = 'admin');

-- Note: weekly_overrides writes are gated through the upsert_weekly_override
-- RPC (migration 0003). Direct table writes are denied by absence of policy.
