/**
 * Single read surface for the UI. In preview mode (no Clerk key) returns
 * deterministic dummy data; in production mode this is where Supabase
 * queries will be wired in M3.
 */
import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  DUMMY_ACTIVE_PROJECTS,
  DUMMY_INTEGRATIONS,
  DUMMY_OVERRIDES,
  DUMMY_PIPELINE,
  DUMMY_PROJECT_REQUIRED_SKILLS,
  DUMMY_RESOURCES,
  DUMMY_RESOURCE_SKILLS,
  DUMMY_SKILLS,
  DUMMY_STATUS_MAPPINGS,
  DUMMY_SYNC_RUNS,
  DUMMY_TASKS,
  generateAllScheduleEntries,
  generateHistoricalSnapshots,
  generateUtilizationCells,
  generateScheduleEntriesFor,
  getLast13Weeks,
  getNext12Weeks,
  simulateAiResponse,
} from '../dev/dummyData';
import type {
  AiMessage,
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
} from './types';

export const PREVIEW_MODE = !import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// PTO hours threshold above which an override needs director approval.
const APPROVAL_THRESHOLD_PTO_HOURS = 40;

export interface DashboardData {
  resources: Resource[];
  weeks: string[];
  cells: UtilizationCell[];
  overrides: WeeklyOverride[];
  saveOverride: (input: {
    resource_id: number;
    week_start_et: string;
    pto_hours: number;
    unavailable_hours: number;
    note?: string;
  }) => void;
  approveOverride: (id: string) => void;
  rejectOverride: (id: string) => void;
}

const overrideListeners = new Set<(o: WeeklyOverride[]) => void>();
let _overrides: WeeklyOverride[] = [...DUMMY_OVERRIDES];

function setOverridesGlobal(updater: (prev: WeeklyOverride[]) => WeeklyOverride[]) {
  _overrides = updater(_overrides);
  for (const l of overrideListeners) l(_overrides);
}

export function useDashboardData(): DashboardData {
  const baseCells = useMemo(() => generateUtilizationCells(), []);
  const weeks = useMemo(() => getNext12Weeks(), []);
  const [overrides, setOverrides] = useState<WeeklyOverride[]>(_overrides);

  // Subscribe to global override changes so /overrides, /approvals, /heatmap
  // all stay in sync within a single preview session.
  useEffect(() => {
    const listener = (o: WeeklyOverride[]) => setOverrides(o);
    overrideListeners.add(listener);
    return () => {
      overrideListeners.delete(listener);
    };
  }, []);

  const saveOverride = useCallback((input: {
    resource_id: number;
    week_start_et: string;
    pto_hours: number;
    unavailable_hours: number;
    note?: string;
  }) => {
    if (!PREVIEW_MODE) {
      console.warn('saveOverride: production mode not yet wired');
      return;
    }
    const requiresApproval = input.pto_hours > APPROVAL_THRESHOLD_PTO_HOURS;
    setOverridesGlobal((prev) => {
      const without = prev.filter(
        (o) => !(o.resource_id === input.resource_id && o.week_start_et === input.week_start_et),
      );
      return [
        ...without,
        {
          id: `${input.resource_id}-${input.week_start_et}`,
          resource_id: input.resource_id,
          week_start_et: input.week_start_et,
          pto_hours: input.pto_hours,
          unavailable_hours: input.unavailable_hours,
          note: input.note ?? null,
          approval_status: requiresApproval ? 'pending' : 'auto_approved',
          requires_approval_reason: requiresApproval
            ? `PTO > ${APPROVAL_THRESHOLD_PTO_HOURS}h triggers director approval`
            : undefined,
        },
      ];
    });
  }, []);

  const approveOverride = useCallback((id: string) => {
    setOverridesGlobal((prev) =>
      prev.map((o) =>
        o.id === id
          ? { ...o, approval_status: 'approved', approved_at: new Date().toISOString() }
          : o,
      ),
    );
  }, []);

  const rejectOverride = useCallback((id: string) => {
    setOverridesGlobal((prev) =>
      prev.map((o) => (o.id === id ? { ...o, approval_status: 'rejected' } : o)),
    );
  }, []);

  // Apply overrides on top of generated cells so the heatmap reflects edits live.
  // Only `approved` and `auto_approved` count toward the rendered heatmap; pending
  // edits don't shift the grid until a director signs off.
  const cells = useMemo(() => {
    const effective = overrides.filter(
      (o) => o.approval_status === 'approved' || o.approval_status === 'auto_approved',
    );
    if (effective.length === 0) return baseCells;
    const overrideMap = new Map(
      effective.map((o) => [`${o.resource_id}|${o.week_start_et}`, o]),
    );
    return baseCells.map((c) => {
      const o = overrideMap.get(`${c.resource_id}|${c.week_start_et}`);
      if (!o) return c;
      return { ...c, pto_hours: o.pto_hours, unavailable_hours: o.unavailable_hours };
    });
  }, [baseCells, overrides]);

  return {
    resources: DUMMY_RESOURCES,
    weeks,
    cells,
    overrides,
    saveOverride,
    approveOverride,
    rejectOverride,
  };
}

export function useDrilldownEntries(resourceId: number, weekStart: string): {
  entries: ScheduleEntry[];
  scheduledHours: number;
} {
  return useMemo(() => {
    const cells = generateUtilizationCells();
    const cell = cells.find(
      (c) => c.resource_id === resourceId && c.week_start_et === weekStart,
    );
    const scheduledHours = cell?.scheduled_hours ?? 0;
    const entries = generateScheduleEntriesFor(resourceId, weekStart, scheduledHours);
    return { entries, scheduledHours };
  }, [resourceId, weekStart]);
}

export function useAdminData() {
  return {
    syncRuns: DUMMY_SYNC_RUNS,
    statusMappings: DUMMY_STATUS_MAPPINGS,
    integrations: DUMMY_INTEGRATIONS as Integration[],
  };
}

export function utilizationPct(cell: UtilizationCell): number {
  const denom = Math.max(
    0.1,
    cell.weekly_capacity_hours - cell.unavailable_hours - cell.pto_hours,
  );
  return cell.scheduled_hours / denom;
}

// ─── Calendar (per-day team availability) ────────────────────────────────────

const FREE_THRESHOLD = 0.5;
const HOURS_PER_DAY = 8;

export interface DayCell {
  date: string;
  perResourceHours: Map<number, number>;
  freeCount: number;
  totalCount: number;
}

export function useCalendarData(monthOffset: number): {
  monthLabel: string;
  weeks: DayCell[][];
  resources: Resource[];
} {
  return useMemo(() => {
    const entries = generateAllScheduleEntries();
    const resources = DUMMY_RESOURCES;
    const totalCount = resources.length;

    const target = new Date();
    target.setDate(1);
    target.setMonth(target.getMonth() + monthOffset);
    const monthLabel = target.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const gridStart = new Date(target);
    gridStart.setDate(1 - target.getDay());

    const dayResourceHours = new Map<string, Map<number, number>>();
    for (const e of entries) {
      const d = new Date(e.start_at);
      const key = isoDate(d);
      const inner = dayResourceHours.get(key) ?? new Map<number, number>();
      inner.set(e.resource_id, (inner.get(e.resource_id) ?? 0) + e.hours);
      dayResourceHours.set(key, inner);
    }

    const weeks: DayCell[][] = [];
    for (let w = 0; w < 6; w++) {
      const week: DayCell[] = [];
      for (let d = 0; d < 7; d++) {
        const day = new Date(gridStart);
        day.setDate(gridStart.getDate() + w * 7 + d);
        const key = isoDate(day);
        const perResourceHours = dayResourceHours.get(key) ?? new Map<number, number>();
        let freeCount = 0;
        for (const r of resources) {
          const hours = perResourceHours.get(r.autotask_id) ?? 0;
          if (hours / HOURS_PER_DAY < FREE_THRESHOLD) freeCount++;
        }
        week.push({ date: key, perResourceHours, freeCount, totalCount });
      }
      weeks.push(week);
    }

    return { monthLabel, weeks, resources };
  }, [monthOffset]);
}

export function dayLoadBucket(hours: number): 'available' | 'light' | 'booked' | 'overbooked' {
  if (hours < HOURS_PER_DAY * 0.5) return 'available';
  if (hours < HOURS_PER_DAY * 0.75) return 'light';
  if (hours <= HOURS_PER_DAY) return 'booked';
  return 'overbooked';
}

export function dayCellColor(cell: DayCell): 'green' | 'yellow' | 'orange' | 'red' {
  const freeRatio = cell.freeCount / cell.totalCount;
  if (freeRatio >= 0.75) return 'green';
  if (freeRatio >= 0.5) return 'yellow';
  if (freeRatio >= 0.25) return 'orange';
  return 'red';
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ─── Pipeline (on-hold + opportunities + discovery) ──────────────────────────

export interface MonthForecast {
  month: string;
  label: string;
  freeHours: number;
  pipelineHoursWeighted: number;   // sum(est_hours × win_probability)
  pipelineHoursUnweighted: number; // sum(est_hours)
  coverageRatio: number;            // weighted / freeHours
}

export function usePipelineData(): {
  pipeline: PipelineProject[];
  forecast: MonthForecast[];
} {
  return useMemo(() => {
    const cells = generateUtilizationCells();
    const today = new Date();
    today.setDate(1);

    const months: MonthForecast[] = [];
    for (let i = 0; i < 3; i++) {
      const d = new Date(today);
      d.setMonth(today.getMonth() + i);
      const monthKey = d.toISOString().slice(0, 7);
      const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      let freeHours = 0;
      for (const cell of cells) {
        if (cell.week_start_et.slice(0, 7) !== monthKey) continue;
        const denom = Math.max(
          0,
          cell.weekly_capacity_hours - cell.unavailable_hours - cell.pto_hours,
        );
        freeHours += Math.max(0, denom - cell.scheduled_hours);
      }

      const monthPipeline = DUMMY_PIPELINE.filter((p) => p.target_month === monthKey);
      const pipelineHoursUnweighted = monthPipeline.reduce(
        (s, p) => s + p.estimated_hours,
        0,
      );
      const pipelineHoursWeighted = monthPipeline.reduce(
        (s, p) => s + p.estimated_hours * p.win_probability,
        0,
      );

      const coverageRatio =
        freeHours > 0 ? pipelineHoursWeighted / freeHours : Infinity;
      months.push({
        month: monthKey,
        label,
        freeHours: Math.round(freeHours),
        pipelineHoursWeighted: Math.round(pipelineHoursWeighted),
        pipelineHoursUnweighted: Math.round(pipelineHoursUnweighted),
        coverageRatio,
      });
    }

    return { pipeline: DUMMY_PIPELINE, forecast: months };
  }, []);
}

// ─── Active projects (margin, burn-vs-budget, slip risk) ─────────────────────

export interface ProjectHealth {
  project: Project;
  hoursDelivered: number;
  hoursBudgeted: number;
  hoursPctConsumed: number;
  timePctElapsed: number;
  burnRiskScore: number;        // > 0 means burning faster than time
  marginDollars: number | null; // fixed-fee only
  marginPct: number | null;
  daysUntilDue: number;
  overdueTaskCount: number;
  assignedResources: { resource_id: number; util_next_4w: number }[];
  slipReasons: string[];
  exposureFlag: boolean;        // committed end < 4 weeks AND assignee overloaded
}

export function useProjectsData(): {
  projects: ProjectHealth[];
  totals: {
    revenueAtRiskDollars: number;
    overdueTaskCount: number;
    fixedFeeMarginDollars: number;
  };
} {
  return useMemo(() => {
    const cells = generateUtilizationCells();
    const today = new Date();

    const utilByResourceWindow = new Map<number, number>();
    for (const c of cells) {
      const wk = new Date(c.week_start_et);
      const offset = (wk.getTime() - today.getTime()) / (7 * 24 * 3600 * 1000);
      if (offset < 0 || offset > 4) continue;
      const denom = Math.max(0.1, c.weekly_capacity_hours - c.unavailable_hours - c.pto_hours);
      const util = c.scheduled_hours / denom;
      const prev = utilByResourceWindow.get(c.resource_id);
      utilByResourceWindow.set(c.resource_id, Math.max(prev ?? 0, util));
    }

    const projects: ProjectHealth[] = DUMMY_ACTIVE_PROJECTS.map((p) => {
      const hoursPctConsumed = p.budget_hours > 0 ? p.hours_delivered / p.budget_hours : 0;

      const start = p.start_date ? new Date(p.start_date) : new Date();
      const end = p.committed_end_date ? new Date(p.committed_end_date) : new Date();
      const total = Math.max(1, (end.getTime() - start.getTime()) / (24 * 3600 * 1000));
      const elapsed = Math.max(0, (today.getTime() - start.getTime()) / (24 * 3600 * 1000));
      const timePctElapsed = Math.min(1, elapsed / total);
      const burnRiskScore = hoursPctConsumed - timePctElapsed;

      const daysUntilDue = Math.round((end.getTime() - today.getTime()) / (24 * 3600 * 1000));

      const projectTasks = DUMMY_TASKS.filter((t) => t.project_id === p.autotask_id);
      const overdueTaskCount = projectTasks.filter((t) => t.is_overdue).length;
      const assignedIds = Array.from(
        new Set(projectTasks.map((t) => t.assigned_resource_id).filter((x): x is number => x != null)),
      );
      const assignedResources = assignedIds.map((rid) => ({
        resource_id: rid,
        util_next_4w: utilByResourceWindow.get(rid) ?? 0,
      }));

      const slipReasons: string[] = [];
      if (burnRiskScore > 0.15) {
        slipReasons.push(
          `Burning faster than timeline (${pctStr(hoursPctConsumed)} hours / ${pctStr(timePctElapsed)} time)`,
        );
      }
      if (overdueTaskCount > 0) {
        slipReasons.push(`${overdueTaskCount} overdue task${overdueTaskCount === 1 ? '' : 's'}`);
      }
      if (assignedResources.some((r) => r.util_next_4w > 1.1)) {
        slipReasons.push('Assigned engineer overbooked next 4 weeks');
      }

      const exposureFlag =
        daysUntilDue >= 0 &&
        daysUntilDue <= 28 &&
        assignedResources.some((r) => r.util_next_4w > 1.1);

      let marginDollars: number | null = null;
      let marginPct: number | null = null;
      if (p.contract_type === 'fixed_fee' && p.contract_value > 0) {
        const hoursAtRisk = Math.max(p.hours_delivered, p.budget_hours);
        const blendedAvgRate = 175;
        const cost = hoursAtRisk * blendedAvgRate;
        marginDollars = p.contract_value - cost;
        marginPct = marginDollars / p.contract_value;
      }

      return {
        project: p,
        hoursDelivered: p.hours_delivered,
        hoursBudgeted: p.budget_hours,
        hoursPctConsumed,
        timePctElapsed,
        burnRiskScore,
        marginDollars,
        marginPct,
        daysUntilDue,
        overdueTaskCount,
        assignedResources,
        slipReasons,
        exposureFlag,
      };
    });

    const revenueAtRiskDollars = projects
      .filter((ph) => ph.exposureFlag)
      .reduce((s, ph) => s + ph.project.contract_value, 0);
    const overdueTaskCount = projects.reduce((s, ph) => s + ph.overdueTaskCount, 0);
    const fixedFeeMarginDollars = projects.reduce(
      (s, ph) => s + (ph.marginDollars ?? 0),
      0,
    );

    return {
      projects,
      totals: { revenueAtRiskDollars, overdueTaskCount, fixedFeeMarginDollars },
    };
  }, []);
}

function pctStr(n: number): string {
  return `${Math.round(n * 100)}%`;
}

// ─── Trends (90-day backward) ────────────────────────────────────────────────

export interface ResourceTrend {
  resource_id: number;
  weeks: { week: string; util: number; delivered: number; scheduled: number }[];
  avgUtil: number;
  avgVarianceVsTarget: number; // actual - target
}

export function useTrendsData(): {
  weeks: string[];
  trends: ResourceTrend[];
  teamWeeklyUtil: { week: string; util: number }[];
} {
  return useMemo(() => {
    const snaps: UtilizationSnapshot[] = generateHistoricalSnapshots();
    const weeks = getLast13Weeks();

    const trends: ResourceTrend[] = DUMMY_RESOURCES.map((r) => {
      const own = snaps.filter((s) => s.resource_id === r.autotask_id);
      const weeksOut = own.map((s) => ({
        week: s.week_start_et,
        util: s.scheduled_hours / s.capacity_hours,
        delivered: s.delivered_hours,
        scheduled: s.scheduled_hours,
      }));
      const avgUtil =
        weeksOut.reduce((s, w) => s + w.util, 0) / Math.max(1, weeksOut.length);
      return {
        resource_id: r.autotask_id,
        weeks: weeksOut,
        avgUtil,
        avgVarianceVsTarget: avgUtil - r.target_billable_pct,
      };
    });

    const teamWeeklyUtil = weeks.map((week) => {
      const wkSnaps = snaps.filter((s) => s.week_start_et === week);
      const totalCap = wkSnaps.reduce((s, x) => s + x.capacity_hours, 0);
      const totalSched = wkSnaps.reduce((s, x) => s + x.scheduled_hours, 0);
      return { week, util: totalCap > 0 ? totalSched / totalCap : 0 };
    });

    return { weeks, trends, teamWeeklyUtil };
  }, []);
}

// ─── Skills ─────────────────────────────────────────────────────────────────

export function useSkillsData(): {
  skills: Skill[];
  resources: Resource[];
  resourceSkills: ResourceSkill[];
  projectRequiredSkills: ProjectRequiredSkill[];
  expiringCertifications: ResourceSkill[];
} {
  return useMemo(() => {
    const today = new Date();
    const ninety = new Date();
    ninety.setDate(today.getDate() + 90);
    const expiringCertifications = DUMMY_RESOURCE_SKILLS.filter(
      (rs) =>
        rs.certified &&
        rs.cert_expires_on &&
        new Date(rs.cert_expires_on) <= ninety,
    );
    return {
      skills: DUMMY_SKILLS,
      resources: DUMMY_RESOURCES,
      resourceSkills: DUMMY_RESOURCE_SKILLS,
      projectRequiredSkills: DUMMY_PROJECT_REQUIRED_SKILLS,
      expiringCertifications,
    };
  }, []);
}

// ─── Personal forecast (Me) ─────────────────────────────────────────────────

export function usePersonalData(resourceId: number): {
  resource: Resource | undefined;
  cells: UtilizationCell[];
  weeks: string[];
  weeklyTrend: { week: string; util: number }[];
} {
  return useMemo(() => {
    const resource = DUMMY_RESOURCES.find((r) => r.autotask_id === resourceId);
    const cells = generateUtilizationCells().filter((c) => c.resource_id === resourceId);
    const trend = generateHistoricalSnapshots()
      .filter((s) => s.resource_id === resourceId)
      .map((s) => ({ week: s.week_start_et, util: s.scheduled_hours / s.capacity_hours }));
    return { resource, cells, weeks: getNext12Weeks(), weeklyTrend: trend };
  }, [resourceId]);
}

// ─── Rebalancing suggestions ────────────────────────────────────────────────

export interface RebalanceSuggestion {
  fromResourceId: number;
  toResourceId: number;
  weekStart: string;
  hoursMoved: number;
  reason: string;
}

export function useRebalanceSuggestions(): RebalanceSuggestion[] {
  return useMemo(() => {
    const cells = generateUtilizationCells();
    const byWeek = new Map<string, UtilizationCell[]>();
    for (const c of cells) {
      const arr = byWeek.get(c.week_start_et) ?? [];
      arr.push(c);
      byWeek.set(c.week_start_et, arr);
    }

    const suggestions: RebalanceSuggestion[] = [];
    for (const [week, weekCells] of byWeek) {
      // Sort overload (>110%) first, slack (<70%) ascending util.
      const overloaded = weekCells
        .map((c) => ({ c, util: utilizationPct(c) }))
        .filter((x) => x.util > 1.1)
        .sort((a, b) => b.util - a.util);
      const slack = weekCells
        .map((c) => ({ c, util: utilizationPct(c) }))
        .filter((x) => x.util < 0.7)
        .sort((a, b) => a.util - b.util);

      for (const over of overloaded) {
        const denom = Math.max(0.1, over.c.weekly_capacity_hours - over.c.unavailable_hours - over.c.pto_hours);
        const overflow = over.c.scheduled_hours - denom;
        if (overflow <= 0) continue;
        const candidate = slack[0];
        if (!candidate) continue;
        const candidateDenom = Math.max(0.1, candidate.c.weekly_capacity_hours - candidate.c.unavailable_hours - candidate.c.pto_hours);
        const candidateRoom = candidateDenom * 0.85 - candidate.c.scheduled_hours;
        if (candidateRoom <= 1) continue;
        const hoursMoved = Math.round(Math.min(overflow, candidateRoom) * 10) / 10;
        suggestions.push({
          fromResourceId: over.c.resource_id,
          toResourceId: candidate.c.resource_id,
          weekStart: week,
          hoursMoved,
          reason: `${pctStr(over.util)} → ${pctStr(candidate.util)} this week`,
        });
        if (suggestions.length >= 5) return suggestions;
      }
    }
    return suggestions;
  }, []);
}

// ─── AI assistant (simulated in preview) ────────────────────────────────────

export function useAi(): {
  history: AiMessage[];
  send: (query: string) => void;
  reset: () => void;
} {
  const [history, setHistory] = useState<AiMessage[]>([]);

  const send = useCallback((query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    const userMsg: AiMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: trimmed,
      created_at: new Date().toISOString(),
    };
    setHistory((prev) => [...prev, userMsg]);
    // Simulate latency.
    window.setTimeout(() => {
      const reply = simulateAiResponse(trimmed);
      setHistory((prev) => [...prev, reply]);
    }, 350);
  }, []);

  const reset = useCallback(() => setHistory([]), []);
  return { history, send, reset };
}

// ─── Utility: identity for "Me" view ─────────────────────────────────────────

export function useMockIdentity(): {
  resourceId: number;
  setResourceId: (id: number) => void;
} {
  // In production this is auth.jwt() -> app_users.linked_resource_id.
  // In preview we let the user pick which engineer they're "logged in as".
  const [resourceId, setResourceId] = useState<number>(DUMMY_RESOURCES[0]!.autotask_id);
  return { resourceId, setResourceId };
}

// ─── Tasks (used by drilldown variants and slip risk) ───────────────────────

export function useProjectTasks(projectId: number): Task[] {
  return useMemo(() => DUMMY_TASKS.filter((t) => t.project_id === projectId), [projectId]);
}
