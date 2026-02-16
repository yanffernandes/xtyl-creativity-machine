// Condition types
export {
  type ConditionOperator,
  CONDITION_OPERATORS,
  type Period,
  PERIODS,
  type SimpleCondition,
  type MetricComparisonCondition,
  type RankingCondition,
  type TimeCondition,
  type LifecycleCondition,
  type Condition,
  type ConditionType,
  CONDITION_TYPES,
  type LogicalOperator,
  type ConditionGroup,
  isConditionGroup,
} from './condition.dto';

// Filter types
export {
  type FilterOperator,
  FILTER_OPERATORS,
  type Filter,
  type FilterGroup,
} from './filter.dto';

// Task / Action types
export {
  type ActionType,
  ACTION_TYPES,
  type FrequencyCap,
  FREQUENCY_CAPS,
  type BudgetChangeParams,
  type SetBudgetParams,
  type ScaleBudgetParams,
  type BidChangeParams,
  type SetBidParams,
  type BidStrategyParams,
  type ExtendEndDateParams,
  type DuplicateParams,
  type NameActionParams,
  type NotifyParams,
  type EmptyParams,
  type ActionParams,
  type Task,
} from './task.dto';

// Schedule types
export {
  type CheckInterval,
  CHECK_INTERVALS,
  type DayOfWeek,
  DAYS_OF_WEEK,
  type CustomSlot,
  type ScheduleDateRange,
  type Schedule,
} from './schedule.dto';

// Automation Rule DTOs
export {
  type Platform,
  PLATFORMS,
  type RuleStatus,
  RULE_STATUSES,
  type EntityLevel,
  ENTITY_LEVELS,
  type GoogleCampaignType,
  GOOGLE_CAMPAIGN_TYPES,
  type MetaAttributionWindow,
  type GoogleAttributionWindow,
  type AttributionConfig,
  type NotificationConfig,
  CreateAutomationRuleDto,
  UpdateAutomationRuleDto,
  ToggleRuleDto,
  GetAutomationRulesQueryDto,
  type AutomationRuleResponseDto,
  type AutomationRulesListResponseDto,
  type PreviewResultDto,
} from './automation-rule.dto';

// Execution Log DTOs
export {
  type ExecutionStatus,
  EXECUTION_STATUSES,
  type AffectedEntityStatus,
  type ExecutionSummaryDto,
  type AffectedEntityDto,
  type ExecutionErrorDto,
  type NotificationSentDto,
  type ExecutionLogResponseDto,
  type ExecutionLogListItemDto,
  type GetExecutionLogsQueryDto,
  type ExecutionLogsListResponseDto,
  type ExecutionStatsDto,
} from './execution-log.dto';
