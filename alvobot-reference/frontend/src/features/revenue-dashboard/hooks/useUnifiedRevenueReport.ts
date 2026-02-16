import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { api } from '@/shared/utils/api'
import type { ActiveNetwork, ActiveAccount } from '../api/useActiveNetworksAndAccounts'
import type {
  UnifiedRevenueRow,
  UnifiedRevenueSummary,
  RevenueSource,
  PrimaryGroupBy,
  SubGroupBy,
  HierarchicalItem,
  PaginationMeta,
  RevenueFieldGroup,
  RevenueMetricField,
} from '../types'

// ============================================
// Types
// ============================================

interface RevenueSourceInput {
  type: 'ad_manager' | 'adsense'
  connectionId: string
  networkId?: string
  accountId?: string
}

interface RevenueReportRequest {
  sources: RevenueSourceInput[]
  startDate: string
  endDate: string
  groupBy?: PrimaryGroupBy
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  search?: string
  forceRefresh?: boolean
  // Pagination parameters
  page?: number
  limit?: number
  // Field selection parameters
  fieldGroup?: RevenueFieldGroup
  metrics?: RevenueMetricField[]
}

interface RevenueMetrics {
  revenue: number
  impressions: number
  clicks: number
  requests: number
  ctr: number
  cpc: number
  rpm: number
  rps: number
  pmr: number
  viewability: number
  fillRate: number
}

interface RevenueRow {
  id: string
  source: RevenueSource
  connectionId: string
  networkId?: string
  accountId?: string
  key: string
  label: string
  domain?: string
  country?: string
  countryCode?: string
  originalCurrencyCode?: string // Original currency before conversion to USD
  originalRevenue?: number // Original revenue amount before conversion
  exchangeRate?: number // Exchange rate used for conversion
  metrics: RevenueMetrics
  childCount?: number
  aggregatedSources?: Array<{
    source: RevenueSource
    connectionId: string
    networkId?: string
    accountId?: string
  }>
}

interface RevenueSummary {
  revenue: number
  impressions: number
  clicks: number
  requests: number
  ctr: number
  cpc: number
  rpm: number
  currency: string
  hasMultipleCurrencies: boolean
  currencies: string[]
  conversionMessage?: string
}

// Failed source info from backend
interface FailedSourceResponse {
  type: 'ad_manager' | 'adsense'
  connectionId: string
  networkId?: string
  accountId?: string
  name: string
  error: string
  retryable: boolean
}

interface RevenueReportResponse {
  rows: RevenueRow[]
  summary: RevenueSummary
  metadata: {
    groupBy: PrimaryGroupBy
    dateRange: {
      start: string
      end: string
    }
    sourcesQueried: number
    sourcesSucceeded: number
    sourcesFailed: number
    cachedAt: string | null
    requestedMetrics?: RevenueMetricField[]
  }
  /** Pagination info (only present when page parameter is provided) */
  pagination?: PaginationMeta
  failedSources?: FailedSourceResponse[]
}

interface RevenueExpandRequest {
  sources: RevenueSourceInput[]
  startDate: string
  endDate: string
  primaryGroupBy: PrimaryGroupBy
  subGroupBy: SubGroupBy
  parentKey: string
  parentDomain?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  forceRefresh?: boolean
}

interface RevenueExpandResponse {
  items: HierarchicalItem[]
  metadata: {
    primaryGroupBy: string
    subGroupBy: string
    parentKey: string
  }
}

// ============================================
// Hook Parameters
// ============================================

interface UseUnifiedRevenueReportParams {
  /** Active networks from Ad Manager */
  activeNetworks: ActiveNetwork[]
  /** Active accounts from AdSense */
  activeAccounts: ActiveAccount[]
  /** Selected network IDs to fetch */
  selectedNetworkIds: string[]
  /** Selected account IDs to fetch */
  selectedAccountIds: string[]
  /** Start date (YYYY-MM-DD) */
  startDate: string
  /** End date (YYYY-MM-DD) */
  endDate: string
  /** Source filter ('all' | 'ad_manager' | 'adsense') */
  sourceFilter: RevenueSource | 'all'
  /** Primary grouping */
  groupBy?: PrimaryGroupBy
  /** Sort field */
  sortBy?: string
  /** Sort order */
  sortOrder?: 'asc' | 'desc'
  /** Search term */
  search?: string
  /**
   * Enable progressive loading mode.
   * When true, fetches sources one by one and updates UI progressively.
   * When false (default), fetches all sources in a single batch request.
   */
  progressive?: boolean

  // ============================================
  // PAGINATION PARAMETERS
  // ============================================

  /**
   * Page number (1-indexed).
   * If not provided, returns all results (no server-side pagination).
   */
  page?: number

  /**
   * Number of items per page.
   * Only applies when `page` is provided.
   * @default 50
   */
  limit?: number

  // ============================================
  // FIELD SELECTION PARAMETERS
  // ============================================

  /**
   * Predefined field group for common use cases.
   * - 'summary': Only essential metrics (revenue, impressions, clicks)
   * - 'tableView': Default table view (revenue, impressions, clicks, ctr, rpm, cpc)
   * - 'full': All available metrics
   * @default 'tableView'
   */
  fieldGroup?: RevenueFieldGroup

  /**
   * Custom list of metrics to return.
   * Takes precedence over `fieldGroup`.
   * Use for fine-grained control over response payload (e.g., based on visible columns).
   */
  metrics?: RevenueMetricField[]
}

interface ProgressInfo {
  /** Current number of completed sources */
  current: number
  /** Total number of sources to fetch */
  total: number
  /** Name of the currently loading source */
  currentSource: string
  /** Names of completed sources */
  completedSources: string[]
}

interface UseUnifiedRevenueReportResult {
  /** Summary totals */
  summary: UnifiedRevenueSummary
  /** Data rows */
  rows: UnifiedRevenueRow[]
  /** Loading state */
  isLoading: boolean
  /** Error state */
  isError: boolean
  /** Error object */
  error: Error | null
  /** Refetch data */
  refetch: () => void
  /** Currency code */
  currencyCode: string
  /** Sources array for use in expand calls */
  sources: RevenueSourceInput[]
  /** Progress info (only in progressive mode) */
  progress: ProgressInfo
  /** Cache timestamp (when data was last cached) */
  cachedAt: string | null
  /** Failed sources for user notification (Nielsen's visibility of system status) */
  failedSources: FailedSourceResponse[]
  /**
   * Whether the current data is placeholder data from a previous query.
   * Use this to show a subtle loading indicator while maintaining UI stability.
   * Part of the "Placeholder Data" optimization pattern.
   */
  isPlaceholderData: boolean

  // ============================================
  // PAGINATION RESULTS
  // ============================================

  /** Pagination metadata (only present when page parameter is provided) */
  pagination: PaginationMeta | null
  /** Whether there is a next page */
  hasNextPage: boolean
  /** Whether there is a previous page */
  hasPrevPage: boolean
  /** Total number of items across all pages */
  totalItems: number
}

// ============================================
// Helper Functions
// ============================================

function getSourceDisplayName(
  source: RevenueSourceInput,
  networks: ActiveNetwork[],
  accounts: ActiveAccount[]
): string {
  if (source.type === 'ad_manager') {
    const network = networks.find(n => n.id === source.networkId)
    return network?.name || `Network ${source.networkId?.slice(0, 8)}...`
  } 
    const account = accounts.find(a => a.id === source.accountId)
    return account?.name || `Account ${source.accountId?.slice(0, 8)}...`
  
}

// ============================================
// Main Hook
// ============================================

export function useUnifiedRevenueReport(
  params: UseUnifiedRevenueReportParams
): UseUnifiedRevenueReportResult {
  const {
    activeNetworks,
    activeAccounts,
    selectedNetworkIds,
    selectedAccountIds,
    startDate,
    endDate,
    sourceFilter,
    groupBy = 'domain',
    sortBy = 'revenue',
    sortOrder = 'desc',
    search,
    progressive = false,
    // Pagination parameters
    page,
    limit = 50,
    // Field selection parameters
    fieldGroup = 'tableView',
    metrics,
  } = params

  // Progressive loading state
  const [progressiveRows, setProgressiveRows] = useState<RevenueRow[]>([])
  const [progressiveLoading, setProgressiveLoading] = useState(false)
  const [progressiveError, setProgressiveError] = useState<Error | null>(null)
  const [progress, setProgress] = useState<ProgressInfo>({
    current: 0,
    total: 0,
    currentSource: '',
    completedSources: [],
  })
  const [fetchTrigger, setFetchTrigger] = useState(0)
  const [forceRefreshFlag, setForceRefreshFlag] = useState(false) // For cache bypass
  const [progressiveCachedAt, setProgressiveCachedAt] = useState<string | null>(null) // Cache timestamp from progressive fetch
  const [progressiveFailedSources, setProgressiveFailedSources] = useState<FailedSourceResponse[]>([]) // Failed sources for notification
  const abortControllerRef = useRef<AbortController | null>(null)
  const lastFetchKeyRef = useRef<string>('')

  // Build sources array from selected networks/accounts
  const sources = useMemo(() => {
    const result: RevenueSourceInput[] = []

    // Add Ad Manager sources (if not filtered to adsense only)
    if (sourceFilter !== 'adsense') {
      const selectedNetworkSet = new Set(selectedNetworkIds)
      for (const network of activeNetworks) {
        if (selectedNetworkSet.has(network.id)) {
          result.push({
            type: 'ad_manager',
            connectionId: network.connectionId,
            networkId: network.id,
          })
        }
      }
    }

    // Add AdSense sources (if not filtered to ad_manager only)
    if (sourceFilter !== 'ad_manager') {
      const selectedAccountSet = new Set(selectedAccountIds)
      for (const account of activeAccounts) {
        if (selectedAccountSet.has(account.id)) {
          result.push({
            type: 'adsense',
            connectionId: account.connectionId,
            accountId: account.id,
          })
        }
      }
    }

    return result
  }, [activeNetworks, activeAccounts, selectedNetworkIds, selectedAccountIds, sourceFilter])

  // Generate fetch key for progressive mode
  const fetchKey = useMemo(() => {
    const sourceIds = sources
      .map(s => `${s.type}:${s.networkId || s.accountId}`)
      .sort()
      .join(',')
    return `${sourceIds}|${startDate}|${endDate}|${groupBy}|${search || ''}`
  }, [sources, startDate, endDate, groupBy, search])

  // Batch mode query (original behavior)
  const {
    data: batchData,
    isLoading: batchLoading,
    isError: batchIsError,
    error: batchError,
    refetch: batchRefetch,
    isPlaceholderData: batchIsPlaceholderData,
  } = useQuery<RevenueReportResponse>({
    queryKey: [
      'revenue',
      'report',
      sources.map(s => `${s.type}:${s.connectionId}:${s.networkId || s.accountId}`).sort(),
      startDate,
      endDate,
      groupBy,
      sortBy,
      sortOrder,
      search,
      // Include pagination and field selection in query key
      page,
      limit,
      metrics ?? fieldGroup,
    ],
    queryFn: async ({ signal }) => {
      if (sources.length === 0) {
        return {
          rows: [],
          summary: {
            revenue: 0,
            impressions: 0,
            clicks: 0,
            requests: 0,
            ctr: 0,
            cpc: 0,
            rpm: 0,
            currency: 'USD',
            hasMultipleCurrencies: false,
            currencies: [],
          },
          metadata: {
            groupBy,
            dateRange: { start: startDate, end: endDate },
            sourcesQueried: 0,
            sourcesSucceeded: 0,
            sourcesFailed: 0,
            cachedAt: null,
          },
          failedSources: [],
        }
      }

      const request: RevenueReportRequest = {
        sources,
        startDate,
        endDate,
        groupBy,
        sortBy,
        sortOrder,
        search,
        // Pagination parameters (only include if page is specified)
        ...(page !== undefined && { page, limit }),
        // Field selection parameters
        ...(metrics ? { metrics } : { fieldGroup }),
      }

      // Pass AbortController signal to cancel request on component unmount or query invalidation
      return api.post<RevenueReportResponse>('/revenue/report', request, { signal })
    },
    enabled: sources.length > 0 && !progressive, // Disable in progressive mode
    // Align with backend cache TTL (15 min for current data)
    // This prevents unnecessary refetches when backend still has cached data
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000, // 1 hour garbage collection
    // PLACEHOLDER DATA PATTERN: Keep previous data while fetching new data
    // This applies to ALL filter changes (pagination, search, groupBy, dateRange, etc.)
    // Prevents jarring UI jumps when changing filters - old data remains visible
    // with a subtle loading indicator while new data loads
    placeholderData: keepPreviousData,
  })

  // Progressive mode fetch effect
  // OPTIMIZATION: Instead of 1 source per request (slow), we batch multiple sources per request.
  // The backend processes sources in parallel batches of 3, so we send all sources in one request.
  // This reduces N HTTP requests (30+ seconds) to 1 HTTP request (~5-10 seconds).
  useEffect(() => {
    if (!progressive) return
    if (sources.length === 0) {
      setProgressiveRows([])
      setProgressiveLoading(false)
      setProgress({ current: 0, total: 0, currentSource: '', completedSources: [] })
      return
    }

    // Skip if key hasn't changed
    if (lastFetchKeyRef.current === fetchKey && lastFetchKeyRef.current !== '') {
      return
    }
    lastFetchKeyRef.current = fetchKey

    // Cancel any in-progress fetch
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    const doProgressiveFetch = async () => {
      const totalSources = sources.length

      // Show initial progress
      setProgress({
        current: 0,
        total: totalSources,
        currentSource: `Carregando ${totalSources} fonte${totalSources > 1 ? 's' : ''}...`,
        completedSources: [],
      })
      setProgressiveLoading(true)
      setProgressiveError(null)

      try {
        // Send ALL sources in a single batch request
        // The backend will process them in parallel (batches of 3)
        const response = await api.post<RevenueReportResponse>('/revenue/report', {
          sources, // All sources at once!
          startDate,
          endDate,
          groupBy,
          sortBy,
          sortOrder,
          search,
          forceRefresh: forceRefreshFlag,
        })

        if (!abortController.signal.aborted) {
          if (response.rows) {
            // Sort rows by selected field
            const sortedRows = [...response.rows].sort((a, b) => {
              const aVal = a.metrics[sortBy as keyof RevenueMetrics] ?? 0
              const bVal = b.metrics[sortBy as keyof RevenueMetrics] ?? 0
              return sortOrder === 'asc' ? aVal - bVal : bVal - aVal
            })
            setProgressiveRows(sortedRows)
          }

          // Update cached timestamp
          if (response.metadata?.cachedAt) {
            setProgressiveCachedAt(response.metadata.cachedAt)
          }

          // Capture failed sources for user notification (Nielsen's visibility of system status)
          if (response.failedSources && response.failedSources.length > 0) {
            setProgressiveFailedSources(response.failedSources)
          } else {
            setProgressiveFailedSources([])
          }

          // Build list of completed source names for progress display
          const completedNames = sources.map(s =>
            getSourceDisplayName(s, activeNetworks, activeAccounts)
          )

          // Update progress to completed (only count successful sources)
          const successfulCount = response.metadata?.sourcesSucceeded ?? totalSources
          setProgress({
            current: successfulCount,
            total: totalSources,
            currentSource: successfulCount < totalSources ? 'Parcialmente concluído' : 'Concluído',
            completedSources: completedNames,
          })
        }
      } catch (error) {
        if (!abortController.signal.aborted) {
          console.error('Failed to fetch revenue report:', error)
          setProgressiveError(error as Error)

          // Show error in progress
          setProgress({
            current: 0,
            total: totalSources,
            currentSource: 'Erro ao carregar',
            completedSources: [],
          })
        }
      } finally {
        if (!abortController.signal.aborted) {
          setProgressiveLoading(false)
          setForceRefreshFlag(false)
        }
      }
    }

    doProgressiveFetch()

    return () => {
      abortController.abort()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progressive, fetchKey, fetchTrigger, forceRefreshFlag])

  // Refetch function that works in both modes
  // When called, bypasses Redis cache to get fresh data from Google APIs
  const refetch = useCallback(() => {
    if (progressive) {
      lastFetchKeyRef.current = ''
      setForceRefreshFlag(true) // Enable cache bypass
      setFetchTrigger(t => t + 1)
    } else {
      batchRefetch()
    }
  }, [progressive, batchRefetch])

  // Select data based on mode
  const data = progressive ? null : batchData
  const rawRows = useMemo<RevenueRow[]>(() => {
    if (progressive) return progressiveRows
    return data?.rows || []
  }, [progressive, progressiveRows, data])

  // Convert response to UnifiedRevenueRow format
  const rows: UnifiedRevenueRow[] = useMemo(() => {
    if (rawRows.length === 0) return []

    const currencyCode = progressive
      ? 'USD' // Progressive mode doesn't have summary currency yet
      : (data?.summary?.currency || 'USD')

    return rawRows.map((row) => ({
      id: row.id,
      source: row.source,
      site: row.label,
      domain: row.domain || '', // Keep empty if no domain - don't fallback to label
      country: row.country,
      countryCode: row.countryCode,
      currencyCode,
      originalCurrencyCode: row.originalCurrencyCode,
      originalRevenue: row.originalRevenue,
      exchangeRate: row.exchangeRate,
      connectionId: row.connectionId,
      networkId: row.networkId,
      accountId: row.accountId,
      metrics: {
        revenue: row.metrics.revenue,
        impressions: row.metrics.impressions,
        clicks: row.metrics.clicks,
        requests: row.metrics.requests,
        ctr: row.metrics.ctr,
        cpc: row.metrics.cpc,
        rpm: row.metrics.rpm,
        rps: row.metrics.rps,
        pmr: row.metrics.pmr,
        viewability: row.metrics.viewability,
      },
      aggregatedCount: row.childCount,
      aggregatedConnections: row.aggregatedSources,
    }))
  }, [rawRows, data, progressive])

  // Calculate summary (computed in progressive mode, from response in batch mode)
  const summary: UnifiedRevenueSummary = useMemo(() => {
    if (!progressive && data?.summary) {
      return {
        revenue: data.summary.revenue,
        impressions: data.summary.impressions,
        clicks: data.summary.clicks,
        ctr: data.summary.ctr,
        cpc: data.summary.cpc,
        rpm: data.summary.rpm,
        currency: data.summary.currency,
        hasMultipleCurrencies: data.summary.hasMultipleCurrencies,
        currencies: data.summary.currencies,
        conversionMessage: data.summary.conversionMessage,
      }
    }

    // Calculate summary from rows (progressive mode or no data)
    const totals = rows.reduce(
      (acc, row) => ({
        revenue: acc.revenue + row.metrics.revenue,
        impressions: acc.impressions + row.metrics.impressions,
        clicks: acc.clicks + row.metrics.clicks,
      }),
      { revenue: 0, impressions: 0, clicks: 0 }
    )

    return {
      revenue: totals.revenue,
      impressions: totals.impressions,
      clicks: totals.clicks,
      ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
      cpc: totals.clicks > 0 ? totals.revenue / totals.clicks : 0,
      rpm: totals.impressions > 0 ? (totals.revenue / totals.impressions) * 1000 : 0,
      currency: 'USD',
      hasMultipleCurrencies: false,
      currencies: ['USD'],
    }
  }, [data, rows, progressive])

  const currencyCode = data?.summary?.currency || 'USD'

  // Select loading/error state based on mode
  const isLoading = progressive ? progressiveLoading : batchLoading
  const isError = progressive ? !!progressiveError : batchIsError
  const error = progressive ? progressiveError : (batchError as Error | null)

  // Select cachedAt based on mode
  const cachedAt = progressive ? progressiveCachedAt : (data?.metadata?.cachedAt || null)

  // Select failedSources based on mode
  const failedSources = progressive ? progressiveFailedSources : (batchData?.failedSources || [])

  // Pagination info from batch response
  const pagination = batchData?.pagination || null
  const hasNextPage = pagination?.hasNextPage ?? false
  const hasPrevPage = pagination?.hasPrevPage ?? false
  const totalItems = pagination?.totalItems ?? rows.length

  // Placeholder data flag (only relevant for batch mode)
  const isPlaceholderData = progressive ? false : batchIsPlaceholderData

  return {
    summary,
    rows,
    isLoading,
    isError,
    error,
    refetch,
    currencyCode,
    sources,
    progress,
    cachedAt,
    failedSources,
    isPlaceholderData,
    // Pagination results
    pagination,
    hasNextPage,
    hasPrevPage,
    totalItems,
  }
}

// ============================================
// Expand Hook
// ============================================

interface UseUnifiedRevenueExpandParams {
  /** Default sources to use if not provided per-call (used as fallback) */
  sources: RevenueSourceInput[]
  startDate: string
  endDate: string
}

interface ExpandMutationParams {
  primaryGroupBy: PrimaryGroupBy
  subGroupBy: SubGroupBy
  parentKey: string
  parentDomain?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  /**
   * Row-specific sources to use for this expand call.
   * This is the key optimization: instead of sending ALL sources (13+),
   * we only send the sources that actually have data for this specific row (typically 1-2).
   * This reduces expand time from 30+ seconds to 2-5 seconds.
   */
  rowSources?: RevenueSourceInput[]
}

/**
 * Generate a stable cache key for expand operations
 */
function getExpandCacheKey(
  startDate: string,
  endDate: string,
  primaryGroupBy: PrimaryGroupBy,
  subGroupBy: SubGroupBy,
  parentKey: string,
  sources: RevenueSourceInput[]
): string[] {
  const sourceKey = sources
    .map(s => `${s.type}:${s.connectionId}:${s.networkId || s.accountId}`)
    .sort()
    .join('|')
  return ['revenue', 'expand', startDate, endDate, primaryGroupBy, subGroupBy, parentKey, sourceKey]
}

/**
 * Generate optimistic placeholder data for expand operations.
 * This creates skeleton-like items that show immediately while real data loads.
 */
function generateOptimisticExpandData(
  parentKey: string,
  subGroupBy: SubGroupBy,
  estimatedCount = 3
): RevenueExpandResponse {
  const placeholderItems: HierarchicalItem[] = Array.from(
    { length: Math.min(estimatedCount, 5) },
    (_, index) => ({
      key: `${parentKey}-placeholder-${index}`,
      label: 'Carregando...',
      groupType: subGroupBy,
      metrics: {
        revenue: 0,
        impressions: 0,
        clicks: 0,
        requests: 0,
        ctr: 0,
        cpc: 0,
        rpm: 0,
        rps: 0,
        pmr: 0,
        viewability: 0,
        fillRate: 0,
      },
      isOptimistic: true, // Flag to identify placeholder data
    })
  )

  return {
    items: placeholderItems,
    metadata: {
      primaryGroupBy: 'domain',
      subGroupBy,
      parentKey,
    },
  }
}

export function useUnifiedRevenueExpand(params: UseUnifiedRevenueExpandParams) {
  const { sources: defaultSources, startDate, endDate } = params
  const queryClient = useQueryClient()

  return useMutation<RevenueExpandResponse, Error, ExpandMutationParams, { cacheKey: string[]; previousData: RevenueExpandResponse | undefined }>({
    mutationFn: async (expandParams) => {
      const { rowSources, ...restParams } = expandParams

      // Use row-specific sources if provided, otherwise fall back to all sources
      // Row-specific sources dramatically improve performance by only querying
      // the connections that actually have data for this row
      const sourcesToUse = rowSources && rowSources.length > 0 ? rowSources : defaultSources

      // Check cache first to avoid redundant API calls
      const cacheKey = getExpandCacheKey(
        startDate,
        endDate,
        restParams.primaryGroupBy,
        restParams.subGroupBy,
        restParams.parentKey,
        sourcesToUse
      )
      const cached = queryClient.getQueryData<RevenueExpandResponse>(cacheKey)
      if (cached && !cached.items.some(item => (item as HierarchicalItem & { isOptimistic?: boolean }).isOptimistic)) {
        // Only return cached data if it's not optimistic placeholder data
        return cached
      }

      const request: RevenueExpandRequest = {
        sources: sourcesToUse,
        startDate,
        endDate,
        ...restParams,
      }

      const response = await api.post<RevenueExpandResponse>('/revenue/expand', request)

      // Cache the result for future expand/collapse cycles
      // Use 30 min staleTime to match backend EXPAND cache TTL
      queryClient.setQueryData(cacheKey, response, {
        updatedAt: Date.now(),
      })

      return response
    },

    // OPTIMISTIC UPDATES PATTERN: Show placeholder data immediately while real data loads
    // This improves perceived performance by eliminating the "blank state" during expand
    onMutate: async (expandParams) => {
      const { rowSources, ...restParams } = expandParams
      const sourcesToUse = rowSources && rowSources.length > 0 ? rowSources : defaultSources

      const cacheKey = getExpandCacheKey(
        startDate,
        endDate,
        restParams.primaryGroupBy,
        restParams.subGroupBy,
        restParams.parentKey,
        sourcesToUse
      )

      // Cancel any outgoing refetches for this key
      await queryClient.cancelQueries({ queryKey: cacheKey })

      // Snapshot the previous value for rollback
      const previousData = queryClient.getQueryData<RevenueExpandResponse>(cacheKey)

      // Only set optimistic data if we don't have real cached data
      if (!previousData || previousData.items.some(item => (item as HierarchicalItem & { isOptimistic?: boolean }).isOptimistic)) {
        // Set optimistic placeholder data
        const optimisticData = generateOptimisticExpandData(
          restParams.parentKey,
          restParams.subGroupBy,
          3 // Default estimate
        )
        queryClient.setQueryData(cacheKey, optimisticData)
      }

      // Return context for rollback
      return { cacheKey, previousData }
    },

    // Rollback on error
    onError: (_error, _variables, context) => {
      if (context?.cacheKey) {
        if (context.previousData) {
          // Restore previous data
          queryClient.setQueryData(context.cacheKey, context.previousData)
        } else {
          // Remove optimistic data if there was no previous data
          queryClient.removeQueries({ queryKey: context.cacheKey })
        }
      }
    },

    // Always refetch after error or success to ensure cache is in sync
    onSettled: (_data, _error, variables) => {
      const { rowSources, ...restParams } = variables
      const sourcesToUse = rowSources && rowSources.length > 0 ? rowSources : defaultSources

      const cacheKey = getExpandCacheKey(
        startDate,
        endDate,
        restParams.primaryGroupBy,
        restParams.subGroupBy,
        restParams.parentKey,
        sourcesToUse
      )

      // Invalidate to ensure fresh data (but don't refetch if we just got data successfully)
      queryClient.invalidateQueries({ queryKey: cacheKey, refetchType: 'none' })
    },
  })
}

// Re-export types for use in page component
export type { RevenueSourceInput, ProgressInfo }
