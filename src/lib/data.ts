/**
 * Single read surface for the UI. In preview mode (no Clerk key) returns
 * deterministic dummy data; in production mode this is where Supabase
 * queries will be wired in M3.
 */
import { useMemo, useState, useCallback } from 'react';
import {
  DUMMY_RESOURCES,
  DUMMY_OVERRIDES,
  DUMMY_SYNC_RUNS,
  DUMMY_STATUS_MAPPINGS,
  generateUtilizationCells,
  generateScheduleEntriesFor,
  getNext12Weeks,
} from '../dev/dummyData';
import type { Resource, ScheduleEntry, UtilizationCell, WeeklyOverride } from './types';

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
