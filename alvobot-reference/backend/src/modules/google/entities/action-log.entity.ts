import { CampaignMetricsDto } from "../dto/campaign-metrics.dto";

/**
 * Action types that can be logged
 */
export type ActionLogType =
  | "pause"
  | "enable"
  | "update_budget"
  | "update_bid"
  | "duplicate"
  | "increase_bid"
  | "decrease_bid"
  | "increase_target_cpa"
  | "decrease_target_cpa"
  | "increase_target_roas"
  | "decrease_target_roas";

/**
 * Status of an action execution
 */
export type ActionLogStatus = "success" | "failed" | "skipped";

/**
 * Source of an action (manual user action or automation)
 */
export type ActionSource = "manual" | "automation";

/**
 * Details about the action performed
 */
export interface ActionDetails {
  previousValue?: number;
  newValue?: number;
  changeAmount?: number;
  changePercent?: number;
  newCampaignId?: string; // For duplicate action
}

/**
 * ActionLog entity representing google_ads_action_logs table
 */
export interface ActionLog {
  id: string;
  user_id: string;
  connection_id: string;
  source: ActionSource;
  automation_rule_id?: string;
  google_campaign_id: string;
  google_campaign_name?: string;
  action_type: ActionLogType;
  action_details?: ActionDetails;
  status: ActionLogStatus;
  error_message?: string;
  metrics_snapshot?: CampaignMetricsDto;
  executed_at: string;
  created_at: string;
}

/**
 * Input for creating an action log entry
 */
export interface CreateActionLogInput {
  user_id: string;
  connection_id: string;
  source: ActionSource;
  automation_rule_id?: string;
  google_campaign_id: string;
  google_campaign_name?: string;
  action_type: ActionLogType;
  action_details?: ActionDetails;
  status: ActionLogStatus;
  error_message?: string;
  metrics_snapshot?: CampaignMetricsDto;
}

/**
 * Filters for querying action logs
 */
export interface ActionLogFilters {
  connection_id?: string;
  source?: ActionSource | "all";
  google_campaign_id?: string;
  action_type?: ActionLogType;
  status?: ActionLogStatus;
  start_date?: string;
  end_date?: string;
}

/**
 * Paginated action logs response
 */
export interface ActionLogsResponse {
  actions: ActionLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Action statistics for a period
 */
export interface ActionStats {
  totalActions: number;
  manualActions: number;
  automatedActions: number;
  successRate: number;
  byActionType: Record<ActionLogType, number>;
  byStatus: Record<ActionLogStatus, number>;
  automationBreakdown: Array<{
    ruleId: string;
    ruleName: string;
    executions: number;
    successRate: number;
  }>;
}
