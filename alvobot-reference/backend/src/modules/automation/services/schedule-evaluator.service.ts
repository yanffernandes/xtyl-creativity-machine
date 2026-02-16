import { Injectable, Logger } from '@nestjs/common';
import {
  Schedule,
  CheckInterval,
  CustomSlot,
  ScheduleDateRange,
  DayOfWeek,
} from '../dto/schedule.dto';

// ============================================================================
// SCHEDULE EVALUATOR SERVICE
// ============================================================================

/**
 * ScheduleEvaluatorService
 *
 * Determines when a rule should run next based on its schedule configuration.
 * Supports:
 * - Frequency-based schedules (every N minutes/hours)
 * - Custom dayparting (specific days + hours)
 * - Date range constraints (start/end dates)
 * - Timezone-aware calculations
 * - Run-once rules (auto-pause after execution)
 */
@Injectable()
export class ScheduleEvaluatorService {
  private readonly logger = new Logger(ScheduleEvaluatorService.name);

  /** Map of CheckInterval values to their duration in minutes */
  private static readonly INTERVAL_MINUTES: Record<string, number> = {
    '15_minutes': 15,
    '30_minutes': 30,
    '1_hour': 60,
    '2_hours': 120,
    '3_hours': 180,
    '4_hours': 240,
    '6_hours': 360,
    '8_hours': 480,
    '12_hours': 720,
    '24_hours': 1440,
    '48_hours': 2880,
    '72_hours': 4320,
  };

  /** Day-of-week mapping: JS getDay() (0=Sun) → our DayOfWeek */
  private static readonly JS_DAY_TO_WEEKDAY: DayOfWeek[] = [
    'sun',
    'mon',
    'tue',
    'wed',
    'thu',
    'fri',
    'sat',
  ];

  /** Ordered weekdays starting from Monday for iteration */
  private static readonly ORDERED_WEEKDAYS: DayOfWeek[] = [
    'mon',
    'tue',
    'wed',
    'thu',
    'fri',
    'sat',
    'sun',
  ];

  /**
   * Calculate the next execution time for a rule.
   *
   * @param schedule - The schedule configuration
   * @param timezone - IANA timezone (e.g., 'America/Sao_Paulo')
   * @param lastRunAt - When the rule last ran (null if never)
   * @returns Next run date (in UTC), or null if the rule should not run again
   */
  calculateNextRun(
    schedule: Schedule,
    timezone: string,
    lastRunAt?: Date | null,
  ): Date | null {
    const now = new Date();

    // Run-once: if already executed, don't schedule again
    if (schedule.runOnce && lastRunAt) {
      return null;
    }

    // Check date range: if end date has passed, don't schedule
    if (
      schedule.dateRange?.end &&
      new Date(schedule.dateRange.end) < now
    ) {
      return null;
    }

    // Check date range: if start date is in the future, schedule for start
    if (
      schedule.dateRange?.start &&
      new Date(schedule.dateRange.start) > now
    ) {
      const startDate = new Date(schedule.dateRange.start);

      if (schedule.type === 'custom' && schedule.customSlots) {
        // For custom, find next slot at or after start date
        const nextSlot = this.findNextCustomSlot(
          schedule.customSlots,
          timezone,
          startDate,
        );
        return this.clampToDateRange(nextSlot, schedule.dateRange);
      }

      return this.clampToDateRange(startDate, schedule.dateRange);
    }

    // Calculate based on schedule type
    if (schedule.type === 'frequency') {
      return this.calculateFrequencyNextRun(
        schedule.checkInterval || '1_hour',
        schedule.dateRange,
        now,
      );
    }

    if (schedule.type === 'custom' && schedule.customSlots) {
      const nextSlot = this.findNextCustomSlot(
        schedule.customSlots,
        timezone,
        now,
      );
      return this.clampToDateRange(nextSlot, schedule.dateRange);
    }

    // Fallback: 1 hour from now
    this.logger.warn('Unknown schedule type, defaulting to 1 hour interval');
    return new Date(now.getTime() + 60 * 60 * 1000);
  }

  /**
   * Check if a rule is due for execution.
   *
   * @param nextRunAt - The scheduled next run time
   * @returns true if the current time is at or past the scheduled time
   */
  isDue(nextRunAt: Date | string | null): boolean {
    if (!nextRunAt) return false;
    const scheduledTime =
      nextRunAt instanceof Date ? nextRunAt : new Date(nextRunAt);
    return scheduledTime <= new Date();
  }

  // ============================================
  // PRIVATE: Frequency-based scheduling
  // ============================================

  /**
   * Calculate next run for frequency-based schedules.
   * Simply adds the interval duration to the current time.
   */
  private calculateFrequencyNextRun(
    interval: CheckInterval,
    dateRange?: ScheduleDateRange,
    fromTime?: Date,
  ): Date | null {
    const minutes = this.intervalToMinutes(interval);
    const from = fromTime || new Date();
    const next = new Date(from.getTime() + minutes * 60 * 1000);
    return this.clampToDateRange(next, dateRange);
  }

  /**
   * Convert a CheckInterval string to minutes.
   */
  private intervalToMinutes(interval: CheckInterval): number {
    return ScheduleEvaluatorService.INTERVAL_MINUTES[interval] || 60;
  }

  // ============================================
  // PRIVATE: Custom slot scheduling
  // ============================================

  /**
   * Find the next matching custom slot (day + hour) after the given time.
   *
   * Custom slots define specific days and hours when the rule can run.
   * This method finds the earliest future slot that matches.
   *
   * Algorithm:
   * 1. Get current day and hour in the target timezone
   * 2. Check remaining hours today
   * 3. Check subsequent days (up to 7 days ahead) for matching slots
   * 4. Return the earliest matching slot as a UTC Date
   *
   * @param slots - Custom schedule slots (day + hours[])
   * @param timezone - IANA timezone
   * @param after - Find slots after this time
   * @returns Next matching slot as UTC Date, or null if none found
   */
  private findNextCustomSlot(
    slots: CustomSlot[],
    timezone: string,
    after: Date,
  ): Date | null {
    if (!slots || slots.length === 0) return null;

    // Build a map of day → sorted hours for quick lookup
    const slotMap = new Map<DayOfWeek, number[]>();
    for (const slot of slots) {
      const existing = slotMap.get(slot.day) || [];
      const merged = [...new Set([...existing, ...slot.hours])].sort(
        (a, b) => a - b,
      );
      slotMap.set(slot.day, merged);
    }

    // Get current day and hour in the target timezone
    const { dayOfWeek: currentDay, hour: currentHour } =
      this.getTimezoneDateTime(after, timezone);

    // Search up to 8 days ahead (covers wrapping around the week)
    for (let dayOffset = 0; dayOffset <= 7; dayOffset++) {
      const targetDate = new Date(
        after.getTime() + dayOffset * 24 * 60 * 60 * 1000,
      );
      const { dayOfWeek: targetDay } = this.getTimezoneDateTime(
        targetDate,
        timezone,
      );

      const hours = slotMap.get(targetDay);
      if (!hours || hours.length === 0) continue;

      for (const hour of hours) {
        // On the first day (dayOffset === 0), skip hours at or before current hour
        if (dayOffset === 0 && hour <= currentHour) continue;

        // Build the target datetime in the timezone
        const slotDate = this.buildDateInTimezone(
          targetDate,
          hour,
          0,
          timezone,
        );

        if (slotDate && slotDate > after) {
          return slotDate;
        }
      }
    }

    // No slot found within the next 7 days
    this.logger.warn(
      'No matching custom slot found within the next 7 days',
    );
    return null;
  }

  // ============================================
  // PRIVATE: Timezone helpers
  // ============================================

  /**
   * Get the current day of week and hour in a given timezone.
   */
  private getTimezoneDateTime(
    date: Date,
    timezone: string,
  ): { dayOfWeek: DayOfWeek; hour: number; minute: number } {
    try {
      // Extract individual components using Intl formatters
      const dayFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        weekday: 'short',
      });
      const hourFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

      const dayStr = dayFormatter.format(date).toLowerCase().slice(0, 3);
      const timeStr = hourFormatter.format(date);
      const [h, m] = timeStr.split(':').map(Number);

      const dayMap: Record<string, DayOfWeek> = {
        mon: 'mon',
        tue: 'tue',
        wed: 'wed',
        thu: 'thu',
        fri: 'fri',
        sat: 'sat',
        sun: 'sun',
      };

      return {
        dayOfWeek: dayMap[dayStr] || 'mon',
        hour: h,
        minute: m,
      };
    } catch (error) {
      this.logger.warn(
        `Failed to get timezone datetime for ${timezone}: ${(error as Error).message}`,
      );
      // Fallback to UTC
      const jsDay = date.getUTCDay();
      return {
        dayOfWeek: ScheduleEvaluatorService.JS_DAY_TO_WEEKDAY[jsDay],
        hour: date.getUTCHours(),
        minute: date.getUTCMinutes(),
      };
    }
  }

  /**
   * Build a Date object for a specific hour in a given timezone.
   * Returns a UTC Date that corresponds to the given local time.
   */
  private buildDateInTimezone(
    referenceDate: Date,
    targetHour: number,
    targetMinute: number,
    timezone: string,
  ): Date | null {
    try {
      // Get the reference date components in the target timezone
      const dateFormatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });

      const dateStr = dateFormatter.format(referenceDate); // "YYYY-MM-DD"
      const hourStr = String(targetHour).padStart(2, '0');
      const minStr = String(targetMinute).padStart(2, '0');

      // Create an ISO string and use Date constructor
      // This is an approximation — for precise timezone handling,
      // a library like date-fns-tz would be ideal.
      // We'll estimate the UTC offset from the reference date.
      const refLocal = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: '2-digit',
        hour12: false,
      });
      const refHourStr = refLocal.format(referenceDate);
      const refLocalHour = parseInt(refHourStr, 10);
      const refUtcHour = referenceDate.getUTCHours();
      const offsetHours = refLocalHour - refUtcHour;

      const targetUtc = new Date(
        `${dateStr}T${hourStr}:${minStr}:00.000Z`,
      );
      targetUtc.setUTCHours(targetUtc.getUTCHours() - offsetHours);

      return targetUtc;
    } catch (error) {
      this.logger.warn(
        `Failed to build date in timezone ${timezone}: ${(error as Error).message}`,
      );
      return null;
    }
  }

  // ============================================
  // PRIVATE: Date range clamping
  // ============================================

  /**
   * Clamp a date to a date range. Returns null if the date exceeds the end.
   * If the date is before the start, returns the start date.
   */
  private clampToDateRange(
    date: Date | null,
    dateRange?: ScheduleDateRange,
  ): Date | null {
    if (!date) return null;
    if (!dateRange) return date;

    // If the date is past the end of the range, the rule is expired
    if (dateRange.end && date > new Date(dateRange.end)) {
      return null;
    }

    // If the date is before the start, move to start
    if (dateRange.start && date < new Date(dateRange.start)) {
      return new Date(dateRange.start);
    }

    return date;
  }
}
