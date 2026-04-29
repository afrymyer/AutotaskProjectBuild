# Imix Projects

Single-tenant Professional Services capacity dashboard for IMIX. Pulls read-only from Autotask hourly and surfaces utilization as a weekly heatmap with drilldown, manager overrides for PTO/unavailable hours, and CSV export.

**This is an internal IMIX tool.** Autotask remains the system of record. This product is read-only against Autotask — no write-back.

> Companion docs: [`docs/architecture.md`](./docs/architecture.md) · [`docs/build-plan.md`](./docs/build-plan.md)

---

## Build parameters (locked)

| Parameter | Value |
|---|---|
| Build mode | Full |
| Framework | Superpowers |
| Security tier | **Tier 2** (employee PII: names, schedules, utilization) |
| Project phase | Pilot |
| Pilot date | 2026-05-13 |
| Tenancy | Single-tenant |
| Data residency | US only |
| Branding | IMIX internal style |
| AI in v1 | None (designed for future addition) |

---

## Stack

| Layer | Choice |
|---|---|
| Frontend | React + Vite + TypeScript |
| Hosting (frontend) | Railway |
| Database | Supabase Postgres (US region) |
| Backend / sync | Supabase Edge Functions (Deno) |
| Auth | Clerk, with **IMIX M365 SSO** as the identity source |
| Analytics + errors | PostHog |
| Source system | Autotask PSA REST API (read-only) |
| Sync cadence | Hourly |
| Time zone | All utilization in `America/New_York` |

### Utilization formula

```
utilization = scheduled_hours / (weekly_capacity - unavailable_hours)
```

### Heatmap thresholds

| Range | Color |
|---|---|
| < 70% | green |
| 70–90% | yellow |
| 90–110% | orange |
| > 110% | red |

---

## Repository layout

```
.
├── CLAUDE.md                          # this file
├── docs/
│   ├── architecture.md                # data model, sync, utilization, auth
│   └── build-plan.md                  # milestones to 2026-05-13
├── src/                               # React + Vite app
│   ├── main.tsx                       # Clerk + PostHog bootstrap
│   ├── App.tsx                        # routes
│   ├── lib/                           # supabase, clerk, posthog clients
│   ├── pages/                         # Heatmap, Drilldown, Overrides, Admin
│   └── components/
├── supabase/
│   ├── migrations/                    # SQL migrations
│   └── functions/
│       └── autotask-sync/             # hourly sync Edge Function
├── package.json
├── vite.config.ts
├── tsconfig.json
└── .env.example
```

---

## Local development

### Prerequisites

- Node.js ≥ 20
- pnpm or npm
- Supabase CLI (`brew install supabase/tap/supabase`)
- Deno (for Edge Function local dev)

### First-time setup

```bash
npm install
cp .env.example .env.local                    # fill in secrets — NEVER commit
supabase start                                 # local Postgres + Edge runtime
supabase db reset                              # apply migrations
npm run dev                                    # Vite dev server
```

### Common commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript check (no emit) |
| `npm run lint` | ESLint |
| `supabase db reset` | Reapply all migrations to local DB |
| `supabase functions serve autotask-sync` | Run sync function locally |
| `supabase functions deploy autotask-sync` | Deploy sync function |

---

## Environment variables

See `.env.example` for the full list. Categories:

- **Clerk:** `VITE_CLERK_PUBLISHABLE_KEY` (frontend), `CLERK_SECRET_KEY` (Edge Functions only).
- **Supabase:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (frontend), `SUPABASE_SERVICE_ROLE_KEY` (Edge Functions only — never ship to client).
- **Autotask:** `AUTOTASK_API_URL`, `AUTOTASK_USERNAME`, `AUTOTASK_SECRET`, `AUTOTASK_INTEGRATION_CODE` — credentials for the dedicated `imixservice-project` service principal.
- **PostHog:** `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST`.

`VITE_*` variables are bundled into the client. Anything sensitive must NOT use the `VITE_` prefix.

---

## Tier 2 security controls

Tier 2 applies because this product handles employee PII (names, schedules, utilization, project assignments). The full Tier 2 control list lives in `security-framework.md`; what follows is the project-specific application.

### Authentication & access
- **All routes require authentication.** Clerk middleware blocks anonymous access at the app shell.
- **Identity source:** IMIX M365 SSO into Clerk. No Clerk-native sign-up.
- **Authorization model in v1:**
  - All authenticated users in v1 are PS managers with full read + override-edit + admin rights.
  - Role enforcement is implemented at the Supabase RLS layer (not just UI), so future role splits (e.g., resources seeing only their own row) are an additive change.

### Data handling
- **Encryption in transit:** HTTPS everywhere (Railway + Supabase default).
- **Encryption at rest:** Supabase default (AES-256).
- **PII minimization:** Only fields required for utilization computation are pulled from Autotask. Email/phone/address fields on resources are NOT synced.
- **No PII in logs.** Log resource IDs, never names. PostHog event payloads must not include names or email.

### Credentials
- **Dedicated Autotask service principal:** `imixservice-project` — read-only, scoped to Projects, Tasks, Resources, Schedule Entries, Time Entries.
- **Do NOT reuse** the existing `imixservice-fabric` credential.
- **Service-role keys** (Supabase, Clerk secret, Autotask) live only in Supabase Edge Function env or Railway server env — never bundled in the Vite client.

### Audit logging
- **`audit_log` table** records every override edit and every admin/settings change. Schema:
  - `actor_clerk_user_id`, `actor_email`, `action`, `entity_type`, `entity_id`, `before_jsonb`, `after_jsonb`, `created_at`.
- Writes happen in the same transaction as the change. RLS prevents non-admins from reading the log.

### Sync hardening
- Hourly sync runs as a scheduled Edge Function with a fixed runtime budget.
- Each run records to `sync_runs` (started_at, finished_at, status, entities_synced_counts, error_message).
- Failed sync alerts route to PostHog as captured exceptions.

---

## Conventions

### TypeScript
- `strict: true` in tsconfig.
- No `any` without an inline justification comment.
- Shared types between frontend and Edge Functions live in `src/lib/types.ts` and are imported by Deno via relative path.

### Database
- All migrations forward-only and numbered (`0001_…`, `0002_…`).
- All tables have `created_at` and `updated_at` (`timestamptz`, default `now()`).
- All Autotask mirror tables include `autotask_id` (the source PK) and `synced_at`.
- RLS is **on** for every table containing PII.

### Time
- Store all timestamps as `timestamptz` (UTC).
- Compute weekly buckets in `America/New_York`. Week starts Monday 00:00 ET.
- A helper function in Postgres (`week_start_et(timestamptz)`) is the single source of truth for bucketing.

### Commits
- Develop on `claude/build-imix-dashboard-4EgyF` until the pilot branch merges to `main`.
- Commit messages: imperative mood, focus on *why*.

---

## What this product is NOT

- Not a replacement for Autotask.
- Not a time-entry tool (read-only).
- Not customer-facing.
- Not mobile-first (desktop manager workflow).
- Not AI-powered in v1 (designed so a future AI surface — overload prediction, NL drilldown — can be added without re-architecting).

---

## Open items deferred to pilot

- Baseline measurement for "missed overload" incidents (G3).
- Whether PS resources should see their own row in v1.5 (currently managers-only).
- CSV export schema confirmation with Director of Ops + vCIO (the v1 consumers).
- Whether AI overload prediction is worth scoping for v2 once we have one full sprint of utilization history.
