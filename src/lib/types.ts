/**
 * Shared types between the React app and Supabase Edge Functions.
 * Keep in sync with the Postgres schema (supabase/migrations/0001_initial_schema.sql).
 */

export interface Resource {
  autotask_id: number;
  first_name: string;
  last_name: string;
  is_active: boolean;
  department: string;
  weekly_capacity_hours: number;
}

export interface Project {
  autotask_id: number;
  name: string;
  status: string;
  account_id: number | null;
  start_date: string | null;
  end_date: string | null;
}

export interface Task {
  autotask_id: number;
  project_id: number;
  title: string;
  assigned_resource_id: number | null;
  estimated_hours: number;
  status: string;
}

export interface ScheduleEntry {
  autotask_id: number;
  resource_id: number;
  task_id: number | null;
  project_id: number | null;
  start_at: string;
  end_at: string;
  hours: number;
}

export interface WeeklyOverride {
  id: string;
  resource_id: number;
  week_start_et: string;
  pto_hours: number;
  unavailable_hours: number;
  note: string | null;
}

export interface UtilizationCell {
  resource_id: number;
  week_start_et: string;
  scheduled_hours: number;
  pto_hours: number;
  unavailable_hours: number;
  weekly_capacity_hours: number;
}
