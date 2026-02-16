import { ConditionGroup } from '../dto/condition.dto';
import { FilterGroup } from '../dto/filter.dto';
import { Task } from '../dto/task.dto';
import { Schedule } from '../dto/schedule.dto';
import {
  Platform,
  RuleStatus,
  EntityLevel,
  GoogleCampaignType,
  AttributionConfig,
  NotificationConfig,
} from '../dto/automation-rule.dto';

// ============================================================================
// DATABASE ENTITIES — snake_case matching Supabase table columns
// ============================================================================

/**
 * AutomationRule entity representing the `automation_rules` table.
 * All column names use snake_case to match PostgreSQL conventions.
 *
 * JSONB columns: filters, tasks, schedule, attribution, notifications
 */
export interface AutomationRuleEntity {
  id: string;
  user_id: string;
  workspace_id?: string;

  name: string;
  description?: string;
  status: RuleStatus;

  platform: Platform;
  connection_ids: string[];
  ad_account_ids?: string[];
  google_campaign_type?: GoogleCampaignType;

  level: EntityLevel;
  filters: FilterGroup[]; // JSONB
  tasks: Task[]; // JSONB
  schedule: Schedule; // JSONB
  timezone: string;
  attribution?: AttributionConfig; // JSONB
  notifications?: NotificationConfig; // JSONB

  last_run_at?: string;
  next_run_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * AutomationExecution entity representing the `automation_executions` table.
 * Tracks frequency cap per entity per task for a rule.
 */
export interface AutomationExecutionEntity {
  id: string;
  rule_id: string;
  task_index: number;
  entity_id: string;
  execution_count: number;
  last_execution_at: string;
}

/**
 * Input for creating an automation rule in the database.
 * Omits auto-generated fields (id, created_at, updated_at, last_run_at, next_run_at).
 */
export interface CreateAutomationRuleInput {
  user_id: string;
  workspace_id?: string;
  name: string;
  description?: string;
  status?: RuleStatus;
  platform: Platform;
  connection_ids: string[];
  ad_account_ids?: string[];
  google_campaign_type?: GoogleCampaignType;
  level: EntityLevel;
  filters?: FilterGroup[];
  tasks: Task[];
  schedule: Schedule;
  timezone?: string;
  attribution?: AttributionConfig;
  notifications?: NotificationConfig;
}

/**
 * Input for updating an automation rule in the database.
 * All fields are optional.
 */
export interface UpdateAutomationRuleInput {
  name?: string;
  description?: string;
  status?: RuleStatus;
  platform?: Platform;
  connection_ids?: string[];
  ad_account_ids?: string[];
  google_campaign_type?: GoogleCampaignType;
  level?: EntityLevel;
  filters?: FilterGroup[];
  tasks?: Task[];
  schedule?: Schedule;
  timezone?: string;
  attribution?: AttributionConfig;
  notifications?: NotificationConfig;
  last_run_at?: string;
  next_run_at?: string;
}
