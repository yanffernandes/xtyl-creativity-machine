import { ActionType, ActionParams } from './task.dto';
import { EntityLevel, Platform, RuleStatus } from './automation-rule.dto';

// ============================================================================
// EXECUTION LOG TYPES
// ============================================================================

/**
 * Status of an automation rule execution.
 */
export type ExecutionStatus =
  | 'completed'
  | 'partial'
  | 'failed'
  | 'skipped'
  | 'rate_limited';

export const EXECUTION_STATUSES: ExecutionStatus[] = [
  'completed',
  'partial',
  'failed',
  'skipped',
  'rate_limited',
];

/**
 * Status of an individual entity action within an execution.
 */
export type AffectedEntityStatus = 'success' | 'failed' | 'skipped';

// ============================================================================
// RESPONSE DTOs (plain interfaces)
// ============================================================================

/**
 * Summary metrics for an execution run.
 */
export interface ExecutionSummaryDto {
  entitiesEvaluated: number;
  entitiesMatchedFilters: number;
  entitiesMatchedConditions: number;
  entitiesAffected: number;
  entitiesSkippedCap: number;
  errorsCount: number;
}

/**
 * Details of a single entity affected by an execution.
 */
export interface AffectedEntityDto {
  entityId: string;
  entityName: string;
  entityType: EntityLevel;
  taskIndex: number;
  actionExecuted: ActionType;
  actionParams: ActionParams;
  previousValue?: string | number | boolean;
  newValue?: string | number | boolean;
  metricsSnapshot: Record<string, number>;
  status: AffectedEntityStatus;
  error?: string;
}

/**
 * Error details from an execution.
 */
export interface ExecutionErrorDto {
  entityId?: string;
  entityName?: string;
  taskIndex?: number;
  action?: ActionType;
  errorCode?: string;
  errorMessage: string;
  retryable: boolean;
  timestamp: string;
}

/**
 * Notification delivery details.
 */
export interface NotificationSentDto {
  emails: string[];
  sentAt: string;
  status: 'sent' | 'failed';
  error?: string;
}

/**
 * Complete response for a single execution log entry.
 */
export interface ExecutionLogResponseDto {
  id: string;
  ruleId: string;
  ruleName: string;
  userId: string;
  workspaceId?: string;

  platform: Platform;
  level: EntityLevel;

  status: ExecutionStatus;
  executedAt: string;
  durationMs: number;

  summary: ExecutionSummaryDto;
  affectedEntities: AffectedEntityDto[];
  errors: ExecutionErrorDto[];
  notificationsSent?: NotificationSentDto;
}

/**
 * Compact version for list views (without full entity details).
 */
export interface ExecutionLogListItemDto {
  id: string;
  ruleId: string;
  ruleName: string;
  ruleStatus: RuleStatus;
  platform: Platform;
  level: EntityLevel;
  status: ExecutionStatus;
  executedAt: string;
  durationMs: number;
  summary: ExecutionSummaryDto;
  errorsCount: number;
}

/**
 * Query parameters for listing execution logs.
 */
export interface GetExecutionLogsQueryDto {
  ruleId?: string;
  status?: ExecutionStatus;
  platform?: Platform;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

/**
 * Paginated list response for execution logs.
 */
export interface ExecutionLogsListResponseDto {
  logs: ExecutionLogListItemDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

/**
 * Aggregated execution statistics for a rule or workspace.
 */
export interface ExecutionStatsDto {
  totalExecutions: number;
  totalEntitiesAffected: number;
  totalErrors: number;
  byStatus: Record<ExecutionStatus, number>;
  averageDurationMs: number;
  lastExecutedAt?: string;
}
