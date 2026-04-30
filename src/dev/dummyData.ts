/**
 * Deterministic dummy data for preview mode.
 * Generated from a seeded PRNG so the heatmap looks the same on every reload.
 *
 * NOT used when Clerk + Supabase are configured (production mode).
 */
import type {
  PipelineProject,
  Resource,
  ScheduleEntry,
  UtilizationCell,
  WeeklyOverride,
} from '../lib/types';

const FIRST_NAMES = ['Sarah', 'Marcus', 'Priya', 'James', 'Elena', 'David', 'Aisha', 'Tom'];
const LAST_NAMES = ['Chen', 'Rodriguez', 'Patel', 'Brennan', 'Vasquez', 'Kim', 'Okafor', 'Sullivan'];

export const DUMMY_RESOURCES: Resource[] = FIRST_NAMES.map((first, i) => ({
  autotask_id: 1000 + i,
  first_name: first,
  last_name: LAST_NAMES[i] ?? 'Unknown',
  is_active: true,
  department: 'Professional Services',
  weekly_capacity_hours: 40,
}));

const PROJECTS = [
  { id: 5001, name: 'Acme M365 Migration' },
  { id: 5002, name: 'Globex Security Hardening' },
  { id: 5003, name: 'Initech Network Refresh' },
  { id: 5004, name: 'Hooli Backup Modernization' },
  { id: 5005, name: 'Pied Piper SharePoint Rollout' },
];

const TASK_TITLES = [
  'Discovery & assessment',
  'Implementation phase 1',
  'Implementation phase 2',
  'Cutover planning',
  'Documentation & handoff',
  'Client training',
  'Post-go-live support',
];

function getMondayInET(d: Date): Date {
  // Approximation suitable for preview. Production code uses week_start_et()
  // in Postgres which is the source of truth.
  const dayOfWeek = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((dayOfWeek + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function getNext12Weeks(): string[] {
  const start = getMondayInET(new Date());
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i * 7);
    return d.toISOString().slice(0, 10);
  });
}

function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export function generateUtilizationCells(): UtilizationCell[] {
  const weeks = getNext12Weeks();
  const cells: UtilizationCell[] = [];

  for (const resource of DUMMY_RESOURCES) {
    const rand = seeded(resource.autotask_id);
    const baseline = 0.6 + rand() * 0.55; // 60%–115% personal tendency

    for (let weekIdx = 0; weekIdx < weeks.length; weekIdx++) {
      const week = weeks[weekIdx]!;
      const variance = (rand() - 0.5) * 0.45;
      const target = Math.max(0.1, baseline + variance);
      const capacity = 40;
      const unavailable = rand() < 0.08 ? 8 : 0;
      const pto = rand() < 0.05 ? 16 : 0;
      const denom = Math.max(0.1, capacity - unavailable - pto);
      const scheduled = target * denom;

      cells.push({
        resource_id: resource.autotask_id,
        week_start_et: week,
        scheduled_hours: Math.round(scheduled * 10) / 10,
        pto_hours: pto,
        unavailable_hours: unavailable,
        weekly_capacity_hours: capacity,
      });
    }
  }
  return cells;
}

export function generateScheduleEntriesFor(
  resourceId: number,
  weekStart: string,
  totalHours: number,
): ScheduleEntry[] {
  const rand = seeded(resourceId * 100000 + Date.parse(weekStart));
  const entries: ScheduleEntry[] = [];
  let remaining = totalHours;
  let entryId = resourceId * 1000;
  const start = new Date(weekStart);

  while (remaining > 0.1) {
    const projectIdx = Math.floor(rand() * PROJECTS.length);
    const project = PROJECTS[projectIdx]!;
    const taskIdx = Math.floor(rand() * TASK_TITLES.length);
    const dayOffset = Math.floor(rand() * 5);
    const hours = Math.min(remaining, Math.round((1 + rand() * 5) * 10) / 10);

    const entryStart = new Date(start);
    entryStart.setDate(start.getDate() + dayOffset);
    entryStart.setHours(9, 0, 0, 0);
    const entryEnd = new Date(entryStart);
    entryEnd.setHours(entryStart.getHours() + Math.ceil(hours));

    entries.push({
      autotask_id: entryId++,
      resource_id: resourceId,
      task_id: project.id * 100 + taskIdx,
      project_id: project.id,
      start_at: entryStart.toISOString(),
      end_at: entryEnd.toISOString(),
      hours,
    });

    remaining -= hours;
  }

  return entries;
}

/** All schedule entries across all PS resources and all 12 visible weeks. */
export function generateAllScheduleEntries(): ScheduleEntry[] {
  const cells = generateUtilizationCells();
  const all: ScheduleEntry[] = [];
  for (const cell of cells) {
    if (cell.scheduled_hours <= 0) continue;
    all.push(
      ...generateScheduleEntriesFor(cell.resource_id, cell.week_start_et, cell.scheduled_hours),
    );
  }
  return all;
}

export function projectName(projectId: number | null): string {
  if (projectId == null) return '(no project)';
  return PROJECTS.find((p) => p.id === projectId)?.name ?? `Project ${projectId}`;
}

export function taskTitle(taskId: number | null): string {
  if (taskId == null) return '(unassigned)';
  const idx = taskId % 100;
  return TASK_TITLES[idx] ?? `Task ${taskId}`;
}

export const DUMMY_OVERRIDES: WeeklyOverride[] = [];

export const DUMMY_SYNC_RUNS = [
  { id: 'r1', started_at: hoursAgo(0), status: 'success', resources: 14, projects: 47, tasks: 312, schedule_entries: 1184, time_entries: 902 },
  { id: 'r2', started_at: hoursAgo(1), status: 'success', resources: 14, projects: 47, tasks: 312, schedule_entries: 1184, time_entries: 901 },
  { id: 'r3', started_at: hoursAgo(2), status: 'success', resources: 14, projects: 47, tasks: 311, schedule_entries: 1183, time_entries: 900 },
  { id: 'r4', started_at: hoursAgo(3), status: 'partial', resources: 14, projects: 47, tasks: 311, schedule_entries: 0, time_entries: 0 },
  { id: 'r5', started_at: hoursAgo(4), status: 'success', resources: 14, projects: 47, tasks: 310, schedule_entries: 1180, time_entries: 898 },
];

function hoursAgo(h: number): string {
  const d = new Date();
  d.setHours(d.getHours() - h);
  return d.toISOString();
}

export const DUMMY_STATUS_MAPPINGS = [
  { entity_type: 'project', autotask_status: 'In Progress',            app_bucket: 'active',   counts_toward_utilization: true },
  { entity_type: 'project', autotask_status: 'On Hold',                app_bucket: 'pipeline', counts_toward_utilization: false },
  { entity_type: 'project', autotask_status: 'Opportunity - On Track', app_bucket: 'pipeline', counts_toward_utilization: false },
  { entity_type: 'project', autotask_status: 'Opportunity - Off Track',app_bucket: 'pipeline', counts_toward_utilization: false },
  { entity_type: 'project', autotask_status: 'Discovery',              app_bucket: 'pipeline', counts_toward_utilization: false },
  { entity_type: 'project', autotask_status: 'Complete',               app_bucket: 'complete', counts_toward_utilization: false },
  { entity_type: 'task',    autotask_status: 'In Progress',            app_bucket: 'active',   counts_toward_utilization: true },
  { entity_type: 'task',    autotask_status: 'Waiting on Customer',    app_bucket: 'inactive', counts_toward_utilization: false },
  { entity_type: 'task',    autotask_status: 'Complete',               app_bucket: 'complete', counts_toward_utilization: false },
];

// ─── Pipeline projects (On Hold + Opportunity + Discovery) ──────────────────
// Target months are anchored to "today" so the forecast strip lines up
// regardless of when the preview is run.
function monthOffset(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + months, 1);
  return d.toISOString().slice(0, 7);
}

export const DUMMY_PIPELINE: PipelineProject[] = [
  {
    autotask_id: 9001,
    name: 'Acme Phase 2 — Identity Modernization',
    account_id: 1,
    account_name: 'Acme Industries',
    status: 'Opportunity - On Track',
    estimated_hours: 240,
    start_date: null,
    end_date: null,
    target_month: monthOffset(0),
    next_action: 'Send updated SOW',
    last_client_contact: daysAgo(4),
  },
  {
    autotask_id: 9002,
    name: 'Globex Server Refresh',
    account_id: 2,
    account_name: 'Globex Corp',
    status: 'On Hold',
    estimated_hours: 80,
    start_date: null,
    end_date: null,
    target_month: monthOffset(0),
    next_action: 'Re-engage CFO on budget',
    last_client_contact: daysAgo(21),
  },
  {
    autotask_id: 9003,
    name: 'Initech AD Migration',
    account_id: 3,
    account_name: 'Initech',
    status: 'Discovery',
    estimated_hours: 120,
    start_date: null,
    end_date: null,
    target_month: monthOffset(1),
    next_action: 'Discovery workshop scheduled',
    last_client_contact: daysAgo(2),
  },
  {
    autotask_id: 9004,
    name: 'Hooli Backup Modernization (Phase 2)',
    account_id: 4,
    account_name: 'Hooli',
    status: 'Opportunity - Off Track',
    estimated_hours: 180,
    start_date: null,
    end_date: null,
    target_month: monthOffset(1),
    next_action: 'Need updated requirements from IT director',
    last_client_contact: daysAgo(31),
  },
  {
    autotask_id: 9005,
    name: 'Pied Piper M365 Tenant Build',
    account_id: 5,
    account_name: 'Pied Piper',
    status: 'Opportunity - On Track',
    estimated_hours: 160,
    start_date: null,
    end_date: null,
    target_month: monthOffset(2),
    next_action: 'Awaiting executed MSA',
    last_client_contact: daysAgo(6),
  },
  {
    autotask_id: 9006,
    name: 'Acme Networking Refresh',
    account_id: 1,
    account_name: 'Acme Industries',
    status: 'On Hold',
    estimated_hours: 60,
    start_date: null,
    end_date: null,
    target_month: monthOffset(2),
    next_action: 'Hardware lead time blocking start',
    last_client_contact: daysAgo(12),
  },
];

function daysAgo(d: number): string {
  const dt = new Date();
  dt.setDate(dt.getDate() - d);
  return dt.toISOString().slice(0, 10);
}
