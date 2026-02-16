import { Period } from './condition.dto';

// ============================================================================
// FILTER TYPES — JSONB field types (no class-validator, stored in DB)
// ============================================================================

/**
 * Operators for filtering entities by field values.
 * Superset of ConditionOperator — includes string operators.
 */
export type FilterOperator =
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
  | 'BETWEEN';

export const FILTER_OPERATORS: FilterOperator[] = [
  'EQUAL',
  'NOT_EQUAL',
  'CONTAIN',
  'NOT_CONTAIN',
  'START_WITH',
  'END_WITH',
  'REGEX',
  'IN',
  'NOT_IN',
  'GREATER_THAN',
  'GREATER_THAN_OR_EQUAL',
  'LESS_THAN',
  'LESS_THAN_OR_EQUAL',
  'BETWEEN',
];

/**
 * A single filter clause.
 *
 * `field` uses dot-notation for hierarchy: "campaign.name", "adset.status", "metrics.spend".
 * `period` is only relevant for metric-based filters (e.g., "metrics.spend" with period "last_7d").
 */
export interface Filter {
  field: string;
  operator: FilterOperator;
  value: string | number | string[] | number[];
  period?: Period;
}

/**
 * A group of filters connected by AND logic.
 * Multiple FilterGroups are connected by OR logic.
 *
 * Structure: Filter[][] = OR between groups, AND within each group.
 *
 * Example:
 *   [
 *     [filter1, filter2],   // filter1 AND filter2
 *     [filter3]             // OR filter3
 *   ]
 */
export type FilterGroup = Filter[];
