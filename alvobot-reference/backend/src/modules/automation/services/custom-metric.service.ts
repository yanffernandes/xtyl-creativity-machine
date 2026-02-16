import { Injectable, Logger } from '@nestjs/common';

/**
 * CustomMetricService
 *
 * Manages user-defined custom metrics (formulas).
 * Custom metrics are computed from platform metrics using expressions
 * (e.g., "purchase_value / spend" as custom ROAS).
 *
 * CRUD operations:
 * - Create custom metric with name + formula
 * - List custom metrics for a user/workspace
 * - Delete custom metric
 * - Evaluate a custom metric formula against entity metrics
 *
 * TODO: Implement in Phase 11
 */
@Injectable()
export class CustomMetricService {
  private readonly logger = new Logger(CustomMetricService.name);
}
