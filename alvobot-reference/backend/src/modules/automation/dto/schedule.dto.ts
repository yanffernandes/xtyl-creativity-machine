// ============================================================================
// SCHEDULE TYPES — JSONB field types (no class-validator, stored in DB)
// ============================================================================

/**
 * Check interval for frequency-based schedules.
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
  | '72_hours';

export const CHECK_INTERVALS: CheckInterval[] = [
  '15_minutes',
  '30_minutes',
  '1_hour',
  '2_hours',
  '3_hours',
  '4_hours',
  '6_hours',
  '8_hours',
  '12_hours',
  '24_hours',
  '48_hours',
  '72_hours',
];

/**
 * Days of the week for custom schedule slots.
 */
export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export const DAYS_OF_WEEK: DayOfWeek[] = [
  'mon',
  'tue',
  'wed',
  'thu',
  'fri',
  'sat',
  'sun',
];

/**
 * A custom schedule slot: a specific day with specific hours (0-23).
 * Used for dayparting — running rules only during business hours, etc.
 */
export interface CustomSlot {
  day: DayOfWeek;
  hours: number[]; // Array of hours 0-23
}

/**
 * Optional date range to limit when the rule is eligible to execute.
 * Both start and end are optional — omit to have no boundary.
 */
export interface ScheduleDateRange {
  start?: string; // ISO 8601 datetime
  end?: string; // ISO 8601 datetime
}

/**
 * Schedule configuration for an automation rule.
 *
 * - `frequency`: Runs at a fixed interval (e.g., every 1 hour), 24/7.
 * - `custom`: Runs only during specific day/hour slots (dayparting).
 *
 * Both types support optional dateRange and runOnce.
 */
export interface Schedule {
  type: 'frequency' | 'custom';

  /** Check interval when type='frequency'. */
  checkInterval?: CheckInterval;

  /** Custom day/hour slots when type='custom'. */
  customSlots?: CustomSlot[];

  /** Optional date range to limit rule execution period. */
  dateRange?: ScheduleDateRange;

  /**
   * When true, the rule executes once and then auto-pauses.
   * @default false
   */
  runOnce?: boolean;
}
