import { useQuery } from '@tanstack/react-query'
import { api } from '@/shared/utils/api'
import { queryKeys } from '@/shared/utils/queryKeys'
import type {
  CampaignMetrics,
  DashboardPeriod,
  CampaignStatus,
  ActionLog,
  ActionStats,
  AutomationRule,
  TestAutomationResult,
  ConnectionInfo,
} from '../types'

interface GetCampaignsParams {
  connectionId?: string
  workspaceId?: string
  period?: DashboardPeriod
  startDate?: string
  endDate?: string
  status?: CampaignStatus | 'all'
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  /** Optional flag to control if the query should run */
  enabled?: boolean
}

interface GetCampaignsResponse {
  campaigns: CampaignMetrics[]
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
  connections: ConnectionInfo[]
  fetchedAt: string
}

interface GetActionHistoryParams {
  connectionId?: string
  source?: 'manual' | 'automation' | 'all'
  campaignId?: string
  actionType?: string
  status?: string
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
}

interface GetActionHistoryResponse {
  actions: ActionLog[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

/**
 * Hook to fetch campaign metrics from Google Ads
 * T021: Campaign query hook
 * Supports either connectionId (single connection) or workspaceId (all connections in workspace)
 */
export function useGoogleCampaigns(params: GetCampaignsParams) {
  // Use workspaceId as query key identifier when available, otherwise connectionId
  const queryKeyId = params.workspaceId || params.connectionId || ''

  return useQuery({
    queryKey: queryKeys.googleAdsDashboard.campaignList(queryKeyId, {
      period: params.period,
      startDate: params.startDate,
      endDate: params.endDate,
      status: params.status,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
      workspaceId: params.workspaceId,
    }),
    queryFn: async (): Promise<GetCampaignsResponse> => {
      const queryParams = new URLSearchParams()

      // Either workspaceId or connectionId should be provided
      if (params.workspaceId) {
        queryParams.append('workspaceId', params.workspaceId)
      }
      if (params.connectionId) {
        queryParams.append('connectionId', params.connectionId)
      }

      if (params.period) queryParams.append('period', params.period)
      if (params.startDate) queryParams.append('startDate', params.startDate)
      if (params.endDate) queryParams.append('endDate', params.endDate)
      if (params.status) queryParams.append('status', params.status)
      if (params.sortBy) queryParams.append('sortBy', params.sortBy)
      if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder)

      const response = await api.get<GetCampaignsResponse>(`/google/dashboard/campaigns?${queryParams.toString()}`)
      return response
    },
    enabled: params.enabled !== undefined
      ? params.enabled && !!(params.connectionId || params.workspaceId)
      : !!(params.connectionId || params.workspaceId),
    staleTime: 5 * 60 * 1000, // 5 minutes (matches backend cache)
    refetchOnWindowFocus: false,
  })
}

export type { GetCampaignsResponse }

/**
 * Hook to fetch action history
 * T073: Action history query hook
 */
export function useActionHistory(params: GetActionHistoryParams) {
  return useQuery({
    queryKey: queryKeys.googleAdsDashboard.actionHistory(
      params.connectionId || '',
      {
        source: params.source,
        campaignId: params.campaignId,
        actionType: params.actionType,
        status: params.status,
        startDate: params.startDate,
        endDate: params.endDate,
        page: params.page,
        limit: params.limit,
      }
    ),
    queryFn: async (): Promise<GetActionHistoryResponse> => {
      const queryParams = new URLSearchParams()

      if (params.connectionId) queryParams.append('connectionId', params.connectionId)
      if (params.source) queryParams.append('source', params.source)
      if (params.campaignId) queryParams.append('campaignId', params.campaignId)
      if (params.actionType) queryParams.append('actionType', params.actionType)
      if (params.status) queryParams.append('status', params.status)
      if (params.startDate) queryParams.append('startDate', params.startDate)
      if (params.endDate) queryParams.append('endDate', params.endDate)
      if (params.page) queryParams.append('page', String(params.page))
      if (params.limit) queryParams.append('limit', String(params.limit))

      return api.get<GetActionHistoryResponse>(`/google/dashboard/history/actions?${queryParams.toString()}`)
    },
    enabled: !!params.connectionId,
  })
}

/**
 * Hook to fetch action statistics
 * T073: Action stats query hook
 */
export function useActionStats(connectionId: string, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: queryKeys.googleAdsDashboard.actionStats(connectionId, { startDate, endDate }),
    queryFn: async (): Promise<ActionStats> => {
      const queryParams = new URLSearchParams()
      queryParams.append('connectionId', connectionId)

      if (startDate) queryParams.append('startDate', startDate)
      if (endDate) queryParams.append('endDate', endDate)

      return api.get<ActionStats>(`/google/dashboard/history/stats?${queryParams.toString()}`)
    },
    enabled: !!connectionId,
  })
}

// ============================================================================
// Automation Rules Queries (T060)
// ============================================================================

interface GetAutomationRulesParams {
  connectionId?: string
  isActive?: boolean
}

/**
 * Hook to fetch automation rules
 * T060: Automation rules query hook
 */
export function useAutomationRules(params: GetAutomationRulesParams = {}) {
  return useQuery({
    queryKey: queryKeys.googleAdsDashboard.automationList(params.connectionId || ''),
    queryFn: async (): Promise<AutomationRule[]> => {
      const queryParams = new URLSearchParams()

      if (params.connectionId) queryParams.append('connectionId', params.connectionId)
      if (params.isActive !== undefined) queryParams.append('isActive', String(params.isActive))

      return api.get<AutomationRule[]>(`/google/automations/rules?${queryParams.toString()}`)
    },
  })
}

/**
 * Hook to fetch a single automation rule
 * T060: Single automation rule query hook
 */
export function useAutomationRule(ruleId: string) {
  return useQuery({
    queryKey: queryKeys.googleAdsDashboard.automationDetail(ruleId),
    queryFn: async (): Promise<AutomationRule> => {
      return api.get<AutomationRule>(`/google/automations/rules/${ruleId}`)
    },
    enabled: !!ruleId,
  })
}

/**
 * Hook to test an automation rule (dry run)
 * T060: Test automation rule query hook
 */
export function useTestAutomationRule(ruleId: string, enabled = false) {
  return useQuery({
    queryKey: queryKeys.googleAdsDashboard.automationTest(ruleId),
    queryFn: async (): Promise<TestAutomationResult> => {
      return api.post<TestAutomationResult>(`/google/automations/rules/${ruleId}/test`, {})
    },
    enabled: !!ruleId && enabled,
    staleTime: 0, // Always refetch when enabled
  })
}

// ============================================================================
// Ad Manager Integration Queries (for consolidated metrics)
// ============================================================================

interface GetAdManagerConsolidatedMetricsParams {
  connectionId: string
  networkId: string
  startDate: string
  endDate: string
  landUriFilter?: string
}

interface ConsolidatedMetricsData {
  totalRevenue: number
  totalImpressions: number
  totalClicks: number
  ecpm: number
  ctr: number
  matchedRows: number
}

interface LandUriMetrics {
  landUri: string
  revenue: number // In USD
  impressions: number
  clicks: number
  ecpm: number
  ctr: number
}

interface ConsolidatedMetricsResponse {
  data: ConsolidatedMetricsData
  byLandUri: LandUriMetrics[]
  metadata: {
    networkId: string
    currencyCode: string // Always 'USD'
    dateRange: {
      start: string
      end: string
    }
    landUriFilter?: string
    cachedAt: string | null
  }
}

/**
 * Hook to fetch consolidated Ad Manager metrics
 * Used to display Ad Manager revenue data in Google Ads dashboard
 */
export function useAdManagerConsolidatedMetrics(params: GetAdManagerConsolidatedMetricsParams) {
  return useQuery({
    queryKey: queryKeys.adManagerDashboard.consolidatedMetricsList(
      params.connectionId,
      params.networkId,
      {
        startDate: params.startDate,
        endDate: params.endDate,
        landUriFilter: params.landUriFilter,
      }
    ),
    queryFn: async (): Promise<ConsolidatedMetricsResponse> => {
      return api.post<ConsolidatedMetricsResponse>('/ad-manager/consolidated-metrics', {
        connectionId: params.connectionId,
        networkId: params.networkId,
        startDate: params.startDate,
        endDate: params.endDate,
        landUriFilter: params.landUriFilter,
      })
    },
    enabled: !!params.connectionId && !!params.networkId && !!params.startDate && !!params.endDate,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  })
}

export type { ConsolidatedMetricsResponse, ConsolidatedMetricsData, LandUriMetrics }
