import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { GoogleAutomationService } from '../../modules/google/services/google-automation.service';
import { AutomationCrudService } from '../../modules/automation/services/automation-crud.service';
import { AutomationEngineService } from '../../modules/automation/services/automation-engine.service';

/**
 * AutomationRunnerJob
 *
 * Cron job that runs automation rules periodically.
 * Handles two separate automation systems:
 *
 * 1. Legacy Google Automations (handleCron)
 *    - Uses GoogleAutomationService.runDueAutomations()
 *    - Backward-compatible with existing google_automations table
 *
 * 2. Unified Automations (handleUnifiedCron)
 *    - Uses AutomationCrudService + AutomationEngineService
 *    - Supports both Google Ads and Meta Ads via automation_rules table
 *    - The engine handles schedule evaluation, next_run_at updates,
 *      and run-once auto-pausing internally.
 *
 * Both run every minute with independent concurrency guards.
 */
@Injectable()
export class AutomationRunnerJob {
  private readonly logger = new Logger(AutomationRunnerJob.name);
  private isRunning = false;
  private isUnifiedRunning = false;

  constructor(
    @Inject(forwardRef(() => GoogleAutomationService))
    private readonly automationService: GoogleAutomationService,
    private readonly automationCrudService: AutomationCrudService,
    private readonly automationEngineService: AutomationEngineService,
  ) {}

  // ============================================
  // LEGACY: Google Automations Runner
  // ============================================

  /**
   * Legacy cron job for Google-specific automations.
   * Maintained for backward compatibility with existing google_automations table.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron(): Promise<void> {
    // Prevent overlapping executions
    if (this.isRunning) {
      this.logger.log('Legacy automation runner already in progress, skipping...');
      return;
    }

    this.isRunning = true;

    try {
      this.logger.debug('Starting legacy automation runner job...');
      await this.automationService.runDueAutomations();
      this.logger.debug('Legacy automation runner job completed');
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Legacy automation runner job failed: ${errorMsg}`);
    } finally {
      this.isRunning = false;
    }
  }

  // ============================================
  // UNIFIED: Ads Automation Engine Runner
  // ============================================

  /**
   * Unified automation runner for the new automation_rules table.
   *
   * Pipeline per rule:
   * 1. Fetch due rules (status=active, next_run_at <= now)
   * 2. Execute each rule via AutomationEngineService
   * 3. Calculate next run time
   * 4. Update rule timestamps
   *
   * Individual rule failures are caught and logged without
   * affecting other rules in the batch.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleUnifiedCron(): Promise<void> {
    if (this.isUnifiedRunning) {
      this.logger.log(
        'Unified automation runner already in progress, skipping...',
      );
      return;
    }

    this.isUnifiedRunning = true;

    try {
      const dueRules = await this.automationCrudService.getActiveRulesDue();

      if (dueRules.length === 0) {
        return;
      }

      this.logger.log(
        `Found ${dueRules.length} unified automation rule(s) to execute`,
      );

      for (const rule of dueRules) {
        try {
          // The engine handles the complete pipeline:
          // fetch → filter → evaluate → cap check → execute → log → notify
          // It also updates last_run_at, next_run_at, and auto-pauses run-once rules.
          const log = await this.automationEngineService.executeRule(rule);

          this.logger.log(
            `Rule "${rule.name}" (${rule.id}) executed: status=${log.status}, affected=${log.summary.entities_affected}, errors=${log.summary.errors_count}`,
          );
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : String(error);
          this.logger.error(
            `Failed to execute rule "${rule.name}" (${rule.id}): ${errorMsg}`,
          );
          // Continue with next rule — don't let one failure crash the batch
        }
      }
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Unified automation runner failed: ${errorMsg}`);
    } finally {
      this.isUnifiedRunning = false;
    }
  }
}
