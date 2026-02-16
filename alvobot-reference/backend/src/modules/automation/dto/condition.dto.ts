// ============================================================================
// CONDITION TYPES — JSONB field types (no class-validator, stored in DB)
// ============================================================================

/**
 * Operators for comparing metric values in conditions.
 */
export type ConditionOperator =
  | 'GREATER_THAN'
  | 'GREATER_THAN_OR_EQUAL'
  | 'LESS_THAN'
  | 'LESS_THAN_OR_EQUAL'
  | 'EQUAL'
  | 'NOT_EQUAL'
  | 'BETWEEN';

export const CONDITION_OPERATORS: ConditionOperator[] = [
  'GREATER_THAN',
  'GREATER_THAN_OR_EQUAL',
  'LESS_THAN',
  'LESS_THAN_OR_EQUAL',
  'EQUAL',
  'NOT_EQUAL',
  'BETWEEN',
];

/**
 * Time periods for metric evaluation.
 * Variants with "_with_today" include the current (incomplete) day.
 */
export type Period =
  | 'current_hour'
  | 'previous_hour'
  | 'last_2_hours'
  | 'last_3_hours'
  | 'last_6_hours'
  | 'last_12_hours'
  | 'last_24_hours'
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
  | 'this_week_mon'
  | 'this_week_sun'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'lifetime';

export const PERIODS: Period[] = [
  'current_hour',
  'previous_hour',
  'last_2_hours',
  'last_3_hours',
  'last_6_hours',
  'last_12_hours',
  'last_24_hours',
  'today',
  'yesterday',
  'last_2d',
  'last_3d',
  'last_3d_with_today',
  'last_7d',
  'last_7d_with_today',
  'last_14d',
  'last_14d_with_today',
  'last_30d',
  'last_30d_with_today',
  'this_week_mon',
  'this_week_sun',
  'last_week',
  'this_month',
  'last_month',
  'lifetime',
];

// ============================================================================
// CONDITION TYPES (Discriminated Union on `type`)
// ============================================================================

/**
 * Type 1: Simple — Metric vs fixed numeric value.
 * Example: spend last_3d_with_today > 50
 */
export interface SimpleCondition {
  type: 'simple';
  metric: string;
  period: Period;
  operator: ConditionOperator;
  value: number;
}

/**
 * Type 2: MetricComparison — Metric vs another metric (cross-period).
 * Example: ROAS last_3d < 70% of ROAS last_7d
 */
export interface MetricComparisonCondition {
  type: 'metric_comparison';
  metric: string;
  period: Period;
  operator: ConditionOperator;
  compareMetric: string;
  comparePeriod: Period;
  compareMultiplier: number;
}

/**
 * Type 3: Ranking — Top/Bottom N entities or N% by a metric.
 * Example: bottom 20% by ROAS last_7d
 */
export interface RankingCondition {
  type: 'ranking';
  metric: string;
  period: Period;
  position: 'top' | 'bottom';
  rankingType: 'quantity' | 'percentage';
  rankingValue: number;
  includeZeros: boolean;
}

/**
 * Type 4: Time — Time-of-day condition (respects rule timezone).
 * Example: between 08:00 and 22:00
 */
export interface TimeCondition {
  type: 'time';
  operator: ConditionOperator;
  value: string; // "HH:mm" format
  valueEnd?: string; // "HH:mm" format (for BETWEEN)
}

/**
 * Type 5: Lifecycle — Entity age since creation.
 * Example: hours_since_creation > 72
 */
export interface LifecycleCondition {
  type: 'lifecycle';
  metric: 'hours_since_creation' | 'days_since_creation';
  operator: ConditionOperator;
  value: number;
}

/**
 * Discriminated union of all condition types.
 */
export type Condition =
  | SimpleCondition
  | MetricComparisonCondition
  | RankingCondition
  | TimeCondition
  | LifecycleCondition;

/**
 * All possible condition type discriminators.
 */
export type ConditionType = Condition['type'];

export const CONDITION_TYPES: ConditionType[] = [
  'simple',
  'metric_comparison',
  'ranking',
  'time',
  'lifecycle',
];

// ============================================================================
// CONDITION GROUP (Recursive AND/OR tree)
// ============================================================================

/**
 * Logical operator for combining conditions.
 */
export type LogicalOperator = 'AND' | 'OR';

/**
 * Recursive condition group supporting arbitrary nesting.
 * Each group has an operator (AND/OR) and an array of children
 * which can be individual conditions or nested groups.
 */
export interface ConditionGroup {
  operator: LogicalOperator;
  conditions: Array<ConditionGroup | Condition>;
}

/**
 * Type guard to check if a node is a ConditionGroup vs a Condition.
 */
export function isConditionGroup(
  node: ConditionGroup | Condition,
): node is ConditionGroup {
  return 'operator' in node && 'conditions' in node && !('type' in node);
}
