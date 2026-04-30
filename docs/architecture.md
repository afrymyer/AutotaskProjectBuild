# Imix Projects — Architecture

This document is the technical companion to [`CLAUDE.md`](../CLAUDE.md). It covers the data model, the Autotask sync pipeline, utilization computation, authentication flow, and the audit/observability surfaces.

---

## 1. System diagram

```
┌─────────────────────┐         ┌────────────────────────────┐
│  Autotask PSA REST  │ ◀─pull─ │  Supabase Edge Function    │
│  (read-only)        │         │  autotask-sync (hourly)    │
└─────────────────────┘         └─────────────┬──────────────┘
                                              │ upsert
                                              ▼
                                ┌────────────────────────────┐
                                │  Supabase Postgres         │
                                │  - autotask mirror tables  │
                                │  - weekly_overrides        │
                                │  - utilization (view)      │
                                │  - audit_log, sync_runs    │
                                └─────────────┬──────────────┘
                                              │ RLS-gated
                                              │ supabase-js
                                              ▼
   M365 ──SSO──▶ Clerk ──JWT──▶ ┌────────────────────────────┐
                                │  React + Vite (Railway)    │
                                │  Heatmap · Drilldown ·     │
                                │  Overrides · Admin · CSV   │
                                └─────────────┬──────────────┘
                                              │ events
                                              ▼
                                ┌────────────────────────────┐
                                │  PostHog (analytics+errors)│
                                └────────────────────────────┘
```

---

## 2. Data model

All tables live in the `public` schema and have RLS enabled. Authenticated PS managers can read all rows; only admins write to `status_mappings` and `weekly_capacity_defaults`. Override edits write through a Postgres function that also writes the audit row in the same transaction.

### 2.1 Autotask mirror tables

Each mirror table stores the subset of fields needed for utilization. Source-of-truth fields (status names, etc.) are mapped through `status_mappings` rather than hardcoded.

#### `autotask_resources`

| Column | Type | Notes |
|---|---|---|
| `autotask_id` | `bigint` PK | Autotask `Resource.id` |
| `first_name` | `text` | |
| `last_name` | `text` | |
| `email` | `text` | Used only for matching to Clerk identity; not displayed |
| `is_active` | `boolean` | |
| `department` | `text` | Used to filter to "Professional Services" |
| `weekly_capacity_hours` | `numeric(5,2)` | Default 40; per-resource override possible via `weekly_capacity_defaults` |
| `synced_at` | `timestamptz` | |
| `created_at`, `updated_at` | `timestamptz` | |

#### `autotask_projects`

| Column | Type | Notes |
|---|---|---|
| `autotask_id` | `bigint` PK | |
| `name` | `text` | |
| `status` | `text` | Raw Autotask status; mapped via `status_mappings` |
| `account_id` | `bigint` | |
| `start_date`, `end_date` | `date` | |
| `synced_at`, `created_at`, `updated_at` | `timestamptz` | |

#### `autotask_tasks`

| Column | Type | Notes |
|---|---|---|
| `autotask_id` | `bigint` PK | |
| `project_id` | `bigint` FK → `autotask_projects` | |
| `title` | `text` | |
| `assigned_resource_id` | `bigint` FK → `autotask_resources` | nullable |
| `estimated_hours` | `numeric(6,2)` | |
| `status` | `text` | |
| `synced_at`, `created_at`, `updated_at` | `timestamptz` | |

#### `autotask_schedule_entries`

The drivers of forward utilization.

| Column | Type | Notes |
|---|---|---|
| `autotask_id` | `bigint` PK | |
| `resource_id` | `bigint` FK → `autotask_resources` | |
| `task_id` | `bigint` FK → `autotask_tasks` | nullable |
| `project_id` | `bigint` FK → `autotask_projects` | nullable (denormalized for fast querying) |
| `start_at`, `end_at` | `timestamptz` | |
| `hours` | `numeric(6,2)` | |
| `synced_at`, `created_at`, `updated_at` | `timestamptz` | |

Index: `(resource_id, start_at)`, `(start_at)`.

#### `autotask_time_entries`

Historical actuals — used for backward-looking comparison and for variance reporting in a later phase.

| Column | Type | Notes |
|---|---|---|
| `autotask_id` | `bigint` PK | |
| `resource_id` | `bigint` FK | |
| `task_id` | `bigint` FK | nullable |
| `project_id` | `bigint` FK | nullable |
| `entry_date` | `date` | |
| `hours` | `numeric(6,2)` | |
| `synced_at`, `created_at`, `updated_at` | `timestamptz` | |

### 2.2 App-managed tables

#### `weekly_capacity_defaults`

Admin-set default weekly capacity for resources whose Autotask record doesn't carry one (or where IMIX wants to override it). Falls back to 40h.

| Column | Type | Notes |
|---|---|---|
| `resource_id` | `bigint` PK FK → `autotask_resources` | |
| `weekly_capacity_hours` | `numeric(5,2)` | |
| `updated_at` | `timestamptz` | |
| `updated_by_clerk_user_id` | `text` | for audit |

#### `weekly_overrides`

The PTO / unavailable-hours editor lives here. One row per (resource, week_start_et).

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `resource_id` | `bigint` FK → `autotask_resources` | |
| `week_start_et` | `date` | Monday in America/New_York |
| `pto_hours` | `numeric(5,2)` | default 0 |
| `unavailable_hours` | `numeric(5,2)` | default 0 |
| `note` | `text` | optional |
| `created_at`, `updated_at` | `timestamptz` | |
| `updated_by_clerk_user_id` | `text` | |

Unique: `(resource_id, week_start_et)`.

#### `status_mappings`

Admin-configurable mapping of Autotask raw status strings to app-level buckets (e.g., "active project," "on hold," "complete"). Used to filter what counts toward utilization.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `entity_type` | `text` | `'project'` or `'task'` |
| `autotask_status` | `text` | |
| `app_bucket` | `text` | `'active'`, `'inactive'`, `'complete'` |
| `counts_toward_utilization` | `boolean` | |
| `updated_at`, `updated_by_clerk_user_id` | | |

#### `app_users`

Maps Clerk user → app role. In v1 every authenticated user is implicitly a manager+admin; this table exists so that future role separation is additive.

| Column | Type | Notes |
|---|---|---|
| `clerk_user_id` | `text` PK | |
| `email` | `text` | |
| `role` | `text` | `'manager'` (default) or `'admin'` |
| `linked_resource_id` | `bigint` FK → `autotask_resources` | nullable; for future "see your own row" |
| `created_at`, `updated_at` | `timestamptz` | |

#### `audit_log`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `actor_clerk_user_id` | `text` | |
| `actor_email` | `text` | |
| `action` | `text` | e.g., `'override.upsert'`, `'status_mapping.update'` |
| `entity_type` | `text` | |
| `entity_id` | `text` | string for flexibility |
| `before_jsonb` | `jsonb` | |
| `after_jsonb` | `jsonb` | |
| `created_at` | `timestamptz` | |

#### `sync_runs`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `started_at`, `finished_at` | `timestamptz` | |
| `status` | `text` | `'success'`, `'partial'`, `'failed'` |
| `entities_synced` | `jsonb` | counts per entity type |
| `error_message` | `text` | nullable |

### 2.3 Computed view: `utilization_weekly`

A view (materialized in a later phase if performance demands it) that drives the heatmap.

```sql
-- conceptual; see migration 0002 for the actual definition
SELECT
  r.autotask_id                                       AS resource_id,
  week_start_et(s.start_at)                           AS week_start_et,
  SUM(s.hours)                                        AS scheduled_hours,
  COALESCE(MAX(o.pto_hours), 0)                       AS pto_hours,
  COALESCE(MAX(o.unavailable_hours), 0)               AS unavailable_hours,
  COALESCE(MAX(cd.weekly_capacity_hours),
           MAX(r.weekly_capacity_hours), 40)          AS weekly_capacity_hours
FROM autotask_resources r
LEFT JOIN autotask_schedule_entries s
  ON s.resource_id = r.autotask_id
LEFT JOIN weekly_overrides o
  ON o.resource_id = r.autotask_id
 AND o.week_start_et = week_start_et(s.start_at)
LEFT JOIN weekly_capacity_defaults cd
  ON cd.resource_id = r.autotask_id
WHERE r.is_active
  AND r.department = 'Professional Services'
GROUP BY r.autotask_id, week_start_et(s.start_at);
```

The frontend computes `utilization_pct = scheduled_hours / NULLIF(weekly_capacity_hours - unavailable_hours, 0)` to keep the SQL view stable.

---

## 3. Sync pipeline

### 3.1 Trigger

Supabase scheduled Edge Function `autotask-sync`, cron `0 * * * *` (top of every hour). Manual trigger via Supabase CLI for backfill.

### 3.2 Pull strategy

Per entity, in order:

1. `Resources` — full pull (small set, low churn)
2. `Projects` — incremental by `lastModifiedDate` since last successful run
3. `Tasks` — incremental
4. `ScheduleEntries` — pull window `[now() - 7 days, now() + 12 weeks]`
5. `TimeEntries` — incremental by `dateWorked >= now() - 30 days`

Each pull paginates via Autotask's REST cursor. The Autotask client lives in `supabase/functions/autotask-sync/_lib/autotask-client.ts` and exposes typed methods per entity.

### 3.3 Upsert strategy

All upserts are by `autotask_id` (Postgres `INSERT … ON CONFLICT (autotask_id) DO UPDATE`). Soft-deletes are detected by absence from a full-pull-by-id sweep run weekly (out of scope for v1; flagged in build plan).

### 3.4 Run accounting

Every run inserts a row into `sync_runs` with status, per-entity counts, and any error. PostHog `capture` event `autotask_sync_completed` carries the same metadata (no PII).

### 3.5 Failure handling

- Network/transient errors: retry with exponential backoff (max 4 attempts) inside the function.
- Hard failure: write `sync_runs.status = 'failed'`, capture to PostHog, and the next hourly run re-attempts.
- A consecutive-failure threshold (3+) surfaces a banner in the Admin page.

---

## 4. Utilization computation

### 4.1 Week boundary

```sql
CREATE FUNCTION week_start_et(ts timestamptz)
RETURNS date AS $$
  SELECT (date_trunc('week', ts AT TIME ZONE 'America/New_York'))::date;
$$ LANGUAGE sql IMMUTABLE;
```

`date_trunc('week', …)` in Postgres anchors weeks to Monday, which matches the IMIX sprint cadence.

### 4.2 Formula

```
utilization_pct = scheduled_hours / max(weekly_capacity_hours - unavailable_hours, 0.1)
```

PTO hours subtract from `scheduled_hours` *only* if the PTO is not already reflected in Autotask schedule entries. **Decision for v1:** PTO captured in the override editor is purely *informational subtraction from capacity* — i.e., it lowers the denominator (`unavailable_hours += pto_hours` semantically). This avoids double-subtraction risk and matches how managers intuitively think about it.

> Effective denominator = `weekly_capacity_hours - (unavailable_hours + pto_hours)`.
> The view stores them separately so the UI can show them separately.

### 4.3 Heatmap thresholds (frontend)

| utilization_pct | color |
|---|---|
| `< 0.70` | green |
| `0.70 – 0.90` | yellow |
| `0.90 – 1.10` | orange |
| `> 1.10` | red |

Defined in `src/lib/heatmap.ts` as a single function so they're testable in isolation.

---

## 5. Authentication & authorization

### 5.1 Identity flow

```
User → Railway-hosted SPA → Clerk hosted sign-in → M365 SSO → Clerk session JWT
       ↓
       supabase-js initialized with Clerk JWT
       ↓
       Postgres validates JWT via Clerk JWKS, sets request.jwt.claims.sub
       ↓
       RLS uses claim 'sub' to look up app_users.role
```

Clerk is configured to accept *only* M365 SSO; native Clerk sign-up is disabled at the Clerk org level.

### 5.2 RLS posture (v1)

```sql
-- on every PII-bearing table
CREATE POLICY "managers read all"
  ON <table> FOR SELECT
  USING (auth_role() IN ('manager','admin'));

CREATE POLICY "managers write overrides"
  ON weekly_overrides FOR INSERT, UPDATE
  USING (auth_role() IN ('manager','admin'));

CREATE POLICY "admins write status_mappings"
  ON status_mappings FOR INSERT, UPDATE, DELETE
  USING (auth_role() = 'admin');
```

`auth_role()` is a SECURITY DEFINER function that reads `app_users.role` for the current `auth.jwt() ->> 'sub'`.

### 5.3 First-login bootstrap

A Postgres trigger on first `auth.jwt()`-bearing request inserts an `app_users` row with `role = 'manager'`. (In v1 every M365-authenticated IMIX employee who lands on the app is provisioned as a manager — narrow this in v1.5 if scope changes.)

---

## 6. Frontend surfaces

| Route | Purpose |
|---|---|
| `/` | Heatmap — utilization × resources × 12 weeks; per-row variance vs personal target; client-exposure banner; rebalancing suggestions |
| `/calendar` | Team availability calendar — day-level "X of N free" (free = <50% of 8h day) |
| `/projects` | Active projects — margin per engagement, burn-vs-budget, slip risk, client-exposure flags |
| `/pipeline` | Pipeline — projects bucketed as `pipeline`; month-by-month forecast (free hours vs **win-probability-weighted** pipeline) and expected revenue |
| `/trends` | 90-day backward trend lines — team rolling utilization + per-engineer sparklines, variance vs target |
| `/skills` | Skill matrix — capability tags per resource, project required skills, certification expiry alerts |
| `/scheduler` | **v1.5 stub** — capacity-aware project scheduling |
| `/resource/:id/week/:weekStart` | Drilldown — schedule entries + tasks + projects driving that cell |
| `/overrides` | Override editor (PTO + unavailable hours); M365 PTO sync; pending-approval pill |
| `/approvals` | Director sign-off queue for overrides above the configured PTO threshold |
| `/me` | Personal forecast view; preview supports identity toggle, production gates by `app_users.linked_resource_id` + RLS |
| `/assistant` | NL queries + week summarization (preview-simulated; production via Anthropic API + tool-calling) |
| `/digest` | Weekly status email preview (production: Resend, scheduled Monday 7am ET) |
| `/admin` | Status mappings, integrations health, sync history |
| `/export` | CSV export (Director of Ops + vCIO consumers) |

### 6.1 Pipeline derivation

The pipeline view is a derived read off `autotask_projects` — there is **no separate Opportunities entity**. A project belongs in the pipeline iff its status maps to `app_bucket = 'pipeline'` via `status_mappings`. The seed mappings (migration `0004`) are:

| Autotask status | app_bucket |
|---|---|
| `On Hold` | `pipeline` |
| `Opportunity - On Track` | `pipeline` |
| `Opportunity - Off Track` | `pipeline` |
| `Discovery` | `pipeline` |

Admins can add or remove pipeline statuses from the Admin page, and `autotask_projects.estimated_hours` (added in `0004`) is the per-project hour estimate that the forecast aggregates by `target_month`.

State management: `@tanstack/react-query` for Supabase reads. No global store needed in v1.

---

## 7. Observability

- **PostHog events:** `app_loaded`, `heatmap_viewed`, `drilldown_opened`, `override_saved`, `csv_exported`, `autotask_sync_completed`, `autotask_sync_failed`.
- **No PII in event payloads.** Resource IDs only; never names or emails.
- **Errors:** `posthog.captureException` from a global React error boundary.
- **Sync health banner:** Admin page reads the latest 5 rows from `sync_runs` and shows red if 3+ consecutive failures.

---

## 8. Deployment

- **Frontend:** Railway, deploys from `main` on merge. Preview deploys per PR.
- **Edge Functions:** `supabase functions deploy autotask-sync` from CI on merge to `main`.
- **Migrations:** `supabase db push` from CI on merge to `main`. Forward-only; rollback is a new migration.

---

## 8.5 PM-feature schema (migration 0005)

The senior-PM feature set adds the following:

**Resources**
- `target_billable_pct numeric(4,3)` — utilization target per engineer (default 0.75).
- `blended_rate numeric(8,2)` — loaded $/hr, used for project margin math.
- `app_role` — `engineer | senior | principal | manager`.

**Projects**
- `budget_hours`, `contract_type` (`time_and_materials | fixed_fee | retainer`), `contract_value`, `committed_end_date`, `hours_delivered` (denormalized aggregate refreshed by sync).
- `win_probability numeric(4,3)` — populated on pipeline projects; drives the weighted forecast.

**Skills**
- `skills(id, name, category)`.
- `resource_skills(resource_id, skill_id, proficiency, certified, cert_expires_on)`.
- `project_required_skills(project_id, skill_id, weight)`.

**Snapshots**
- `utilization_snapshots(taken_on, resource_id, week_start_et, scheduled, delivered, capacity)` — populated nightly from `autotask_schedule_entries` + `autotask_time_entries`. Drives `/trends` and is the only place 90-day-backward signal lives.

**Approval workflow**
- `weekly_overrides.approval_status` (`auto_approved | pending | approved | rejected`) + `requires_approval_reason`, `approved_by`, `approved_at`.
- The `upsert_weekly_override` RPC sets `approval_status = 'pending'` when `pto_hours > 40`. Pending edits don't shift the heatmap until a director signs off.

**AI**
- `ai_conversations`, `ai_messages` for the `/assistant` chat history.

**Integrations**
- `integrations(id, status, last_health_check_at, last_error_message)` for `microsoft_graph`, `resend`, `anthropic`.

## 9. Out of scope for v1

- Mobile-responsive layout
- Soft-delete reconciliation (weekly full sweep)
- AI overload prediction / NL drilldown
- PS resource self-view (row-level filtering on `linked_resource_id`)
- Slack/Teams alerts on sync failure
- Variance reporting (scheduled vs actual via `autotask_time_entries`)

These are tracked in [`build-plan.md`](./build-plan.md) under "post-pilot backlog."
