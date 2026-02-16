// TypeScript interfaces for Google Ads Dashboard feature
// Based on data-model.md specification

// ============================================================================
// Condition Types for Automations
// ============================================================================

export type ConditionOperator = '>' | '<' | '>=' | '<=' | '==' | '!=';
export type LogicalOperator = 'AND' | 'OR';

export type MetricType =
  | 'impressions'
  | 'clicks'
  | 'ctr'
  | 'cost'
  | 'conversions'
  | 'cpa'
  | 'roas'
  | 'runtime_hours'
  | 'budget_spent_percent';

export type PeriodType = 'today' | 'last_24h' | 'last_7d' | 'last_30d';

export interface Condition {
  type: 'condition';
  metric: MetricType;
  operator: ConditionOperator;
  value: number;
  period?: PeriodType;
}

export interface ConditionGroup {
  type: 'group';
  operator: LogicalOperator;
  children: Array<ConditionGroup | Condition>;
}

export type ConditionTree = ConditionGroup | Condition;

// ============================================================================
// Scope Filters for Automations
// ============================================================================

export interface ScopeFilters {
  nameContains?: string;
  nameNotContains?: string;
  status?: 'ENABLED' | 'PAUSED';
  minBudget?: number;
  maxBudget?: number;
  campaignIds?: string[];
  biddingStrategyType?: string;
}

// ============================================================================
// Action Types
// ============================================================================

export type ActionType =
  | 'pause'
  | 'enable'
  | 'increase_budget'
  | 'decrease_budget'
  | 'increase_bid'
  | 'decrease_bid'
  | 'increase_target_cpa'
  | 'decrease_target_cpa'
  | 'increase_target_roas'
  | 'decrease_target_roas';

export type ActionValueType = 'absolute' | 'percentage';

export interface ActionDetails {
  previousValue?: number;
  newValue?: number;
  changeAmount?: number;
  changePercent?: number;
}

// ============================================================================
// Campaign Metrics (from Google Ads API - not persisted)
// ============================================================================

export type CampaignStatus = 'ENABLED' | 'PAUSED' | 'REMOVED';

export type AlertType = 'low_ctr' | 'budget_depleted' | 'no_conversions' | 'high_cpa';

export interface CampaignMetrics {
  id: string;
  name: string;
  status: CampaignStatus;
  channelType: string;
  budget: number;
  budgetId: string;
  maxBid?: number;
  // Bidding strategy information
  biddingStrategyType?: string;
  targetCpa?: number;
  targetRoas?: number;
  // Performance metrics
  impressions: number;
  clicks: number;
  ctr: number;
  cost: number;
  conversions: number;
  conversionsValue: number;
  cpa: number;
  roas: number;
  budgetSpentPercent: number;
  runtimeHours?: number;
  alerts?: AlertType[];
  // Customer account info for API operations
  customerId?: string;
  loginCustomerId?: string;
  // Connection info for multi-connection support
  connectionId?: string;
  connectionName?: string;
}

export interface CampaignSummary {
  totalCampaigns: number;
  activeCampaigns: number;
  totalImpressions: number;
  totalClicks: number;
  totalCost: number;
  totalConversions: number;
  avgCtr: number;
  avgCpa: number;
}

export interface ConnectionInfo {
  id: string;
  name: string;
  customerIds: string[];
}

export interface CampaignsResponse {
  campaigns: CampaignMetrics[];
  summary: CampaignSummary;
  connections: ConnectionInfo[];
  fetchedAt: string;
}

// ============================================================================
// Automation Rule Entity
// Matches backend AutomationRuleResponseDto (camelCase from API)
// ============================================================================

export interface AutomationRule {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  scopeType: 'all' | 'filter';
  scopeFilters?: ScopeFilters;
  conditions: ConditionTree;
  actionType: ActionType;
  actionValue?: number;
  actionValueType?: ActionValueType;
  actionLimit?: number;
  checkFrequencyMinutes: number;
  cooldownMinutes: number;
  maxExecutions?: number;
  currentExecutions: number;
  lastRunAt?: string;
  lastExecutionAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAutomationRuleInput {
  connection_id: string;
  name: string;
  description?: string;
  scope_type: 'all' | 'filter';
  scope_filters?: ScopeFilters;
  conditions: ConditionTree;
  action_type: ActionType;
  action_value?: number;
  action_value_type?: ActionValueType;
  action_limit?: number;
  check_frequency_minutes?: number;
  cooldown_minutes?: number;
  max_executions?: number;
}

export interface UpdateAutomationRuleInput extends Partial<CreateAutomationRuleInput> {
  is_active?: boolean;
}

// ============================================================================
// Action Log Entity
// ============================================================================

export type ActionLogStatus = 'success' | 'failed' | 'skipped';
export type ActionSource = 'manual' | 'automation';

export interface ActionLog {
  id: string;
  user_id: string;
  connection_id: string;
  source: ActionSource;
  automation_rule_id?: string;
  automation_rule_name?: string;
  google_campaign_id: string;
  google_campaign_name?: string;
  action_type: ActionType | 'duplicate' | 'update_bid';
  action_details?: ActionDetails;
  status: ActionLogStatus;
  error_message?: string;
  metrics_snapshot?: CampaignMetrics;
  executed_at: string;
  created_at: string;
}

export interface ActionHistoryFilters {
  connectionId?: string;
  source?: ActionSource | 'all';
  campaignId?: string;
  actionType?: string;
  status?: ActionLogStatus;
  startDate?: string;
  endDate?: string;
}

export interface ActionHistoryResponse {
  actions: ActionLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ActionStats {
  totalActions: number;
  manualActions: number;
  automatedActions: number;
  successRate: number;
  byActionType: Record<string, number>;
  byStatus: Record<ActionLogStatus, number>;
  automationBreakdown: Array<{
    ruleId: string;
    ruleName: string;
    executions: number;
    successRate: number;
  }>;
}

// ============================================================================
// Automation Execution Entity
// ============================================================================

export interface AutomationExecution {
  id: string;
  automation_rule_id: string;
  google_campaign_id: string;
  execution_count: number;
  last_execution_at: string;
}

// ============================================================================
// Notifications
// ============================================================================

export interface AutomationNotification {
  id: string;
  type: 'automation_executed';
  title: string;
  message: string;
  actionLogId: string;
  automationRuleId: string;
  createdAt: string;
  read: boolean;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface CampaignActionResponse {
  success: boolean;
  campaignId: string;
  previousStatus?: CampaignStatus;
  newStatus?: CampaignStatus;
  previousBudget?: number;
  newBudget?: number;
  actionLogId: string;
}

export interface DuplicateCampaignResponse {
  success: boolean;
  originalCampaignId: string;
  newCampaignId: string;
  newName: string;
  actionLogId: string;
}

export interface TestAutomationResult {
  matchingCampaigns: Array<{
    id: string;
    name: string;
    currentMetrics: Partial<CampaignMetrics>;
    wouldExecute: boolean;
    reason: string;
  }>;
  totalMatching: number;
  testedAt: string;
}

// ============================================================================
// Dashboard Filter State
// ============================================================================

export type DashboardPeriod = 'today' | 'yesterday' | 'last_7d' | 'last_30d' | 'custom';

export interface DashboardFilters {
  connectionId: string;
  period: DashboardPeriod;
  startDate?: string;
  endDate?: string;
  status?: CampaignStatus | 'all';
  sortBy?: keyof CampaignMetrics;
  sortOrder?: 'asc' | 'desc';
}

// ============================================================================
// Sort Configuration
// ============================================================================

export interface SortConfig {
  key: keyof CampaignMetrics;
  direction: 'asc' | 'desc';
}
