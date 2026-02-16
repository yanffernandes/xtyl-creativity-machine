import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/shared/utils/queryKeys'
import { supabase } from '@/shared/utils/supabase'
import { useAuthStore } from '../stores/authStore'

export interface UserPlanData {
  user_id: string
  email: string
  name: string | null
  has_active_plan: boolean
  active_plan_name: string | null
  active_plan_monthly_credits: number | null
  active_plan_project_limit: number | null
  plan_expiration_date: string | null
  current_cycle_start: string | null
  current_cycle_end: string | null
  current_cycle_articles_count: number
  active_projects_count: number
}

export interface UserCredits {
  used: number
  limit: number
  remaining: number
  cycleStart: string | null
  cycleEnd: string | null
  hasActivePlan: boolean
  planName: string | null
}

async function fetchUserPlan(userId: string): Promise<UserPlanData | null> {
  const { data, error } = await supabase
    .from('user_transactions_view')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) {
    // If no data found (user has no transactions), return null
    if (error.code === 'PGRST116') return null
    throw error
  }

  return data
}

export function useUserPlan() {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: queryKeys.userPlan.current(user?.id || ''),
    queryFn: () => fetchUserPlan(user!.id),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useUserCredits(): {
  data: UserCredits | null
  isLoading: boolean
  error: Error | null
} {
  const { data: planData, isLoading, error } = useUserPlan()

  if (isLoading || error || !planData) {
    return {
      data: planData ? {
        used: 0,
        limit: 0,
        remaining: 0,
        cycleStart: null,
        cycleEnd: null,
        hasActivePlan: false,
        planName: null,
      } : null,
      isLoading,
      error: error as Error | null,
    }
  }

  const limit = planData.active_plan_monthly_credits || 0
  const used = planData.current_cycle_articles_count || 0

  return {
    data: {
      used,
      limit,
      remaining: Math.max(0, limit - used),
      cycleStart: planData.current_cycle_start,
      cycleEnd: planData.current_cycle_end,
      hasActivePlan: planData.has_active_plan,
      planName: planData.active_plan_name,
    },
    isLoading: false,
    error: null,
  }
}
