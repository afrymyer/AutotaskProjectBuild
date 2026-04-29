# Imix Projects — Build Plan

**Pilot kickoff:** 2026-05-13
**Today:** 2026-04-29
**Working days to pilot:** 10

This is an aggressive timeline. Scope is sized to fit by ruthlessly defending the v1 cut: heatmap + drilldown + overrides + admin + CSV. Anything else is post-pilot backlog (Section 5).

> Companion docs: [`../CLAUDE.md`](../CLAUDE.md) · [`architecture.md`](./architecture.md)

---

## 1. Milestones

### M1 — Foundations (Apr 29 – May 1, 3 days)

**Goal:** the rails are laid. A signed-in user lands on an empty heatmap shell that already enforces auth and reads from a real (empty) Supabase instance.

**Deliverables:**
- [ ] Supabase project provisioned (US region) and Clerk org provisioned with M365 SSO connection
- [ ] `imixservice-project` Autotask service principal provisioned (read-only, scoped to 5 entities)
- [ ] Railway project provisioned, env vars set, preview deploys working
- [ ] Repo scaffold (this branch) installs cleanly, `npm run dev` shows a Clerk sign-in screen
- [ ] Migration `0001_initial_schema.sql` applied to Supabase (all tables, RLS on, no data)
- [ ] PostHog project created, events flowing from local dev
- [ ] First-login bootstrap inserts `app_users` row with role `manager`

**Acceptance:** A team member signs in via M365 SSO on the Railway preview URL, lands on `/`, and sees an empty heatmap shell. PostHog shows `app_loaded`.

---

### M2 — Sync working end-to-end (May 4 – May 5, 2 days)

**Goal:** real Autotask data is in Postgres and refreshes every hour.

**Deliverables:**
- [ ] `supabase/functions/autotask-sync` pulls all 5 entities and upserts
- [ ] Pagination handled for each entity
- [ ] Pull windows respected (12-week forward window for schedule entries; 30-day backward for time entries)
- [ ] `sync_runs` row written for every run with per-entity counts
- [ ] PostHog events: `autotask_sync_completed`, `autotask_sync_failed`
- [ ] Hourly schedule registered (`0 * * * *`)
- [ ] Manual one-shot trigger documented in `CLAUDE.md`

**Acceptance:** Three consecutive hourly runs succeed against Autotask production with non-zero counts in every mirror table. `sync_runs` table shows three success rows.

---

### M3 — Heatmap + drilldown (May 6 – May 7, 2 days)

**Goal:** managers can see who's overbooked.

**Deliverables:**
- [ ] `utilization_weekly` view (migration `0002`)
- [ ] `/` heatmap page: rows = active PS resources, columns = next 12 weeks
- [ ] Cell colors per thresholds (<70 green / 70–90 yellow / 90–110 orange / >110 red)
- [ ] Cell click → `/resource/:id/week/:weekStart` drilldown
- [ ] Drilldown shows schedule entries grouped by project/task with hours
- [ ] PostHog: `heatmap_viewed`, `drilldown_opened`

**Acceptance:** A PS manager looks at the heatmap and can correctly identify a resource who is over 100% utilized in the next two weeks, clicks through, and sees the schedule entries explaining it.

---

### M4 — Override editor + admin + CSV (May 8 – May 11, 2 days, with weekend buffer)

**Goal:** the human-in-the-loop surfaces and the one export consumer flow.

**Deliverables:**
- [ ] `/overrides` table: resources × weeks, editable PTO hours and unavailable hours
- [ ] Override edits go through a Postgres function that writes `audit_log` in the same transaction
- [ ] `/admin` shows status mappings (editable), weekly capacity defaults (editable), and sync run history (read-only, last 20)
- [ ] Sync health banner on `/admin` (red if 3+ consecutive failures)
- [ ] `/export` CSV: per-resource per-week utilization for the next 12 weeks
- [ ] PostHog: `override_saved`, `csv_exported`

**Acceptance:** A manager sets PTO for one resource for next week, the heatmap cell color shifts as expected (denominator drops), and the audit log shows the edit with before/after values. CSV downloads with the agreed columns.

---

### M5 — Pilot prep (May 12, 1 day)

**Goal:** ready for users.

**Deliverables:**
- [ ] Production deploy on Railway (custom domain optional)
- [ ] Sync schedule running against production Supabase
- [ ] Manager users provisioned in Clerk (M365 SSO group membership confirmed)
- [ ] Quick-start one-pager (1 page, in `docs/pilot-guide.md`) for managers
- [ ] Baseline capture form: managers log "missed overload" incidents from the prior week (paper or Notion — out of app for v1)

**Acceptance:** All PS managers can sign in to production, see real heatmap data, and have read the one-pager.

---

### M6 — Pilot kickoff (May 13)

- [ ] 30-min walkthrough with the PS management team
- [ ] PostHog dashboard shared with stakeholders (DAU, heatmap views, override edits, CSV exports)
- [ ] Calendar invite for week-2 pilot retro

---

## 2. Critical path

```
M1 (3d) → M2 (2d) → M3 (2d) → M4 (2d) → M5 (1d)  ── M6 (kickoff)
                       │
                       └── M3 only depends on resources + schedule_entries, so it can start in parallel
                           with the back half of M2 if those entities are synced first.
```

The sync's pull order (resources → projects → tasks → schedule_entries → time_entries) is set to unblock M3 on the third pull, so frontend work can start before time_entries is fully wired.

---

## 3. Risk log

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `imixservice-project` provisioning takes longer than 1 day | M | Blocks M2 | Andy starts the credential request day 1 (Apr 29). Reuse `imixservice-fabric` *only* as a temporary local-dev fallback; do not deploy with it. |
| M365 → Clerk SSO config friction | M | Blocks M1 acceptance | Stand up Clerk dev with email/password as a fallback to unblock UI work; switch to M365 before M5. |
| Autotask API rate limits hit during initial backfill | L | Slows M2 | Backoff already baked in; first backfill run scheduled overnight. |
| Utilization computation edge cases (mid-week start dates, partial-week schedule entries) | H | UI shows wrong colors | Unit tests on `week_start_et` and the heatmap-color function before M3 ships. |
| Scope creep — someone asks for resource self-view, Slack alerts, etc. before pilot | H | Misses 2026-05-13 | Anything not in M1–M5 lands in §5 backlog. Decision authority: Andy. |
| Override semantics confusion (does PTO subtract from numerator or denominator?) | M | Wrong numbers shown | Locked in [`architecture.md`](./architecture.md#42-formula): PTO is a denominator reduction, not a numerator subtraction. |

---

## 4. Definition of done (pilot)

- All M1–M5 deliverables checked
- Authenticated access only, verified by attempting an unauthenticated request to `/api/*` and getting denied
- RLS verified by impersonating a non-`app_users` JWT and getting zero rows
- `audit_log` populated for at least 3 override edits and 1 status mapping change
- `sync_runs` shows ≥ 24 hours of consecutive successful hourly runs
- PostHog dashboard live with the seven core events
- One-pager exists and has been read by all pilot users

---

## 5. Post-pilot backlog (NOT in v1)

Captured here so they don't leak into the timeline.

- **Resource self-view** — PS resources see their own row only. Requires `app_users.linked_resource_id` matching + RLS row filter.
- **Variance reporting** — scheduled vs actual using `autotask_time_entries`.
- **Soft-delete reconciliation** — weekly full ID sweep to detect Autotask deletions.
- **AI overload prediction** — needs ≥ 1 sprint of utilization history; rescope after pilot week 2.
- **NL drilldown** — "Why is Sarah at 130% next week?" → Claude-generated explanation. Needs the AI scope decision.
- **Slack / Teams alerts** on sync failure or new ≥110% cell.
- **Mobile layout.**
- **Multi-tenant** — out of scope by definition (this is single-tenant IMIX-internal).
- **Recurring CSV email** to Director of Ops + vCIO.

---

## 6. Decisions log

Every meaningful trade-off lands here so future Claude Code sessions don't re-litigate them.

| Date | Decision | Rationale |
|---|---|---|
| 2026-04-29 | No AI in v1 | Confirmed by Andy; designed so future addition is non-invasive. |
| 2026-04-29 | New `imixservice-project` Autotask credential, not reuse of `imixservice-fabric` | Tier 2 + least-privilege. |
| 2026-04-29 | Clerk + IMIX M365 SSO; native Clerk sign-up disabled | Tier 2 identity boundary at IMIX SSO. |
| 2026-04-29 | All authenticated v1 users are managers; admin scope == managers in v1 | Andy: "either" — defaulting to broad admin in a small team. RLS structure supports narrowing later. |
| 2026-04-29 | PTO override is a denominator reduction (not numerator subtraction) | Avoids double-counting risk if PTO is also reflected in Autotask schedule entries. |
| 2026-04-29 | CSV export consumers: Director of Ops + vCIO | Drives schema for `/export`. Confirm exact columns at M4 kickoff. |
| 2026-04-29 | US-only Supabase region | Confirmed by Andy. |
| 2026-04-29 | IMIX-internal branding | Confirmed by Andy. |
