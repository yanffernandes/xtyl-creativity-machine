/**
 * Automation Guard Contract
 *
 * Defines interfaces for preventing automations from running
 * when their associated connections are invalid.
 *
 * @feature 20260202-oauth-token-management
 * @requirement FR-009, FR-010
 */

// ============================================================================
// Types
// ============================================================================

export type AutomationSkipReason =
  | 'connection_needs_reconnect'
  | 'circuit_breaker_open'
  | 'connection_not_found'
  | 'connection_inactive';

export interface AutomationGuardResult {
  canExecute: boolean;
  skipReason?: AutomationSkipReason;
  connectionId?: string;
  message?: string;
}

export interface AutomationRunStatus {
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  skip_reason?: AutomationSkipReason;
  error_message?: string;
}

// ============================================================================
// Service Interface
// ============================================================================

export interface IAutomationGuardService {
  /**
   * Check if an automation can execute based on its connection status.
   *
   * @param automationId - The automation to check
   * @returns Guard result indicating if execution can proceed
   *
   * @requirement FR-009: Skip automations with needs_reconnect connections
   */
  canExecuteAutomation(automationId: string): Promise<AutomationGuardResult>;

  /**
   * Check if a connection can be used for automation.
   * Combines needs_reconnect check with circuit breaker status.
   *
   * @param connectionId - The connection to check
   * @returns Guard result
   */
  canUseConnection(connectionId: string): Promise<AutomationGuardResult>;

  /**
   * Record that an automation was skipped.
   *
   * @param automationRunId - The run that was skipped
   * @param reason - Why it was skipped
   * @param connectionId - The problematic connection
   *
   * @requirement FR-010: Record skip reason in execution log
   */
  recordSkippedRun(
    automationRunId: string,
    reason: AutomationSkipReason,
    connectionId: string,
  ): Promise<void>;

  /**
   * Get all automations that would be skipped due to connection issues.
   * Useful for dashboard/reporting.
   *
   * @param userId - The user to check for
   * @returns List of automations with their skip reasons
   */
  getBlockedAutomations(userId: string): Promise<Array<{
    automationId: string;
    automationName: string;
    connectionId: string;
    connectionName: string;
    reason: AutomationSkipReason;
  }>>;
}

// ============================================================================
// Event Handlers (for workflow integration)
// ============================================================================

export interface AutomationGuardEventHandlers {
  /**
   * Called before an automation attempts to execute.
   * Should throw or return false to prevent execution.
   */
  onBeforeExecute(automationId: string): Promise<AutomationGuardResult>;

  /**
   * Called when an automation is skipped due to connection issues.
   * Used for notifications and logging.
   */
  onAutomationSkipped(
    automationId: string,
    reason: AutomationSkipReason,
    connectionId: string,
  ): Promise<void>;
}

// ============================================================================
// Integration Points
// ============================================================================

/**
 * How this integrates with the workflow system:
 *
 * 1. Temporal Workflow calls automationGuard.canExecuteAutomation(id)
 * 2. If canExecute is false:
 *    - Call automationGuard.recordSkippedRun(...)
 *    - Skip to next automation in batch
 *    - Optionally notify user (respecting 24h limit)
 * 3. If canExecute is true:
 *    - Proceed with normal execution
 *    - On API errors, check if error is permanent
 *    - If permanent, mark connection and skip remaining operations
 */

export const AUTOMATION_GUARD_INTEGRATION = {
  /**
   * Entry point in workflow activities.
   */
  activityEntryPoint: 'backend/src/temporal/activities/automation.activities.ts',

  /**
   * Method to call before API operations.
   */
  guardMethod: 'automationGuardService.canUseConnection(connectionId)',

  /**
   * How to handle skip result.
   */
  skipHandling: `
    if (!guardResult.canExecute) {
      await automationGuardService.recordSkippedRun(
        runId,
        guardResult.skipReason,
        guardResult.connectionId,
      );
      return { status: 'skipped', reason: guardResult.skipReason };
    }
  `,
};
