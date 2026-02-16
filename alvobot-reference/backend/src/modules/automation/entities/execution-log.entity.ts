import { ActionType, ActionParams } from '../dto/task.dto';
import {
  Platform,
  EntityLevel,
} from '../dto/automation-rule.dto';
import {
  ExecutionStatus,
  AffectedEntityStatus,
} from '../dto/execution-log.dto';

// ============================================================================
// DATABASE ENTITIES — snake_case matching Supabase table columns
// ============================================================================

/**
 * Execution summary stored as JSONB in the execution log.
 */
export interface ExecutionSummary {
  entities_evaluated: number;
  entities_matched_filters: number;
  entities_matched_conditions: number;
  entities_affected: number;
  entities_skipped_cap: number;
  errors_count: number;
}

/**
 * A single entity affected during an execution.
 * Stored within the affected_entities JSONB array.
 */
export interface AffectedEntityRecord {
  entity_id: string;
  entity_name: string;
  entity_type: EntityLevel;
  task_index: number;
  action_executed: ActionType;
  action_params: ActionParams;
  previous_value?: string | number | boolean;
  new_value?: string | number | boolean;
  metrics_snapshot: Record<string, number>;
  status: AffectedEntityStatus;
  error?: string;
}

/**
 * An error that occurred during execution.
 * Stored within the errors JSONB array.
 */
export interface ExecutionErrorRecord {
  entity_id?: string;
  entity_name?: string;
  task_index?: number;
  action?: ActionType;
  error_code?: string;
  error_message: string;
  retryable: boolean;
  timestamp: string;
}

/**
 * Notification delivery record.
 * Stored as JSONB in the execution log.
 */
export interface NotificationSentRecord {
  emails: string[];
  sent_at: string;
  status: 'sent' | 'failed';
  error?: string;
}

/**
 * ExecutionLog entity representing the `automation_execution_logs` table.
 * Immutable audit trail of all rule executions.
 */
export interface ExecutionLogEntity {
  id: string;
  rule_id: string;
  user_id: string;
  workspace_id?: string;

  platform: Platform;
  level: EntityLevel;

  status: ExecutionStatus;
  executed_at: string;
  duration_ms: number;

  summary: ExecutionSummary; // JSONB
  affected_entities: AffectedEntityRecord[]; // JSONB
  errors: ExecutionErrorRecord[]; // JSONB
  notifications_sent?: NotificationSentRecord; // JSONB

  created_at: string;
}

/**
 * Input for creating an execution log entry.
 * Omits auto-generated fields (id, created_at).
 */
export interface CreateExecutionLogInput {
  rule_id: string;
  user_id: string;
  workspace_id?: string;
  platform: Platform;
  level: EntityLevel;
  status: ExecutionStatus;
  executed_at: string;
  duration_ms: number;
  summary: ExecutionSummary;
  affected_entities: AffectedEntityRecord[];
  errors: ExecutionErrorRecord[];
  notifications_sent?: NotificationSentRecord;
}
