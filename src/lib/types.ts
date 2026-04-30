/**
 * Shared types between the React app and Supabase Edge Functions.
 * Keep in sync with the Postgres schema (supabase/migrations/*).
 */

export interface Resource {
  autotask_id: number;
  first_name: string;
  last_name: string;
  is_active: boolean;
  department: string;
  weekly_capacity_hours: number;
  target_billable_pct: number;       // e.g., 0.75
  blended_rate: number;              // $/hr loaded
  app_role: 'engineer' | 'senior' | 'principal' | 'manager';
}

export type ContractType = 'time_and_materials' | 'fixed_fee' | 'retainer';

export interface Project {
  autotask_id: number;
  name: string;
  status: string;
  account_id: number | null;
  account_name?: string;
  start_date: string | null;
  end_date: string | null;
  committed_end_date: string | null;
  estimated_hours: number;
  budget_hours: number;
  hours_delivered: number;           // denormalized actual
  contract_type: ContractType;
  contract_value: number;            // $ if fixed-fee/retainer
}

export type PipelineStatus =
  | 'On Hold'
  | 'Opportunity - On Track'
  | 'Opportunity - Off Track'
  | 'Discovery';

export interface PipelineProject extends Omit<Project, 'status'> {
  status: PipelineStatus;
  target_month: string;
  next_action?: string;
  last_client_contact?: string;
  win_probability: number;           // 0..1
}

export interface Task {
  autotask_id: number;
  project_id: number;
  title: string;
  assigned_resource_id: number | null;
  estimated_hours: number;
  status: string;
  due_date?: string;
  is_overdue?: boolean;
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
  approval_status: 'auto_approved' | 'pending' | 'approved' | 'rejected';
  requires_approval_reason?: string;
  approved_by_clerk_user_id?: string;
  approved_at?: string;
}

export interface UtilizationCell {
  resource_id: number;
  week_start_et: string;
  scheduled_hours: number;
  pto_hours: number;
  unavailable_hours: number;
  weekly_capacity_hours: number;
}

// Skills

export type SkillCategory =
  | 'Microsoft 365' | 'Identity' | 'Networking' | 'Security' | 'Cloud' | 'Backup' | 'Endpoint';

export interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
}

export interface ResourceSkill {
  resource_id: number;
  skill_id: string;
  proficiency: 'learning' | 'proficient' | 'expert';
  certified: boolean;
  cert_expires_on?: string;
}

export interface ProjectRequiredSkill {
  project_id: number;
  skill_id: string;
  weight: number;
}

// Snapshots (90-day trend)

export interface UtilizationSnapshot {
  taken_on: string;
  resource_id: number;
  week_start_et: string;
  scheduled_hours: number;
  delivered_hours: number;
  capacity_hours: number;
}

// AI

export interface AiMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  created_at: string;
}

// Integrations

export type IntegrationId = 'microsoft_graph' | 'resend' | 'anthropic';

export interface Integration {
  id: IntegrationId;
  status: 'unconfigured' | 'configured' | 'disabled' | 'error';
  last_health_check_at?: string;
  last_error_message?: string;
}
