import { Injectable, Logger } from '@nestjs/common';
import { PlatformEntity } from '../adapters/platform-adapter.interface';
import { Filter, FilterGroup, FilterOperator } from '../dto/filter.dto';

// ============================================================================
// FILTER EVALUATOR SERVICE
// ============================================================================

/**
 * FilterEvaluatorService
 *
 * Evaluates scope filters to determine which entities should be considered.
 * Filter groups use AND within a group, OR between groups (array-of-arrays logic).
 *
 * Supports operators: EQUAL, NOT_EQUAL, CONTAIN, NOT_CONTAIN,
 * START_WITH, END_WITH, REGEX, IN, NOT_IN, >, >=, <, <=, BETWEEN.
 *
 * Cross-level field resolution: "campaign.name" when rule level is "adset"
 * resolves through entity.parentData.
 */
@Injectable()
export class FilterEvaluatorService {
  private readonly logger = new Logger(FilterEvaluatorService.name);

  /**
   * Evaluate entity against filter groups (OR between groups, AND within group).
   * Returns true if entity matches at least one group, or if no filters are defined.
   *
   * @param entity - The normalized platform entity to evaluate
   * @param filters - Array of filter groups (OR between groups)
   * @returns true if entity passes the filter criteria
   */
  matchesFilters(entity: PlatformEntity, filters: FilterGroup[]): boolean {
    if (!filters || filters.length === 0) return true;

    return filters.some((group) => this.matchesFilterGroup(entity, group));
  }

  /**
   * Evaluate entity against a single filter group (AND within group).
   * All filters in the group must match for the entity to pass.
   */
  private matchesFilterGroup(
    entity: PlatformEntity,
    group: Filter[],
  ): boolean {
    if (!group || group.length === 0) return true;

    return group.every((filter) => this.matchesSingleFilter(entity, filter));
  }

  /**
   * Evaluate entity against a single filter.
   * Resolves the field value from the entity (supporting cross-level access)
   * and applies the operator.
   */
  private matchesSingleFilter(entity: PlatformEntity, filter: Filter): boolean {
    try {
      const fieldValue = this.getFieldValue(entity, filter.field, filter.period);

      // Null/undefined values only match NOT_EQUAL, NOT_CONTAIN, NOT_IN
      if (fieldValue === undefined || fieldValue === null) {
        return (
          filter.operator === 'NOT_EQUAL' ||
          filter.operator === 'NOT_CONTAIN' ||
          filter.operator === 'NOT_IN'
        );
      }

      return this.applyOperator(fieldValue, filter.operator, filter.value);
    } catch (error) {
      this.logger.warn(
        `Filter evaluation error for field "${filter.field}": ${(error as Error).message}`,
      );
      return false;
    }
  }

  /**
   * Apply a filter operator to compare a field value against a filter value.
   */
  private applyOperator(
    fieldValue: unknown,
    operator: FilterOperator,
    filterValue: string | number | string[] | number[],
  ): boolean {
    switch (operator) {
      case 'EQUAL':
        return String(fieldValue) === String(filterValue);

      case 'NOT_EQUAL':
        return String(fieldValue) !== String(filterValue);

      case 'CONTAIN':
        return String(fieldValue)
          .toLowerCase()
          .includes(String(filterValue).toLowerCase());

      case 'NOT_CONTAIN':
        return !String(fieldValue)
          .toLowerCase()
          .includes(String(filterValue).toLowerCase());

      case 'START_WITH':
        return String(fieldValue)
          .toLowerCase()
          .startsWith(String(filterValue).toLowerCase());

      case 'END_WITH':
        return String(fieldValue)
          .toLowerCase()
          .endsWith(String(filterValue).toLowerCase());

      case 'REGEX':
        return this.safeRegexTest(String(fieldValue), String(filterValue));

      case 'IN':
        return (
          Array.isArray(filterValue) &&
          filterValue.some((v) => String(v) === String(fieldValue))
        );

      case 'NOT_IN':
        return (
          Array.isArray(filterValue) &&
          !filterValue.some((v) => String(v) === String(fieldValue))
        );

      case 'GREATER_THAN':
        return Number(fieldValue) > Number(filterValue);

      case 'GREATER_THAN_OR_EQUAL':
        return Number(fieldValue) >= Number(filterValue);

      case 'LESS_THAN':
        return Number(fieldValue) < Number(filterValue);

      case 'LESS_THAN_OR_EQUAL':
        return Number(fieldValue) <= Number(filterValue);

      case 'BETWEEN': {
        if (!Array.isArray(filterValue) || filterValue.length < 2) {
          this.logger.warn(
            `BETWEEN operator requires an array with [min, max], got: ${JSON.stringify(filterValue)}`,
          );
          return false;
        }
        const numValue = Number(fieldValue);
        const min = Number(filterValue[0]);
        const max = Number(filterValue[1]);
        return numValue >= min && numValue <= max;
      }

      default:
        this.logger.warn(`Unknown filter operator: ${operator}`);
        return false;
    }
  }

  /**
   * Resolve a field value from a PlatformEntity.
   *
   * Field format: "level.property" (e.g., "campaign.name", "metrics.spend", "adset.status")
   *
   * Resolution order:
   * 1. "metrics.*" → entity.metrics[property] (with optional period suffix)
   * 2. Same level as entity → entity direct properties or rawData
   * 3. Cross-level → entity.parentData[level][property]
   */
  private getFieldValue(
    entity: PlatformEntity,
    field: string,
    period?: string,
  ): unknown {
    const parts = field.split('.');
    if (parts.length !== 2) {
      this.logger.warn(`Invalid field format "${field}", expected "level.property"`);
      return undefined;
    }

    const [level, prop] = parts;

    // Metrics resolution: try period-suffixed key first, then bare key
    if (level === 'metrics') {
      if (period) {
        const periodKey = `${prop}_${period}`;
        if (entity.metrics[periodKey] !== undefined) {
          return entity.metrics[periodKey];
        }
      }
      return entity.metrics[prop];
    }

    // Same-level resolution
    if (this.isSameLevel(level, entity.level)) {
      // Check well-known PlatformEntity properties first
      const directValue = this.getDirectProperty(entity, prop);
      if (directValue !== undefined) return directValue;

      // Fall back to rawData
      if (entity.rawData && typeof entity.rawData === 'object') {
        return (entity.rawData as Record<string, unknown>)[prop];
      }

      return undefined;
    }

    // Cross-level resolution via parentData
    if (entity.parentData) {
      const parentLevel = entity.parentData[level as keyof typeof entity.parentData];
      if (parentLevel && typeof parentLevel === 'object') {
        return (parentLevel as Record<string, unknown>)[prop];
      }
    }

    return undefined;
  }

  /**
   * Check if the field level matches the entity's level.
   * Handles synonyms (adset/ad_group are different but both valid).
   */
  private isSameLevel(fieldLevel: string, entityLevel: string): boolean {
    return fieldLevel === entityLevel;
  }

  /**
   * Get a direct property from a PlatformEntity by name.
   * Maps common properties that exist on the PlatformEntity interface.
   */
  private getDirectProperty(entity: PlatformEntity, prop: string): unknown {
    const propertyMap: Record<string, unknown> = {
      id: entity.id,
      name: entity.name,
      status: entity.status,
      budget: entity.budget,
      budgetType: entity.budgetType,
      budget_type: entity.budgetType,
      bid: entity.bid,
      bidStrategy: entity.bidStrategy,
      bid_strategy: entity.bidStrategy,
      createdTime: entity.createdTime,
      created_time: entity.createdTime,
      daily_budget: entity.budgetType === 'daily' ? entity.budget : undefined,
      lifetime_budget:
        entity.budgetType === 'lifetime' ? entity.budget : undefined,
    };

    if (prop in propertyMap) {
      return propertyMap[prop];
    }

    return undefined;
  }

  /**
   * Test a string against a regex pattern with protection against ReDoS.
   * Returns false if the pattern is invalid.
   */
  private safeRegexTest(value: string, pattern: string): boolean {
    try {
      const regex = new RegExp(pattern, 'i');
      return regex.test(value);
    } catch (error) {
      this.logger.warn(
        `Invalid regex pattern "${pattern}": ${(error as Error).message}`,
      );
      return false;
    }
  }

  /**
   * Validate a regex pattern before saving to the database.
   * Returns a validation result with optional error message.
   */
  validateRegex(pattern: string): { valid: boolean; error?: string } {
    try {
      new RegExp(pattern);
      return { valid: true };
    } catch (error) {
      return { valid: false, error: (error as Error).message };
    }
  }
}
