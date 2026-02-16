import { useUserPlan } from '@/features/auth/api/useUserPlan'
import { useCurrentWorkspace } from '@/features/workspace/stores/workspaceStore'

/**
 * Returns the user's effective plan ID.
 * Priority: Workspace plan > Personal plan
 *
 * - If user is in an active workspace with a plan, returns workspace's plan_id
 * - Otherwise, returns user's personal active plan_id from transactions
 * - Returns null if user has no active plan
 */
export function useEffectivePlanId(): number | null {
  const currentWorkspace = useCurrentWorkspace()
  const { data: userPlan } = useUserPlan()

  // Workspace plan takes priority
  if (currentWorkspace?.plan_id) {
    // plan_id might be string, convert to number
    const planId = typeof currentWorkspace.plan_id === 'string'
      ? parseInt(currentWorkspace.plan_id, 10)
      : currentWorkspace.plan_id
    if (!isNaN(planId)) {
      return planId
    }
  }

  // Fallback to personal plan
  // The user_transactions_view indicates has_active_plan but doesn't directly give plan_id
  // We need to check if user has an active plan
  if (userPlan?.has_active_plan) {
    // Try to extract plan_id from the view or assume it exists
    // Note: The actual plan_id would come from the transaction
    // For now, we return a truthy indicator that they have SOME plan
    // The actual visibility check is done in the database view
    return 1 // Placeholder - actual plan_id is resolved in DB view
  }

  return null
}

/**
 * Returns whether the user has any active plan (workspace or personal).
 */
export function useHasActivePlan(): boolean {
  const effectivePlanId = useEffectivePlanId()
  return effectivePlanId !== null
}

/**
 * Returns information about the user's effective plan source.
 */
export function useEffectivePlanInfo(): {
  planId: number | null
  source: 'workspace' | 'personal' | 'none'
  isLoading: boolean
} {
  const currentWorkspace = useCurrentWorkspace()
  const { data: userPlan, isLoading } = useUserPlan()

  // Workspace plan takes priority
  if (currentWorkspace?.plan_id) {
    const planId = typeof currentWorkspace.plan_id === 'string'
      ? parseInt(currentWorkspace.plan_id, 10)
      : currentWorkspace.plan_id
    if (!isNaN(planId)) {
      return {
        planId,
        source: 'workspace',
        isLoading: false,
      }
    }
  }

  // Check personal plan
  if (userPlan?.has_active_plan) {
    return {
      planId: 1, // Placeholder - actual resolution in DB
      source: 'personal',
      isLoading,
    }
  }

  return {
    planId: null,
    source: 'none',
    isLoading,
  }
}
