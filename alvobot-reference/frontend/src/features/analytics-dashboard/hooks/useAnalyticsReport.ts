import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { api } from '@/shared/utils/api'
import type {
  AnalyticsReportRequest,
  AnalyticsReportResponse,
  AnalyticsExpandRequest,
  AnalyticsExpandResponse,
  AnalyticsSource,
  ActiveProperty,
  AnalyticsGroupBy,
  AnalyticsFieldGroup,
  ProgressInfo,
  AnalyticsSummary,
  AnalyticsRow,
  FailedSource,
  PaginationMeta,
} from '../types'

// ============================================
// Report Hook
// ============================================

interface UseAnalyticsReportParams {
  activeProperties: ActiveProperty[]
  selectedPropertyIds: string[]
  startDate: string
  endDate: string
  groupBy?: AnalyticsGroupBy
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  search?: string
  page?: number
  limit?: number
  fieldGroup?: AnalyticsFieldGroup
}

interface UseAnalyticsReportResult {
  summary: AnalyticsSummary | null
  rows: AnalyticsRow[]
  isLoading: boolean
  isError: boolean
  error: Error | null
  refetch: () => void
  sources: AnalyticsSource[]
  progress: ProgressInfo
  cachedAt: string | null
  failedSources: FailedSource[]
  isPlaceholderData: boolean
  pagination: PaginationMeta | null
  hasNextPage: boolean
  hasPrevPage: boolean
  totalItems: number
}

async function fetchAnalyticsReport(
  request: AnalyticsReportRequest
): Promise<AnalyticsReportResponse> {
  return api.post<AnalyticsReportResponse>('/analytics/report', request)
}

export function useAnalyticsReport(
  params: UseAnalyticsReportParams
): UseAnalyticsReportResult {
  const {
    activeProperties,
    selectedPropertyIds,
    startDate,
    endDate,
    groupBy,
    sortBy,
    sortOrder,
    search,
    page,
    limit,
    fieldGroup,
  } = params

  // DEBUG: Log input params
  console.debug('[DEBUG useAnalyticsReport] Input params:', {
    activePropertiesCount: activeProperties.length,
    activeProperties: activeProperties.map(p => ({ id: p.id, propertyId: p.propertyId, displayName: p.displayName, connectionId: p.connectionId })),
    selectedPropertyIds,
    startDate,
    endDate,
    groupBy,
  })

  // Build sources from selected property IDs
  const sources: AnalyticsSource[] = activeProperties
    .filter((p) => {
      const included = selectedPropertyIds.includes(p.propertyId)
      console.debug('[DEBUG useAnalyticsReport] Filter check:', { propertyId: p.propertyId, selectedPropertyIds, included })
      return included
    })
    .map((p) => ({
      connectionId: p.connectionId,
      propertyId: p.propertyId,
    }))

  // DEBUG: Log sources
  console.debug('[DEBUG useAnalyticsReport] Built sources:', sources)
  console.debug('[DEBUG useAnalyticsReport] Query enabled?', sources.length > 0 && !!startDate && !!endDate)

  // Build query key
  const queryKey = [
    'analytics',
    'report',
    sources.map((s) => `${s.connectionId}:${s.propertyId}`).sort().join('|'),
    startDate,
    endDate,
    groupBy || 'pagePath',
    sortBy || 'activeUsers',
    sortOrder || 'desc',
    search || '',
    page || 1,
    limit || 50,
    fieldGroup || 'tableView',
  ]

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      console.debug('[DEBUG useAnalyticsReport] Fetching report with request:', {
        sources,
        startDate,
        endDate,
        groupBy,
        sortBy,
        sortOrder,
        search,
        page,
        limit,
        fieldGroup,
      })
      try {
        const result = await fetchAnalyticsReport({
          sources,
          startDate,
          endDate,
          groupBy,
          sortBy,
          sortOrder,
          search,
          page,
          limit,
          fieldGroup,
        })
        console.debug('[DEBUG useAnalyticsReport] Report response:', {
          rowsCount: result.rows?.length,
          summary: result.summary,
          failedSources: result.failedSources,
          metadata: result.metadata,
        })
        return result
      } catch (error) {
        console.error('[DEBUG useAnalyticsReport] Report error:', error)
        throw error
      }
    },
    enabled: sources.length > 0 && !!startDate && !!endDate,
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    placeholderData: keepPreviousData,
  })

  const emptyProgress: ProgressInfo = {
    current: sources.length,
    total: sources.length,
    isProgressing: false,
  }

  return {
    summary: query.data?.summary || null,
    rows: query.data?.rows || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    sources,
    progress: emptyProgress,
    cachedAt: query.data?.metadata?.cachedAt || null,
    failedSources: query.data?.failedSources || [],
    isPlaceholderData: query.isPlaceholderData,
    pagination: query.data?.pagination || null,
    hasNextPage: query.data?.pagination?.hasNextPage || false,
    hasPrevPage: query.data?.pagination?.hasPrevPage || false,
    totalItems: query.data?.pagination?.totalItems || query.data?.rows?.length || 0,
  }
}

// ============================================
// Expand Hook
// ============================================

interface UseAnalyticsExpandResult {
  expandRow: (params: AnalyticsExpandRequest) => Promise<AnalyticsExpandResponse>
  isExpanding: boolean
}

export function useAnalyticsExpand(): UseAnalyticsExpandResult {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (request: AnalyticsExpandRequest) =>
      api.post<AnalyticsExpandResponse>('/analytics/report/expand', request),
    onSuccess: (data, variables) => {
      // Cache the expand result
      const cacheKey = [
        'analytics',
        'expand',
        variables.sources.map((s) => `${s.connectionId}:${s.propertyId}`).sort().join('|'),
        variables.startDate,
        variables.endDate,
        variables.primaryGroupBy,
        variables.subGroupBy,
        variables.parentKey,
      ]
      queryClient.setQueryData(cacheKey, data)
    },
  })

  return {
    expandRow: mutation.mutateAsync,
    isExpanding: mutation.isPending,
  }
}

// ============================================
// Prefetch Hook
// ============================================

export function usePrefetchAnalyticsExpand() {
  const queryClient = useQueryClient()

  const prefetch = async (request: AnalyticsExpandRequest) => {
    const cacheKey = [
      'analytics',
      'expand',
      request.sources.map((s) => `${s.connectionId}:${s.propertyId}`).sort().join('|'),
      request.startDate,
      request.endDate,
      request.primaryGroupBy,
      request.subGroupBy,
      request.parentKey,
    ]

    // Check if already cached
    const existing = queryClient.getQueryData(cacheKey)
    if (existing) {
      return
    }

    // Prefetch
    await queryClient.prefetchQuery({
      queryKey: cacheKey,
      queryFn: () =>
        api.post<AnalyticsExpandResponse>('/analytics/report/expand', request),
      staleTime: 30 * 60 * 1000, // 30 minutes
    })
  }

  return { prefetch }
}
