import { ConditionGroup, Period } from './condition.dto';

// ============================================================================
// ACTION TYPES — JSONB field types (no class-validator, stored in DB)
// ============================================================================

/**
 * All available automation action types.
 * Availability varies by platform and entity level.
 */
export type ActionType =
  // Status
  | 'pause'
  | 'start'
  | 'extend_end_date'
  // Budget
  | 'increase_budget'
  | 'decrease_budget'
  | 'set_budget'
  | 'scale_budget_by_target'
  // Bid
  | 'increase_bid'
  | 'decrease_bid'
  | 'set_bid'
  | 'set_bid_strategy'
  // Creation
  | 'duplicate'
  // Naming
  | 'add_to_name'
  | 'remove_from_name'
  | 'replace_in_name'
  // Notification
  | 'notify';

export const ACTION_TYPES: ActionType[] = [
  'pause',
  'start',
  'extend_end_date',
  'increase_budget',
  'decrease_budget',
  'set_budget',
  'scale_budget_by_target',
  'increase_bid',
  'decrease_bid',
  'set_bid',
  'set_bid_strategy',
  'duplicate',
  'add_to_name',
  'remove_from_name',
  'replace_in_name',
  'notify',
];

// ============================================================================
// FREQUENCY CAP
// ============================================================================

/**
 * Limits how often the same entity can be affected by a task.
 * Applied per-entity, per-task (not per-rule).
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
  | 'once_in_lifetime';

export const FREQUENCY_CAPS: FrequencyCap[] = [
  'no_limit',
  'once_per_hour',
  'once_per_2_hours',
  'once_per_4_hours',
  'once_per_6_hours',
  'once_per_8_hours',
  'once_per_12_hours',
  'once_per_day',
  'once_per_2_days',
  'once_per_3_days',
  'once_per_week',
  'once_in_lifetime',
];

// ============================================================================
// ACTION PARAMS — Union types by ActionType
// ============================================================================

/**
 * Params for increase_budget / decrease_budget actions.
 */
export interface BudgetChangeParams {
  changeType: 'percentage' | 'fixed';
  changeValue: number;
  minBudget?: number;
  maxBudget?: number;
}

/**
 * Params for set_budget action.
 */
export interface SetBudgetParams {
  budgetValue: number;
  budgetType: 'daily' | 'lifetime';
}

/**
 * Params for scale_budget_by_target action.
 * Adjusts budget proportionally to achieve a target metric value.
 */
export interface ScaleBudgetParams {
  targetMetric: string;
  targetValue: number;
  targetPeriod: Period;
  scaleDirection: 'proportional' | 'aggressive' | 'conservative';
  minBudget?: number;
  maxBudget?: number;
}

/**
 * Params for increase_bid / decrease_bid actions.
 */
export interface BidChangeParams {
  changeType: 'percentage' | 'fixed';
  changeValue: number;
  minBid?: number;
  maxBid?: number;
}

/**
 * Params for set_bid action.
 */
export interface SetBidParams {
  bidValue: number;
}

/**
 * Params for set_bid_strategy action.
 * Fields vary by platform (Meta vs Google).
 */
export interface BidStrategyParams {
  bidStrategy: string;
  // Meta-specific
  bidAmount?: number;
  // Google-specific
  targetCpa?: number;
  targetRoas?: number;
  maxCpcLimit?: number;
  // Google Target Impression Share
  location?: string;
  percent?: number;
}

/**
 * Params for extend_end_date action.
 */
export interface ExtendEndDateParams {
  extendBy: number;
  extendUnit: 'days' | 'hours';
}

/**
 * Params for duplicate action (Meta only).
 */
export interface DuplicateParams {
  originalAction: 'keep' | 'pause';
  nameSuffix?: string;
  appendNumber?: boolean;
  preserveSocialProof?: boolean;
  destinationCampaignId?: string;
  destinationAdsetId?: string;
}

/**
 * Params for add_to_name / remove_from_name / replace_in_name actions.
 */
export interface NameActionParams {
  text: string;
  position?: 'prefix' | 'suffix';
  find?: string;
  replace?: string;
}

/**
 * Params for notify action.
 */
export interface NotifyParams {
  message: string;
  includeMetrics?: string[];
  includeLink?: boolean;
}

/**
 * Empty params for actions that need no configuration (pause, start).
 */
export type EmptyParams = Record<string, never>;

/**
 * Union of all possible action parameter shapes.
 */
export type ActionParams =
  | EmptyParams
  | BudgetChangeParams
  | SetBudgetParams
  | ScaleBudgetParams
  | BidChangeParams
  | SetBidParams
  | BidStrategyParams
  | ExtendEndDateParams
  | DuplicateParams
  | NameActionParams
  | NotifyParams;

// ============================================================================
// TASK
// ============================================================================

/**
 * A task defines WHAT to do when conditions are met.
 * Each task has its own conditions and frequency cap,
 * allowing multiple actions with different triggers in the same rule.
 */
export interface Task {
  action: ActionType;
  params: ActionParams;
  frequencyCap: FrequencyCap;
  conditions: ConditionGroup;
}
