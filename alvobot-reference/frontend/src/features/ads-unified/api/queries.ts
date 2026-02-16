/**
 * Unified Ads Dashboard - Query Hooks
 *
 * These hooks fetch and normalize data from multiple ad platforms
 * using the adapter pattern.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { api } from '@/shared/utils/api'
import {
  fetchUnifiedAutomations,
  fetchUnifiedHistory,
} from '../adapters'
import { fetchMetaCreativeDetails } from './mutations'
import type {
  AdsPlatform,
  DashboardPeriod,
  ActionSource,
  ActionStatus,
  AdsSearchResponse,
  AdsExpandResponse,
  AdsActionResponse,
  AdsSource,
  AdsLevel,
  AdsOrderBy,
  FieldGroup,
} from '../types'

// ============================================
// Field Groups for Projection Pushdown
// ============================================

/**
 * Predefined field groups for common use cases
 * Match backend FIELD_GROUPS exactly
 */
export const FIELD_GROUPS = {
  // Minimal fields for ID lookups
  minimal: ['id', 'name', 'platform', 'level', 'status', 'connectionId'],

  // Standard table view fields
  tableView: [
    'id', 'name', 'platform', 'level', 'status', 'effectiveStatus',
    'connectionId', 'connectionName', 'accountId', 'accountName',
    'budget', 'budgetType', 'budgetId', 'isABO', 'objective',
    'impressions', 'clicks', 'ctr', 'cpc', 'cost', 'conversions', 'cpa', 'roas',
    // Platform-specific IDs for actions
    'customerId', 'loginCustomerId', 'adAccountId',
  ],

  // Extended view with Meta-specific metrics
  extendedView: [
    'id', 'name', 'platform', 'level', 'status', 'effectiveStatus',
    'connectionId', 'connectionName', 'accountId', 'accountName',
    'budget', 'budgetType', 'isABO', 'objective',
    'impressions', 'clicks', 'ctr', 'cpc', 'cost', 'conversions', 'cpa', 'roas',
    'reach', 'frequency', 'landingPageViews',
    'qualityRanking', 'engagementRateRanking', 'conversionRateRanking',
  ],

  // Expand view with hierarchy info
  expandView: [
    'id', 'name', 'platform', 'level', 'status', 'effectiveStatus',
    'connectionId', 'connectionName', 'accountId', 'accountName',
    'budget', 'budgetType', 'isABO', 'objective',
    'impressions', 'clicks', 'ctr', 'cpc', 'cost', 'conversions', 'cpa', 'roas',
    'reach', 'frequency', 'landingPageViews',
    'parentId', 'parentName', 'campaignId', 'campaignName', 'adSetId', 'adSetName',
    'learningStageInfo', 'issuesInfo',
  ],

  // Action fields for pause/enable/budget
  actionFields: [
    'id', 'platform', 'level', 'status', 'connectionId',
    'customerId', 'loginCustomerId', 'budgetId', 'accountId',
  ],

  // All fields (no projection)
  full: ['*'],
} as const

// ============================================
// Creative Details Hooks
// ============================================


// ============================================
// Meta Campaign Metrics Types
// ============================================

export interface MetaCampaignMetrics {
  id: string
  name: string
  status: 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED'
  effectiveStatus?: string
  objective: string
  dailyBudget: number
  lifetimeBudget: number
  budgetType: 'daily' | 'lifetime'
  isABO: boolean
  bidStrategy?: string
  specialAdCategories?: string[]
  impressions: number
  clicks: number
  ctr: number
  cpc: number
  spend: number
  reach: number
  frequency: number
  conversions: number
  cpa: number
  roas: number
  qualityRanking?: string
  engagementRateRanking?: string
  conversionRateRanking?: string
  landingPageViews?: number
  connectionId: string
  connectionName: string
  adAccountId: string
  adAccountName: string
}

export interface MetaDashboardResponse {
  success: boolean
  campaigns: MetaCampaignMetrics[]
  connections?: Array<{ id: string; name: string }>
  totals: {
    totalCampaigns: number
    activeCampaigns: number
    pausedCampaigns: number
    totalImpressions: number
    totalClicks: number
    totalSpend: number
    totalConversions: number
    avgCtr: number
    avgCpa: number
  }
  error?: string
}

// ============================================
// Query Keys
// ============================================

export const unifiedAdsKeys = {
  all: ['unified-ads'] as const,
  campaigns: () => [...unifiedAdsKeys.all, 'campaigns'] as const,
  campaignList: (platforms: AdsPlatform[], params: Record<string, unknown>) =>
    [...unifiedAdsKeys.campaigns(), platforms.join(','), params] as const,
  metrics: () => [...unifiedAdsKeys.all, 'metrics'] as const,
  metricsSummary: (platforms: AdsPlatform[], params: Record<string, unknown>) =>
    [...unifiedAdsKeys.metrics(), platforms.join(','), params] as const,
  automations: () => [...unifiedAdsKeys.all, 'automations'] as const,
  automationList: (platforms: AdsPlatform[], connectionId?: string) =>
    [...unifiedAdsKeys.automations(), platforms.join(','), connectionId] as const,
  history: () => [...unifiedAdsKeys.all, 'history'] as const,
  historyList: (platforms: AdsPlatform[], params: Record<string, unknown>) =>
    [...unifiedAdsKeys.history(), platforms.join(','), params] as const,
  // New unified search keys
  search: () => [...unifiedAdsKeys.all, 'search'] as const,
  searchList: (params: Record<string, unknown>) =>
    [...unifiedAdsKeys.search(), params] as const,
  expand: () => [...unifiedAdsKeys.all, 'expand'] as const,
  // Include platform and connectionId to prevent cache collisions across connections
  expandList: (parentId: string, childLevel: string, startDate?: string, endDate?: string, platform?: string, connectionId?: string) =>
    [...unifiedAdsKeys.expand(), parentId, childLevel, startDate, endDate, platform, connectionId] as const,
}

// ============================================
// Automation Queries
// ============================================

interface UseUnifiedAutomationsParams {
  platforms: AdsPlatform[]
  connectionId?: string
  enabled?: boolean
}

/**
 * Hook to fetch automation rules from selected platforms
 * T048: Automations query hook for automations tab
 */
export function useUnifiedAutomations({
  platforms,
  connectionId,
  enabled = true,
}: UseUnifiedAutomationsParams) {
  const query = useQuery({
    queryKey: unifiedAdsKeys.automationList(platforms, connectionId),
    queryFn: async () => {
      const automations = await fetchUnifiedAutomations(platforms, connectionId)
      return automations
    },
    enabled: enabled && platforms.length > 0,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  return {
    automations: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}

// ============================================
// History Queries
// ============================================

interface UseUnifiedHistoryParams {
  platforms: AdsPlatform[]
  connectionId?: string
  source?: ActionSource
  status?: ActionStatus
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
  enabled?: boolean
}

/**
 * Hook to fetch action history from selected platforms
 * T053: History query hook for history tab
 */
export function useUnifiedHistory({
  platforms,
  connectionId,
  source,
  status,
  startDate,
  endDate,
  page = 1,
  limit = 20,
  enabled = true,
}: UseUnifiedHistoryParams) {
  const query = useQuery({
    queryKey: unifiedAdsKeys.historyList(platforms, {
      connectionId,
      source,
      status,
      startDate,
      endDate,
      page,
      limit,
    }),
    queryFn: async () => {
      const result = await fetchUnifiedHistory(platforms, {
        connectionId,
        source,
        status,
        startDate,
        endDate,
        page,
        limit,
      })
      return result
    },
    enabled: enabled && platforms.length > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes for history
    refetchOnWindowFocus: false,
  })

  return {
    actions: query.data?.actions || [],
    pagination: query.data?.pagination || { page: 1, totalPages: 0, total: 0 },
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}

// ============================================
// Meta Ad Accounts Query
// ============================================

interface MetaAdAccountsResponse {
  success: boolean
  accounts: Array<{
    id: string
    accountId: string
    accountName: string
    connectionId: string
    connectionName: string
  }>
  error?: string
}

/**
 * Hook to fetch active Meta ad accounts for a workspace
 * Returns accounts independently of whether they have campaigns
 */
export function useMetaAdAccounts({
  workspaceId,
  enabled = true,
}: {
  workspaceId?: string
  enabled?: boolean
}) {
  const query = useQuery({
    queryKey: [...unifiedAdsKeys.all, 'meta-accounts', { workspaceId }],
    queryFn: async (): Promise<MetaAdAccountsResponse> => {
      const params = new URLSearchParams()
      if (workspaceId) params.set('workspaceId', workspaceId)

      const response = await api.get<MetaAdAccountsResponse>(
        `/meta/dashboard/accounts?${params.toString()}`
      )

      return response
    },
    enabled: enabled && !!workspaceId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  })

  return {
    data: query.data,
    accounts: query.data?.accounts || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}

// ============================================
// Meta Campaign Metrics Query
// ============================================

interface UseMetaCampaignsParams {
  workspaceId?: string
  connectionId?: string
  period?: DashboardPeriod
  startDate?: string
  endDate?: string
  status?: 'ACTIVE' | 'PAUSED' | 'all'
  forceRefresh?: boolean
  enabled?: boolean
}

/**
 * Hook to fetch Meta campaign metrics from dashboard API
 * Similar to useGoogleCampaigns from alvoads-google-dashboard
 */
export function useMetaCampaigns({
  workspaceId,
  connectionId,
  period = 'last_7d',
  startDate,
  endDate,
  status = 'all',
  forceRefresh = false,
  enabled = true,
}: UseMetaCampaignsParams) {
  const query = useQuery({
    queryKey: [...unifiedAdsKeys.all, 'meta-campaigns', {
      workspaceId,
      connectionId,
      period,
      startDate,
      endDate,
      status,
      forceRefresh,
    }],
    queryFn: async (): Promise<MetaDashboardResponse> => {
      const params = new URLSearchParams()
      if (workspaceId) params.set('workspaceId', workspaceId)
      if (connectionId) params.set('connectionId', connectionId)
      if (period) params.set('period', period)
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)
      if (status && status !== 'all') params.set('status', status)
      if (forceRefresh) params.set('forceRefresh', 'true')

      const response = await api.get<MetaDashboardResponse>(
        `/meta/dashboard/campaigns?${params.toString()}`
      )

      return response
    },
    enabled: enabled && !!workspaceId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  })

  return {
    data: query.data,
    campaigns: query.data?.campaigns || [],
    connections: query.data?.connections || [],
    totals: query.data?.totals,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    dataUpdatedAt: query.dataUpdatedAt,
  }
}

/**
 * Hook to fetch full creative details for a Meta ad
 * Provides high-resolution images and video embed data
 */
export function useMetaCreativeDetails(
  adId: string | null,
  connectionId: string | null,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ['meta', 'creative-details', adId, connectionId],
    queryFn: () => fetchMetaCreativeDetails(adId!, connectionId!),
    enabled: options?.enabled && !!adId && !!connectionId,
    staleTime: 30 * 60 * 1000, // 30 minutes (creative details don't change often)
    refetchOnWindowFocus: false,
  })
}

// ============================================
// Unified Ads Search - New Backend API
// ============================================

/** Metric filter for server-side filtering */
interface MetricFilterParam {
  id: string
  metric: 'impressions' | 'clicks' | 'conversions' | 'cost' | 'cpc' | 'cpa' | 'ctr' | 'conversionRate' | 'roas'
  operator: 'gt' | 'lt' | 'eq' | 'between'
  value: number
  value2?: number
}

interface UseUnifiedAdsSearchParams {
  sources: AdsSource[]
  startDate: string
  endDate: string
  level: AdsLevel
  status?: 'ENABLED' | 'PAUSED' | 'REMOVED' | 'all'
  nameContains?: string
  objective?: string
  orderBy?: AdsOrderBy
  sortOrder?: 'asc' | 'desc'
  page?: number
  limit?: number
  forceRefresh?: boolean
  enabled?: boolean
  /**
   * Field selection for projection pushdown
   * Use fieldGroup for predefined sets, or fields for custom selection
   */
  fieldGroup?: FieldGroup
  fields?: string[]
  /** Advanced metric filters (e.g., impressions > 1000, cost < 100) */
  metricFilters?: MetricFilterParam[]
}

/**
 * Hook to search ads using the new unified backend API
 * POST /ads/search
 *
 * Features:
 * - Field selection (projection pushdown) to reduce payload
 * - Server-side pagination
 * - keepPreviousData for smooth transitions
 */
export function useUnifiedAdsSearch({
  sources,
  startDate,
  endDate,
  level,
  status = 'all',
  nameContains,
  objective,
  orderBy,
  sortOrder = 'desc',
  page = 1,
  limit = 20,
  forceRefresh = false,
  enabled = true,
  fieldGroup = 'tableView',
  fields,
  metricFilters,
}: UseUnifiedAdsSearchParams) {
  const query = useQuery({
    queryKey: unifiedAdsKeys.searchList({
      sources: sources.map(s => `${s.platform}:${s.connectionId}`).join(','),
      startDate,
      endDate,
      level,
      status,
      nameContains,
      objective,
      orderBy,
      sortOrder,
      page,
      limit,
      fieldGroup,
      // Include metricFilters in queryKey for cache invalidation
      metricFilters: metricFilters?.map(f => `${f.metric}:${f.operator}:${f.value}:${f.value2 ?? ''}`).join(','),
    }),
    queryFn: async ({ signal }): Promise<AdsSearchResponse> => {
      // Use the signal from TanStack Query for automatic request cancellation
      const response = await api.post<AdsSearchResponse>('/ads/search', {
        sources,
        startDate,
        endDate,
        level,
        status,
        nameContains,
        objective,
        orderBy,
        sortOrder,
        page,
        limit,
        forceRefresh,
        fieldGroup,
        fields,
        metricFilters,
      }, { signal })

      return response
    },
    enabled: enabled && sources.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    // Keep previous data while fetching new page
    placeholderData: keepPreviousData,
  })

  return {
    data: query.data,
    items: query.data?.items || [],
    summary: query.data?.summary,
    pagination: query.data?.pagination,
    metadata: query.data?.metadata,
    failedSources: query.data?.failedSources,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    dataUpdatedAt: query.dataUpdatedAt,
    // New: indicate if showing stale data
    isPlaceholderData: query.isPlaceholderData,
  }
}

// ============================================
// Progressive Ads Search - Per-Connection Loading
// ============================================

export interface ProgressInfo {
  current: number
  total: number
  currentSource: string
  completedSources: string[]
}

interface UseProgressiveAdsSearchParams {
  sources: AdsSource[]
  startDate: string
  endDate: string
  level: AdsLevel
  status?: 'ENABLED' | 'PAUSED' | 'REMOVED' | 'all'
  nameContains?: string
  objective?: string
  orderBy?: AdsOrderBy
  sortOrder?: 'asc' | 'desc'
  page?: number
  limit?: number
  forceRefresh?: boolean
  enabled?: boolean
  fieldGroup?: FieldGroup
  fields?: string[]
  /** Connection names for progress display */
  connectionNames?: Map<string, string>
  /** Advanced metric filters (e.g., impressions > 1000, cost < 100) */
  metricFilters?: MetricFilterParam[]
  /** When true, only returns campaigns created by AlvoBot. Backend resolves IDs from Supabase. */
  alvobotOnly?: boolean
  /** Workspace ID for scoping AlvoBot campaign lookup. Required when alvobotOnly is true. */
  workspaceId?: string
  /** Filter by specific ad account IDs. Applied server-side before pagination. */
  accountIds?: string[]
}

/**
 * Hook for batched loading of ads data from all connections in a single request.
 * The backend already handles multiple sources in one POST /ads/search call,
 * so we send all sources at once instead of making N sequential requests.
 *
 * Features:
 * - Single HTTP request with all sources (reduces N requests to 1)
 * - Shows loading progress via progress state
 * - Handles partial failures from the backend gracefully
 */
export function useProgressiveAdsSearch({
  sources,
  startDate,
  endDate,
  level,
  status = 'all',
  nameContains,
  objective,
  orderBy,
  sortOrder = 'desc',
  page = 1,
  limit = 20,
  forceRefresh = false,
  enabled = true,
  fieldGroup = 'tableView',
  fields,
  connectionNames,
  metricFilters,
  alvobotOnly,
  workspaceId,
  accountIds,
}: UseProgressiveAdsSearchParams) {
  const [response, setResponse] = useState<AdsSearchResponse | null>(null)
  const [progress, setProgress] = useState<ProgressInfo>({
    current: 0,
    total: 0,
    currentSource: '',
    completedSources: [],
  })
  const [isLoading, setIsLoading] = useState(false)
  const [fetchError, setFetchError] = useState<Error | null>(null)
  const [dataUpdatedAt, setDataUpdatedAt] = useState<number | null>(null)

  // Abort controller for cancellation
  const abortControllerRef = useRef<AbortController | null>(null)

  // Track if we need to refetch
  const queryParamsRef = useRef<string>('')

  // Build a stable key for the query params
  const queryKey = JSON.stringify({
    sources: sources.map(s => `${s.platform}:${s.connectionId}`).sort(),
    startDate,
    endDate,
    level,
    status,
    nameContains,
    objective,
    orderBy,
    sortOrder,
    page,
    limit,
    fieldGroup,
    // Include metricFilters in queryKey for cache invalidation
    metricFilters: metricFilters?.map(f => `${f.metric}:${f.operator}:${f.value}:${f.value2 ?? ''}`).join(','),
    // Include alvobotOnly in queryKey so toggling AlvoBot filter triggers a new fetch
    alvobotOnly: alvobotOnly || undefined,
    // Include accountIds in queryKey so changing account selection triggers a new fetch
    accountIds: accountIds?.length ? [...accountIds].sort().join(',') : undefined,
  })

  // Main fetch function - single batched request
  const fetchAllSources = useCallback(async () => {
    if (!enabled || sources.length === 0) return

    // Cancel any in-flight requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()
    const { signal } = abortControllerRef.current

    setIsLoading(true)
    // Don't clear response - keep previous data visible during refetch (stale-while-revalidate)
    setFetchError(null)

    // Build source names for progress display
    const sourceNames = sources.map(s =>
      connectionNames?.get(s.connectionId) ||
      (s.platform === 'google' ? 'Google Ads' : 'Meta Ads')
    )

    setProgress({
      current: 0,
      total: sources.length,
      currentSource: sourceNames.join(', '),
      completedSources: [],
    })

    try {
      // Single batched request with ALL sources
      const result = await api.post<AdsSearchResponse>('/ads/search', {
        sources,
        startDate,
        endDate,
        level,
        status,
        nameContains,
        objective,
        orderBy,
        sortOrder,
        page,
        limit,
        forceRefresh,
        fieldGroup,
        fields,
        metricFilters,
        // AlvoBot filter: backend resolves campaign IDs from Supabase
        ...(alvobotOnly ? { alvobotOnly: true, workspaceId } : {}),
        // Account filter: applied server-side before pagination
        ...(accountIds?.length ? { accountIds } : {}),
      }, { signal })

      setResponse(result)
      setProgress({
        current: sources.length,
        total: sources.length,
        currentSource: '',
        completedSources: sourceNames,
      })
      setDataUpdatedAt(Date.now())
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return // Request was cancelled
      }
      setFetchError(error as Error)
    } finally {
      setIsLoading(false)
    }
  }, [sources, enabled, startDate, endDate, level, status, nameContains, objective, orderBy, sortOrder, page, limit, forceRefresh, fieldGroup, fields, metricFilters, connectionNames, alvobotOnly, workspaceId, accountIds])

  // Trigger fetch when params change
  useEffect(() => {
    if (queryKey !== queryParamsRef.current) {
      queryParamsRef.current = queryKey
      fetchAllSources()
    }
  }, [queryKey, fetchAllSources])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  // Extract data from single response - memoized to prevent unnecessary re-renders
  const items = useMemo(
    () => response?.success ? (response.items || []) : [],
    [response]
  )

  const summary = useMemo(() => response?.success ? {
    totalItems: response.summary?.totalItems || 0,
    totalCost: response.summary?.totalCost || 0,
    totalImpressions: response.summary?.totalImpressions || 0,
    totalClicks: response.summary?.totalClicks || 0,
    totalConversions: response.summary?.totalConversions || 0,
  } : {
    totalItems: 0,
    totalCost: 0,
    totalImpressions: 0,
    totalClicks: 0,
    totalConversions: 0,
  }, [response])

  // Collect failed sources from the backend response - memoized
  const failedSources = useMemo(() => {
    const failed = (response?.failedSources || []).map(fs => ({
      platform: fs.platform,
      connectionId: fs.connectionId,
      error: fs.error || 'Unknown error',
    }))

    // If the entire request failed, add all sources as failed
    if (fetchError && failed.length === 0) {
      sources.forEach(s => {
        failed.push({
          platform: s.platform,
          connectionId: s.connectionId,
          error: fetchError.message,
        })
      })
    }

    return failed
  }, [response, fetchError, sources])

  // Pending sources: all sources while loading, 0 when done
  const pendingSources = isLoading ? sources.length : 0

  // Memoize pagination to prevent unnecessary re-renders
  const pagination = useMemo(() => ({
    page,
    limit,
    total: response?.pagination?.total || summary.totalItems,
    totalPages: response?.pagination?.totalPages || Math.ceil(summary.totalItems / limit),
  }), [page, limit, response?.pagination?.total, response?.pagination?.totalPages, summary.totalItems])

  // Refetch function
  const refetch = useCallback(() => {
    queryParamsRef.current = '' // Force refetch
    fetchAllSources()
  }, [fetchAllSources])

  // isLoading = true only on initial load (no previous data)
  // isFetching = true whenever fetching (including refetch with stale data)
  const hasData = items.length > 0
  const isInitialLoading = isLoading && !hasData

  return {
    items,
    summary,
    pagination,
    failedSources,
    isLoading: isInitialLoading,
    isFetching: isLoading,
    progress,
    pendingSources,
    showProgress: isLoading && sources.length > 1,
    dataUpdatedAt,
    refetch,
  }
}

// ============================================
// Unified Ads Expand (Drill-down)
// ============================================

interface UseUnifiedAdsExpandParams {
  sources: AdsSource[]
  startDate: string
  endDate: string
  parentLevel: 'campaign' | 'adset'
  parentId: string
  childLevel: 'adset' | 'ad'
  orderBy?: AdsOrderBy
  sortOrder?: 'asc' | 'desc'
  enabled?: boolean
}

/**
 * Hook to expand/drill-down into ad objects
 * POST /ads/expand
 */
export function useUnifiedAdsExpand({
  sources,
  startDate,
  endDate,
  parentLevel,
  parentId,
  childLevel,
  orderBy,
  sortOrder = 'desc',
  enabled = true,
}: UseUnifiedAdsExpandParams) {
  // Extract platform and connectionId from first source for cache key
  const firstSource = sources[0]
  const query = useQuery({
    queryKey: unifiedAdsKeys.expandList(parentId, childLevel, startDate, endDate, firstSource?.platform, firstSource?.connectionId),
    queryFn: async ({ signal }): Promise<AdsExpandResponse> => {
      // Use the signal from TanStack Query for automatic request cancellation
      const response = await api.post<AdsExpandResponse>('/ads/expand', {
        sources,
        startDate,
        endDate,
        parentLevel,
        parentId,
        childLevel,
        orderBy,
        sortOrder,
      }, { signal })

      return response
    },
    enabled: enabled && sources.length > 0 && !!parentId,
    staleTime: 10 * 60 * 1000, // 10 minutes for expand data
    refetchOnWindowFocus: false,
  })

  return {
    data: query.data,
    items: query.data?.items || [],
    metadata: query.data?.metadata,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}

// ============================================
// Unified Ads Actions
// ============================================

interface AdsActionParams {
  platform: AdsPlatform
  level: AdsLevel
  objectId: string
  connectionId: string
  customerId?: string
  loginCustomerId?: string
  adAccountId?: string
  name?: string
}

/**
 * Hook to pause an ad object (campaign, adset, or ad)
 *
 * Features:
 * - Optimistic update: UI updates immediately
 * - Rollback on error: reverts to previous state
 * - Background refetch: syncs with server after mutation
 * - Mutation key: serializes concurrent mutations on the same object
 */
export function useUnifiedAdsPause() {
  const queryClient = useQueryClient()

  return useMutation({
    // Mutation key serializes mutations on the same object to prevent race conditions
    mutationKey: ['ads-action'],
    mutationFn: async (params: AdsActionParams): Promise<AdsActionResponse> => {
      return api.post<AdsActionResponse>('/ads/actions/pause', params)
    },
    // Optimistic update
    onMutate: async (params) => {
      // Cancel outgoing refetches for this specific object to prevent race conditions
      await queryClient.cancelQueries({ queryKey: unifiedAdsKeys.search() })
      await queryClient.cancelQueries({ queryKey: unifiedAdsKeys.expand() })

      // Snapshot previous value
      const previousSearchData = queryClient.getQueriesData<AdsSearchResponse>({
        queryKey: unifiedAdsKeys.search(),
      })
      const previousExpandData = queryClient.getQueriesData<AdsExpandResponse>({
        queryKey: unifiedAdsKeys.expand(),
      })

      // Optimistically update search cache
      // Match by id + platform + connectionId to prevent updating wrong items across connections
      queryClient.setQueriesData<AdsSearchResponse>(
        { queryKey: unifiedAdsKeys.search() },
        (old) => {
          if (!old) return old
          return {
            ...old,
            items: old.items.map((item) =>
              item.id === params.objectId &&
              item.platform === params.platform &&
              item.connectionId === params.connectionId
                ? { ...item, status: 'PAUSED' as const }
                : item
            ),
            summary: old.summary ? {
              ...old.summary,
              activeItems: Math.max(0, old.summary.activeItems - 1),
              pausedItems: old.summary.pausedItems + 1,
            } : old.summary,
          }
        }
      )

      // Optimistically update expand cache
      // Match by id + platform + connectionId to prevent updating wrong items across connections
      queryClient.setQueriesData<AdsExpandResponse>(
        { queryKey: unifiedAdsKeys.expand() },
        (old) => {
          if (!old) return old
          return {
            ...old,
            items: old.items.map((item) =>
              item.id === params.objectId &&
              item.platform === params.platform &&
              item.connectionId === params.connectionId
                ? { ...item, status: 'PAUSED' as const }
                : item
            ),
          }
        }
      )

      return { previousSearchData, previousExpandData }
    },
    // Rollback on error
    onError: (_err, _params, context) => {
      if (context?.previousSearchData) {
        context.previousSearchData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
      if (context?.previousExpandData) {
        context.previousExpandData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
    },
    // Background refetch to sync with server - use 'active' to invalidate properly
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: unifiedAdsKeys.search(),
        refetchType: 'active',
      })
      queryClient.invalidateQueries({
        queryKey: unifiedAdsKeys.expand(),
        refetchType: 'active',
      })
    },
  })
}

/**
 * Hook to enable an ad object (campaign, adset, or ad)
 *
 * Features:
 * - Optimistic update: UI updates immediately
 * - Rollback on error: reverts to previous state
 * - Background refetch: syncs with server after mutation
 * - Mutation key: serializes concurrent mutations on the same object
 */
export function useUnifiedAdsEnable() {
  const queryClient = useQueryClient()

  return useMutation({
    // Mutation key serializes mutations on the same object to prevent race conditions
    mutationKey: ['ads-action'],
    mutationFn: async (params: AdsActionParams): Promise<AdsActionResponse> => {
      return api.post<AdsActionResponse>('/ads/actions/enable', params)
    },
    // Optimistic update
    onMutate: async (params) => {
      // Cancel outgoing refetches for this specific object to prevent race conditions
      await queryClient.cancelQueries({ queryKey: unifiedAdsKeys.search() })
      await queryClient.cancelQueries({ queryKey: unifiedAdsKeys.expand() })

      // Snapshot previous value
      const previousSearchData = queryClient.getQueriesData<AdsSearchResponse>({
        queryKey: unifiedAdsKeys.search(),
      })
      const previousExpandData = queryClient.getQueriesData<AdsExpandResponse>({
        queryKey: unifiedAdsKeys.expand(),
      })

      // Optimistically update search cache
      // Match by id + platform + connectionId to prevent updating wrong items across connections
      queryClient.setQueriesData<AdsSearchResponse>(
        { queryKey: unifiedAdsKeys.search() },
        (old) => {
          if (!old) return old
          return {
            ...old,
            items: old.items.map((item) =>
              item.id === params.objectId &&
              item.platform === params.platform &&
              item.connectionId === params.connectionId
                ? { ...item, status: 'ENABLED' as const }
                : item
            ),
            summary: old.summary ? {
              ...old.summary,
              activeItems: old.summary.activeItems + 1,
              pausedItems: Math.max(0, old.summary.pausedItems - 1),
            } : old.summary,
          }
        }
      )

      // Optimistically update expand cache
      // Match by id + platform + connectionId to prevent updating wrong items across connections
      queryClient.setQueriesData<AdsExpandResponse>(
        { queryKey: unifiedAdsKeys.expand() },
        (old) => {
          if (!old) return old
          return {
            ...old,
            items: old.items.map((item) =>
              item.id === params.objectId &&
              item.platform === params.platform &&
              item.connectionId === params.connectionId
                ? { ...item, status: 'ENABLED' as const }
                : item
            ),
          }
        }
      )

      return { previousSearchData, previousExpandData }
    },
    // Rollback on error
    onError: (_err, _params, context) => {
      if (context?.previousSearchData) {
        context.previousSearchData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
      if (context?.previousExpandData) {
        context.previousExpandData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
    },
    // Background refetch to sync with server - use 'active' to invalidate properly
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: unifiedAdsKeys.search(),
        refetchType: 'active',
      })
      queryClient.invalidateQueries({
        queryKey: unifiedAdsKeys.expand(),
        refetchType: 'active',
      })
    },
  })
}

interface AdsBudgetUpdateParams {
  platform: AdsPlatform
  campaignId: string
  newBudget: number
  connectionId: string
  budgetId?: string
  customerId?: string
  loginCustomerId?: string
  adAccountId?: string
}

/**
 * Hook to update campaign budget
 *
 * Features:
 * - Optimistic update: UI updates immediately
 * - Rollback on error: reverts to previous state
 * - Background refetch: syncs with server after mutation
 * - Mutation key: serializes concurrent mutations on the same object
 */
export function useUnifiedAdsBudgetUpdate() {
  const queryClient = useQueryClient()

  return useMutation({
    // Mutation key serializes mutations on the same object to prevent race conditions
    mutationKey: ['ads-action'],
    mutationFn: async (params: AdsBudgetUpdateParams): Promise<AdsActionResponse> => {
      return api.patch<AdsActionResponse>('/ads/actions/budget', params)
    },
    // Optimistic update
    onMutate: async (params) => {
      await queryClient.cancelQueries({ queryKey: unifiedAdsKeys.search() })

      const previousSearchData = queryClient.getQueriesData<AdsSearchResponse>({
        queryKey: unifiedAdsKeys.search(),
      })

      // Optimistically update budget in cache
      // Match by id + platform + connectionId to prevent updating wrong items across connections
      queryClient.setQueriesData<AdsSearchResponse>(
        { queryKey: unifiedAdsKeys.search() },
        (old) => {
          if (!old) return old
          return {
            ...old,
            items: old.items.map((item) =>
              item.id === params.campaignId &&
              item.platform === params.platform &&
              item.connectionId === params.connectionId
                ? { ...item, budget: params.newBudget }
                : item
            ),
          }
        }
      )

      return { previousSearchData }
    },
    // Rollback on error
    onError: (_err, _params, context) => {
      if (context?.previousSearchData) {
        context.previousSearchData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
    },
    // Background refetch - use 'active' to invalidate properly
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: unifiedAdsKeys.search(),
        refetchType: 'active',
      })
      queryClient.invalidateQueries({
        queryKey: unifiedAdsKeys.expand(),
        refetchType: 'active',
      })
    },
  })
}

// ============================================
// Prefetch Utilities
// ============================================

/**
 * Prefetch campaign hierarchy (ad sets) on hover
 * Call this when hovering over a campaign row
 */
export function usePrefetchCampaignHierarchy() {
  const queryClient = useQueryClient()

  return {
    prefetch: (params: {
      sources: AdsSource[]
      startDate: string
      endDate: string
      campaignId: string
    }) => {
      // Extract platform and connectionId from first source for cache key
      const firstSource = params.sources[0]
      const cacheKey = unifiedAdsKeys.expandList(
        params.campaignId,
        'adset',
        params.startDate,
        params.endDate,
        firstSource?.platform,
        firstSource?.connectionId
      )

      // Only prefetch if not already in cache
      if (queryClient.getQueryData(cacheKey)) return

      queryClient.prefetchQuery({
        queryKey: cacheKey,
        queryFn: async () => {
          const response = await api.post<AdsExpandResponse>('/ads/expand', {
            sources: params.sources,
            startDate: params.startDate,
            endDate: params.endDate,
            parentLevel: 'campaign',
            parentId: params.campaignId,
            childLevel: 'adset',
            fieldGroup: 'expandView',
          })
          return response
        },
        staleTime: 10 * 60 * 1000, // 10 minutes
      })
    },
  }
}

/**
 * Prefetch ad group/ad set hierarchy (ads) on hover
 * Call this when hovering over an ad group or ad set row
 */
export function usePrefetchAdSetHierarchy() {
  const queryClient = useQueryClient()

  return {
    prefetch: (params: {
      sources: AdsSource[]
      startDate: string
      endDate: string
      adSetId: string
    }) => {
      // Extract platform and connectionId from first source for cache key
      const firstSource = params.sources[0]
      const cacheKey = unifiedAdsKeys.expandList(
        params.adSetId,
        'ad',
        params.startDate,
        params.endDate,
        firstSource?.platform,
        firstSource?.connectionId
      )

      // Only prefetch if not already in cache
      if (queryClient.getQueryData(cacheKey)) return

      queryClient.prefetchQuery({
        queryKey: cacheKey,
        queryFn: async () => {
          const response = await api.post<AdsExpandResponse>('/ads/expand', {
            sources: params.sources,
            startDate: params.startDate,
            endDate: params.endDate,
            parentLevel: 'adset',
            parentId: params.adSetId,
            childLevel: 'ad',
            fieldGroup: 'expandView',
          })
          return response
        },
        staleTime: 10 * 60 * 1000, // 10 minutes
      })
    },
  }
}

/**
 * Get cached expand data from React Query
 * Used by expand handlers to check if data was already prefetched
 */
export function useExpandCache() {
  const queryClient = useQueryClient()

  return {
    getCachedExpand: (
      parentId: string,
      childLevel: 'adset' | 'ad',
      startDate: string,
      endDate: string,
      platform?: string,
      connectionId?: string
    ): AdsExpandResponse | undefined => {
      const cacheKey = unifiedAdsKeys.expandList(parentId, childLevel, startDate, endDate, platform, connectionId)
      return queryClient.getQueryData<AdsExpandResponse>(cacheKey)
    },
    setCachedExpand: (
      parentId: string,
      childLevel: 'adset' | 'ad',
      startDate: string,
      endDate: string,
      data: AdsExpandResponse,
      platform?: string,
      connectionId?: string
    ): void => {
      const cacheKey = unifiedAdsKeys.expandList(parentId, childLevel, startDate, endDate, platform, connectionId)
      queryClient.setQueryData(cacheKey, data)
    },
  }
}

// ============================================
// Backfill Campaign Names
// ============================================

interface BackfillResult {
  success: boolean
  updated: number
  failed: number
  errors: string[]
}

/**
 * Hook to backfill missing campaign names in Meta action logs
 * Fetches campaign names from Meta API and updates old records
 */
export function useBackfillCampaignNames() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (workspaceId?: string): Promise<BackfillResult> => {
      const params = workspaceId ? `?workspaceId=${workspaceId}` : ''
      return api.post<BackfillResult>(`/meta/dashboard/history/backfill-campaign-names${params}`, {})
    },
    onSuccess: () => {
      // Invalidate history queries to refresh data
      queryClient.invalidateQueries({ queryKey: unifiedAdsKeys.history() })
    },
  })
}
