import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Internal services
import { FilterEvaluatorService } from './filter-evaluator.service';
import { ConditionEvaluatorService } from './condition-evaluator.service';
import { ActionExecutorService } from './action-executor.service';
import { ScheduleEvaluatorService } from './schedule-evaluator.service';
import { AutomationNotificationService } from './notification.service';

// Adapters
import { GoogleAutomationAdapter } from '../adapters/google-automation.adapter';
import { MetaAutomationAdapter } from '../adapters/meta-automation.adapter';
import {
  PlatformAutomationAdapter,
  PlatformEntity,
} from '../adapters/platform-adapter.interface';

// Types
import { AutomationRuleEntity } from '../entities/automation-rule.entity';
import {
  ExecutionLogEntity,
  CreateExecutionLogInput,
  ExecutionSummary,
  AffectedEntityRecord,
  ExecutionErrorRecord,
} from '../entities/execution-log.entity';
import { ExecutionStatus } from '../dto/execution-log.dto';
import { PreviewResultDto, Platform } from '../dto/automation-rule.dto';
import { Task, FrequencyCap } from '../dto/task.dto';
import {
  ConditionGroup,
  Condition,
  isConditionGroup,
} from '../dto/condition.dto';

// Constants
import { FREQUENCY_CAP_OPTIONS } from '../constants/enums';

// ============================================================================
// AUTOMATION ENGINE SERVICE
// ============================================================================

/** Maximum entities to process in a single rule execution */
const MAX_ENTITIES_PER_EXECUTION = 2000;

/** Table names */
const TABLE_EXECUTION_LOGS = 'automation_execution_logs';
const TABLE_EXECUTIONS = 'automation_executions';
const TABLE_RULES = 'automation_rules';

/**
 * AutomationEngineService
 *
 * Core engine that orchestrates rule execution. This is the main entry point
 * for running an automation rule through the complete pipeline:
 *
 *   Fetch → Filter → Evaluate → Check Cap → Execute → Log → Notify
 *
 * Also provides preview (dry-run) functionality that follows the same
 * pipeline but stops before executing actions.
 */
@Injectable()
export class AutomationEngineService {
  private readonly logger = new Logger(AutomationEngineService.name);
  private readonly supabase: SupabaseClient;

  constructor(
    private readonly configService: ConfigService,
    private readonly filterEvaluator: FilterEvaluatorService,
    private readonly conditionEvaluator: ConditionEvaluatorService,
    private readonly actionExecutor: ActionExecutorService,
    private readonly scheduleEvaluator: ScheduleEvaluatorService,
    private readonly notificationService: AutomationNotificationService,
    private readonly googleAdapter: GoogleAutomationAdapter,
    private readonly metaAdapter: MetaAutomationAdapter,
  ) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseServiceKey = this.configService.get<string>(
      'SUPABASE_SERVICE_KEY',
    );

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error(
        'SUPABASE_URL and SUPABASE_SERVICE_KEY are required for AutomationEngineService',
      );
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  // ============================================
  // PUBLIC: Execute Rule
  // ============================================

  /**
   * Execute a single automation rule through the complete pipeline.
   *
   * Pipeline phases:
   * 1. FETCH — Get entities from platform API
   * 2. FILTER — Apply scope filters to narrow entities
   * 3. EVALUATE — Check conditions per task for each filtered entity
   * 4. CAP CHECK — Verify frequency cap for each entity+task
   * 5. EXECUTE — Perform the action via platform adapter
   * 6. LOG — Record execution details in the database
   * 7. NOTIFY — Send notifications if configured
   *
   * @param rule - The automation rule entity to execute
   * @param options - Optional execution options
   * @param options.isManual - If true, don't update next_run_at (manual execution)
   * @returns ExecutionLogEntity with full execution details
   */
  async executeRule(
    rule: AutomationRuleEntity,
    options?: { isManual?: boolean },
  ): Promise<ExecutionLogEntity> {
    const startTime = Date.now();
    const adapter = this.getAdapter(rule.platform);

    const summary: ExecutionSummary = {
      entities_evaluated: 0,
      entities_matched_filters: 0,
      entities_matched_conditions: 0,
      entities_affected: 0,
      entities_skipped_cap: 0,
      errors_count: 0,
    };
    const affectedEntities: AffectedEntityRecord[] = [];
    const errors: ExecutionErrorRecord[] = [];

    try {
      // ── PHASE 1: RESOLVE CONNECTIONS & FETCH ──
      const connectionMap = await this.resolveConnectionsForAdAccounts(
        rule.platform,
        rule.connection_ids,
        rule.ad_account_ids || [],
      );

      if (connectionMap.size === 0) {
        const log = await this.createAndSaveLog(
          rule,
          'failed',
          summary,
          affectedEntities,
          [this.makeError('No active ad accounts found for this rule')],
          startTime,
        );
        await this.updateRuleAfterExecution(rule, options?.isManual);
        return log;
      }

      // Collect all periods needed by conditions across all tasks
      const periods = this.collectPeriods(rule.tasks);
      const allFetchedEntities: PlatformEntity[] = [];

      for (const [connectionId, accountIds] of connectionMap) {
        // Check connection health
        const health = await adapter.checkConnection(connectionId);
        if (!health.isHealthy) {
          this.logger.warn(
            `Connection ${connectionId} is unhealthy: ${health.lastError || 'unknown'}. Skipping.`,
          );
          continue;
        }

        // Fetch entities for this connection's accounts
        try {
          const entities = await adapter.fetchEntities(
            connectionId,
            accountIds,
            rule.level,
            rule.filters,
            periods,
            rule.attribution,
            rule.google_campaign_type,
          );
          allFetchedEntities.push(...entities);
        } catch (fetchError) {
          this.logger.error(
            `Failed to fetch entities from connection ${connectionId}: ${(fetchError as Error).message}`,
          );
          // Continue with other connections
        }
      }

      summary.entities_evaluated = allFetchedEntities.length;

      // Safety limit
      if (allFetchedEntities.length > MAX_ENTITIES_PER_EXECUTION) {
        this.logger.warn(
          `Rule ${rule.id}: ${allFetchedEntities.length} entities exceed ${MAX_ENTITIES_PER_EXECUTION} limit.`,
        );
      }

      const entitiesToProcess = allFetchedEntities.slice(
        0,
        MAX_ENTITIES_PER_EXECUTION,
      );

      // ── PHASE 2: FILTER ──
      const filtered = entitiesToProcess.filter((e) =>
        this.filterEvaluator.matchesFilters(e, rule.filters),
      );
      summary.entities_matched_filters = filtered.length;

      if (filtered.length === 0) {
        this.logger.debug(
          `Rule ${rule.id}: No entities matched filters (${entitiesToProcess.length} evaluated)`,
        );
        const log = await this.createAndSaveLog(
          rule,
          'skipped',
          summary,
          affectedEntities,
          errors,
          startTime,
        );
        await this.updateRuleAfterExecution(rule, options?.isManual);
        return log;
      }

      // ── PHASE 3: EVALUATE + EXECUTE per task ──
      for (let taskIndex = 0; taskIndex < rule.tasks.length; taskIndex++) {
        const task = rule.tasks[taskIndex];

        for (const entity of filtered) {
          try {
            // Evaluate conditions
            const matches = this.conditionEvaluator.evaluate(
              task.conditions,
              entity,
              filtered,
              rule.timezone,
            );

            if (!matches) continue;
            summary.entities_matched_conditions++;

            // ── PHASE 4: CAP CHECK ──
            const capped = await this.checkFrequencyCap(
              rule.id,
              taskIndex,
              entity.id,
              task.frequencyCap,
            );
            if (capped) {
              summary.entities_skipped_cap++;
              affectedEntities.push(
                this.makeAffectedRecord(
                  entity,
                  taskIndex,
                  task,
                  'skipped',
                  undefined,
                  undefined,
                  'Frequency cap reached',
                ),
              );
              continue;
            }

            // ── PHASE 5: EXECUTE ──
            const result = await this.actionExecutor.execute(
              rule.platform,
              entity.connectionId,
              entity,
              task,
              rule.user_id,
            );

            if (result.success) {
              summary.entities_affected++;

              // Record execution for frequency cap tracking
              await this.recordExecution(
                rule.id,
                taskIndex,
                entity.id,
                rule.platform,
              );

              affectedEntities.push(
                this.makeAffectedRecord(
                  entity,
                  taskIndex,
                  task,
                  'success',
                  result.previousValue,
                  result.newValue,
                ),
              );
            } else {
              summary.errors_count++;
              errors.push(
                this.makeError(
                  result.error || 'Unknown error',
                  entity.id,
                  entity.name,
                  taskIndex,
                  task.action,
                ),
              );
              affectedEntities.push(
                this.makeAffectedRecord(
                  entity,
                  taskIndex,
                  task,
                  'failed',
                  result.previousValue,
                  result.newValue,
                  result.error,
                ),
              );
            }
          } catch (entityError) {
            // Individual entity failure should not crash the entire execution
            const errorMsg =
              entityError instanceof Error
                ? entityError.message
                : String(entityError);

            this.logger.error(
              `Rule ${rule.id} task ${taskIndex}: Entity ${entity.id} error: ${errorMsg}`,
            );

            summary.errors_count++;
            errors.push(
              this.makeError(
                errorMsg,
                entity.id,
                entity.name,
                taskIndex,
                task.action,
                true,
              ),
            );
          }
        }
      }

      // ── PHASE 6: Determine status ──
      const status = this.determineExecutionStatus(summary);

      // ── PHASE 7: LOG ──
      const log = await this.createAndSaveLog(
        rule,
        status,
        summary,
        affectedEntities,
        errors,
        startTime,
      );

      // ── PHASE 8: NOTIFY ──
      try {
        await this.notificationService.sendExecutionNotification(
          rule,
          {
            status,
            entities_affected: summary.entities_affected,
            errors_count: summary.errors_count,
            affected_entities: affectedEntities,
            errors,
          },
          rule.notifications,
        );
      } catch (notifyError) {
        this.logger.warn(
          `Rule ${rule.id}: Notification failed (non-critical): ${(notifyError as Error).message}`,
        );
      }

      // Update rule timestamps (skip next_run_at update for manual execution)
      await this.updateRuleAfterExecution(rule, options?.isManual);

      return log;
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : String(error);

      this.logger.error(
        `Rule ${rule.id} execution failed with exception: ${errorMsg}`,
      );

      errors.push(
        this.makeError(errorMsg, undefined, undefined, undefined, undefined, false),
      );
      summary.errors_count++;

      return this.createAndSaveLog(
        rule,
        'failed',
        summary,
        affectedEntities,
        errors,
        startTime,
      );
    }
  }

  // ============================================
  // PUBLIC: Preview (Dry Run)
  // ============================================

  /**
   * Preview which entities would be affected by a rule without executing actions.
   * Follows the same pipeline as executeRule but stops before the execute phase.
   *
   * @param rule - The automation rule entity to preview
   * @returns PreviewResultDto with matching entities and summary
   */
  async previewRule(rule: AutomationRuleEntity): Promise<PreviewResultDto> {
    const adapter = this.getAdapter(rule.platform);
    const warnings: string[] = [];

    const result: PreviewResultDto = {
      matchingEntities: [],
      summary: {
        totalEvaluated: 0,
        totalMatchedFilters: 0,
        totalMatchedConditions: 0,
        totalWouldBeAffected: 0,
      },
      previewedAt: new Date().toISOString(),
    };

    try {
      // Resolve connections from ad accounts
      const connectionMap = await this.resolveConnectionsForAdAccounts(
        rule.platform,
        rule.connection_ids,
        rule.ad_account_ids || [],
      );

      if (connectionMap.size === 0) {
        this.logger.warn('Preview: No active ad accounts found');
        return result;
      }

      // Fetch entities from all connections
      const periods = this.collectPeriods(rule.tasks);
      const allFetchedEntities: PlatformEntity[] = [];

      for (const [connectionId, accountIds] of connectionMap) {
        const health = await adapter.checkConnection(connectionId);
        if (!health.isHealthy) {
          this.logger.warn(
            `Preview: Connection ${connectionId} is unhealthy: ${health.lastError || 'unknown'}. Skipping.`,
          );
          continue;
        }

        try {
          const entities = await adapter.fetchEntities(
            connectionId,
            accountIds,
            rule.level,
            rule.filters,
            periods,
            rule.attribution,
            rule.google_campaign_type,
          );
          allFetchedEntities.push(...entities);
        } catch (fetchError) {
          this.logger.error(
            `Preview: Failed to fetch from connection ${connectionId}: ${(fetchError as Error).message}`,
          );
        }
      }

      result.summary.totalEvaluated = allFetchedEntities.length;

      // Entity count warning when > 2000
      if (allFetchedEntities.length > MAX_ENTITIES_PER_EXECUTION) {
        warnings.push(
          `Esta regra encontrou ${allFetchedEntities.length} entidades, mas apenas as primeiras ${MAX_ENTITIES_PER_EXECUTION} serão processadas. ` +
            `Considere adicionar filtros mais restritivos para reduzir o escopo.`,
        );
      }

      const entitiesToProcess = allFetchedEntities.slice(
        0,
        MAX_ENTITIES_PER_EXECUTION,
      );

      // Filter
      const filtered = entitiesToProcess.filter((e) =>
        this.filterEvaluator.matchesFilters(e, rule.filters),
      );
      result.summary.totalMatchedFilters = filtered.length;

      // Evaluate per entity
      for (const entity of filtered) {
        const taskResults: PreviewResultDto['matchingEntities'][number]['wouldExecuteTasks'] =
          [];

        let entityMatchedAnyCondition = false;

        for (let taskIndex = 0; taskIndex < rule.tasks.length; taskIndex++) {
          const task = rule.tasks[taskIndex];

          const conditionsMet = this.conditionEvaluator.evaluate(
            task.conditions,
            entity,
            filtered,
            rule.timezone,
          );

          if (conditionsMet) {
            entityMatchedAnyCondition = true;
          }

          // Check frequency cap (for preview, we still check)
          const skippedByCap = conditionsMet
            ? await this.checkFrequencyCap(
                rule.id,
                taskIndex,
                entity.id,
                task.frequencyCap,
              )
            : false;

          taskResults.push({
            taskIndex,
            action: task.action,
            conditionsMet,
            skippedByCap,
          });
        }

        if (entityMatchedAnyCondition) {
          result.summary.totalMatchedConditions++;
        }

        const wouldBeAffected = taskResults.some(
          (t) => t.conditionsMet && !t.skippedByCap,
        );
        if (wouldBeAffected) {
          result.summary.totalWouldBeAffected++;
        }

        // Only include entities that matched at least one condition
        if (entityMatchedAnyCondition) {
          result.matchingEntities.push({
            entityId: entity.id,
            entityName: entity.name,
            entityType: entity.level,
            platform: entity.platform as Platform,
            currentMetrics: entity.metrics,
            wouldExecuteTasks: taskResults,
          });
        }
      }
    } catch (error) {
      this.logger.error(
        `Preview failed for rule ${rule.id}: ${(error as Error).message}`,
      );
    }

    // Attach warnings if any
    if (warnings.length > 0) {
      result.warnings = warnings;
    }

    return result;
  }

  // ============================================
  // PRIVATE: Frequency Cap
  // ============================================

  /**
   * Check if an entity+task combination is capped (should be skipped).
   *
   * Frequency cap logic:
   * - 'no_limit': never capped
   * - 'once_in_lifetime': capped if any execution exists
   * - Others: capped if last execution is within the cap window
   *
   * @returns true if the entity is capped (should be SKIPPED)
   */
  private async checkFrequencyCap(
    ruleId: string,
    taskIndex: number,
    entityId: string,
    cap: FrequencyCap,
  ): Promise<boolean> {
    if (cap === 'no_limit') return false;

    try {
      const { data, error } = await this.supabase
        .from(TABLE_EXECUTIONS)
        .select('last_execution_at')
        .eq('rule_id', ruleId)
        .eq('task_index', taskIndex)
        .eq('entity_id', entityId)
        .maybeSingle();

      if (error) {
        this.logger.warn(
          `Frequency cap check failed: ${error.message}. Allowing execution.`,
        );
        return false; // On error, allow execution rather than blocking
      }

      if (!data) return false; // No previous execution, not capped

      // once_in_lifetime: any previous execution means capped
      if (cap === 'once_in_lifetime') return true;

      // For time-based caps, check if we're within the window
      const lastExecution = new Date(data.last_execution_at);
      const capMinutes = this.getCapMinutes(cap);

      if (capMinutes <= 0) return false;

      const elapsedMs = Date.now() - lastExecution.getTime();
      const elapsedMinutes = elapsedMs / (1000 * 60);

      return elapsedMinutes < capMinutes;
    } catch (error) {
      this.logger.warn(
        `Frequency cap check exception: ${(error as Error).message}. Allowing execution.`,
      );
      return false;
    }
  }

  /**
   * Get the cap window in minutes for a given FrequencyCap value.
   */
  private getCapMinutes(cap: FrequencyCap): number {
    const option = FREQUENCY_CAP_OPTIONS.find((o) => o.value === cap);
    if (!option) return 0;
    // Infinity from the constant is fine — any elapsed time will be less
    return option.minutes;
  }

  // ============================================
  // PRIVATE: Execution Recording
  // ============================================

  /**
   * Record an execution for frequency cap tracking.
   * Upserts into automation_executions table.
   */
  private async recordExecution(
    ruleId: string,
    taskIndex: number,
    entityId: string,
    platform: string,
  ): Promise<void> {
    try {
      const now = new Date().toISOString();

      // Try to find existing record
      const { data: existing } = await this.supabase
        .from(TABLE_EXECUTIONS)
        .select('id, execution_count')
        .eq('rule_id', ruleId)
        .eq('task_index', taskIndex)
        .eq('entity_id', entityId)
        .maybeSingle();

      if (existing) {
        // Update existing record
        await this.supabase
          .from(TABLE_EXECUTIONS)
          .update({
            execution_count: (existing.execution_count || 0) + 1,
            last_execution_at: now,
          })
          .eq('id', existing.id);
      } else {
        // Insert new record
        await this.supabase.from(TABLE_EXECUTIONS).insert({
          rule_id: ruleId,
          task_index: taskIndex,
          entity_id: entityId,
          entity_platform: platform,
          execution_count: 1,
          last_execution_at: now,
        });
      }
    } catch (error) {
      this.logger.warn(
        `Failed to record execution for rule ${ruleId}, task ${taskIndex}, entity ${entityId}: ${(error as Error).message}`,
      );
      // Non-critical: don't fail the entire execution over a tracking record
    }
  }

  // ============================================
  // PRIVATE: Execution Logging
  // ============================================

  /**
   * Create and persist an execution log entry.
   */
  private async createAndSaveLog(
    rule: AutomationRuleEntity,
    status: ExecutionStatus,
    summary: ExecutionSummary,
    affectedEntities: AffectedEntityRecord[],
    errors: ExecutionErrorRecord[],
    startTime: number,
  ): Promise<ExecutionLogEntity> {
    const durationMs = Date.now() - startTime;
    const now = new Date().toISOString();

    const input: CreateExecutionLogInput = {
      rule_id: rule.id,
      user_id: rule.user_id,
      workspace_id: rule.workspace_id,
      platform: rule.platform,
      level: rule.level,
      status,
      executed_at: now,
      duration_ms: durationMs,
      summary,
      affected_entities: affectedEntities,
      errors,
    };

    try {
      const { data, error } = await this.supabase
        .from(TABLE_EXECUTION_LOGS)
        .insert(input)
        .select()
        .single();

      if (error) {
        this.logger.error(
          `Failed to save execution log: ${error.message}`,
        );

        // Return an in-memory log even if DB save failed
        return {
          ...input,
          id: 'unsaved',
          created_at: now,
        } as ExecutionLogEntity;
      }

      this.logger.log(
        `Execution log saved: rule=${rule.id} status=${status} affected=${summary.entities_affected} errors=${summary.errors_count} duration=${durationMs}ms`,
      );

      return data as ExecutionLogEntity;
    } catch (error) {
      this.logger.error(
        `Exception saving execution log: ${(error as Error).message}`,
      );

      return {
        ...input,
        id: 'unsaved',
        created_at: now,
      } as ExecutionLogEntity;
    }
  }

  // ============================================
  // PRIVATE: Post-Execution Updates
  // ============================================

  /**
   * Update rule timestamps after execution (last_run_at, next_run_at).
   * Also handles run-once rules by auto-pausing them.
   *
   * @param rule - The rule that was executed
   * @param isManual - If true, only update last_run_at (don't change next_run_at)
   */
  private async updateRuleAfterExecution(
    rule: AutomationRuleEntity,
    isManual?: boolean,
  ): Promise<void> {
    try {
      const now = new Date();
      const lastRunAt = now.toISOString();

      const updateData: Record<string, unknown> = {
        last_run_at: lastRunAt,
        updated_at: lastRunAt,
      };

      // For manual execution, don't update next_run_at (schedule-based timer stays intact)
      if (!isManual) {
        // Calculate next run time
        const nextRunAt = this.scheduleEvaluator.calculateNextRun(
          rule.schedule,
          rule.timezone,
          now,
        );
        updateData.next_run_at = nextRunAt?.toISOString() || null;

        // Auto-pause run-once rules after execution (only for scheduled runs)
        if (rule.schedule.runOnce) {
          updateData.status = 'paused';
          this.logger.log(`Rule ${rule.id} is run-once, auto-pausing`);
        }
      } else {
        this.logger.log(
          `Rule ${rule.id}: Manual execution — next_run_at preserved`,
        );
      }

      const { error } = await this.supabase
        .from(TABLE_RULES)
        .update(updateData)
        .eq('id', rule.id);

      if (error) {
        this.logger.error(
          `Failed to update rule ${rule.id} after execution: ${error.message}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Exception updating rule ${rule.id}: ${(error as Error).message}`,
      );
    }
  }

  // ============================================
  // PRIVATE: Connection Resolution
  // ============================================

  /**
   * Given a list of ad account IDs, group them by their connection_id.
   * Returns a Map<connectionId, accountIds[]>.
   * If adAccountIds is empty, returns a map with all active accounts from all connection_ids in the rule.
   */
  private async resolveConnectionsForAdAccounts(
    platform: string,
    connectionIds: string[],
    adAccountIds: string[],
  ): Promise<Map<string, string[]>> {
    const table =
      platform === 'meta' ? 'meta_ad_accounts' : 'google_ads_accounts';
    const accountIdCol = platform === 'meta' ? 'account_id' : 'customer_id';

    if (adAccountIds && adAccountIds.length > 0) {
      // User specified ad accounts — resolve which connections they belong to
      const { data, error } = await this.supabase
        .from(table)
        .select(`connection_id, ${accountIdCol}`)
        .in(accountIdCol, adAccountIds)
        .eq('is_active', true);

      if (error || !data) {
        this.logger.error(
          `Failed to resolve connections for ad accounts: ${error?.message}`,
        );
        return new Map();
      }

      const map = new Map<string, string[]>();
      for (const row of data) {
        const connId = row.connection_id;
        const accId = row[accountIdCol];
        if (!map.has(connId)) map.set(connId, []);
        map.get(connId)!.push(accId);
      }
      return map;
    }

    // No ad accounts specified — get all active accounts from all connections
    if (connectionIds && connectionIds.length > 0) {
      const { data, error } = await this.supabase
        .from(table)
        .select(`connection_id, ${accountIdCol}`)
        .in('connection_id', connectionIds)
        .eq('is_active', true);

      if (error || !data) {
        this.logger.error(
          `Failed to resolve accounts for connections: ${error?.message}`,
        );
        return new Map();
      }

      const map = new Map<string, string[]>();
      for (const row of data) {
        const connId = row.connection_id;
        const accId = row[accountIdCol];
        if (!map.has(connId)) map.set(connId, []);
        map.get(connId)!.push(accId);
      }
      return map;
    }

    return new Map();
  }

  // ============================================
  // PRIVATE: Helpers
  // ============================================

  /**
   * Get the platform adapter for a given platform.
   */
  private getAdapter(platform: Platform): PlatformAutomationAdapter {
    return platform === 'google' ? this.googleAdapter : this.metaAdapter;
  }

  /**
   * Determine the overall execution status from the summary.
   */
  private determineExecutionStatus(summary: ExecutionSummary): ExecutionStatus {
    if (summary.errors_count > 0 && summary.entities_affected > 0) {
      return 'partial';
    }
    if (summary.errors_count > 0 && summary.entities_affected === 0) {
      return 'failed';
    }
    if (summary.entities_affected === 0) {
      return 'skipped';
    }
    return 'completed';
  }

  /**
   * Traverse all conditions in all tasks to collect unique periods.
   * These periods are passed to the adapter so it can fetch the right metrics.
   */
  private collectPeriods(tasks: Task[]): string[] {
    const periods = new Set<string>();

    for (const task of tasks) {
      this.collectPeriodsFromGroup(task.conditions, periods);
    }

    // Always include 'lifetime' as a fallback
    if (periods.size === 0) {
      periods.add('lifetime');
    }

    return Array.from(periods);
  }

  /**
   * Recursively collect periods from a condition group.
   */
  private collectPeriodsFromGroup(
    group: ConditionGroup,
    periods: Set<string>,
  ): void {
    if (!group || !group.conditions) return;

    for (const child of group.conditions) {
      if (isConditionGroup(child)) {
        this.collectPeriodsFromGroup(child, periods);
      } else {
        this.collectPeriodsFromCondition(child, periods);
      }
    }
  }

  /**
   * Collect periods from a single leaf condition.
   */
  private collectPeriodsFromCondition(
    condition: Condition,
    periods: Set<string>,
  ): void {
    switch (condition.type) {
      case 'simple':
        periods.add(condition.period);
        break;
      case 'metric_comparison':
        periods.add(condition.period);
        periods.add(condition.comparePeriod);
        break;
      case 'ranking':
        periods.add(condition.period);
        break;
      // 'time' and 'lifecycle' don't use metric periods
    }
  }

  /**
   * Create an AffectedEntityRecord from execution data.
   */
  private makeAffectedRecord(
    entity: PlatformEntity,
    taskIndex: number,
    task: Task,
    status: 'success' | 'failed' | 'skipped',
    previousValue?: unknown,
    newValue?: unknown,
    error?: string,
  ): AffectedEntityRecord {
    return {
      entity_id: entity.id,
      entity_name: entity.name,
      entity_type: entity.level,
      task_index: taskIndex,
      action_executed: task.action,
      action_params: task.params,
      previous_value: previousValue as string | number | boolean | undefined,
      new_value: newValue as string | number | boolean | undefined,
      metrics_snapshot: entity.metrics,
      status,
      error,
    };
  }

  /**
   * Create an ExecutionErrorRecord.
   */
  private makeError(
    message: string,
    entityId?: string,
    entityName?: string,
    taskIndex?: number,
    action?: string,
    retryable = false,
  ): ExecutionErrorRecord {
    return {
      entity_id: entityId,
      entity_name: entityName,
      task_index: taskIndex,
      action: action as ExecutionErrorRecord['action'],
      error_message: message,
      retryable,
      timestamp: new Date().toISOString(),
    };
  }
}
