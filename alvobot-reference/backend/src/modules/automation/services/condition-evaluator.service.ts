import { Injectable, Logger } from '@nestjs/common';
import { PlatformEntity } from '../adapters/platform-adapter.interface';
import {
  ConditionGroup,
  Condition,
  ConditionOperator,
  SimpleCondition,
  MetricComparisonCondition,
  RankingCondition,
  TimeCondition,
  LifecycleCondition,
  Period,
  isConditionGroup,
} from '../dto/condition.dto';

// ============================================================================
// CONDITION EVALUATOR SERVICE
// ============================================================================

/**
 * ConditionEvaluatorService
 *
 * Evaluates condition groups (AND/OR tree) against entity metrics.
 * Supports 5 condition types:
 * 1. Simple — metric vs fixed numeric value
 * 2. MetricComparison — metric vs another metric (cross-period)
 * 3. Ranking — top/bottom N entities or N% by a metric
 * 4. Time — time-of-day condition (timezone-aware)
 * 5. Lifecycle — hours/days since entity creation
 */
@Injectable()
export class ConditionEvaluatorService {
  private readonly logger = new Logger(ConditionEvaluatorService.name);

  /**
   * Evaluate a ConditionGroup recursively (AND/OR tree).
   *
   * @param conditionGroup - Root condition group to evaluate
   * @param entity - The entity being evaluated
   * @param allEntities - All entities in scope (needed for ranking conditions)
   * @param timezone - IANA timezone for time conditions
   * @returns true if the entity satisfies the condition group
   */
  evaluate(
    conditionGroup: ConditionGroup,
    entity: PlatformEntity,
    allEntities?: PlatformEntity[],
    timezone?: string,
  ): boolean {
    if (!conditionGroup || !conditionGroup.conditions) return true;

    const { operator, conditions } = conditionGroup;

    if (conditions.length === 0) return true;

    if (operator === 'AND') {
      return conditions.every((c) =>
        isConditionGroup(c)
          ? this.evaluate(c, entity, allEntities, timezone)
          : this.evaluateLeaf(c, entity, allEntities, timezone),
      );
    } else {
      // OR
      return conditions.some((c) =>
        isConditionGroup(c)
          ? this.evaluate(c, entity, allEntities, timezone)
          : this.evaluateLeaf(c, entity, allEntities, timezone),
      );
    }
  }

  /**
   * Evaluate a single leaf condition (not a group).
   * Dispatches to the appropriate condition type handler.
   */
  private evaluateLeaf(
    condition: Condition,
    entity: PlatformEntity,
    allEntities?: PlatformEntity[],
    timezone?: string,
  ): boolean {
    try {
      switch (condition.type) {
        case 'simple':
          return this.evaluateSimple(condition, entity);
        case 'metric_comparison':
          return this.evaluateMetricComparison(condition, entity);
        case 'ranking':
          return this.evaluateRanking(
            condition,
            entity,
            allEntities || [],
          );
        case 'time':
          return this.evaluateTime(condition, timezone);
        case 'lifecycle':
          return this.evaluateLifecycle(condition, entity);
        default:
          this.logger.warn(
            `Unknown condition type: ${(condition as Condition).type}`,
          );
          return false;
      }
    } catch (error) {
      this.logger.error(
        `Condition evaluation error (${condition.type}): ${(error as Error).message}`,
      );
      return false;
    }
  }

  // ============================================
  // CONDITION TYPE: Simple
  // ============================================

  /**
   * Simple condition: metric_period op value.
   * Example: spend last_3d_with_today > 50
   */
  private evaluateSimple(
    condition: SimpleCondition,
    entity: PlatformEntity,
  ): boolean {
    const metricValue = this.getMetricValue(
      entity,
      condition.metric,
      condition.period,
    );

    if (condition.operator === 'BETWEEN') {
      // For BETWEEN with a simple condition, value should be interpreted
      // as the lower bound. This case is unusual for simple conditions.
      this.logger.warn(
        'BETWEEN operator on SimpleCondition is unusual; use MetricComparison instead',
      );
      return false;
    }

    return this.compareValues(metricValue, condition.operator, condition.value);
  }

  // ============================================
  // CONDITION TYPE: MetricComparison
  // ============================================

  /**
   * MetricComparison: metric_period op compare_metric_compare_period * multiplier.
   * Example: ROAS last_3d < 70% of ROAS last_7d
   *   → getMetric(ROAS, last_3d) < getMetric(ROAS, last_7d) * 0.7
   */
  private evaluateMetricComparison(
    condition: MetricComparisonCondition,
    entity: PlatformEntity,
  ): boolean {
    const value = this.getMetricValue(
      entity,
      condition.metric,
      condition.period,
    );
    const compareValue =
      this.getMetricValue(
        entity,
        condition.compareMetric,
        condition.comparePeriod,
      ) * condition.compareMultiplier;

    return this.compareValues(value, condition.operator, compareValue);
  }

  // ============================================
  // CONDITION TYPE: Ranking
  // ============================================

  /**
   * Ranking: top/bottom N/N% by metric.
   * Example: bottom 20% by ROAS last_7d
   *
   * Sorts all entities by the metric, then checks if the target entity
   * is within the top/bottom N or N%.
   */
  private evaluateRanking(
    condition: RankingCondition,
    entity: PlatformEntity,
    allEntities: PlatformEntity[],
  ): boolean {
    if (allEntities.length === 0) return false;

    let entities = allEntities;

    // Optionally exclude zeros
    if (!condition.includeZeros) {
      entities = entities.filter(
        (e) => this.getMetricValue(e, condition.metric, condition.period) !== 0,
      );
    }

    if (entities.length === 0) return false;

    // Sort by metric value
    const sorted = [...entities].sort((a, b) => {
      const aVal = this.getMetricValue(a, condition.metric, condition.period);
      const bVal = this.getMetricValue(b, condition.metric, condition.period);
      // For 'top': sort descending (highest first)
      // For 'bottom': sort ascending (lowest first)
      return condition.position === 'bottom' ? aVal - bVal : bVal - aVal;
    });

    // Calculate how many entities qualify
    const count =
      condition.rankingType === 'percentage'
        ? Math.max(1, Math.ceil(sorted.length * (condition.rankingValue / 100)))
        : Math.min(condition.rankingValue, sorted.length);

    const qualifyingEntities = sorted.slice(0, count);
    return qualifyingEntities.some((e) => e.id === entity.id);
  }

  // ============================================
  // CONDITION TYPE: Time
  // ============================================

  /**
   * Time: current time in timezone vs value.
   * Example: between 08:00 and 22:00
   *
   * Uses Intl.DateTimeFormat for timezone-aware time extraction.
   */
  private evaluateTime(
    condition: TimeCondition,
    timezone?: string,
  ): boolean {
    const tz = timezone || 'America/Sao_Paulo';
    const now = new Date();

    const currentMinutes = this.getCurrentMinutesInTimezone(now, tz);
    const valueMinutes = this.timeToMinutes(condition.value);

    if (condition.operator === 'BETWEEN' && condition.valueEnd) {
      const endMinutes = this.timeToMinutes(condition.valueEnd);

      // Handle overnight ranges (e.g., 22:00 to 06:00)
      if (endMinutes < valueMinutes) {
        return currentMinutes >= valueMinutes || currentMinutes <= endMinutes;
      }
      return currentMinutes >= valueMinutes && currentMinutes <= endMinutes;
    }

    return this.compareValues(currentMinutes, condition.operator, valueMinutes);
  }

  // ============================================
  // CONDITION TYPE: Lifecycle
  // ============================================

  /**
   * Lifecycle: hours/days since entity creation.
   * Example: hours_since_creation > 72
   */
  private evaluateLifecycle(
    condition: LifecycleCondition,
    entity: PlatformEntity,
  ): boolean {
    if (!entity.createdTime) {
      this.logger.debug(
        `Entity ${entity.id} has no createdTime, lifecycle condition cannot be evaluated`,
      );
      return false;
    }

    const created = new Date(entity.createdTime);
    if (isNaN(created.getTime())) {
      this.logger.warn(
        `Entity ${entity.id} has invalid createdTime: ${entity.createdTime}`,
      );
      return false;
    }

    const now = new Date();
    const diffMs = now.getTime() - created.getTime();

    const value =
      condition.metric === 'hours_since_creation'
        ? diffMs / (1000 * 60 * 60) // Convert to hours
        : diffMs / (1000 * 60 * 60 * 24); // Convert to days

    return this.compareValues(value, condition.operator, condition.value);
  }

  // ============================================
  // HELPERS
  // ============================================

  /**
   * Compare two numeric values using a condition operator.
   */
  private compareValues(
    a: number,
    operator: ConditionOperator,
    b: number,
  ): boolean {
    switch (operator) {
      case 'GREATER_THAN':
        return a > b;
      case 'GREATER_THAN_OR_EQUAL':
        return a >= b;
      case 'LESS_THAN':
        return a < b;
      case 'LESS_THAN_OR_EQUAL':
        return a <= b;
      case 'EQUAL':
        return a === b;
      case 'NOT_EQUAL':
        return a !== b;
      case 'BETWEEN':
        // For BETWEEN on compareValues, this is handled at the condition level
        this.logger.warn(
          'BETWEEN operator on compareValues is not applicable here',
        );
        return false;
      default:
        this.logger.warn(`Unknown condition operator: ${operator}`);
        return false;
    }
  }

  /**
   * Get a metric value from an entity, trying period-suffixed key first.
   *
   * Resolution order:
   * 1. entity.metrics["metric_period"] (e.g., "spend_last_7d")
   * 2. entity.metrics["metric"] (e.g., "spend")
   * 3. 0 (default fallback)
   */
  getMetricValue(
    entity: PlatformEntity,
    metric: string,
    period: Period,
  ): number {
    const periodKey = `${metric}_${period}`;

    if (entity.metrics[periodKey] !== undefined) {
      return entity.metrics[periodKey];
    }

    if (entity.metrics[metric] !== undefined) {
      return entity.metrics[metric];
    }

    return 0;
  }

  /**
   * Convert "HH:mm" or "HH:MM" time string to total minutes since midnight.
   */
  private timeToMinutes(time: string): number {
    const parts = time.split(':');
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;
    return h * 60 + m;
  }

  /**
   * Get the current time in minutes since midnight for a given timezone.
   */
  private getCurrentMinutesInTimezone(date: Date, timezone: string): number {
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

      const formatted = formatter.format(date); // "HH:MM"
      return this.timeToMinutes(formatted);
    } catch (error) {
      this.logger.warn(
        `Invalid timezone "${timezone}", falling back to UTC: ${(error as Error).message}`,
      );
      return date.getUTCHours() * 60 + date.getUTCMinutes();
    }
  }
}
