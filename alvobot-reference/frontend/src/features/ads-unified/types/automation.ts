/**
 * Ads Automation Engine - Frontend Types
 *
 * Pure TypeScript interfaces/types mirroring the backend automation engine DTOs.
 * Used by React components, React Query hooks, and Zustand stores.
 *
 * @module ads-unified/types/automation
 */

// ============================================
// Enums / Literal Types
// ============================================

/** Advertising platform */
export type Platform = 'meta' | 'google'

/** Entity level in the ads hierarchy that an automation rule targets */
export type EntityLevel =
  | 'campaign'
  | 'adset'
  | 'ad_group'
  | 'ad'
  | 'keyword'
  | 'ad_account'

/** Automation rule lifecycle status */
export type RuleStatus = 'active' | 'paused' | 'draft'

/** Google Ads campaign types - used to scope rules to specific campaign objectives */
export type GoogleCampaignType =
  | 'search'
  | 'display'
  | 'shopping'
  | 'app'
  | 'performance_max'
  | 'demand_gen'

// ============================================
// Filters
// ============================================

/**
 * Operators for entity filters (pre-condition filtering).
 * Determines which entities are evaluated by the rule.
 */
export type AutomationFilterOperator =
  | 'EQUAL'
  | 'NOT_EQUAL'
  | 'CONTAIN'
  | 'NOT_CONTAIN'
  | 'START_WITH'
  | 'END_WITH'
  | 'REGEX'
  | 'IN'
  | 'NOT_IN'
  | 'GREATER_THAN'
  | 'GREATER_THAN_OR_EQUAL'
  | 'LESS_THAN'
  | 'LESS_THAN_OR_EQUAL'
  | 'BETWEEN'

/**
 * A single filter criterion.
 * Filters narrow down which entities are evaluated (e.g., only campaigns with name containing "Black Friday").
 */
export interface AutomationFilter {
  /** The field to filter on (e.g., 'name', 'status', 'objective') */
  field: string
  /** Comparison operator */
  operator: AutomationFilterOperator
  /** Value(s) to compare against */
  value: string | number | string[] | number[]
  /** Optional time period for metric-based filters */
  period?: Period
}

/**
 * A group of filters combined with AND logic.
 * Multiple FilterGroups are combined with OR logic.
 */
export type FilterGroup = AutomationFilter[]

// ============================================
// Conditions
// ============================================

/**
 * Operators for metric conditions.
 * Used to compare metric values against thresholds.
 */
export type ConditionOperator =
  | 'GREATER_THAN'
  | 'GREATER_THAN_OR_EQUAL'
  | 'LESS_THAN'
  | 'LESS_THAN_OR_EQUAL'
  | 'EQUAL'
  | 'NOT_EQUAL'
  | 'BETWEEN'

/**
 * Time periods for metric evaluation.
 * Defines the lookback window for metric aggregation.
 */
export type Period =
  // Hourly granularity
  | 'current_hour'
  | 'previous_hour'
  | 'last_2_hours'
  | 'last_3_hours'
  | 'last_6_hours'
  | 'last_12_hours'
  | 'last_24_hours'
  // Daily granularity
  | 'today'
  | 'yesterday'
  | 'last_2d'
  | 'last_3d'
  | 'last_3d_with_today'
  | 'last_7d'
  | 'last_7d_with_today'
  | 'last_14d'
  | 'last_14d_with_today'
  | 'last_30d'
  | 'last_30d_with_today'
  // Weekly/Monthly granularity
  | 'this_week_mon'
  | 'this_week_sun'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  // Full history
  | 'lifetime'

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Condition Types (Discriminated Union on `type`)
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

/**
 * Simple metric threshold condition.
 * Example: "CPA > 50" in the last 7 days.
 */
export interface SimpleCondition {
  type: 'simple'
  /** Metric to evaluate (e.g., 'cpa', 'spend', 'impressions') */
  metric: string
  /** Time period for metric aggregation */
  period: Period
  /** Comparison operator */
  operator: ConditionOperator
  /** Threshold value */
  value: number
}

/**
 * Metric-vs-metric comparison condition.
 * Example: "CPA (last 3d) > 1.5x CPA (last 7d)" to detect metric degradation.
 */
export interface MetricComparisonCondition {
  type: 'metric_comparison'
  /** Primary metric to compare */
  metric: string
  /** Time period for the primary metric */
  period: Period
  /** Comparison operator */
  operator: ConditionOperator
  /** Metric to compare against */
  compareMetric: string
  /** Time period for the comparison metric */
  comparePeriod: Period
  /** Multiplier applied to the comparison metric (e.g., 1.5 means "150% of") */
  compareMultiplier: number
}

/**
 * Ranking-based condition for relative performance.
 * Example: "Bottom 20% by ROAS" or "Top 3 by spend".
 */
export interface RankingCondition {
  type: 'ranking'
  /** Metric used for ranking */
  metric: string
  /** Time period for metric evaluation */
  period: Period
  /** Rank from top or bottom */
  position: 'top' | 'bottom'
  /** Whether ranking uses absolute count or percentage */
  rankingType: 'quantity' | 'percentage'
  /** Number of positions (quantity) or percentage threshold */
  rankingValue: number
  /** Whether to include entities with zero metric values */
  includeZeros: boolean
}

/**
 * Time-of-day condition.
 * Example: "Run only between 08:00 and 18:00".
 */
export interface TimeCondition {
  type: 'time'
  /** Comparison operator */
  operator: ConditionOperator
  /** Time value in HH:mm format */
  value: string
  /** End time for BETWEEN operator */
  valueEnd?: string
}

/**
 * Entity lifecycle condition.
 * Example: "Only entities created more than 72 hours ago" (learning phase protection).
 */
export interface LifecycleCondition {
  type: 'lifecycle'
  /** Lifecycle metric to evaluate */
  metric: 'hours_since_creation' | 'days_since_creation'
  /** Comparison operator */
  operator: ConditionOperator
  /** Threshold value (hours or days depending on metric) */
  value: number
}

/**
 * Discriminated union of all condition types.
 * The `type` field determines which shape applies.
 */
export type Condition =
  | SimpleCondition
  | MetricComparisonCondition
  | RankingCondition
  | TimeCondition
  | LifecycleCondition

/**
 * Recursive condition group with AND/OR logic.
 * Supports nested groups for complex boolean expressions like:
 * (CPA > 50 AND Impressions > 1000) OR (Spend > 100)
 */
export interface ConditionGroup {
  /** Boolean operator combining the children */
  operator: 'AND' | 'OR'
  /** Array of conditions or nested condition groups */
  conditions: Array<ConditionGroup | Condition>
}

// ============================================
// Actions
// ============================================

/**
 * All available automation action types.
 * Each action type has a corresponding params interface.
 */
export type AutomationActionType =
  | 'pause'
  | 'start'
  | 'extend_end_date'
  | 'increase_budget'
  | 'decrease_budget'
  | 'set_budget'
  | 'scale_budget_by_target'
  | 'increase_bid'
  | 'decrease_bid'
  | 'set_bid'
  | 'set_bid_strategy'
  | 'duplicate'
  | 'add_to_name'
  | 'remove_from_name'
  | 'replace_in_name'
  | 'notify'

/**
 * Frequency cap for action execution per entity.
 * Prevents the same action from being applied too frequently to the same entity.
 */
export type FrequencyCap =
  | 'no_limit'
  | 'once_per_hour'
  | 'once_per_2_hours'
  | 'once_per_4_hours'
  | 'once_per_6_hours'
  | 'once_per_8_hours'
  | 'once_per_12_hours'
  | 'once_per_day'
  | 'once_per_2_days'
  | 'once_per_3_days'
  | 'once_per_week'
  | 'once_in_lifetime'

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Action Params (per action type)
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

/** Params for increase_budget / decrease_budget */
export interface BudgetChangeParams {
  /** Change amount as a percentage (e.g., 20 for 20%) */
  percentage: number
  /** Optional minimum budget floor (prevents going below this value) */
  minBudget?: number
  /** Optional maximum budget ceiling (prevents exceeding this value) */
  maxBudget?: number
}

/** Params for set_budget */
export interface SetBudgetParams {
  /** Absolute budget value to set */
  amount: number
}

/**
 * Params for scale_budget_by_target.
 * Dynamically scales budget based on a target metric (e.g., maintain CPA of $30).
 */
export interface ScaleBudgetParams {
  /** Target metric to optimize for (e.g., 'cpa', 'roas') */
  targetMetric: string
  /** Desired target value */
  targetValue: number
  /** Maximum allowed budget increase percentage per execution */
  maxIncreasePercent: number
  /** Maximum allowed budget decrease percentage per execution */
  maxDecreasePercent: number
  /** Optional minimum budget floor */
  minBudget?: number
  /** Optional maximum budget ceiling */
  maxBudget?: number
}

/** Params for increase_bid / decrease_bid */
export interface BidChangeParams {
  /** Change amount as a percentage (e.g., 10 for 10%) */
  percentage: number
  /** Optional minimum bid floor */
  minBid?: number
  /** Optional maximum bid ceiling */
  maxBid?: number
}

/** Params for set_bid */
export interface SetBidParams {
  /** Absolute bid value to set */
  amount: number
}

/** Params for set_bid_strategy */
export interface BidStrategyParams {
  /** Bid strategy to apply (e.g., 'MAXIMIZE_CONVERSIONS', 'TARGET_CPA') */
  strategy: string
  /** Optional target CPA for TARGET_CPA strategy */
  targetCpa?: number
  /** Optional target ROAS for TARGET_ROAS strategy */
  targetRoas?: number
}

/** Params for duplicate action */
export interface DuplicateParams {
  /** Number of copies to create */
  copies: number
  /** Suffix to append to the duplicated entity name */
  nameSuffix?: string
  /** Initial status for the duplicated entity */
  status?: 'active' | 'paused'
}

/** Params for add_to_name / remove_from_name / replace_in_name */
export interface NameActionParams {
  /** Text to add, remove, or search for (depending on action type) */
  text: string
  /** Position for add_to_name */
  position?: 'prefix' | 'suffix'
  /** Replacement text for replace_in_name */
  replaceWith?: string
}

/** Params for extend_end_date action */
export interface ExtendEndDateParams {
  /** Number of days to extend the end date */
  days: number
}

/** Params for notify action (standalone notification without other action) */
export interface NotifyParams {
  /** Email addresses to send the notification to */
  emails: string[]
  /** Custom notification message */
  message?: string
}

/**
 * Union of all action parameter types.
 * The applicable type depends on the `ActionType` of the task.
 */
export type ActionParams =
  | BudgetChangeParams
  | SetBudgetParams
  | ScaleBudgetParams
  | BidChangeParams
  | SetBidParams
  | BidStrategyParams
  | DuplicateParams
  | NameActionParams
  | ExtendEndDateParams
  | NotifyParams
  | Record<string, never> // For actions with no params (pause, start)

// ============================================
// Tasks
// ============================================

/**
 * A single task within an automation rule.
 * Each task combines an action with its own conditions and frequency cap.
 * A rule can have multiple tasks, each evaluated independently.
 */
export interface Task {
  /** The action to execute when conditions are met */
  action: AutomationActionType
  /** Parameters for the action */
  params: ActionParams
  /** How often this action can be applied to the same entity */
  frequencyCap: FrequencyCap
  /** Conditions that must be met for this task to execute */
  conditions: ConditionGroup
}

// ============================================
// Schedule
// ============================================

/**
 * How frequently the rule should be checked.
 * Shorter intervals = more responsive but higher API usage.
 */
export type CheckInterval =
  | '15_minutes'
  | '30_minutes'
  | '1_hour'
  | '2_hours'
  | '3_hours'
  | '4_hours'
  | '6_hours'
  | '8_hours'
  | '12_hours'
  | '24_hours'
  | '48_hours'
  | '72_hours'

/**
 * A custom time slot for scheduling.
 * Used with schedule type 'custom' for fine-grained control.
 */
export interface CustomSlot {
  /** Day of the week */
  day: 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'
  /** Hours to run (0-23). Example: [8, 12, 18] means 8am, 12pm, 6pm */
  hours: number[]
}

/**
 * Rule execution schedule configuration.
 * Supports both frequency-based (every N hours) and custom (specific days/hours) scheduling.
 */
export interface Schedule {
  /** Schedule type: frequency = interval-based, custom = day/hour specific */
  type: 'frequency' | 'custom'
  /** Check interval for frequency-based scheduling */
  checkInterval?: CheckInterval
  /** Custom time slots for custom scheduling */
  customSlots?: CustomSlot[]
  /** Optional date range to restrict when the rule runs */
  dateRange?: {
    /** Start date (ISO 8601). Rule won't run before this date. */
    start?: string
    /** End date (ISO 8601). Rule auto-pauses after this date. */
    end?: string
  }
  /** If true, the rule runs once and then auto-pauses */
  runOnce?: boolean
}

// ============================================
// Attribution
// ============================================

/** Meta Ads attribution windows */
export type MetaAttributionWindow =
  | '1d_click'
  | '7d_click'
  | '1d_click_1d_view'
  | '7d_click_1d_view'
  | '28d_click_1d_view'

/** Google Ads attribution windows */
export type GoogleAttributionWindow =
  | '30_days'
  | '60_days'
  | '90_days'
  | 'data_driven'

/**
 * Attribution configuration for metric evaluation.
 * Controls which attribution window is used when pulling conversion metrics.
 */
export interface AttributionConfig {
  /** If true, uses the attribution window configured on the entity itself */
  useEntitySetting: boolean
  /** Custom attribution window override */
  window?: MetaAttributionWindow | GoogleAttributionWindow
}

// ============================================
// Notifications
// ============================================

/**
 * Notification preferences for rule execution events.
 * Controls what emails are sent and what information they contain.
 */
export interface NotificationConfig {
  /** Email addresses to receive notifications */
  emails: string[]
  /** Send email when an action is executed */
  notifyOnAction: boolean
  /** Send email when an error occurs during execution */
  notifyOnError: boolean
  /** Send email when no entities match the rule (useful for debugging) */
  notifyOnNoMatch: boolean
  /** Include a summary table of all actions taken */
  includeSummary: boolean
  /** Include details of each affected entity */
  includeEntityDetails: boolean
  /** Include a snapshot of current metric values */
  includeMetricsSnapshot: boolean
  /** Custom email subject line (overrides default) */
  customSubject?: string
}

// ============================================
// Automation Rule
// ============================================

/**
 * Complete automation rule definition.
 * This is the main entity that users create, edit, and manage.
 */
export interface AutomationRule {
  /** Unique identifier (UUID) */
  id: string
  /** Owner user ID */
  userId: string
  /** Optional workspace ID for team-shared rules */
  workspaceId?: string
  /** Human-readable rule name */
  name: string
  /** Optional description of what the rule does */
  description?: string
  /** Rule lifecycle status */
  status: RuleStatus
  /** Target advertising platform */
  platform: Platform
  /** Connection IDs (ad accounts) this rule applies to */
  connectionIds: string[]
  /** Specific ad account IDs to scope the rule (optional) */
  adAccountIds?: string[]
  /** Google campaign type filter (Google only) */
  googleCampaignType?: GoogleCampaignType
  /** Entity level this rule operates on */
  level: EntityLevel
  /** Entity filters (pre-condition). Groups combined with OR, filters within group with AND. */
  filters: FilterGroup[]
  /** Tasks to execute (each with its own conditions and actions) */
  tasks: Task[]
  /** Execution schedule */
  schedule: Schedule
  /** IANA timezone for schedule evaluation (e.g., 'America/Sao_Paulo') */
  timezone: string
  /** Attribution window configuration */
  attribution?: AttributionConfig
  /** Notification preferences */
  notifications?: NotificationConfig
  /** Timestamp of the last successful execution */
  lastRunAt?: string
  /** Timestamp of the next scheduled execution */
  nextRunAt?: string
  /** Creation timestamp (ISO 8601) */
  createdAt: string
  /** Last update timestamp (ISO 8601) */
  updatedAt: string
}

// ============================================
// Execution Log
// ============================================

/**
 * Details of an entity affected by a rule execution.
 * One entry per entity per task that matched.
 */
export interface AffectedEntity {
  /** Platform entity ID */
  entityId: string
  /** Entity display name */
  entityName: string
  /** Entity level (campaign, adset, etc.) */
  entityType: EntityLevel
  /** Index of the task that triggered this action (0-based) */
  taskIndex: number
  /** The action that was executed */
  actionExecuted: AutomationActionType
  /** Parameters used for the action */
  actionParams: ActionParams
  /** Value before the action (e.g., previous budget) */
  previousValue?: unknown
  /** Value after the action (e.g., new budget) */
  newValue?: unknown
  /** Snapshot of entity metrics at execution time */
  metricsSnapshot: Record<string, number>
  /** Result of the action for this entity */
  status: 'success' | 'failed' | 'skipped'
  /** Error message if status is 'failed' */
  error?: string
}

/** Overall execution status */
export type ExecutionStatus =
  | 'completed'
  | 'partial'
  | 'failed'
  | 'skipped'
  | 'rate_limited'

/**
 * Error that occurred during rule execution.
 * Can be entity-specific or rule-level.
 */
export interface ExecutionError {
  /** Entity ID (if entity-specific error) */
  entityId?: string
  /** Entity name for display */
  entityName?: string
  /** Action that caused the error */
  action?: AutomationActionType
  /** Human-readable error message */
  message: string
  /** Machine-readable error code (e.g., 'API_RATE_LIMIT', 'INSUFFICIENT_BUDGET') */
  code?: string
}

/**
 * Complete execution log for a single rule run.
 * Provides a detailed record of what happened during execution.
 */
export interface ExecutionLog {
  /** Unique identifier (UUID) */
  id: string
  /** Rule that was executed */
  ruleId: string
  /** User who owns the rule */
  userId: string
  /** Workspace context (if applicable) */
  workspaceId?: string
  /** Overall execution status */
  status: ExecutionStatus
  /** When the execution started (ISO 8601) */
  executedAt: string
  /** Total execution duration in milliseconds */
  durationMs: number
  /** Total entities evaluated (after filter matching) */
  entitiesEvaluated: number
  /** Entities that passed the filter stage */
  entitiesMatchedFilters: number
  /** Entities that passed both filters and conditions */
  entitiesMatchedConditions: number
  /** Entities that had actions applied */
  entitiesAffected: number
  /** Entities skipped due to frequency cap */
  entitiesSkippedCap: number
  /** Total number of errors */
  errorsCount: number
  /** Detailed list of affected entities */
  affectedEntities: AffectedEntity[]
  /** Detailed list of errors */
  errors: ExecutionError[]
  /** Notification delivery info */
  notificationsSent?: {
    /** Email addresses notified */
    emails: string[]
    /** When the notification was sent (ISO 8601) */
    sentAt: string
  }
  /** Frozen snapshot of the rule at execution time (for audit trail) */
  ruleSnapshot?: AutomationRule
}

// ============================================
// Custom Metrics
// ============================================

/** Mathematical operations for custom metric formulas */
export type FormulaOperation =
  | 'add'
  | 'subtract'
  | 'multiply'
  | 'divide'
  | 'percentage'

/**
 * Operand in a custom metric formula.
 * Discriminated union on `type` field.
 */
export type Operand =
  | { type: 'metric'; value: string }
  | { type: 'number'; value: number }
  | { type: 'custom_metric'; value: string }

/**
 * Formula definition for custom metrics.
 * Example: Revenue per Click = { operation: 'divide', operands: [{ type: 'metric', value: 'revenue' }, { type: 'metric', value: 'clicks' }] }
 */
export interface Formula {
  /** Mathematical operation to apply */
  operation: FormulaOperation
  /** Operands for the operation (order matters for subtract/divide) */
  operands: Operand[]
}

/**
 * User-defined custom metric.
 * Allows users to create derived metrics from platform-provided ones.
 */
export interface CustomMetric {
  /** Unique identifier (UUID) */
  id: string
  /** Owner user ID */
  userId: string
  /** Optional workspace ID for team-shared metrics */
  workspaceId?: string
  /** Display name (e.g., "Revenue per Click") */
  name: string
  /** URL-safe identifier (e.g., "revenue_per_click") */
  slug: string
  /** Which platform(s) this metric applies to */
  platform: Platform | 'both'
  /** The formula to compute this metric */
  formula: Formula
  /** Creation timestamp (ISO 8601) */
  createdAt: string
  /** Last update timestamp (ISO 8601) */
  updatedAt: string
}

// ============================================
// API DTOs (for React Query mutations)
// ============================================

/**
 * Input DTO for creating a new automation rule.
 * Omits server-generated fields (id, userId, timestamps, etc.).
 */
export interface CreateAutomationRuleInput {
  name: string
  description?: string
  status?: RuleStatus
  platform: Platform
  connectionIds: string[]
  adAccountIds?: string[]
  googleCampaignType?: GoogleCampaignType
  level: EntityLevel
  filters: FilterGroup[]
  tasks: Task[]
  schedule: Schedule
  timezone: string
  attribution?: AttributionConfig
  notifications?: NotificationConfig
}

/**
 * Input DTO for updating an existing automation rule.
 * All fields are optional - only provided fields are updated.
 */
export type UpdateAutomationRuleInput = Partial<CreateAutomationRuleInput>

// ============================================
// Platform Entity (for preview / dry-run)
// ============================================

/**
 * Represents a platform entity returned by the preview/dry-run endpoint.
 * Shows which entities would be affected by a rule before activating it.
 */
export interface PlatformEntity {
  /** Platform entity ID */
  id: string
  /** Entity display name */
  name: string
  /** Source platform */
  platform: Platform
  /** Entity level */
  level: EntityLevel
  /** Current entity status */
  status: string
  /** Current metric values */
  metrics: Record<string, number>
  /** Current budget (if applicable) */
  budget?: number
  /** Current bid (if applicable) */
  bid?: number
  /** Current bid strategy (if applicable) */
  bidStrategy?: string
  /** Entity creation timestamp */
  createdTime?: string
}

// ============================================
// API Response Types (for React Query)
// ============================================

/** Paginated list response for automation rules */
export interface AutomationRulesListResponse {
  rules: AutomationRule[]
  total: number
  page: number
  limit: number
}

/** Paginated list response for execution logs */
export interface ExecutionLogsListResponse {
  logs: ExecutionLog[]
  total: number
  page: number
  limit: number
}

/** Preview/dry-run response showing which entities would be affected */
export interface PreviewResponse {
  matchedEntities: PlatformEntity[]
  totalEvaluated: number
  totalMatched: number
}

/** Params for querying execution logs */
export interface ExecutionLogQueryParams {
  ruleId?: string
  status?: ExecutionStatus
  page?: number
  limit?: number
  startDate?: string
  endDate?: string
}
