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

const ACTIVE_PROJECTS_RAW = [
  { id: 5001, name: 'Acme M365 Migration',         account: 'Acme Industries',   contract_type: 'fixed_fee',         budget_hours: 320, value: 56000, end: 22 },
  { id: 5002, name: 'Globex Security Hardening',   account: 'Globex Corp',       contract_type: 'time_and_materials', budget_hours: 180, value: 0,     end: 60 },
  { id: 5003, name: 'Initech Network Refresh',     account: 'Initech',           contract_type: 'fixed_fee',         budget_hours: 240, value: 42000, end: 45 },
  { id: 5004, name: 'Hooli Backup Modernization',  account: 'Hooli',             contract_type: 'time_and_materials', budget_hours: 200, value: 0,     end: 75 },
  { id: 5005, name: 'Pied Piper SharePoint Rollout', account: 'Pied Piper',      contract_type: 'fixed_fee',         budget_hours: 160, value: 28000, end: 30 },
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
export const DUMMY_ACTIVE_PROJECTS: Project[] = ACTIVE_PROJECTS_RAW.map((p, i) => {
  const rand = seeded(p.id);
  const consumed = Math.round(p.budget_hours * (0.3 + rand() * 0.6));
  const end = new Date();
  end.setDate(end.getDate() + p.end);
  return {
    autotask_id: p.id,
    name: p.name,
    status: 'In Progress',
    account_id: i + 1,
    account_name: p.account,
    start_date: daysAgo(60 - i * 10),
    end_date: end.toISOString().slice(0, 10),
    committed_end_date: end.toISOString().slice(0, 10),
    estimated_hours: p.budget_hours,
    budget_hours: p.budget_hours,
    hours_delivered: consumed,
    contract_type: p.contract_type as ContractType,
    contract_value: p.value,
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

export const DUMMY_PROJECT_REQUIRED_SKILLS: ProjectRequiredSkill[] = [
  { project_id: 5001, skill_id: 'sk-m365',     weight: 1.0 },
  { project_id: 5001, skill_id: 'sk-exchange', weight: 0.8 },
  { project_id: 5002, skill_id: 'sk-fw',       weight: 1.0 },
  { project_id: 5002, skill_id: 'sk-soc',      weight: 0.7 },
  { project_id: 5003, skill_id: 'sk-cisco',    weight: 1.0 },
  { project_id: 5003, skill_id: 'sk-meraki',   weight: 0.7 },
  { project_id: 5004, skill_id: 'sk-veeam',    weight: 1.0 },
  { project_id: 5004, skill_id: 'sk-azure',    weight: 0.6 },
  { project_id: 5005, skill_id: 'sk-m365',     weight: 1.0 },
  { project_id: 5005, skill_id: 'sk-ad',       weight: 0.5 },
  // Pipeline
  { project_id: 9001, skill_id: 'sk-ad',       weight: 1.0 },
  { project_id: 9001, skill_id: 'sk-sso',      weight: 1.0 },
  { project_id: 9001, skill_id: 'sk-azure',    weight: 0.7 },
  { project_id: 9002, skill_id: 'sk-veeam',    weight: 0.5 },
  { project_id: 9003, skill_id: 'sk-ad',       weight: 1.0 },
  { project_id: 9004, skill_id: 'sk-veeam',    weight: 1.0 },
  { project_id: 9005, skill_id: 'sk-m365',     weight: 1.0 },
  { project_id: 9006, skill_id: 'sk-cisco',    weight: 1.0 },
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

function monthOffset(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + months, 1);
  return d.toISOString().slice(0, 7);
}

export const DUMMY_PIPELINE: PipelineProject[] = [
  {
    autotask_id: 9001,
    name: 'Acme Phase 2 — Identity Modernization',
    account_id: 1, account_name: 'Acme Industries',
    status: 'Opportunity - On Track',
    estimated_hours: 240, budget_hours: 240, hours_delivered: 0,
    start_date: null, end_date: null, committed_end_date: null,
    contract_type: 'fixed_fee', contract_value: 42000,
    target_month: monthOffset(0),
    next_action: 'Send updated SOW',
    last_client_contact: daysAgo(4),
    win_probability: 0.75,
  },
  {
    autotask_id: 9002,
    name: 'Globex Server Refresh',
    account_id: 2, account_name: 'Globex Corp',
    status: 'On Hold',
    estimated_hours: 80, budget_hours: 80, hours_delivered: 0,
    start_date: null, end_date: null, committed_end_date: null,
    contract_type: 'time_and_materials', contract_value: 0,
    target_month: monthOffset(0),
    next_action: 'Re-engage CFO on budget',
    last_client_contact: daysAgo(21),
    win_probability: 0.30,
  },
  {
    autotask_id: 9003,
    name: 'Initech AD Migration',
    account_id: 3, account_name: 'Initech',
    status: 'Discovery',
    estimated_hours: 120, budget_hours: 120, hours_delivered: 0,
    start_date: null, end_date: null, committed_end_date: null,
    contract_type: 'fixed_fee', contract_value: 21000,
    target_month: monthOffset(1),
    next_action: 'Discovery workshop scheduled',
    last_client_contact: daysAgo(2),
    win_probability: 0.60,
  },
  {
    autotask_id: 9004,
    name: 'Hooli Backup Modernization (Phase 2)',
    account_id: 4, account_name: 'Hooli',
    status: 'Opportunity - Off Track',
    estimated_hours: 180, budget_hours: 180, hours_delivered: 0,
    start_date: null, end_date: null, committed_end_date: null,
    contract_type: 'time_and_materials', contract_value: 0,
    target_month: monthOffset(1),
    next_action: 'Need updated requirements from IT director',
    last_client_contact: daysAgo(31),
    win_probability: 0.20,
  },
  {
    autotask_id: 9005,
    name: 'Pied Piper M365 Tenant Build',
    account_id: 5, account_name: 'Pied Piper',
    status: 'Opportunity - On Track',
    estimated_hours: 160, budget_hours: 160, hours_delivered: 0,
    start_date: null, end_date: null, committed_end_date: null,
    contract_type: 'fixed_fee', contract_value: 28000,
    target_month: monthOffset(2),
    next_action: 'Awaiting executed MSA',
    last_client_contact: daysAgo(6),
    win_probability: 0.85,
  },
  {
    autotask_id: 9006,
    name: 'Acme Networking Refresh',
    account_id: 1, account_name: 'Acme Industries',
    status: 'On Hold',
    estimated_hours: 60, budget_hours: 60, hours_delivered: 0,
    start_date: null, end_date: null, committed_end_date: null,
    contract_type: 'time_and_materials', contract_value: 0,
    target_month: monthOffset(2),
    next_action: 'Hardware lead time blocking start',
    last_client_contact: daysAgo(12),
    win_probability: 0.40,
  },
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
        '• Pipeline coverage for the current month is **133%** — capacity is the bottleneck.',
        '• Globex Server Refresh has been on hold 21 days; CFO budget conversation is the open item.',
        '• Acme M365 Migration is at 75% of budget hours with ~3 weeks of timeline remaining (on pace).',
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
        '• **Patrick Winters** — 122% week of ' + getNext12Weeks()[1] + ', driver: Acme M365 cutover (28h).',
        '• **Barend Lotriet** — 118% week of ' + getNext12Weeks()[2] + ', driver: 3 concurrent Azure projects.',
        '',
        'Suggested rebalancing: move 8h of Acme documentation from Patrick to Chris Kaschak (current util 62%).',
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
