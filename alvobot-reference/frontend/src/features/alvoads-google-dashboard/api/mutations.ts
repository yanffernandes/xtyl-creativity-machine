import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/utils/api'
import { queryKeys } from '@/shared/utils/queryKeys'
import type {
  AutomationRule,
  CreateAutomationRuleInput,
  UpdateAutomationRuleInput,
} from '../types'

// ============================================================================
// Automation Rules Mutations (T060)
// ============================================================================

interface CampaignActionParams {
  connectionId: string
  campaignId: string
}

interface UpdateBudgetParams extends CampaignActionParams {
  budgetId?: string
  budget: number
  customerId?: string
  loginCustomerId?: string
}

interface UpdateBidParams extends CampaignActionParams {
  newBid: number
  customerId?: string
  loginCustomerId?: string
}

interface DuplicateCampaignParams extends CampaignActionParams {
  newName: string
  status?: 'ENABLED' | 'PAUSED'
}

interface ActionResult {
  success: boolean
  previousStatus?: string
  previousBudget?: number
  newBudget?: number
  previousBid?: number
  newBid?: number
  newCampaignId?: string
  actionLogId?: string
  error?: string
}

/**
 * Hook to pause a campaign
 * T038: Pause campaign mutation
 */
export function usePauseCampaign() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: CampaignActionParams): Promise<ActionResult> => {
      return api.post<ActionResult>(
        `/google/dashboard/campaigns/${params.campaignId}/pause`,
        { connectionId: params.connectionId }
      )
    },
    onSuccess: () => {
      // Invalidate campaign queries for this connection
      queryClient.invalidateQueries({
        queryKey: queryKeys.googleAdsDashboard.campaigns(),
      })
    },
  })
}

/**
 * Hook to enable a campaign
 * T038: Enable campaign mutation
 */
export function useEnableCampaign() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: CampaignActionParams): Promise<ActionResult> => {
      return api.post<ActionResult>(
        `/google/dashboard/campaigns/${params.campaignId}/enable`,
        { connectionId: params.connectionId }
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.googleAdsDashboard.campaigns(),
      })
    },
  })
}

/**
 * Hook to update campaign budget
 * T038: Update budget mutation
 */
export function useUpdateBudget() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: UpdateBudgetParams): Promise<ActionResult> => {
      return api.patch<ActionResult>(
        `/google/dashboard/campaigns/${params.campaignId}/budget`,
        {
          connectionId: params.connectionId,
          budgetId: params.budgetId,
          newBudget: params.budget,
          customerId: params.customerId,
          loginCustomerId: params.loginCustomerId,
        }
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.googleAdsDashboard.campaigns(),
      })
    },
  })
}

/**
 * Hook to update campaign CPC bid
 */
export function useUpdateBid() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: UpdateBidParams): Promise<ActionResult> => {
      return api.patch<ActionResult>(
        `/google/dashboard/campaigns/${params.campaignId}/bid`,
        {
          connectionId: params.connectionId,
          newBid: params.newBid,
          customerId: params.customerId,
          loginCustomerId: params.loginCustomerId,
        }
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.googleAdsDashboard.campaigns(),
      })
    },
  })
}

interface ForceRefreshParams {
  connectionId?: string
  workspaceId?: string
  period?: 'today' | 'yesterday' | 'last_7d' | 'last_30d' | 'custom'
  startDate?: string
  endDate?: string
  status?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

interface ForceRefreshResponse {
  campaigns: Array<{
    id: string
    name: string
    status: string
    channelType: string
    budget: number
    budgetId: string
    maxBid?: number
    impressions: number
    clicks: number
    ctr: number
    cost: number
    conversions: number
    conversionsValue: number
    cpa: number
    roas: number
    budgetSpentPercent: number
    alerts?: string[]
    customerId?: string
    loginCustomerId?: string
  }>
  summary: {
    totalCampaigns: number
    activeCampaigns: number
    totalImpressions: number
    totalClicks: number
    totalCost: number
    totalConversions: number
    avgCtr: number
    avgCpa: number
  }
  fetchedAt: string
}

/**
 * Hook to force refresh campaigns (bypasses backend cache)
 * Supports either connectionId (single connection) or workspaceId (all connections)
 */
export function useForceRefreshCampaigns() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: ForceRefreshParams): Promise<ForceRefreshResponse> => {
      const queryParams = new URLSearchParams()
      if (params.workspaceId) {
        queryParams.append('workspaceId', params.workspaceId)
      }
      if (params.connectionId) {
        queryParams.append('connectionId', params.connectionId)
      }
      queryParams.append('forceRefresh', 'true')
      if (params.period) queryParams.append('period', params.period)

      return api.get<ForceRefreshResponse>(`/google/dashboard/campaigns?${queryParams.toString()}`)
    },
    onSuccess: (data, variables) => {
      // Update the query cache directly with the fresh data
      // Use workspaceId as query key identifier when available, otherwise connectionId
      const queryKeyId = variables.workspaceId || variables.connectionId || ''
      queryClient.setQueryData(
        queryKeys.googleAdsDashboard.campaignList(queryKeyId, {
          period: variables.period,
          workspaceId: variables.workspaceId,
        }),
        data
      )
      // Also invalidate all campaign queries to ensure UI updates
      queryClient.invalidateQueries({
        queryKey: queryKeys.googleAdsDashboard.campaigns(),
      })
    },
  })
}

/**
 * Hook to duplicate a campaign
 * T038: Duplicate campaign mutation (placeholder - requires backend implementation)
 */
export function useDuplicateCampaign() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: DuplicateCampaignParams): Promise<ActionResult> => {
      return api.post<ActionResult>(
        `/google/dashboard/campaigns/${params.campaignId}/duplicate`,
        {
          connectionId: params.connectionId,
          newName: params.newName,
          status: params.status || 'PAUSED',
        }
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.googleAdsDashboard.campaigns(),
      })
    },
  })
}

/**
 * Hook to create an automation rule
 * T060: Create automation rule mutation
 */
export function useCreateAutomationRule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateAutomationRuleInput): Promise<AutomationRule> => {
      // Convert snake_case to camelCase for backend DTO
      const payload = {
        connectionId: input.connection_id,
        name: input.name,
        description: input.description,
        scopeType: input.scope_type,
        scopeFilters: input.scope_filters,
        conditions: input.conditions,
        actionType: input.action_type,
        actionValue: input.action_value,
        actionValueType: input.action_value_type,
        actionLimit: input.action_limit,
        checkFrequencyMinutes: input.check_frequency_minutes,
        cooldownMinutes: input.cooldown_minutes,
        maxExecutions: input.max_executions,
      }
      return api.post<AutomationRule>('/google/automations/rules', payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.googleAdsDashboard.automations(),
      })
    },
  })
}

/**
 * Hook to update an automation rule
 * T060: Update automation rule mutation
 */
export function useUpdateAutomationRule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      ruleId,
      ...input
    }: UpdateAutomationRuleInput & { ruleId: string }): Promise<AutomationRule> => {
      // Convert snake_case to camelCase for backend DTO
      const payload: Record<string, unknown> = {}
      if (input.name !== undefined) payload.name = input.name
      if (input.description !== undefined) payload.description = input.description
      if (input.is_active !== undefined) payload.isActive = input.is_active
      if (input.scope_type !== undefined) payload.scopeType = input.scope_type
      if (input.scope_filters !== undefined) payload.scopeFilters = input.scope_filters
      if (input.conditions !== undefined) payload.conditions = input.conditions
      if (input.action_type !== undefined) payload.actionType = input.action_type
      if (input.action_value !== undefined) payload.actionValue = input.action_value
      if (input.action_value_type !== undefined) payload.actionValueType = input.action_value_type
      if (input.action_limit !== undefined) payload.actionLimit = input.action_limit
      if (input.check_frequency_minutes !== undefined) payload.checkFrequencyMinutes = input.check_frequency_minutes
      if (input.cooldown_minutes !== undefined) payload.cooldownMinutes = input.cooldown_minutes
      if (input.max_executions !== undefined) payload.maxExecutions = input.max_executions

      return api.patch<AutomationRule>(`/google/automations/rules/${ruleId}`, payload)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.googleAdsDashboard.automations(),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.googleAdsDashboard.automationDetail(variables.ruleId),
      })
    },
  })
}

/**
 * Hook to delete an automation rule
 * T060: Delete automation rule mutation
 */
export function useDeleteAutomationRule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (ruleId: string): Promise<void> => {
      return api.delete(`/google/automations/rules/${ruleId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.googleAdsDashboard.automations(),
      })
    },
  })
}

/**
 * Hook to toggle automation rule active status
 * T060: Toggle automation rule mutation
 */
export function useToggleAutomationRule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (ruleId: string): Promise<AutomationRule> => {
      return api.post<AutomationRule>(`/google/automations/rules/${ruleId}/toggle`, {})
    },
    onSuccess: (_, ruleId) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.googleAdsDashboard.automations(),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.googleAdsDashboard.automationDetail(ruleId),
      })
    },
  })
}

// ============================================================================
// Campaign Hierarchy (Expand) Mutations
// ============================================================================

export interface AdMetrics {
  impressions: number
  clicks: number
  ctr: number
  cost: number
  conversions: number
}

export interface AdGroupAd {
  id: string
  name: string
  status: string
  type: string
  finalUrls: string[]
  displayUrl?: string
  path1?: string
  path2?: string
  headlines?: string[]
  descriptions?: string[]
  metrics: AdMetrics
}

export interface AdGroupMetrics {
  impressions: number
  clicks: number
  ctr: number
  cost: number
  conversions: number
  cpa: number
}

export interface AdGroup {
  id: string
  name: string
  status: string
  type: string // SEARCH_STANDARD, SEARCH_DYNAMIC_ADS, DISPLAY_STANDARD, etc.
  cpcBidMicros: number
  cpcBid: number
  metrics: AdGroupMetrics
  ads: AdGroupAd[]
}

export interface CampaignHierarchyResponse {
  success: boolean
  adGroups?: AdGroup[]
  trackingUrlTemplate?: string
  finalUrlSuffix?: string
  error?: string
}

export interface CampaignHierarchyParams {
  campaignId: string
  connectionId: string
  customerId?: string
  loginCustomerId?: string
  startDate?: string
  endDate?: string
}

/**
 * Hook to fetch campaign hierarchy (ad groups with ads)
 * Used for expandable rows in the performance table
 */
export function useCampaignHierarchy() {
  return useMutation({
    mutationFn: async (params: CampaignHierarchyParams): Promise<CampaignHierarchyResponse> => {
      const queryParams = new URLSearchParams()
      queryParams.append('connectionId', params.connectionId)
      if (params.customerId) queryParams.append('customerId', params.customerId)
      if (params.loginCustomerId) queryParams.append('loginCustomerId', params.loginCustomerId)
      if (params.startDate) queryParams.append('startDate', params.startDate)
      if (params.endDate) queryParams.append('endDate', params.endDate)

      return api.get<CampaignHierarchyResponse>(
        `/google/dashboard/campaigns/${params.campaignId}/hierarchy?${queryParams.toString()}`
      )
    },
  })
}
