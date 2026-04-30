/**
 * Single read surface for the UI. In preview mode (no Clerk key) returns
 * deterministic dummy data; in production mode this is where Supabase
 * queries will be wired in M3.
 */
import { useMemo, useState, useCallback } from 'react';
import {
  DUMMY_RESOURCES,
  DUMMY_OVERRIDES,
  DUMMY_PIPELINE,
  DUMMY_SYNC_RUNS,
  DUMMY_STATUS_MAPPINGS,
  generateUtilizationCells,
  generateScheduleEntriesFor,
  generateAllScheduleEntries,
  getNext12Weeks,
} from '../dev/dummyData';
import type {
  PipelineProject,
  Resource,
  ScheduleEntry,
  UtilizationCell,
  WeeklyOverride,
} from './types';

export const PREVIEW_MODE = !import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

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
}

export function useDashboardData(): DashboardData {
  const baseCells = useMemo(() => generateUtilizationCells(), []);
  const weeks = useMemo(() => getNext12Weeks(), []);
  const [overrides, setOverrides] = useState<WeeklyOverride[]>(DUMMY_OVERRIDES);

  const saveOverride = useCallback((input: {
    resource_id: number;
    week_start_et: string;
    pto_hours: number;
    unavailable_hours: number;
    note?: string;
  }) => {
    if (!PREVIEW_MODE) {
      // TODO(M4): call supabase.rpc('upsert_weekly_override', input)
      console.warn('saveOverride: production mode not yet wired');
      return;
    }
    setOverrides((prev) => {
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
        },
      ];
    });
  }, []);

  // Apply overrides on top of generated cells so the heatmap reflects edits live.
  const cells = useMemo(() => {
    if (overrides.length === 0) return baseCells;
    const overrideMap = new Map(
      overrides.map((o) => [`${o.resource_id}|${o.week_start_et}`, o]),
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

const FREE_THRESHOLD = 0.5; // engineer is "free" on a day when scheduled / 8h < 50%
const HOURS_PER_DAY = 8;

export interface DayCell {
  date: string; // 'YYYY-MM-DD'
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

    // Calendar grid: 6 weeks × 7 days, anchored on the Sunday before the 1st.
    const gridStart = new Date(target);
    gridStart.setDate(1 - target.getDay());

    // Per-day per-resource totals.
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

export function dayLoadBucket(
  hours: number,
): 'available' | 'light' | 'booked' | 'overbooked' {
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
  month: string; // 'YYYY-MM'
  label: string; // 'May 2026'
  freeHours: number;
  pipelineHours: number;
  coverageRatio: number; // pipelineHours / freeHours
}

export function usePipelineData(): {
  pipeline: PipelineProject[];
  forecast: MonthForecast[];
} {
  return useMemo(() => {
    const cells = generateUtilizationCells();
    const today = new Date();
    today.setDate(1);

    // 3-month forecast window.
    const months: MonthForecast[] = [];
    for (let i = 0; i < 3; i++) {
      const d = new Date(today);
      d.setMonth(today.getMonth() + i);
      const monthKey = d.toISOString().slice(0, 7);
      const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      // Free hours per month: per resource, (capacity - unavailable - pto - scheduled)
      // summed across the weeks in this month.
      let freeHours = 0;
      for (const cell of cells) {
        if (cell.week_start_et.slice(0, 7) !== monthKey) continue;
        const denom = Math.max(
          0,
          cell.weekly_capacity_hours - cell.unavailable_hours - cell.pto_hours,
        );
        freeHours += Math.max(0, denom - cell.scheduled_hours);
      }

      const pipelineHours = DUMMY_PIPELINE.filter((p) => p.target_month === monthKey).reduce(
        (s, p) => s + p.estimated_hours,
        0,
      );

      const coverageRatio = freeHours > 0 ? pipelineHours / freeHours : Infinity;
      months.push({
        month: monthKey,
        label,
        freeHours: Math.round(freeHours),
        pipelineHours,
        coverageRatio,
      });
    }

    return { pipeline: DUMMY_PIPELINE, forecast: months };
  }, []);
}
