-- 0005_pm_features.sql
-- Schema additions for the v1.5/v2 PM feature set:
--   - resource: target_billable_pct, blended_rate, role
--   - project: budget_hours, contract_type, contract_value, committed_end_date,
--     hours_delivered (denormalized aggregate of time_entries)
--   - pipeline (autotask_projects with status app_bucket='pipeline'):
--     win_probability, contract_value (uses the columns added on autotask_projects)
--   - skills + resource_skills + project_required_skills
--   - utilization_snapshots for 90-day trend lines
--   - weekly_overrides.approval_status for sign-off workflow
--   - ai_conversations + ai_messages for the assistant
--   - integrations table (M365, Resend, Anthropic) for credential provisioning audit
--
-- Forward-only. See architecture.md §11 for the rationale.

-- ─── resources ────────────────────────────────────────────────────────────
alter table autotask_resources
  add column target_billable_pct numeric(4,3) not null default 0.75,
  add column blended_rate numeric(8,2) not null default 175.00,
  add column app_role text not null default 'engineer'
    check (app_role in ('engineer','senior','principal','manager'));

-- ─── projects ─────────────────────────────────────────────────────────────
alter table autotask_projects
  add column budget_hours numeric(8,2) not null default 0,
  add column contract_type text not null default 'time_and_materials'
    check (contract_type in ('time_and_materials','fixed_fee','retainer')),
  add column contract_value numeric(10,2) not null default 0,
  add column committed_end_date date,
  add column hours_delivered numeric(8,2) not null default 0,  -- denormalized; refreshed by sync
  add column win_probability numeric(4,3); -- only populated for pipeline projects

-- ─── skills ───────────────────────────────────────────────────────────────
create table skills (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  category text not null,
  created_at timestamptz not null default now()
);

create table resource_skills (
  resource_id bigint not null references autotask_resources(autotask_id) on delete cascade,
  skill_id uuid not null references skills(id) on delete cascade,
  proficiency text not null check (proficiency in ('learning','proficient','expert')),
  certified boolean not null default false,
  cert_expires_on date,
  primary key (resource_id, skill_id)
);

create table project_required_skills (
  project_id bigint not null references autotask_projects(autotask_id) on delete cascade,
  skill_id uuid not null references skills(id) on delete cascade,
  weight numeric(3,2) not null default 1.0,
  primary key (project_id, skill_id)
);

-- ─── snapshots (90-day trend line storage) ────────────────────────────────
create table utilization_snapshots (
  id uuid primary key default uuid_generate_v4(),
  taken_on date not null,
  resource_id bigint not null references autotask_resources(autotask_id) on delete cascade,
  week_start_et date not null,
  scheduled_hours numeric(6,2) not null,
  delivered_hours numeric(6,2) not null,
  capacity_hours numeric(6,2) not null,
  unique (taken_on, resource_id, week_start_et)
);

create index utilization_snapshots_resource_idx
  on utilization_snapshots(resource_id, week_start_et);

-- ─── override approvals ───────────────────────────────────────────────────
alter table weekly_overrides
  add column approval_status text not null default 'auto_approved'
    check (approval_status in ('auto_approved','pending','approved','rejected')),
  add column requires_approval_reason text,
  add column approved_by_clerk_user_id text,
  add column approved_at timestamptz;

-- Threshold: PTO > 5 days (40h) routes to director approval. Triggered at
-- override-write time by the upsert_weekly_override RPC (updated separately).

-- ─── AI conversation log ──────────────────────────────────────────────────
create table ai_conversations (
  id uuid primary key default uuid_generate_v4(),
  actor_clerk_user_id text not null,
  started_at timestamptz not null default now(),
  topic text
);

create table ai_messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references ai_conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant','tool')),
  content text not null,
  tool_calls jsonb,
  created_at timestamptz not null default now()
);

create index ai_messages_conv_idx on ai_messages(conversation_id, created_at);

-- ─── external integrations (credential provisioning audit) ────────────────
create table integrations (
  id text primary key,                    -- 'microsoft_graph' | 'resend' | 'anthropic'
  status text not null default 'unconfigured'
    check (status in ('unconfigured','configured','disabled','error')),
  last_health_check_at timestamptz,
  last_error_message text,
  configured_at timestamptz,
  configured_by_clerk_user_id text
);

insert into integrations (id, status) values
  ('microsoft_graph', 'unconfigured'),
  ('resend',          'unconfigured'),
  ('anthropic',       'unconfigured');

-- ─── RLS for new tables ───────────────────────────────────────────────────
alter table skills enable row level security;
alter table resource_skills enable row level security;
alter table project_required_skills enable row level security;
alter table utilization_snapshots enable row level security;
alter table ai_conversations enable row level security;
alter table ai_messages enable row level security;
alter table integrations enable row level security;

create policy "managers read skills"
  on skills for select using (auth_role() in ('manager','admin'));
create policy "admins write skills"
  on skills for all
  using (auth_role() = 'admin') with check (auth_role() = 'admin');

create policy "managers read resource_skills"
  on resource_skills for select using (auth_role() in ('manager','admin'));
create policy "admins write resource_skills"
  on resource_skills for all
  using (auth_role() = 'admin') with check (auth_role() = 'admin');

create policy "managers read project_required_skills"
  on project_required_skills for select using (auth_role() in ('manager','admin'));
create policy "admins write project_required_skills"
  on project_required_skills for all
  using (auth_role() = 'admin') with check (auth_role() = 'admin');

create policy "managers read snapshots"
  on utilization_snapshots for select using (auth_role() in ('manager','admin'));

create policy "users read own ai_conversations"
  on ai_conversations for select
  using (actor_clerk_user_id = (auth.jwt() ->> 'sub') or auth_role() = 'admin');
create policy "users write own ai_conversations"
  on ai_conversations for insert
  with check (actor_clerk_user_id = (auth.jwt() ->> 'sub'));

create policy "users read own ai_messages"
  on ai_messages for select using (
    exists (
      select 1 from ai_conversations c
      where c.id = ai_messages.conversation_id
        and (c.actor_clerk_user_id = (auth.jwt() ->> 'sub') or auth_role() = 'admin')
    )
  );
create policy "users write own ai_messages"
  on ai_messages for insert with check (
    exists (
      select 1 from ai_conversations c
      where c.id = ai_messages.conversation_id
        and c.actor_clerk_user_id = (auth.jwt() ->> 'sub')
    )
  );

create policy "admins read integrations"
  on integrations for select using (auth_role() = 'admin');
create policy "admins write integrations"
  on integrations for all
  using (auth_role() = 'admin') with check (auth_role() = 'admin');
