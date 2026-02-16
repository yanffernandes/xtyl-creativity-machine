import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth/stores/authStore'
import { useWorkspaceId } from '@/features/workspace/stores/workspaceStore'
import { queryKeys } from '@/shared/utils/queryKeys'
import { supabase } from '@/shared/utils/supabase'
import type { SubscriptionSummary, Transaction, Plan, CreditsSummary, CreditsByType, ActivityLog, CreditTransaction, UserCreditsSummaryV2, ExtraCreditPackage } from '../types'

// Query keys
export const subscriptionKeys = {
  all: ['subscription'] as const,
  summary: (userId: string) => [...subscriptionKeys.all, 'summary', userId] as const,
  transactions: (userId: string) => [...subscriptionKeys.all, 'transactions', userId] as const,
  plans: () => [...subscriptionKeys.all, 'plans'] as const,
  credits: (userId: string) => [...subscriptionKeys.all, 'credits', userId] as const,
  creditsWorkspace: (workspaceId: string) => [...subscriptionKeys.all, 'credits-workspace', workspaceId] as const,
  creditsByType: (userId: string) => [...subscriptionKeys.all, 'credits-by-type', userId] as const,
  creditTransactions: (userId: string) => [...subscriptionKeys.all, 'credit-transactions', userId] as const,
  activities: (userId: string) => [...subscriptionKeys.all, 'activities', userId] as const,
}

// Fetch subscription summary from user_transactions_view
async function fetchSubscriptionSummary(userId: string): Promise<SubscriptionSummary | null> {
  const { data, error } = await supabase
    .from('user_transactions_view')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // No data found
    throw error
  }

  return data
}

// Fetch all transactions for user
async function fetchTransactions(userId: string): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select(`
      *,
      plans:plan_id (name)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data || []).map((t) => ({
    ...t,
    plan_name: t.plans?.name || null,
  }))
}

// Fetch all available plans
async function fetchPlans(): Promise<Plan[]> {
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .order('price', { ascending: true })

  if (error) throw error
  return data || []
}

// Fetch credits summary from new view
async function fetchCreditsSummary(userId: string): Promise<CreditsSummary | null> {
  const { data, error } = await supabase
    .from('user_credits_summary')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    // View might not exist yet, fallback to old method
    console.warn('user_credits_summary view not available, using fallback')
    return null
  }

  return data
}

// Fetch workspace credits summary
async function fetchWorkspaceCreditsSummary(workspaceId: string): Promise<CreditsSummary | null> {
  const { data, error } = await supabase
    .from('workspace_credits_summary')
    .select('*')
    .eq('workspace_id', workspaceId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    console.warn('workspace_credits_summary not available:', error.message)
    return null
  }

  // Map workspace credits to CreditsSummary format
  return {
    user_id: data.owner_id,
    has_active_plan: data.has_active_plan || false,
    plan_monthly_credits: data.plan_monthly_credits || 0,
    credits_used: data.monthly_credits_used || 0,
    credits_remaining: data.monthly_credits_remaining || 0,
    cycle_start: data.cycle_start,
    cycle_end: data.cycle_end,
    plan_expiration: data.plan_expiration || null,
    // Extra fields for workspace context
    extra_credits_available: data.extra_credits_available || 0,
    total_credits_available: data.total_credits_available || 0,
  } as CreditsSummary
}

// Fetch credits breakdown by type
async function fetchCreditsByType(userId: string): Promise<CreditsByType[]> {
  const { data, error } = await supabase
    .from('user_credits_by_type')
    .select('*')
    .eq('user_id', userId)

  if (error) {
    // View might not exist yet
    console.warn('user_credits_by_type view not available')
    return []
  }

  return data || []
}

// Fetch credit transactions
async function fetchCreditTransactions(userId: string, limit = 50): Promise<CreditTransaction[]> {
  const { data, error } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    // Table might not exist yet
    console.warn('credit_transactions table not available')
    return []
  }

  return data || []
}

// Fetch recent activities
async function fetchRecentActivities(userId: string, limit = 50): Promise<ActivityLog[]> {
  const { data, error } = await supabase
    .from('user_recent_activities')
    .select('*')
    .eq('user_id', userId)
    .limit(limit)

  if (error) {
    // View might not exist yet
    console.warn('user_recent_activities view not available')
    return []
  }

  return data || []
}

// Fetch all activities (including non-visible)
async function fetchAllActivities(userId: string, limit = 100): Promise<ActivityLog[]> {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    // Table might not exist yet
    console.warn('activity_logs table not available')
    return []
  }

  return data || []
}

// Hooks

export function useSubscriptionSummary() {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: subscriptionKeys.summary(user?.id || ''),
    queryFn: () => fetchSubscriptionSummary(user!.id),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useTransactions() {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: subscriptionKeys.transactions(user?.id || ''),
    queryFn: () => fetchTransactions(user!.id),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  })
}

export function usePlans() {
  return useQuery({
    queryKey: subscriptionKeys.plans(),
    queryFn: fetchPlans,
    staleTime: 1000 * 60 * 30, // 30 minutes (plans rarely change)
  })
}

export function useCreditsSummary() {
  const { user } = useAuthStore()
  const workspaceId = useWorkspaceId()

  return useQuery({
    queryKey: workspaceId
      ? subscriptionKeys.creditsWorkspace(workspaceId)
      : subscriptionKeys.credits(user?.id || ''),
    queryFn: async () => {
      // If workspace is selected, try to get workspace credits first
      if (workspaceId) {
        const wsCredits = await fetchWorkspaceCreditsSummary(workspaceId)
        // If workspace has credits (has_active_plan), use them
        if (wsCredits?.has_active_plan) {
          return wsCredits
        }
        // Otherwise fall back to user credits
      }
      // Default to user credits
      return fetchCreditsSummary(user!.id)
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 2, // 2 minutes (credits change more frequently)
  })
}

export function useCreditsByType() {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: subscriptionKeys.creditsByType(user?.id || ''),
    queryFn: () => fetchCreditsByType(user!.id),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 2,
  })
}

export function useCreditTransactions(limit = 50) {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: [...subscriptionKeys.creditTransactions(user?.id || ''), limit],
    queryFn: () => fetchCreditTransactions(user!.id, limit),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 2,
  })
}

export function useRecentActivities(limit = 50) {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: [...subscriptionKeys.activities(user?.id || ''), 'recent', limit],
    queryFn: () => fetchRecentActivities(user!.id, limit),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 1, // 1 minute (activities update frequently)
  })
}

export function useAllActivities(limit = 100) {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: [...subscriptionKeys.activities(user?.id || ''), 'all', limit],
    queryFn: () => fetchAllActivities(user!.id, limit),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 1,
  })
}

// ==================== EXTRA CREDITS (Feature 032) ====================

// Fetch credits summary V2 (includes extra credits)
async function fetchCreditsSummaryV2(userId: string): Promise<UserCreditsSummaryV2 | null> {
  const { data, error } = await supabase
    .from('user_credits_summary_v2')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // No data found
    console.warn('user_credits_summary_v2 view not available:', error.message)
    return null
  }

  return data
}

// Fetch user's extra credit packages
async function fetchExtraCreditsPackages(userId: string): Promise<ExtraCreditPackage[]> {
  const { data, error } = await supabase
    .from('user_extra_credits_packages')
    .select('*')
    .eq('user_id', userId)
    .order('expires_at', { ascending: true, nullsFirst: false })

  if (error) {
    console.warn('user_extra_credits_packages view not available:', error.message)
    return []
  }

  return data || []
}

// T015: Hook for credits summary V2
export function useCreditsSummaryV2() {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: queryKeys.credits.summaryV2(user?.id || ''),
    queryFn: () => fetchCreditsSummaryV2(user!.id),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

// T016: Hook for extra credits packages
export function useExtraCreditsPackages() {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: queryKeys.credits.packages(user?.id || ''),
    queryFn: () => fetchExtraCreditsPackages(user!.id),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

// Hook for active extra credits only (not expired, not consumed)
export function useActiveExtraCredits() {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: [...queryKeys.credits.packages(user?.id || ''), 'active'],
    queryFn: async () => {
      const packages = await fetchExtraCreditsPackages(user!.id)
      return packages.filter(pkg => pkg.status === 'active' || pkg.status === 'expiring_soon')
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 2,
  })
}
