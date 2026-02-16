import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link as LinkIcon, DollarSign } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useConnections } from '@/features/connections/api/useConnections'
import { 
  Button, 
  Card,
  CardBody,
  Alert, 
  Spinner,
  PageLayout,
  PageHeader,
  FilterBar,
  PeriodSelector,
  type DateRange,
  getDefault7DayRange,
} from '@/shared/components'
import { useDebounce, useDebouncedCallback } from '@/shared/hooks'
import type { Connection } from '@/shared/types/entities'
import { api } from '@/shared/utils/api'
import styles from './AdManagerDashboardPage.module.css'
import { useActiveAdManagerNetworks, getActiveAdSenseAccounts } from '../api/useActiveNetworksAndAccounts'
import { DEFAULT_COLUMN_VISIBILITY, type ColumnVisibility } from '../components/ColumnVisibilitySelector'
import { FailedSourcesNotification } from '../components/FailedSourcesNotification'
import { NetworkAccountFilter } from '../components/NetworkAccountFilter'
import { Pagination } from '../components/Pagination'
import { RevenueSourceFilter, type RevenueSource } from '../components/RevenueSourceFilter'
import { RevenueSummaryCards } from '../components/RevenueSummaryCards'
import { SiteAnalysisTable } from '../components/SiteAnalysisTable'
import { usePrefetchLimiter } from '../hooks/usePrefetchLimiter'
import { useUnifiedRevenueReport, useUnifiedRevenueExpand } from '../hooks/useUnifiedRevenueReport'
import { VALID_SUB_GROUPINGS,
  type SortField,
  type SortOrder,
  type RevenueSource as RevenueSourceType,
  type PrimaryGroupBy,
  type SubGroupBy,
  type HierarchicalItem,
  type SiteData } from '../types'

// localStorage keys for filter persistence
const STORAGE_KEY_NETWORK_IDS = 'revenue-dashboard:selected-network-ids'
const STORAGE_KEY_ACCOUNT_IDS = 'revenue-dashboard:selected-account-ids'
const STORAGE_KEY_COLUMN_VISIBILITY = 'revenue-dashboard:column-visibility'

export function AdManagerDashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  // Flag to track if we've done the initial auto-select
  const hasAutoSelected = useRef(false)

  // Multi-select filters for networks and accounts (restored from localStorage if available)
  const [selectedNetworkIds, setSelectedNetworkIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_NETWORK_IDS)
      if (saved) {
        hasAutoSelected.current = true // Mark as already selected
        return JSON.parse(saved)
      }
      return []
    } catch {
      return []
    }
  })
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ACCOUNT_IDS)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  // Date range state using standardized PeriodSelector
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    if (startDate && endDate) {
      return { startDate, endDate }
    }
    return getDefault7DayRange()
  })

  // Table state
  const [sortBy, setSortBy] = useState<SortField>('revenue')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [searchTerm, setSearchTerm] = useState('')

  // Debounce search to avoid excessive queries (500ms delay)
  const debouncedSearch = useDebounce(searchTerm, 500)

  // Source filter state (for unified revenue dashboard)
  const [selectedSource, setSelectedSource] = useState<RevenueSource>('all')

  // Hierarchical grouping state
  const [groupBy, setGroupBy] = useState<PrimaryGroupBy>('domain')
  const [subGroupBy, setSubGroupBy] = useState<SubGroupBy>('url')

  // Hierarchical expansion state
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [hierarchicalData, setHierarchicalData] = useState<Map<string, HierarchicalItem[]>>(new Map())
  const [loadingExpand, setLoadingExpand] = useState<string | null>(null)

  // Column visibility state (lifted from SiteAnalysisTable for aggregation control)
  // Persisted to localStorage for user preference retention (Nielsen H6: Recognition over Recall)
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_COLUMN_VISIBILITY)
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<ColumnVisibility>
        // Merge with defaults to handle new columns
        return { ...DEFAULT_COLUMN_VISIBILITY, ...parsed }
      }
      return DEFAULT_COLUMN_VISIBILITY
    } catch {
      return DEFAULT_COLUMN_VISIBILITY
    }
  })

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageLimit, setPageLimit] = useState(50)

  // Reset expansion state when grouping changes
  useEffect(() => {
    setExpandedItems(new Set())
    setHierarchicalData(new Map())
  }, [groupBy, subGroupBy])

  // Re-sort hierarchical data when sort changes
  useEffect(() => {
    setHierarchicalData((prevData) => {
      if (prevData.size === 0) return prevData

      const newData = new Map<string, HierarchicalItem[]>()

      prevData.forEach((items, key) => {
        const sortedItems = [...items].sort((a, b) => {
          // For site/domain/date fields, compare using the key (ISO format for dates)
          if (sortBy === 'site' || sortBy === 'domain' || sortBy === 'date' || sortBy === 'requestUri') {
            // Use key for sorting (preserves ISO format like 2026-W04)
            const aVal = a.key
            const bVal = b.key
            return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
          }
          // For numeric fields
          const aVal = a.metrics[sortBy as keyof typeof a.metrics] ?? 0
          const bVal = b.metrics[sortBy as keyof typeof b.metrics] ?? 0
          return sortOrder === 'asc' ? aVal - bVal : bVal - aVal
        })
        newData.set(key, sortedItems)
      })

      return newData
    })
  }, [sortBy, sortOrder])

  // Use date range from standardized PeriodSelector
  const { startDate, endDate } = dateRange

  // Reset pagination when filters change (must be after startDate/endDate are defined)
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedNetworkIds, selectedAccountIds, startDate, endDate, selectedSource, groupBy, debouncedSearch])

  // Fetch all connections (we'll filter by platform client-side)
  const { data: connectionsData, isLoading: connectionsLoading } = useConnections()

  // Filter Ad Manager connections (plataform_name is 'google' with metadata.type = 'ad_manager')
  const allAdManagerConnections = useMemo(() => {
    return (connectionsData?.filter((c: Connection) => {
      const metadata = c.metadata as { type?: string } | undefined
      const isAdManager =
        c.plataform_name === 'ad_manager' || // Legacy format
        (c.plataform_name === 'google' && metadata?.type === 'ad_manager') // New format
      return isAdManager && c.is_active
    }) || []) as Connection[]
  }, [connectionsData])

  // Batch validate all Ad Manager connections in a single optimized query
  const { data: validationData, isLoading: isValidating } = useQuery({
    queryKey: ['ad-manager', 'validate-connections', allAdManagerConnections.map(c => c.id)],
    queryFn: async () => {
      if (allAdManagerConnections.length === 0) return { success: true, validations: [] }

      const response = await api.post<{
        success: boolean
        validations: Array<{
          connectionId: string
          hasActiveNetworks: boolean
          activeNetworkCount: number
        }>
      }>('/ad-manager/connections/validate', {
        connectionIds: allAdManagerConnections.map(c => c.id),
      })
      return response
    },
    enabled: allAdManagerConnections.length > 0,
    staleTime: 60 * 60 * 1000, // 1 hour (connection status rarely changes)
    gcTime: 2 * 60 * 60 * 1000, // 2 hours garbage collection
  })

  // Filter Ad Manager connections that have at least one active network
  const adManagerConnections = useMemo(() => {
    if (!validationData || isValidating) return []

    return allAdManagerConnections.filter((connection) => {
      const validation = validationData.validations.find(v => v.connectionId === connection.id)
      return validation?.hasActiveNetworks === true
    })
  }, [allAdManagerConnections, validationData, isValidating])

  // Filter AdSense connections (plataform_name is 'adsense' or 'google' with metadata.type === 'adsense')
  const adsenseConnections = useMemo(() => {
    return (connectionsData?.filter((c: Connection) => {
      const isAdSense = c.plataform_name === 'adsense' ||
        (c.plataform_name === 'google' && (c.metadata as Record<string, unknown>)?.type === 'adsense')
      return isAdSense && c.is_active
    }) || []) as Connection[]
  }, [connectionsData])

  // Combined count for source filter
  const adManagerCount = adManagerConnections.length
  const adsenseCount = adsenseConnections.length

  // Fetch active networks from database (not metadata)
  const { data: activeNetworks, isLoading: networksLoading } = useActiveAdManagerNetworks(
    adManagerConnections.map(c => c.id)
  )

  // Get active accounts from AdSense connections metadata
  const activeAccounts = useMemo(() => {
    return getActiveAdSenseAccounts(adsenseConnections)
  }, [adsenseConnections])

  // Save selected IDs to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_NETWORK_IDS, JSON.stringify(selectedNetworkIds))
    } catch (error) {
      console.error('Failed to save network IDs to localStorage:', error)
    }
  }, [selectedNetworkIds])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ACCOUNT_IDS, JSON.stringify(selectedAccountIds))
    } catch (error) {
      console.error('Failed to save account IDs to localStorage:', error)
    }
  }, [selectedAccountIds])

  // Persist column visibility to localStorage (UX: Recognition over Recall)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_COLUMN_VISIBILITY, JSON.stringify(columnVisibility))
    } catch (error) {
      console.error('Failed to save column visibility to localStorage:', error)
    }
  }, [columnVisibility])

  // Auto-select all active networks/accounts ONLY on first load (if no localStorage data)
  useEffect(() => {
    if (networksLoading) return
    if (hasAutoSelected.current) return // Already selected (from localStorage or previous run)

    const allNetworkIds = (activeNetworks || []).filter(n => n.id).map(n => n.id)
    const allAccountIds = activeAccounts.filter(a => a.id).map(a => a.id)

    // Select all available networks/accounts on first load
    if (allNetworkIds.length > 0 || allAccountIds.length > 0) {
      setSelectedNetworkIds(allNetworkIds)
      setSelectedAccountIds(allAccountIds)
      hasAutoSelected.current = true
    }
  }, [activeNetworks, activeAccounts, networksLoading])

  // Build filters (use debounced search for better performance)
  const filters = useMemo(
    () => ({
      sortBy,
      sortOrder,
      search: debouncedSearch || undefined,
      groupBy,
    }),
    [sortBy, sortOrder, debouncedSearch, groupBy]
  )


  // Unified revenue data (Ad Manager + AdSense) - uses optimized backend endpoint
  // Progressive mode: fetch sources one by one to show progress and reduce anxiety
  const {
    rows: unifiedRows,
    summary: unifiedSummary,
    isLoading: unifiedLoading,
    isError: unifiedError,
    refetch: refetchUnified,
    sources: revenueSources,
    progress,
    cachedAt,
    failedSources,
    // Pagination results
    pagination,
    // Placeholder data flag - used to show subtle loading indicator
    isPlaceholderData,
  } = useUnifiedRevenueReport({
    activeNetworks: activeNetworks || [],
    activeAccounts,
    selectedNetworkIds,
    selectedAccountIds,
    startDate,
    endDate,
    sourceFilter: selectedSource,
    sortBy,
    sortOrder,
    search: debouncedSearch || undefined,
    groupBy,
    progressive: true, // Enable progressive loading for better UX
    // Pagination parameters
    page: currentPage,
    limit: pageLimit,
    // Field selection: only request metrics for visible columns
    fieldGroup: 'tableView', // Default to table view metrics
  })

  // Unified hierarchical expand mutation
  const unifiedExpandMutation = useUnifiedRevenueExpand({
    sources: revenueSources,
    startDate,
    endDate,
  })

  // Get currency from unified data
  const currencyCode = useMemo(() => {
    return unifiedSummary?.currency || 'USD'
  }, [unifiedSummary])

  // Helper to extract domain from URL
  const extractDomainFromUrl = (url: string): string => {
    if (!url) return ''
    // If it's already a domain (no path), return as-is
    if (!url.includes('/') && !url.startsWith('http')) {
      return url
    }
    try {
      // Try to parse as URL
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`)
      return urlObj.hostname
    } catch {
      // If not a valid URL, return as-is
      return url
    }
  }

  // Convert unified rows to SiteData format for table
  const tableData = useMemo(() => {
    // Convert UnifiedRevenueRow to SiteData format
    // Domain column shows the actual domain extracted from URL or the domain itself
    // Key-Value column shows the grouping key (date, url, domain key-value)
    return unifiedRows.map((row) => {
      let domain: string

      // Helper to try extracting domain from URL-like strings
      const tryExtractDomain = (value: string): string => {
        if (!value) return ''
        // Try to extract from URL
        const extracted = extractDomainFromUrl(value)
        if (extracted) return extracted
        // If it contains a path, try to extract domain from the beginning
        if (value.includes('/') && !value.startsWith('/')) {
          const beforePath = value.split('/')[0]
          if (beforePath.includes('.')) return beforePath
        }
        return ''
      }

      // For URL grouping, always prefer backend's domain first
      // Backend extracts domain from key-value (TOP_PRIVATE_DOMAIN for Ad Manager, PAGE_URL for AdSense)
      // Only fallback to extracting from site if backend didn't provide domain
      if (groupBy === 'url' || groupBy === 'url_full') {
        domain = row.domain || tryExtractDomain(row.site) || ''
      }
      // For country grouping, use the domain from the backend response
      else if (groupBy === 'country') {
        domain = row.domain || ''
      }
      // For date grouping, use the domain from the backend response
      else if (groupBy === 'date_day' || groupBy === 'date_week' || groupBy === 'date_month') {
        if (row.domain) {
          // Backend returned domain per row - show it
          domain = row.domain
        } else if (row.aggregatedDomains && row.aggregatedDomains.length > 0) {
          // Aggregated rows - show summary
          // Filter out empty domains
          const validDomains = row.aggregatedDomains.filter(d => d && d.trim() !== '')
          domain = validDomains.length === 1
            ? validDomains[0]
            : validDomains.length > 0
              ? `(${validDomains.length} domínios)`
              : ''
        } else {
          // Fallback for aggregated or unknown
          domain = ''
        }
      }
      // For domain grouping, use the actual domain from backend
      // row.site = key-value (e.g., land_uri=/path)
      // row.domain = actual domain (e.g., example.com)
      else {
        domain = row.domain || ''
      }

      // If we still don't have a domain, try to extract from the site URL
      if (!domain) {
        domain = tryExtractDomain(row.site)
      }

      return {
        site: row.site,
        domain,
        country: row.country,
        countryCode: row.countryCode,
        childCount: row.aggregatedCount || 0,
        metrics: {
          revenue: row.metrics.revenue,
          rps: row.metrics.rps || 0,
          ecpm: row.metrics.rpm,
          pmr: row.metrics.pmr || 0,
          viewability: row.metrics.viewability || 0,
          cpc: row.metrics.cpc,
          ctr: row.metrics.ctr,
          clicks: row.metrics.clicks,
          impressions: row.metrics.impressions,
          requests: row.metrics.requests || 0,
        },
        // Currency conversion info (when converted from non-USD)
        originalCurrencyCode: row.originalCurrencyCode,
        originalRevenue: row.originalRevenue,
        exchangeRate: row.exchangeRate,
        // Connection info for optimized expand - only query sources that have data for this row
        aggregatedConnections: row.aggregatedConnections,
        // Single source connection (for non-aggregated rows)
        connectionId: row.connectionId,
        networkId: row.networkId,
        accountId: row.accountId,
        source: row.source,
      }
    })
  }, [unifiedRows, groupBy])

  // Calculate summary data
  const summaryData = useMemo(() => {
    if (!unifiedRows.length) return undefined
    return {
      revenue: unifiedSummary.revenue,
      impressions: unifiedSummary.impressions,
      clicks: unifiedSummary.clicks,
      ctr: unifiedSummary.ctr,
      cpc: unifiedSummary.cpc,
      rpm: unifiedSummary.rpm,
      currency: unifiedSummary.currency || currencyCode,
      hasMultipleCurrencies: unifiedSummary.hasMultipleCurrencies,
    }
  }, [unifiedRows, unifiedSummary, currencyCode])

  // Helper to generate consistent keys for maps (matching SiteAnalysisTable's getItemKey logic)
  const getRowKey = useCallback((row: { site: string; domain?: string; countryCode?: string }): string => {
    // For domain grouping, the key is domain|||keyValue (matching SiteAnalysisTable)
    if (groupBy === 'domain') {
      return `${row.domain}|||${row.site}`
    }
    // For URL grouping (slug or full), the key is the site (keyValue)
    if (groupBy === 'url' || groupBy === 'url_full') {
      return row.site
    }
    // For country grouping, the key is the countryCode or site
    if (groupBy === 'country') {
      return row.countryCode || row.site
    }
    // For date groupings with specific domain (not aggregated), include domain in key
    const isDateGrouping = groupBy === 'date_day' || groupBy === 'date_week' || groupBy === 'date_month'
    if (isDateGrouping && row.domain && !row.domain.startsWith('(')) {
      return `${row.site}|||${row.domain}`
    }
    // Default: just the site key
    return row.site
  }, [groupBy])

  // Build source map for table badges
  const sourceMap = useMemo(() => {
    const map = new Map<string, RevenueSourceType>()
    unifiedRows.forEach((row) => {
      const key = getRowKey(row)
      map.set(key, row.source)
      // Also set by site alone for fallback lookups
      map.set(row.site, row.source)
    })
    return map
  }, [unifiedRows, getRowKey])

  // Build source name map for tooltip on source badges
  // Maps networkId/accountId to human-readable name
  const sourceNameMap = useMemo(() => {
    const map = new Map<string, string>()

    // Add Ad Manager network names
    ;(activeNetworks || []).forEach((network) => {
      if (network.id && network.name) {
        map.set(network.id, network.name)
      }
    })

    // Add AdSense account names
    activeAccounts.forEach((account) => {
      if (account.id && account.name) {
        map.set(account.id, account.name)
      }
    })

    return map
  }, [activeNetworks, activeAccounts])

  // Combined loading state
  const isLoading = unifiedLoading

  // Combined error state
  const hasError = unifiedError

  // Update URL params when filters change
  // Sync date range to URL params
  useEffect(() => {
    const params = new URLSearchParams()
    params.set('startDate', dateRange.startDate)
    params.set('endDate', dateRange.endDate)
    setSearchParams(params, { replace: true })
  }, [dateRange.startDate, dateRange.endDate, setSearchParams])

  // Handle date range change from PeriodSelector
  const handleDateRangeChange = useCallback((newRange: DateRange) => {
    setDateRange(newRange)
    // Reset expansion state on period change
    setExpandedItems(new Set())
    setHierarchicalData(new Map())
  }, [])

  // Handle sort
  const handleSort = useCallback((field: SortField) => {
    if (sortBy === field) {
      // Toggle sort order when clicking the same column
      setSortOrder((order) => (order === 'asc' ? 'desc' : 'asc'))
    } else {
      // New column: set as sort field with descending order
      setSortBy(field)
      setSortOrder('desc')
    }
  }, [sortBy])

  // Handle search
  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term)
  }, [])

  // Handle refresh
  const handleRefresh = useCallback(() => {
    refetchUnified()
  }, [refetchUnified])

  // Handle groupBy change
  const handleGroupByChange = useCallback((newGroupBy: PrimaryGroupBy) => {
    setGroupBy(newGroupBy)
    // Reset to first valid sub-grouping for new primary grouping
    const validOptions = VALID_SUB_GROUPINGS[newGroupBy]
    if (!validOptions.includes(subGroupBy)) {
      setSubGroupBy(validOptions[0])
    }
  }, [subGroupBy])

  // Handle subGroupBy change
  const handleSubGroupByChange = useCallback((newSubGroupBy: SubGroupBy) => {
    setSubGroupBy(newSubGroupBy)
  }, [])

  // Handle hierarchical item toggle
  // Now accepts optional rowData for optimized expand (only query sources with data for this row)
  const handleToggleItem = useCallback(
    async (itemKey: string, rowData?: SiteData) => {
      if (expandedItems.has(itemKey)) {
        // Collapse
        setExpandedItems((prev) => {
          const next = new Set(prev)
          next.delete(itemKey)
          return next
        })
        return
      }

      // Check if we already have data
      if (hierarchicalData.has(itemKey)) {
        setExpandedItems((prev) => new Set(prev).add(itemKey))
        return
      }

      // Skip expand for 'none' or 'total' sub-grouping
      if (subGroupBy === 'none' || subGroupBy === 'total') {
        return
      }

      // For backend API, extract the actual parent key (first part before |||)
      // For date groupings: "2026-01-19|||domain" -> "2026-01-19"
      // For domain groupings: "domain|||site" -> "domain"
      const backendParentKey = itemKey.includes('|||') ? itemKey.split('|||')[0] : itemKey

      // Get parent domain if available (for date groupings with specific domain)
      const parentDomain = itemKey.includes('|||') ? itemKey.split('|||')[1] : undefined

      // Build row-specific sources for optimized expand
      // This is the key optimization: instead of sending ALL sources (13+),
      // we only send the sources that actually have data for this specific row
      let rowSources: typeof revenueSources | undefined
      if (rowData) {
        if (rowData.aggregatedConnections && rowData.aggregatedConnections.length > 0) {
          // Row is aggregated from multiple sources - use all of them
          rowSources = rowData.aggregatedConnections.map((conn) => ({
            type: conn.source === 'ad_manager' ? 'ad_manager' as const : 'adsense' as const,
            connectionId: conn.connectionId,
            networkId: conn.networkId,
            accountId: conn.accountId,
          }))
        } else if (rowData.connectionId && rowData.source) {
          // Single source row
          rowSources = [{
            type: rowData.source === 'ad_manager' ? 'ad_manager' as const : 'adsense' as const,
            connectionId: rowData.connectionId,
            networkId: rowData.networkId,
            accountId: rowData.accountId,
          }]
        }
      }

      setLoadingExpand(itemKey)
      try {
        // Use unified expand endpoint with row-specific sources for better performance
        // This dramatically reduces expand time from 30+ seconds to 2-5 seconds
        const result = await unifiedExpandMutation.mutateAsync({
          primaryGroupBy: groupBy,
          subGroupBy,
          parentKey: backendParentKey,
          parentDomain,
          sortBy: filters.sortBy,
          sortOrder: filters.sortOrder,
          rowSources, // Optimized: only query sources that have data for this row
        })

        const items = result.items || []

        if (items.length > 0) {
          setHierarchicalData((prev) => new Map(prev).set(itemKey, items))
          setExpandedItems((prev) => new Set(prev).add(itemKey))
        }
      } catch (err) {
        console.error('Expand error:', err)
      } finally {
        setLoadingExpand(null)
      }
    },
    [expandedItems, hierarchicalData, subGroupBy, unifiedExpandMutation, groupBy, filters]
  )



  // Query client for prefetching
  const queryClient = useQueryClient()

  // CONCURRENCY LIMITS: Limit parallel prefetch operations to avoid flooding the API
  // Max 3 concurrent prefetch requests - additional requests are queued
  const { limitedExecute: limitedPrefetch, clearPending: clearPendingPrefetch } = usePrefetchLimiter(3)

  // Clear pending prefetch operations when filters change to avoid stale prefetches
  useEffect(() => {
    clearPendingPrefetch()
  }, [startDate, endDate, groupBy, subGroupBy, clearPendingPrefetch])

  // Handle prefetch on hover - prefetches expand data before user clicks
  // Debounced to prevent excessive API calls when quickly moving mouse over rows
  // Uses concurrency limiter to prevent flooding the API with too many requests
  const doPrefetchExpand = useCallback(
    (itemKey: string, rowData: SiteData) => {
      // Skip if we already have data or sub-grouping is disabled
      if (hierarchicalData.has(itemKey)) return
      if (subGroupBy === 'none' || subGroupBy === 'total') return

      // Extract backend parent key
      const backendParentKey = itemKey.includes('|||') ? itemKey.split('|||')[0] : itemKey
      const parentDomain = itemKey.includes('|||') ? itemKey.split('|||')[1] : undefined

      // Build row-specific sources for optimized prefetch
      let rowSources: typeof revenueSources | undefined
      if (rowData.aggregatedConnections && rowData.aggregatedConnections.length > 0) {
        rowSources = rowData.aggregatedConnections.map((conn) => ({
          type: conn.source === 'ad_manager' ? 'ad_manager' as const : 'adsense' as const,
          connectionId: conn.connectionId,
          networkId: conn.networkId,
          accountId: conn.accountId,
        }))
      } else if (rowData.connectionId && rowData.source) {
        rowSources = [{
          type: rowData.source === 'ad_manager' ? 'ad_manager' as const : 'adsense' as const,
          connectionId: rowData.connectionId,
          networkId: rowData.networkId,
          accountId: rowData.accountId,
        }]
      }

      // Build cache key for this expand operation
      const sourcesToUse = rowSources && rowSources.length > 0 ? rowSources : revenueSources
      const sourceKey = sourcesToUse
        .map(s => `${s.type}:${s.connectionId}:${s.networkId || s.accountId}`)
        .sort()
        .join('|')
      const cacheKey = ['revenue', 'expand', startDate, endDate, groupBy, subGroupBy, backendParentKey, sourceKey]

      // Check if already cached
      const cached = queryClient.getQueryData(cacheKey)
      if (cached) return

      // CONCURRENCY LIMITED PREFETCH: Use the limiter to queue prefetch requests
      // This prevents flooding the API when user quickly hovers over multiple rows
      limitedPrefetch(async () => {
        await queryClient.prefetchQuery({
          queryKey: cacheKey,
          queryFn: async () => {
            const response = await api.post('/revenue/expand', {
              sources: sourcesToUse,
              startDate,
              endDate,
              primaryGroupBy: groupBy,
              subGroupBy,
              parentKey: backendParentKey,
              parentDomain,
              sortBy: filters.sortBy,
              sortOrder: filters.sortOrder,
            })
            return response
          },
          staleTime: 30 * 60 * 1000, // 30 minutes
        })
      })
    },
    [hierarchicalData, subGroupBy, revenueSources, startDate, endDate, groupBy, filters, queryClient, limitedPrefetch]
  )

  // Debounced prefetch handler - 150ms delay prevents excessive API calls when moving mouse quickly
  const handlePrefetchExpand = useDebouncedCallback(doPrefetchExpand, 150)
  // Format cache timestamp for display (relative time for refresh button)
  const cacheTimeText = useMemo(() => {
    if (!cachedAt) return null

    try {
      const cacheDate = new Date(cachedAt)
      const now = new Date()
      const diffMs = now.getTime() - cacheDate.getTime()
      const diffMinutes = Math.floor(diffMs / (1000 * 60))
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

      if (diffMinutes < 1) return '< 1 min'
      if (diffMinutes < 60) return `Há ${diffMinutes} min`
      if (diffHours < 24) return `Há ${diffHours}h`
      return `Há ${diffDays} dia${diffDays > 1 ? 's' : ''}`
    } catch {
      return null
    }
  }, [cachedAt])

  // No connections state
  const hasAnyConnection = adManagerConnections.length > 0 || adsenseConnections.length > 0
  if (!connectionsLoading && !hasAnyConnection) {
    return (
      <PageLayout>
        <PageHeader
          icon={<DollarSign size={24} />}
          title="Receita"
          subtitle="Acompanhe sua receita de anúncios"
          secondaryActions={
            <RevenueSourceFilter
              value={selectedSource}
              onChange={setSelectedSource}
              adManagerCount={0}
              adsenseCount={0}
              disabled
            />
          }
        />

        <Card>
          <CardBody>
            <div className={styles.emptyState}>
              <LinkIcon size={48} className={styles.emptyIcon} />
              <h2>Nenhuma conexão encontrada</h2>
              <p>
                Conecte sua conta do Google Ad Manager ou AdSense para visualizar as métricas de receita.
              </p>
              <Button variant="primary" onClick={() => window.location.href = '/connections'}>
                Ir para Conexões
              </Button>
            </div>
          </CardBody>
        </Card>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <PageHeader
        icon={<DollarSign size={24} />}
        title="Receita"
        subtitle="Acompanhe sua receita de anúncios"
        cacheTime={cacheTimeText}
        isRefreshing={isLoading}
        onRefresh={handleRefresh}
        secondaryActions={
          <RevenueSourceFilter
            value={selectedSource}
            onChange={setSelectedSource}
            adManagerCount={adManagerCount}
            adsenseCount={adsenseCount}
          />
        }
      />

      <FilterBar
        rightContent={
          <NetworkAccountFilter
            activeNetworks={activeNetworks || []}
            activeAccounts={activeAccounts}
            selectedNetworkIds={selectedNetworkIds}
            selectedAccountIds={selectedAccountIds}
            onNetworkSelectionChange={setSelectedNetworkIds}
            onAccountSelectionChange={setSelectedAccountIds}
            isLoading={networksLoading}
          />
        }
      >
        <PeriodSelector value={dateRange} onChange={handleDateRangeChange} />
      </FilterBar>

      <RevenueSummaryCards
        data={summaryData}
        isLoading={(unifiedLoading && !summaryData) || connectionsLoading}
      />

      {/* Nielsen's Heuristics: Visibility of system status - Show partial failures */}
      {failedSources.length > 0 && !unifiedLoading && (
        <FailedSourcesNotification
          failedSources={failedSources}
          onRetry={handleRefresh}
        />
      )}

      {hasError && (
        <Alert variant="error" style={{ marginBottom: 'var(--space-6)' }}>
          <strong>Não foi possível carregar os dados de receita.</strong>
          <br />
          Verifique sua conexão com a internet e tente novamente. Se o problema persistir, suas credenciais do Google podem precisar ser renovadas em <a href="/connections" style={{ color: 'inherit', textDecoration: 'underline' }}>Conexões</a>.
        </Alert>
      )}

      {/* Table Section - STANDARDIZED: No card header, just toolbar + table (matches Central de Anúncios) */}
      <div className={`${styles.tableSection} ${isPlaceholderData ? styles.placeholderOverlay : ''}`}>
        {connectionsLoading ? (
          <div className={styles.loading}>
            <Spinner size="lg" />
            <span>Carregando...</span>
          </div>
        ) : (
          <SiteAnalysisTable
            data={tableData}
            currencyCode={currencyCode}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={handleSort}
            onSearch={handleSearch}
            searchTerm={searchTerm}
            isLoading={isLoading && tableData.length === 0}
            pendingSources={0}
            showSource={selectedSource === 'all'}
            sourceMap={sourceMap}
            sourceNameMap={sourceNameMap}
            groupBy={groupBy}
            onGroupByChange={handleGroupByChange}
            subGroupBy={subGroupBy}
            onSubGroupByChange={handleSubGroupByChange}
            expandedItems={expandedItems}
            onToggleItem={handleToggleItem}
            loadingExpand={loadingExpand}
            hierarchicalData={hierarchicalData}
            columnVisibility={columnVisibility}
            onColumnVisibilityChange={setColumnVisibility}
            progress={progress}
            showProgress={unifiedLoading && progress.total > 0}
            startDate={startDate}
            endDate={endDate}
            onPrefetchExpand={handlePrefetchExpand}
          />
        )}

        {/* Pagination controls - STANDARDIZED: Same style as Central de Anúncios */}
        {pagination && !unifiedLoading && tableData.length > 0 && (
          <Pagination
            pagination={pagination}
            onPageChange={setCurrentPage}
            onLimitChange={setPageLimit}
            showLimitSelector
          />
        )}
      </div>
    </PageLayout>
  )
}
