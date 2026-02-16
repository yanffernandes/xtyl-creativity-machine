import { Injectable, Logger } from '@nestjs/common';
import {
  PlatformAutomationAdapter,
  PlatformEntity,
  ActionResult,
} from '../adapters/platform-adapter.interface';
import { GoogleAutomationAdapter } from '../adapters/google-automation.adapter';
import { MetaAutomationAdapter } from '../adapters/meta-automation.adapter';
import { Task } from '../dto/task.dto';
import { Platform } from '../dto/automation-rule.dto';

// ============================================================================
// ACTION EXECUTOR SERVICE
// ============================================================================

/**
 * ActionExecutorService
 *
 * Executes automation actions by delegating to the appropriate
 * platform adapter (Google or Meta).
 *
 * Handles:
 * - Status changes (pause, start)
 * - Budget modifications (increase, decrease, set, scale)
 * - Bid modifications (increase, decrease, set, strategy change)
 * - Naming operations (add, remove, replace)
 * - Duplication (Meta only)
 * - Notifications (no platform API call — returns immediately)
 *
 * The service acts as a thin dispatcher: it selects the correct adapter
 * and delegates the actual platform API call. Error handling ensures
 * individual entity failures don't crash the entire rule execution.
 */
@Injectable()
export class ActionExecutorService {
  private readonly logger = new Logger(ActionExecutorService.name);

  constructor(
    private readonly googleAdapter: GoogleAutomationAdapter,
    private readonly metaAdapter: MetaAutomationAdapter,
  ) {}

  /**
   * Get the platform adapter for a given platform.
   */
  getAdapter(platform: Platform): PlatformAutomationAdapter {
    return platform === 'google' ? this.googleAdapter : this.metaAdapter;
  }

  /** Budget-related actions that are blocked on CBO ad sets */
  private static readonly BUDGET_ACTIONS = new Set([
    'increase_budget',
    'decrease_budget',
    'set_budget',
    'scale_budget_by_target',
  ]);

  /**
   * Execute an automation task action on an entity.
   *
   * For 'notify' actions, no platform API call is made — the action
   * returns immediately with a flag indicating notification is required.
   *
   * Pre-execution validations:
   * - CBO/ABO: Budget actions on Meta ad set level are blocked if the
   *   parent campaign uses Campaign Budget Optimization (CBO).
   *
   * @param platform - Target platform ('google' or 'meta')
   * @param connectionId - Connection to use for API access
   * @param entity - The entity to act upon
   * @param task - The task defining the action and its parameters
   * @param userId - The user triggering the action (for audit)
   * @returns ActionResult with success status and value changes
   */
  async execute(
    platform: Platform,
    connectionId: string,
    entity: PlatformEntity,
    task: Task,
    userId: string,
  ): Promise<ActionResult> {
    const { action, params } = task;

    try {
      // For 'notify' action, don't call platform API
      if (action === 'notify') {
        this.logger.debug(
          `Notify action for entity ${entity.id} — no platform call needed`,
        );
        return {
          success: true,
          action,
          requiresNotification: true,
        };
      }

      // ── CBO/ABO validation for Meta budget actions on ad sets ──
      if (
        platform === 'meta' &&
        entity.level === 'adset' &&
        ActionExecutorService.BUDGET_ACTIONS.has(action)
      ) {
        const parentBudgetOpt =
          entity.parentData?.campaign?.budget_optimization ||
          entity.parentData?.campaign?.budgetOptimization;

        if (
          parentBudgetOpt === 'CAMPAIGN_BUDGET_OPTIMIZATION' ||
          parentBudgetOpt === 'CBO'
        ) {
          this.logger.warn(
            `Action "${action}" blocked on adset ${entity.id}: parent campaign uses CBO`,
          );
          return {
            success: false,
            action,
            error:
              'Alterações de orçamento não são permitidas em conjuntos de anúncios de campanhas com CBO (Campaign Budget Optimization). ' +
              'Altere o orçamento no nível da campanha.',
          };
        }
      }

      const adapter = this.getAdapter(platform);

      this.logger.debug(
        `Executing action "${action}" on ${platform} entity ${entity.id} (${entity.name})`,
      );

      const result = await adapter.executeAction(
        connectionId,
        entity,
        { action, params: { ...params } as Record<string, unknown> },
        userId,
      );

      if (result.success) {
        this.logger.log(
          `Action "${action}" succeeded for entity ${entity.id}` +
            (result.previousValue !== undefined
              ? ` (${result.previousValue} → ${result.newValue})`
              : ''),
        );
      } else {
        this.logger.warn(
          `Action "${action}" failed for entity ${entity.id}: ${result.error}`,
        );
      }

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error(
        `Action "${action}" threw exception for entity ${entity.id}: ${errorMessage}`,
      );

      return {
        success: false,
        action,
        error: errorMessage,
      };
    }
  }
}
