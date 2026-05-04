/**
 * Deterministic dummy data for preview mode.
 * Generated from a seeded PRNG so the heatmap looks the same on every reload.
 *
 * NOT used when Clerk + Supabase are configured (production mode).
 */
import type {
  AiMessage,
  ContractType,
  Integration,
  PipelineProject,
  Project,
  ProjectRequiredSkill,
  Resource,
  ResourceSkill,
  ScheduleEntry,
  Skill,
  Task,
  UtilizationCell,
  UtilizationSnapshot,
  WeeklyOverride,
} from '../lib/types';

const FIRST_NAMES = ['Patrick', 'Tyler',   'Barend',  'Chris'];
const LAST_NAMES  = ['Winters', 'Barrick',  'Lotriet', 'Kaschak'];
const ROLES: Resource['app_role'][] = ['senior', 'engineer', 'principal', 'senior'];
const RATES   = [185, 155, 220, 185];
const TARGETS = [0.80, 0.80, 0.75, 0.80];

export const DUMMY_RESOURCES: Resource[] = FIRST_NAMES.map((first, i) => ({
  autotask_id: 1000 + i,
  first_name: first,
  last_name: LAST_NAMES[i] ?? 'Unknown',
  is_active: true,
  department: 'Professional Services',
  weekly_capacity_hours: 40,
  target_billable_pct: TARGETS[i] ?? 0.75,
  blended_rate: RATES[i] ?? 175,
  app_role: ROLES[i] ?? 'engineer',
}));

// Real active projects from the IMIX export. All currently T&M / $0 contract
// value per the source data — the Projects margin column will read "T&M" for
// these. Add a contract_value if you want margin math on a specific row.
const ACTIVE_PROJECTS_RAW = [
  // status: New
  { id: 7001, name: 'Furniture First - Q2 MFA on Workstations',           account: 'Furniture First',                              start: '2026-04-01', budget: 18.55, delivered: 0.47,  status: 'New' },
  { id: 7002, name: 'Homeland at Home - Q2 MFA for Workstations',         account: 'Homeland at Home',                             start: '2026-04-01', budget: 18.55, delivered: 0.48,  status: 'New' },
  { id: 7003, name: 'Homeland at Home - Q2 Last Pass Implementation',     account: 'Homeland at Home',                             start: '2026-04-01', budget: 26.05, delivered: 0.37,  status: 'New' },
  { id: 7004, name: 'Homeland Center - Q2 MFA for Workstations',          account: 'Homeland Center',                              start: '2026-04-01', budget: 18.55, delivered: 0.45,  status: 'New' },
  { id: 7005, name: 'PA Options - Q2 MFA for Workstations',               account: 'PA Options for Wellness Inc',                  start: '2026-04-01', budget: 18.55, delivered: 0.48,  status: 'New' },
  { id: 7006, name: 'PDAA - Q2 Last Pass Implementation',                 account: 'Pennsylvania District Attorneys Assoc.',       start: '2026-04-01', budget: 18.55, delivered: 0.30,  status: 'New' },
  { id: 7007, name: 'CCW - Q3 Server Replacement',                        account: 'Cunningham, Chernicoff, & Warshawsky, P.C',    start: '2026-02-19', budget: 19.55, delivered: 2.72,  status: 'New' },
  { id: 7008, name: 'Capozzi - Q2 Hardening and Quarantine',              account: 'Capozzi Adler, PC',                            start: '2026-04-06', budget: 12.30, delivered: 1.35,  status: 'New' },
  // status: Planning - On Track
  { id: 7009, name: 'Driving Force - Allentown Acquistion',               account: 'Driving Force Collision - Allentown',          start: '2026-04-08', budget: 88.25, delivered: 12.53, status: 'Planning - On Track' },
  // status: Execution - On Track
  { id: 7010, name: 'TFEC - Q2 Last Pass Implementation',                 account: 'The Foundation for Enhancing Communities',     start: '2026-03-30', budget: 15.40, delivered: 4.88,  status: 'Execution - On Track' },
  { id: 7011, name: 'Capozzi Adler - Q2 Office Move Camp Hill',           account: 'Capozzi Adler, PC',                            start: '2026-03-02', budget: 23.00, delivered: 11.37, status: 'Execution - On Track' },
  { id: 7012, name: 'Capozzi Adler - Q1 Network Refresh',                 account: 'Capozzi Adler, PC',                            start: '2026-01-01', budget: 25.25, delivered: 6.80,  status: 'Execution - On Track' },
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

/** 13-week backward window for trend lines (last 90 days). */
export function getLast13Weeks(): string[] {
  const start = getMondayInET(new Date());
  return Array.from({ length: 13 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() - (13 - i) * 7);
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

// ─── ACTIVE PROJECTS ─────────────────────────────────────────────────────────
// committed_end_date is synthesized as start + max(60d, hours×4) so the burn
// math reads usefully — the Autotask end_date in the source data is a long
// contract horizon (often 9/2027), not an expected delivery date.
export const DUMMY_ACTIVE_PROJECTS: Project[] = ACTIVE_PROJECTS_RAW.map((p, i) => {
  const start = new Date(p.start);
  const deliveryDays = Math.max(60, Math.round(p.budget * 4));
  const committed = new Date(start);
  committed.setDate(start.getDate() + deliveryDays);
  return {
    autotask_id: p.id,
    name: p.name,
    status: p.status,
    account_id: i + 1,
    account_name: p.account,
    start_date: p.start,
    end_date: committed.toISOString().slice(0, 10),
    committed_end_date: committed.toISOString().slice(0, 10),
    estimated_hours: p.budget,
    budget_hours: p.budget,
    hours_delivered: p.delivered,
    contract_type: 'time_and_materials' as ContractType,
    contract_value: 0,
  };
});

export function generateUtilizationCells(): UtilizationCell[] {
  const weeks = getNext12Weeks();
  const cells: UtilizationCell[] = [];

  for (const resource of DUMMY_RESOURCES) {
    const rand = seeded(resource.autotask_id);
    const baseline = 0.6 + rand() * 0.55;

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

/** Historical snapshots — last 13 weeks of utilization per resource. */
export function generateHistoricalSnapshots(): UtilizationSnapshot[] {
  const weeks = getLast13Weeks();
  const out: UtilizationSnapshot[] = [];
  for (const resource of DUMMY_RESOURCES) {
    const rand = seeded(resource.autotask_id + 7777);
    const baseline = 0.65 + rand() * 0.4;
    for (let i = 0; i < weeks.length; i++) {
      const variance = (rand() - 0.5) * 0.35;
      const target = Math.max(0.1, baseline + variance);
      const scheduled = target * 40;
      const delivered = scheduled * (0.85 + rand() * 0.2); // actual ~85-105% of scheduled
      out.push({
        taken_on: weeks[i]!,
        resource_id: resource.autotask_id,
        week_start_et: weeks[i]!,
        scheduled_hours: Math.round(scheduled * 10) / 10,
        delivered_hours: Math.round(delivered * 10) / 10,
        capacity_hours: 40,
      });
    }
  }
  return out;
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
    const projectIdx = Math.floor(rand() * ACTIVE_PROJECTS_RAW.length);
    const project = ACTIVE_PROJECTS_RAW[projectIdx]!;
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
  const active = DUMMY_ACTIVE_PROJECTS.find((p) => p.autotask_id === projectId);
  if (active) return active.name;
  const pipeline = DUMMY_PIPELINE.find((p) => p.autotask_id === projectId);
  return pipeline?.name ?? `Project ${projectId}`;
}

export function taskTitle(taskId: number | null): string {
  if (taskId == null) return '(unassigned)';
  const idx = taskId % 100;
  return TASK_TITLES[idx] ?? `Task ${taskId}`;
}

export const DUMMY_OVERRIDES: WeeklyOverride[] = [
  // Pre-seed one pending approval to demonstrate the queue
  {
    id: 'seed-1',
    resource_id: 1003,
    week_start_et: getNext12Weeks()[6]!,
    pto_hours: 40,
    unavailable_hours: 0,
    note: 'Family vacation',
    approval_status: 'pending',
    requires_approval_reason: 'PTO > 40h triggers director approval',
  },
];

// ─── TASKS (for slip risk) ───────────────────────────────────────────────────
export const DUMMY_TASKS: Task[] = (() => {
  const out: Task[] = [];
  let taskId = 60000;
  for (const proj of DUMMY_ACTIVE_PROJECTS) {
    const rand = seeded(proj.autotask_id);
    const taskCount = 4 + Math.floor(rand() * 4);
    for (let i = 0; i < taskCount; i++) {
      const dueOffset = Math.floor((rand() - 0.3) * 60);
      const due = new Date();
      due.setDate(due.getDate() + dueOffset);
      const isOverdue = dueOffset < 0 && rand() < 0.6;
      out.push({
        autotask_id: taskId++,
        project_id: proj.autotask_id,
        title: TASK_TITLES[i % TASK_TITLES.length]!,
        assigned_resource_id: DUMMY_RESOURCES[i % DUMMY_RESOURCES.length]!.autotask_id,
        estimated_hours: Math.round(8 + rand() * 32),
        status: isOverdue ? 'In Progress' : rand() < 0.3 ? 'Complete' : 'In Progress',
        due_date: due.toISOString().slice(0, 10),
        is_overdue: isOverdue,
      });
    }
  }
  return out;
})();

// ─── SKILLS ──────────────────────────────────────────────────────────────────
export const DUMMY_SKILLS: Skill[] = [
  { id: 'sk-m365',     name: 'Microsoft 365',           category: 'Microsoft 365' },
  { id: 'sk-exchange', name: 'Exchange Online',         category: 'Microsoft 365' },
  { id: 'sk-teams',    name: 'Teams Voice',             category: 'Microsoft 365' },
  { id: 'sk-ad',       name: 'Active Directory / Entra', category: 'Identity' },
  { id: 'sk-sso',      name: 'SSO / SAML',              category: 'Identity' },
  { id: 'sk-cisco',    name: 'Cisco Routing/Switching', category: 'Networking' },
  { id: 'sk-meraki',   name: 'Meraki SD-WAN',           category: 'Networking' },
  { id: 'sk-fw',       name: 'Firewall (Palo / Fortinet)', category: 'Security' },
  { id: 'sk-soc',      name: 'SOC Monitoring',          category: 'Security' },
  { id: 'sk-azure',    name: 'Azure',                   category: 'Cloud' },
  { id: 'sk-aws',      name: 'AWS',                     category: 'Cloud' },
  { id: 'sk-veeam',    name: 'Veeam',                   category: 'Backup' },
  { id: 'sk-intune',   name: 'Intune / MDM',            category: 'Endpoint' },
];

// 1000 Patrick Winters — senior · M365 + Exchange + Azure + AD generalist
// 1001 Tyler Barrick    — engineer · network + security focus
// 1002 Barend Lotriet   — principal · cloud / infrastructure
// 1003 Chris Kaschak    — senior · endpoint + M365 + identity
const SKILL_DISTRIBUTIONS: Record<number, Array<[string, ResourceSkill['proficiency'], boolean]>> = {
  1000: [['sk-m365','expert',true],     ['sk-exchange','expert',true], ['sk-ad','proficient',true],   ['sk-azure','proficient',true]],
  1001: [['sk-cisco','expert',true],    ['sk-meraki','expert',true],   ['sk-fw','expert',true],       ['sk-soc','proficient',true]],
  1002: [['sk-azure','expert',true],    ['sk-aws','expert',true],      ['sk-ad','expert',true],       ['sk-veeam','proficient',true]],
  1003: [['sk-m365','expert',true],     ['sk-intune','expert',true],   ['sk-teams','proficient',true], ['sk-ad','proficient',false]],
};

export const DUMMY_RESOURCE_SKILLS: ResourceSkill[] = Object.entries(SKILL_DISTRIBUTIONS).flatMap(
  ([rid, skills]) =>
    skills.map(([skill_id, proficiency, certified]) => {
      const expires = certified ? new Date() : null;
      if (expires) expires.setMonth(expires.getMonth() + 3 + Math.floor(Math.random() * 18));
      return {
        resource_id: Number(rid),
        skill_id,
        proficiency,
        certified,
        cert_expires_on: expires ? expires.toISOString().slice(0, 10) : undefined,
      };
    }),
);

// Required skills derived from project name keywords. Weight 1.0 = primary,
// 0.5–0.7 = supporting capability. Project IDs match the IMIX export.
export const DUMMY_PROJECT_REQUIRED_SKILLS: ProjectRequiredSkill[] = [
  // Active — MFA on Workstations (M365 + AD)
  { project_id: 7001, skill_id: 'sk-m365', weight: 1.0 }, { project_id: 7001, skill_id: 'sk-ad',     weight: 0.7 },
  { project_id: 7002, skill_id: 'sk-m365', weight: 1.0 }, { project_id: 7002, skill_id: 'sk-ad',     weight: 0.7 },
  { project_id: 7004, skill_id: 'sk-m365', weight: 1.0 }, { project_id: 7004, skill_id: 'sk-ad',     weight: 0.7 },
  { project_id: 7005, skill_id: 'sk-m365', weight: 1.0 }, { project_id: 7005, skill_id: 'sk-ad',     weight: 0.7 },
  // Active — Last Pass Implementation (M365 + Intune)
  { project_id: 7003, skill_id: 'sk-m365', weight: 1.0 }, { project_id: 7003, skill_id: 'sk-intune', weight: 0.7 },
  { project_id: 7006, skill_id: 'sk-m365', weight: 1.0 }, { project_id: 7006, skill_id: 'sk-intune', weight: 0.7 },
  { project_id: 7010, skill_id: 'sk-m365', weight: 1.0 }, { project_id: 7010, skill_id: 'sk-intune', weight: 0.7 },
  // Active — Server Replacement
  { project_id: 7007, skill_id: 'sk-ad',    weight: 1.0 }, { project_id: 7007, skill_id: 'sk-azure', weight: 0.6 },
  // Active — Hardening / Quarantine
  { project_id: 7008, skill_id: 'sk-fw',    weight: 1.0 }, { project_id: 7008, skill_id: 'sk-soc',   weight: 0.7 },
  // Active — Acquisition (broad)
  { project_id: 7009, skill_id: 'sk-m365',  weight: 1.0 }, { project_id: 7009, skill_id: 'sk-ad',    weight: 1.0 }, { project_id: 7009, skill_id: 'sk-azure', weight: 0.7 }, { project_id: 7009, skill_id: 'sk-cisco', weight: 0.7 },
  // Active — Office Move (network)
  { project_id: 7011, skill_id: 'sk-cisco', weight: 1.0 }, { project_id: 7011, skill_id: 'sk-meraki', weight: 0.7 },
  // Active — Network Refresh
  { project_id: 7012, skill_id: 'sk-cisco', weight: 1.0 }, { project_id: 7012, skill_id: 'sk-meraki', weight: 0.7 },

  // Pipeline — Last Pass / Compliance
  { project_id: 8001, skill_id: 'sk-m365',  weight: 1.0 }, { project_id: 8001, skill_id: 'sk-intune', weight: 0.7 },
  { project_id: 8009, skill_id: 'sk-soc',   weight: 1.0 }, { project_id: 8009, skill_id: 'sk-fw',    weight: 0.7 },
  // Pipeline — Azure / Cloud
  { project_id: 8002, skill_id: 'sk-azure', weight: 1.0 },
  { project_id: 8006, skill_id: 'sk-azure', weight: 1.0 },
  // Pipeline — MFA / Network
  { project_id: 8003, skill_id: 'sk-fw',    weight: 1.0 }, { project_id: 8003, skill_id: 'sk-ad',    weight: 0.7 },
  { project_id: 8004, skill_id: 'sk-cisco', weight: 1.0 }, { project_id: 8004, skill_id: 'sk-meraki', weight: 0.7 },
  { project_id: 8005, skill_id: 'sk-m365',  weight: 1.0 }, { project_id: 8005, skill_id: 'sk-ad',    weight: 0.7 },
  // Pipeline — Office / Endpoint discovery
  { project_id: 8007, skill_id: 'sk-cisco', weight: 1.0 }, { project_id: 8007, skill_id: 'sk-meraki', weight: 0.7 },
  { project_id: 8008, skill_id: 'sk-intune', weight: 1.0 }, { project_id: 8008, skill_id: 'sk-ad',    weight: 0.7 },
  // Pipeline — Network refresh
  { project_id: 8010, skill_id: 'sk-cisco', weight: 1.0 }, { project_id: 8010, skill_id: 'sk-meraki', weight: 0.7 },
  { project_id: 8011, skill_id: 'sk-cisco', weight: 1.0 }, { project_id: 8011, skill_id: 'sk-meraki', weight: 0.7 },
  // Pipeline — MDM / Migration
  { project_id: 8012, skill_id: 'sk-intune', weight: 1.0 },
  { project_id: 8013, skill_id: 'sk-azure',  weight: 1.0 }, { project_id: 8013, skill_id: 'sk-ad',    weight: 0.7 },
  { project_id: 8014, skill_id: 'sk-m365',  weight: 1.0 }, { project_id: 8014, skill_id: 'sk-exchange', weight: 0.7 },
  { project_id: 8015, skill_id: 'sk-m365',  weight: 1.0 }, { project_id: 8015, skill_id: 'sk-ad',    weight: 0.7 }, { project_id: 8015, skill_id: 'sk-cisco', weight: 0.5 },
];

export const DUMMY_SYNC_RUNS = [
  { id: 'r1', started_at: hoursAgo(0), status: 'success', resources: 4, projects: 31, tasks: 178, schedule_entries: 612, time_entries: 482 },
  { id: 'r2', started_at: hoursAgo(1), status: 'success', resources: 4, projects: 31, tasks: 178, schedule_entries: 612, time_entries: 481 },
  { id: 'r3', started_at: hoursAgo(2), status: 'success', resources: 4, projects: 31, tasks: 177, schedule_entries: 611, time_entries: 480 },
  { id: 'r4', started_at: hoursAgo(3), status: 'partial', resources: 4, projects: 31, tasks: 177, schedule_entries: 0, time_entries: 0 },
  { id: 'r5', started_at: hoursAgo(4), status: 'success', resources: 4, projects: 31, tasks: 176, schedule_entries: 608, time_entries: 478 },
];

function hoursAgo(h: number): string {
  const d = new Date();
  d.setHours(d.getHours() - h);
  return d.toISOString();
}

export const DUMMY_STATUS_MAPPINGS = [
  // Active statuses observed in the IMIX export
  { entity_type: 'project', autotask_status: 'New',                    app_bucket: 'active',   counts_toward_utilization: true },
  { entity_type: 'project', autotask_status: 'Planning - On Track',    app_bucket: 'active',   counts_toward_utilization: true },
  { entity_type: 'project', autotask_status: 'Execution - On Track',   app_bucket: 'active',   counts_toward_utilization: true },
  { entity_type: 'project', autotask_status: 'In Progress',            app_bucket: 'active',   counts_toward_utilization: true },
  // Pipeline statuses
  { entity_type: 'project', autotask_status: 'On Hold',                app_bucket: 'pipeline', counts_toward_utilization: false },
  { entity_type: 'project', autotask_status: 'Opportunity - On Track', app_bucket: 'pipeline', counts_toward_utilization: false },
  { entity_type: 'project', autotask_status: 'Opportunity - Off Track',app_bucket: 'pipeline', counts_toward_utilization: false },
  { entity_type: 'project', autotask_status: 'Discovery',              app_bucket: 'pipeline', counts_toward_utilization: false },
  // Complete
  { entity_type: 'project', autotask_status: 'Complete',               app_bucket: 'complete', counts_toward_utilization: false },
  // Tasks
  { entity_type: 'task',    autotask_status: 'In Progress',            app_bucket: 'active',   counts_toward_utilization: true },
  { entity_type: 'task',    autotask_status: 'Waiting on Customer',    app_bucket: 'inactive', counts_toward_utilization: false },
  { entity_type: 'task',    autotask_status: 'Complete',               app_bucket: 'complete', counts_toward_utilization: false },
];

function monthOffset(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + months, 1);
  return d.toISOString().slice(0, 7);
}

// Real pipeline projects from the IMIX export — On Hold + Opportunity statuses.
// contract_value is synthesized at $185/hr so the revenue forecast has signal;
// override per project if the real number is known.
// win_probability is derived from status: On Hold = 0.40, Opportunity = 0.70.
// target_month is anchored to the current month for past-start projects so
// they show up in the rolling 3-month forecast (these need re-engagement now,
// not "in their original planned month, 6 months ago").
function pipelineEntry(p: {
  id: number;
  name: string;
  account: string;
  status: PipelineProject['status'];
  budget: number;
  delivered: number;
  start: string;
  next_action?: string;
  last_contact_days_ago: number;
  target_month_offset: 0 | 1 | 2;
}): PipelineProject {
  const winProb = p.status === 'Opportunity - On Track' ? 0.70 : 0.40;
  const synthValue = Math.round(p.budget * 185);
  return {
    autotask_id: p.id,
    name: p.name,
    account_id: p.id,
    account_name: p.account,
    status: p.status,
    estimated_hours: p.budget,
    budget_hours: p.budget,
    hours_delivered: p.delivered,
    start_date: p.start,
    end_date: null,
    committed_end_date: null,
    contract_type: 'time_and_materials',
    contract_value: synthValue,
    target_month: monthOffset(p.target_month_offset),
    next_action: p.next_action,
    last_client_contact: daysAgo(p.last_contact_days_ago),
    win_probability: winProb,
  };
}

export const DUMMY_PIPELINE: PipelineProject[] = [
  // ── On Hold ───────────────────────────────────────────────────────────────
  pipelineEntry({ id: 8001, name: 'PA Options - Q2 Last Pass',                     account: 'PA Options for Wellness Inc',                  status: 'On Hold', budget: 17.40, delivered: 4.25,  start: '2026-03-30', next_action: 'Confirm timeline with client',           last_contact_days_ago: 5,  target_month_offset: 0 }),
  pipelineEntry({ id: 8002, name: 'Capozzi Adler - Q3 Azure Discovery',            account: 'Capozzi Adler, PC',                            status: 'On Hold', budget: 19.55, delivered: 2.13,  start: '2026-01-01', next_action: 'Schedule discovery workshop',            last_contact_days_ago: 49, target_month_offset: 0 }),
  pipelineEntry({ id: 8003, name: 'PBA - Q1 MFA on VPN/Servers',                   account: 'Pennsylvania Builders Association',            status: 'On Hold', budget: 19.55, delivered: 0.50,  start: '2026-01-01', next_action: 'Awaiting client maintenance window',     last_contact_days_ago: 70, target_month_offset: 1 }),
  pipelineEntry({ id: 8004, name: 'PBA - Q1 Network Refresh',                      account: 'Pennsylvania Builders Association',            status: 'On Hold', budget: 19.55, delivered: 1.12,  start: '2026-01-01', next_action: 'Hardware procurement decision pending',  last_contact_days_ago: 70, target_month_offset: 1 }),
  pipelineEntry({ id: 8005, name: 'PDAA - Q1 MFA on Workstations',                 account: 'Pennsylvania District Attorneys Assoc.',       status: 'On Hold', budget: 18.55, delivered: 0.75,  start: '2026-01-01', next_action: 'Re-engage on rollout schedule',          last_contact_days_ago: 100, target_month_offset: 0 }),
  pipelineEntry({ id: 8006, name: 'Zimmerman - Q1 Serverless Migration',           account: 'Zimmerman Plumbing and Heating',               status: 'On Hold', budget: 15.55, delivered: 1.95,  start: '2026-01-01', next_action: 'Confirm Azure subscription readiness',   last_contact_days_ago: 4,  target_month_offset: 0 }),
  pipelineEntry({ id: 8007, name: 'M2 - Office Renovation',                        account: 'M2 Construction, LLC',                         status: 'On Hold', budget: 22.25, delivered: 11.93, start: '2026-01-08', next_action: 'Construction completion gating cutover', last_contact_days_ago: 28, target_month_offset: 1 }),
  // ── Opportunity - On Track ────────────────────────────────────────────────
  pipelineEntry({ id: 8008, name: 'Gift CPA - Q2 Intune and Entra Endpoint Discovery', account: 'Gift CPAs, LLC',                          status: 'Opportunity - On Track', budget: 19.55, delivered: 0.78, start: '2026-01-01', next_action: 'Discovery workshop scheduled',   last_contact_days_ago: 34, target_month_offset: 0 }),
  pipelineEntry({ id: 8009, name: 'PA Options - Q1 Compliance and Pen Testing',    account: 'PA Options for Wellness Inc',                  status: 'Opportunity - On Track', budget: 19.55, delivered: 0,    start: '2026-01-01', next_action: 'Send pen-test SOW for review',  last_contact_days_ago: 146, target_month_offset: 0 }),
  pipelineEntry({ id: 8010, name: 'RestoreCore - Q2 Network Refresh KOP',          account: 'RestoreCore',                                  status: 'Opportunity - On Track', budget: 18.55, delivered: 1.52, start: '2026-04-01', next_action: 'Awaiting site survey results',  last_contact_days_ago: 34, target_month_offset: 1 }),
  pipelineEntry({ id: 8011, name: 'CCW - Q2 Network Refresh',                      account: 'Cunningham, Chernicoff, & Warshawsky, P.C',    status: 'Opportunity - On Track', budget: 19.55, delivered: 9.50, start: '2026-03-05', next_action: 'Schedule cutover date',          last_contact_days_ago: 27, target_month_offset: 1 }),
  pipelineEntry({ id: 8012, name: 'MTMSA - Q2 MDM',                                account: 'Montgomery Township Municipal Sewer Authority', status: 'Opportunity - On Track', budget: 18.55, delivered: 4.77, start: '2026-02-03', next_action: 'Pilot device enrollment in flight', last_contact_days_ago: 0,  target_month_offset: 1 }),
  pipelineEntry({ id: 8013, name: 'AHEDD - Q2 AIMS Migration',                     account: 'AHEDD',                                        status: 'Opportunity - On Track', budget: 12.00, delivered: 1.67, start: '2026-04-02', next_action: 'Migration plan in client review', last_contact_days_ago: 26, target_month_offset: 1 }),
  pipelineEntry({ id: 8014, name: 'Mt. Cav - Q2 365 Migration',                    account: 'Mt. Calvary United Methodist Church',          status: 'Opportunity - On Track', budget: 12.30, delivered: 3.77, start: '2026-04-06', next_action: 'Tenant prep underway',           last_contact_days_ago: 3,  target_month_offset: 1 }),
  pipelineEntry({ id: 8015, name: 'DF Allentown - Entra/365 Migration/Network',    account: 'Driving Force Collision - Allentown',          status: 'Opportunity - On Track', budget: 12.30, delivered: 0,    start: '2026-04-10', next_action: 'Awaiting acquisition close',     last_contact_days_ago: 5,  target_month_offset: 2 }),
];

function daysAgo(d: number): string {
  const dt = new Date();
  dt.setDate(dt.getDate() - d);
  return dt.toISOString().slice(0, 10);
}

// ─── Integrations ────────────────────────────────────────────────────────────
export const DUMMY_INTEGRATIONS: Integration[] = [
  { id: 'microsoft_graph', status: 'unconfigured' },
  { id: 'resend',          status: 'unconfigured' },
  { id: 'anthropic',       status: 'unconfigured' },
];

// ─── AI canned responses ─────────────────────────────────────────────────────
// In production, /ai routes through Anthropic with tool definitions over the
// Postgres schema. For preview these are pattern-matched from the user query.
export function simulateAiResponse(query: string): AiMessage {
  const q = query.toLowerCase();
  const id = `m-${Date.now()}`;
  const created_at = new Date().toISOString();

  if (q.includes('summar') || q.includes('this week') || q.includes('what changed')) {
    return {
      id, role: 'assistant', created_at,
      content: [
        '**Capacity summary — week of ' + getNext12Weeks()[0] + '**',
        '',
        '• 2 engineers projected over 110% next 2 weeks (Patrick Winters, Barend Lotriet).',
        '• Driving Force - Allentown Acquisition is in planning at 14% hours / 22% task — on pace, but the largest open commitment (88h budget).',
        '• PA Options - Q1 Compliance and Pen Testing has had no client contact in 146 days. Push to close or kill.',
        '• M2 - Office Renovation is 53% hours / 39% task — burning ahead of timeline. Worth a check-in with Shawna.',
        '• 1 PTO request pending director approval (Chris Kaschak, 40h, week of ' + getNext12Weeks()[6] + ').',
      ].join('\n'),
    };
  }

  if (q.includes('60h') || q.includes('60 h') || q.includes('security') || q.includes('starting')) {
    return {
      id, role: 'assistant', created_at,
      content: [
        '**3 candidates for a 60h security project starting June 8:**',
        '',
        '1. **Tyler Barrick** — 22h slack across the window, expert in Firewall + SOC, certified.',
        '2. **Barend Lotriet** — 18h slack, expert in Azure + AD, also certified.',
        '3. **Patrick Winters** — has the skills (M365, Azure) but already at 105% — would require rebalancing.',
        '',
        'Want me to draft an allocation? *(Scheduler is v1.5 — preview only.)*',
      ].join('\n'),
    };
  }

  if (q.includes('overload') || q.includes('overbook') || q.includes('over 100')) {
    return {
      id, role: 'assistant', created_at,
      content: [
        '**Overbooked engineers (next 4 weeks):**',
        '',
        '• **Patrick Winters** — 122% week of ' + getNext12Weeks()[1] + ', driver: Capozzi Adler Q1 Network Refresh + 4 concurrent Q2 MFA rollouts.',
        '• **Barend Lotriet** — 118% week of ' + getNext12Weeks()[2] + ', driver: Driving Force Allentown Acquisition planning + Azure-touch projects.',
        '',
        'Suggested rebalancing: shift 8h of Q2 MFA documentation from Patrick to Chris Kaschak (M365 expert, current util 62%).',
      ].join('\n'),
    };
  }

  return {
    id, role: 'assistant', created_at,
    content:
      "I don't have enough context for that yet. In production I'll have tools over the Postgres " +
      'schema (resources, projects, schedule, overrides, snapshots) and can answer most capacity, ' +
      'project, and pipeline questions. Try: *"Summarize this week"*, *"Who has space for a 60h ' +
      'project starting June 8?"*, or *"Who is overbooked in the next 4 weeks?"*',
  };
}
