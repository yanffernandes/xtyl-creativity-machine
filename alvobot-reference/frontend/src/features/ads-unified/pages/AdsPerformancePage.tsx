import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import {
  BarChart3,
  Settings,
  History,
  FileEdit,
  Plus,
} from 'lucide-react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { BudgetModal } from '@/features/alvoads-google-dashboard/components'
import type { CampaignMetrics } from '@/features/alvoads-google-dashboard/types'
import { useConnections } from '@/features/connections/api/useConnections'
import { useWorkspaceId } from '@/features/workspace/stores/workspaceStore'
import { 
  Button, 
  showToast,
  PageLayout,
  PageHeader,
  FilterBar,
  PageNav,
  PeriodSelector,
  type DateRange,
  getDefault7DayRange,
} from '@/shared/components'
import { useDocumentTitle, useDebounce, useDebouncedCallback } from '@/shared/hooks'
import { api } from '@/shared/utils/api'
import {
  useMetaAdAccounts,
  useUnifiedAdsPause,
  useUnifiedAdsEnable,
  useUnifiedAdsBudgetUpdate,
  useProgressiveAdsSearch,
  usePrefetchCampaignHierarchy,
  usePrefetchAdSetHierarchy,
  useExpandCache,
  useAlvobotCampaignIds,
} from '../api'
import styles from './AdsPerformancePage.module.css'
import { AdsAccountFilter, type GoogleAdsAccount, type MetaAdsAccount  } from '../components/AdsAccountFilter'
import { AdsSummaryCards } from '../components/AdsSummaryCards'
import { PlatformSelector } from '../components/PlatformSelector'
import {
  UnifiedCampaignPerformanceTable,
  unifiedAdObjectToRow,
  type UnifiedCampaignRow,
  type PerformanceTableFilters,
} from '../components/UnifiedCampaignPerformanceTable'
import { useUnifiedAdsStore, useSelectedPlatforms } from '../stores/unifiedAdsStore'
import type { AdsPlatform, AdsSource, AdsExpandResponse } from '../types'

// Format relative time helper - returns text suitable for refresh button display
function formatRelativeTimeHelper(date: Date): string {
  const now = Date.now()
  const diffMs = now - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)

  if (diffSecs < 60) return '< 1 min'
  if (diffMins === 1) return 'Há 1 min'
  if (diffMins < 60) return `Há ${diffMins} min`
  if (diffHours === 1) return 'Há 1h'
  if (diffHours < 24) return `Há ${diffHours}h`
  return `Há ${Math.floor(diffHours / 24)} dia${diffHours >= 48 ? 's' : ''}`
}

// Navigation items for sub-pages
const NAV_ITEMS = [
  { to: '/ads', label: 'Performance', icon: <BarChart3 size={16} /> },
  { to: '/ads/drafts', label: 'Rascunhos', icon: <FileEdit size={16} /> },
  { to: '/ads/automations', label: 'Automações', icon: <Settings size={16} /> },
  { to: '/ads/history', label: 'Histórico', icon: <History size={16} /> },
]

const PERFORMANCE_ACCOUNTS_STORAGE_KEY = 'unified-ads-performance-accounts-v1'
const PERFORMANCE_FILTERS_STORAGE_KEY = 'unified-ads-performance-filters-v1'
const PERFORMANCE_PAGE_SIZE_STORAGE_KEY = 'unified-ads-performance-page-size-v1'

interface StoredPerformanceAccounts {
  googleAccountIds: string[]
  metaAccountIds: string[]
}

const loadPerformanceAccounts = (): StoredPerformanceAccounts => {
  if (typeof window === 'undefined') {
    return { googleAccountIds: [], metaAccountIds: [] }
  }
  try {
    const raw = window.localStorage.getItem(PERFORMANCE_ACCOUNTS_STORAGE_KEY)
    if (!raw) return { googleAccountIds: [], metaAccountIds: [] }
    const parsed = JSON.parse(raw) as Partial<StoredPerformanceAccounts>
    if (!parsed || typeof parsed !== 'object') {
      return { googleAccountIds: [], metaAccountIds: [] }
    }
    return {
      googleAccountIds: Array.isArray(parsed.googleAccountIds) ? parsed.googleAccountIds : [],
      metaAccountIds: Array.isArray(parsed.metaAccountIds) ? parsed.metaAccountIds : [],
    }
  } catch {
    return { googleAccountIds: [], metaAccountIds: [] }
  }
}

const loadPerformanceFilters = (): PerformanceTableFilters => {
  if (typeof window === 'undefined') {
    return { search: '', status: 'active', objective: 'all', alvobotOnly: false, metricFilters: [] }
  }
  try {
    const raw = window.localStorage.getItem(PERFORMANCE_FILTERS_STORAGE_KEY)
    if (!raw) return { search: '', status: 'active', objective: 'all', alvobotOnly: false, metricFilters: [] }
    const parsed = JSON.parse(raw) as Partial<PerformanceTableFilters>
    return {
      search: typeof parsed.search === 'string' ? parsed.search : '',
      status: parsed.status === 'active' || parsed.status === 'paused' || parsed.status === 'all' ? parsed.status : 'active',
      objective: typeof parsed.objective === 'string' ? parsed.objective : 'all',
      alvobotOnly: typeof parsed.alvobotOnly === 'boolean' ? parsed.alvobotOnly : false,
      metricFilters: Array.isArray(parsed.metricFilters) ? parsed.metricFilters : [],
    }
  } catch {
    return { search: '', status: 'active', objective: 'all', alvobotOnly: false, metricFilters: [] }
  }
}

const loadPerformancePageSize = (): number => {
  if (typeof window === 'undefined') return 20
  try {
    const raw = window.localStorage.getItem(PERFORMANCE_PAGE_SIZE_STORAGE_KEY)
    if (!raw) return 20
    const parsed = Number(raw)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 20
  } catch {
    return 20
  }
}

export function AdsPerformancePage() {
  useDocumentTitle('Central de Anúncios')
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // Store state
  const selectedPlatforms = useSelectedPlatforms()
  const { setSelectedPlatforms } = useUnifiedAdsStore()

  // T064: URL-driven platform state
  const platformFromUrl = searchParams.get('platform')
  useEffect(() => {
    if (platformFromUrl) {
      const platforms = platformFromUrl.split(',').filter(
        (p): p is AdsPlatform => p === 'google' || p === 'meta'
      )
      if (platforms.length > 0) {
        setSelectedPlatforms(platforms)
      }
    }
  }, [platformFromUrl, setSelectedPlatforms])

  // Handle platform change with URL sync
  const handlePlatformChange = useCallback((platforms: AdsPlatform[]) => {
    setSelectedPlatforms(platforms)
    if (platforms.length === 1 && platforms[0] === 'google') {
      searchParams.delete('platform')
    } else {
      searchParams.set('platform', platforms.join(','))
    }
    setSearchParams(searchParams, { replace: true })
  }, [searchParams, setSearchParams, setSelectedPlatforms])

  // Handle create campaign
  const handleCreateCampaign = useCallback(() => {
    if (selectedPlatforms.includes('google')) {
      navigate('/alvoads-google/wizard')
    } else if (selectedPlatforms.includes('meta')) {
      navigate('/alvoads-meta')
    }
  }, [navigate, selectedPlatforms])

  // Performance tab state (lifted to page level)
  const workspaceId = useWorkspaceId()
  const storedAccountFilters = useMemo(() => loadPerformanceAccounts(), [])
  const [performanceFilters, setPerformanceFilters] = useState<PerformanceTableFilters>(() => loadPerformanceFilters())
  const [pageSize, setPageSize] = useState<number>(() => loadPerformancePageSize())

  // Fetch AlvoBot campaign IDs for badge display and filtering
  const { alvobotCampaignIds } = useAlvobotCampaignIds()

  // Get active connections to build sources for unified API
  const { data: connectionsData, isLoading: isLoadingConnections } = useConnections({ status: 'active' })

  // Filter Google Ads connections
  const googleConnections = useMemo(
    () => connectionsData?.filter(c => {
      if (c.plataform_name !== 'google') return false
      const metadata = c.metadata as { type?: string } | undefined
      return !metadata?.type || metadata.type === 'ads'
    }) || [],
    [connectionsData]
  )

  // Filter Meta Ads connections
  const metaConnections = useMemo(
    () => connectionsData?.filter(c => {
      if (c.plataform_name !== 'meta') return false
      const metadata = c.metadata as { type?: string } | undefined
      return !metadata?.type || metadata.type === 'ads'
    }) || [],
    [connectionsData]
  )

  const connectionsLoaded = !isLoadingConnections
  const hasGoogleConnection = connectionsLoaded && googleConnections.length > 0
  const hasMetaConnection = connectionsLoaded && metaConnections.length > 0

  // Date range state using standardized PeriodSelector
  const [dateRange, setDateRange] = useState<DateRange>(() => getDefault7DayRange())

  // ─── Account data & filter state (must be declared before sources) ───

  // Fetch Meta ad accounts for filter component
  const { accounts: metaAdAccountsData } = useMetaAdAccounts({
    workspaceId: workspaceId || undefined,
    enabled: selectedPlatforms.includes('meta'),
  })

  // Build account lists for filter component
  const googleAccounts: GoogleAdsAccount[] = useMemo(() => {
    return googleConnections.map(c => ({
      id: c.id,
      name: c.connection_name || 'Google Ads',
      connectionId: c.id,
    }))
  }, [googleConnections])

  const metaAccounts: MetaAdsAccount[] = useMemo(() => {
    return metaAdAccountsData.map(account => ({
      id: account.accountId,
      name: account.accountName,
      connectionId: account.connectionId,
      adAccountId: account.accountId,
    }))
  }, [metaAdAccountsData])

  // Account filter state
  const [selectedGoogleAccountIds, setSelectedGoogleAccountIds] = useState<string[]>(
    storedAccountFilters.googleAccountIds
  )
  const [selectedMetaAccountIds, setSelectedMetaAccountIds] = useState<string[]>(
    storedAccountFilters.metaAccountIds
  )

  // Track if accounts have been initialized (to distinguish between "user deselected all" vs "first load")
  const googleInitializedRef = useRef(false)
  const metaInitializedRef = useRef(false)

  // Initialize selected accounts when data loads (only on first load, not when user changes selection)
  useEffect(() => {
    if (googleAccounts.length === 0) return
    // Only auto-select all on first load if localStorage was empty
    if (!googleInitializedRef.current) {
      googleInitializedRef.current = true
      setSelectedGoogleAccountIds((prev) => {
        // Validate stored IDs against available accounts
        const valid = prev.filter(id => googleAccounts.some(a => a.id === id))
        // If we have valid stored selections, keep them
        if (valid.length > 0) return valid
        // If localStorage was empty (first visit), select all
        if (storedAccountFilters.googleAccountIds.length === 0) {
          return googleAccounts.map(a => a.id)
        }
        // Otherwise, user had selections but they're no longer valid - keep empty
        return []
      })
    }
  }, [googleAccounts])

  useEffect(() => {
    if (metaAccounts.length === 0) return
    // Only auto-select all on first load if localStorage was empty
    if (!metaInitializedRef.current) {
      metaInitializedRef.current = true
      setSelectedMetaAccountIds((prev) => {
        // Validate stored IDs against available accounts
        const valid = prev.filter(id => metaAccounts.some(a => a.id === id))
        // If we have valid stored selections, keep them
        if (valid.length > 0) return valid
        // If localStorage was empty (first visit), select all
        if (storedAccountFilters.metaAccountIds.length === 0) {
          return metaAccounts.map(a => a.id)
        }
        // Otherwise, user had selections but they're no longer valid - keep empty
        return []
      })
    }
  }, [metaAccounts])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const payload: StoredPerformanceAccounts = {
        googleAccountIds: selectedGoogleAccountIds,
        metaAccountIds: selectedMetaAccountIds,
      }
      window.localStorage.setItem(PERFORMANCE_ACCOUNTS_STORAGE_KEY, JSON.stringify(payload))
    } catch (error) {
      console.error('Failed to persist performance account filters:', error)
    }
  }, [selectedGoogleAccountIds, selectedMetaAccountIds])

  // ─── Sources & API configuration ───

  // Build sources array for unified API
  // Push-down filtering: only include selected accounts as sources so the backend
  // only queries the platform APIs for those specific accounts.
  //
  // - Google: 1 source per selected connection (Google connection = 1 account)
  // - Meta: 1 source per selected ad account (with adAccountId for push-down),
  //         falling back to 1 source per connection when accounts haven't loaded yet
  const sources: AdsSource[] = useMemo(() => {
    const result: AdsSource[] = []

    if (selectedPlatforms.includes('google')) {
      googleConnections.forEach(conn => {
        // Only include Google connections that are selected
        // When no accounts are loaded yet or none are selected, include all
        const hasFilter = googleAccounts.length > 0 && selectedGoogleAccountIds.length > 0
        if (!hasFilter || selectedGoogleAccountIds.includes(conn.id)) {
          result.push({
            platform: 'google',
            connectionId: conn.id,
          })
        }
      })
    }

    if (selectedPlatforms.includes('meta')) {
      const hasMetaAccountFilter = metaAccounts.length > 0 && selectedMetaAccountIds.length > 0

      if (hasMetaAccountFilter) {
        // Push-down: one source per selected ad account
        // This activates the backend's per-account fetch path with filter push-down
        // to the Meta API (name, status, metric filters applied at API level)
        const selectedAccounts = metaAccounts.filter(acc => selectedMetaAccountIds.includes(acc.id))
        selectedAccounts.forEach(acc => {
          result.push({
            platform: 'meta',
            connectionId: acc.connectionId,
            adAccountId: acc.adAccountId,
          })
        })
      } else {
        // Accounts not loaded yet - include all connections (initial load)
        metaConnections.forEach(conn => {
          result.push({
            platform: 'meta',
            connectionId: conn.id,
          })
        })
      }
    }

    return result
  }, [selectedPlatforms, googleConnections, metaConnections, googleAccounts, selectedGoogleAccountIds, metaAccounts, selectedMetaAccountIds])

  // Build connection names map for progress display
  const connectionNames = useMemo(() => {
    const names = new Map<string, string>()
    googleConnections.forEach(conn => {
      names.set(conn.id, conn.connection_name || 'Google Ads')
    })
    metaConnections.forEach(conn => {
      names.set(conn.id, conn.connection_name || 'Meta Ads')
    })
    return names
  }, [googleConnections, metaConnections])

  // Persist filters to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(PERFORMANCE_FILTERS_STORAGE_KEY, JSON.stringify(performanceFilters))
    } catch (error) {
      console.error('Failed to persist performance filters:', error)
    }
  }, [performanceFilters])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(PERFORMANCE_PAGE_SIZE_STORAGE_KEY, String(pageSize))
    } catch (error) {
      console.error('Failed to persist performance page size:', error)
    }
  }, [pageSize])

  // Map frontend status filter to API status
  const apiStatus = useMemo(() => {
    switch (performanceFilters.status) {
      case 'active': return 'ENABLED' as const
      case 'paused': return 'PAUSED' as const
      default: return 'all' as const
    }
  }, [performanceFilters.status])

  // Server-side pagination state
  const [serverPage, setServerPage] = useState(1)

  // Server-side sorting state
  const [sortConfig, setSortConfig] = useState<{ key: 'cost' | 'impressions' | 'clicks' | 'ctr' | 'cpc' | 'conversions' | 'cpa' | 'roas' | 'reach' | 'frequency' | 'landingPageViews' | 'platform' | 'name' | 'accountName' | 'status' | 'budget'; direction: 'asc' | 'desc' }>({ key: 'cost', direction: 'desc' })

  // Debounce search input to reduce API calls (400ms delay)
  const debouncedSearch = useDebounce(performanceFilters.search, 400)

  // Reset to page 1 when filters, sorting, or account selection changes
  useEffect(() => {
    setServerPage(1)
  }, [debouncedSearch, apiStatus, performanceFilters.objective, performanceFilters.alvobotOnly, dateRange.startDate, dateRange.endDate, sortConfig, selectedGoogleAccountIds, selectedMetaAccountIds])

  // Fetch campaigns using progressive loading (per-connection)
  const {
    items: unifiedItems,
    summary: serverSummary,
    pagination: searchPagination,
    isLoading: isLoadingSearch,
    isFetching: isFetchingSearch,
    progress: searchProgress,
    pendingSources,
    showProgress,
    failedSources,
    refetch: refetchSearch,
    dataUpdatedAt,
  } = useProgressiveAdsSearch({
    sources,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    level: 'campaign',
    status: apiStatus,
    nameContains: debouncedSearch || undefined,
    objective: performanceFilters.objective !== 'all' ? performanceFilters.objective : undefined,
    // Server-side sorting
    orderBy: sortConfig.key as 'cost' | 'impressions' | 'clicks' | 'conversions' | 'ctr' | 'cpa' | 'roas' | 'budget' | 'name' | 'cpc' | 'reach' | 'frequency',
    sortOrder: sortConfig.direction,
    page: serverPage,
    limit: pageSize,
    fieldGroup: 'tableView',
    enabled: sources.length > 0 && connectionsLoaded,
    connectionNames,
    // Server-side metric filtering
    metricFilters: performanceFilters.metricFilters?.length ? performanceFilters.metricFilters : undefined,
    // Server-side AlvoBot filter: backend resolves campaign IDs from Supabase
    alvobotOnly: performanceFilters.alvobotOnly || undefined,
    workspaceId: performanceFilters.alvobotOnly ? (workspaceId || undefined) : undefined,
  })

  // Prefetch campaign hierarchy on hover
  const { prefetch: prefetchHierarchy } = usePrefetchCampaignHierarchy()

  // Prefetch ad set/ad group hierarchy (ads) on hover
  const { prefetch: prefetchAdSetHierarchy } = usePrefetchAdSetHierarchy()

  // Cache helper for checking prefetched data before API calls
  const { getCachedExpand, setCachedExpand } = useExpandCache()

  // Handle prefetch on row hover
  const handlePrefetchHierarchy = useDebouncedCallback((params: {
    campaignId: string
    platform: AdsPlatform
    connectionId: string
    customerId?: string
    loginCustomerId?: string
    adAccountId?: string
  }) => {
    const source: AdsSource = {
      platform: params.platform,
      connectionId: params.connectionId,
      customerId: params.customerId,
      loginCustomerId: params.loginCustomerId,
      adAccountId: params.adAccountId,
    }

    prefetchHierarchy({
      sources: [source],
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      campaignId: params.campaignId,
    })
  }, 150)

  const handlePrefetchAdSetHierarchy = useDebouncedCallback((params: {
    adSetId: string
    platform: AdsPlatform
    connectionId: string
    customerId?: string
    loginCustomerId?: string
    adAccountId?: string
  }) => {
    const source: AdsSource = {
      platform: params.platform,
      connectionId: params.connectionId,
      customerId: params.customerId,
      loginCustomerId: params.loginCustomerId,
      adAccountId: params.adAccountId,
    }

    prefetchAdSetHierarchy({
      sources: [source],
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      adSetId: params.adSetId,
    })
  }, 150)

  // Handle campaign expand
  const handleExpandCampaign = useCallback(async (params: {
    campaignId: string
    platform: AdsPlatform
    connectionId: string
    customerId?: string
    loginCustomerId?: string
    adAccountId?: string
  }) => {
    const cachedData = getCachedExpand(
      params.campaignId,
      'adset',
      dateRange.startDate,
      dateRange.endDate,
      params.platform,
      params.connectionId
    )

    if (cachedData?.success && cachedData.items?.length > 0) {
      return {
        success: true,
        children: cachedData.items,
        error: undefined,
      }
    }

    try {
      const source: AdsSource = {
        platform: params.platform,
        connectionId: params.connectionId,
        customerId: params.customerId,
        loginCustomerId: params.loginCustomerId,
        adAccountId: params.adAccountId,
      }

      const response = await api.post<AdsExpandResponse>('/ads/expand', {
        sources: [source],
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        parentLevel: 'campaign',
        parentId: params.campaignId,
        childLevel: 'adset',
        fieldGroup: 'expandView',
      })

      if (response.success) {
        setCachedExpand(
          params.campaignId,
          'adset',
          dateRange.startDate,
          dateRange.endDate,
          response,
          params.platform,
          params.connectionId
        )
      }

      return {
        success: response.success,
        children: response.items || [],
        error: response.error,
      }
    } catch (error) {
      console.error('Failed to expand campaign:', error)
      return {
        success: false,
        children: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }, [dateRange.startDate, dateRange.endDate, getCachedExpand, setCachedExpand])

  // Handle ad set expand
  const handleExpandAdSet = useCallback(async (params: {
    campaignId: string
    parentId: string
    platform: AdsPlatform
    connectionId: string
    customerId?: string
    loginCustomerId?: string
    adAccountId?: string
  }) => {
    const cachedData = getCachedExpand(
      params.parentId,
      'ad',
      dateRange.startDate,
      dateRange.endDate,
      params.platform,
      params.connectionId
    )

    if (cachedData?.success && cachedData.items?.length > 0) {
      return {
        success: true,
        children: cachedData.items,
        error: undefined,
      }
    }

    try {
      const source: AdsSource = {
        platform: params.platform,
        connectionId: params.connectionId,
        customerId: params.customerId,
        loginCustomerId: params.loginCustomerId,
        adAccountId: params.adAccountId,
      }

      const response = await api.post<AdsExpandResponse>('/ads/expand', {
        sources: [source],
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        parentLevel: 'adset',
        parentId: params.parentId,
        childLevel: 'ad',
        fieldGroup: 'expandView',
      })

      if (response.success) {
        setCachedExpand(
          params.parentId,
          'ad',
          dateRange.startDate,
          dateRange.endDate,
          response,
          params.platform,
          params.connectionId
        )
      }

      return {
        success: response.success,
        children: response.items || [],
        error: response.error,
      }
    } catch (error) {
      console.error('Failed to expand ad set:', error)
      return {
        success: false,
        children: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }, [dateRange.startDate, dateRange.endDate, getCachedExpand, setCachedExpand])

  // Convert UnifiedAdObject[] to UnifiedCampaignRow[]
  // Note: Account filtering is now done server-side:
  // - Google: filtered at source level (only selected connections are queried)
  // - Meta: filtered via accountIds parameter (server-side before pagination)
  const unifiedCampaigns: UnifiedCampaignRow[] = useMemo(() => {
    if (!unifiedItems.length) return []
    return unifiedItems.map(item => unifiedAdObjectToRow(item))
  }, [unifiedItems])

  // Use server summary for the cards (reflects ALL filtered items, not just current page)
  const summaryData = useMemo(() => {
    if (!serverSummary || serverSummary.totalItems === 0) return undefined

    return {
      cost: serverSummary.totalCost,
      impressions: serverSummary.totalImpressions,
      clicks: serverSummary.totalClicks,
      conversions: serverSummary.totalConversions,
      ctr: serverSummary.totalImpressions > 0
        ? (serverSummary.totalClicks / serverSummary.totalImpressions) * 100
        : 0,
      cpa: serverSummary.totalConversions > 0
        ? serverSummary.totalCost / serverSummary.totalConversions
        : 0,
    }
  }, [serverSummary])

  // Loading states
  const isLoading = isLoadingSearch || isLoadingConnections
  const isFetching = isFetchingSearch
  const hasCachedData = unifiedItems.length > 0
  const isInitialLoading = isLoading && !hasCachedData

  const searchError = failedSources.length > 0 ? failedSources[0].error : null
  const errorMessage = searchError
    ? (typeof searchError === 'object' && 'message' in searchError
        ? (searchError as { message: string }).message
        : String(searchError))
    : ''

  const lastUpdatedTime = useMemo(() => {
    if (!dataUpdatedAt) return null
    return new Date(dataUpdatedAt)
  }, [dataUpdatedAt])

  // Unified mutations for all platforms (Google + Meta)
  const pauseMutation = useUnifiedAdsPause()
  const enableMutation = useUnifiedAdsEnable()
  const budgetMutation = useUnifiedAdsBudgetUpdate()

  // Modal state for budget editing
  const [budgetModalRow, setBudgetModalRow] = useState<UnifiedCampaignRow | null>(null)

  // Force refresh
  const handleForceRefresh = useCallback(async () => {
    await refetchSearch()
  }, [refetchSearch])

  // Unified pause handler - works for both Google and Meta
  const handlePause = useCallback(async (row: UnifiedCampaignRow) => {
    try {
      const result = await pauseMutation.mutateAsync({
        platform: row.platform,
        level: 'campaign',
        objectId: row.id,
        connectionId: row.connectionId,
        customerId: row.platform === 'google' ? (row.platformData as CampaignMetrics).customerId : undefined,
        loginCustomerId: row.platform === 'google' ? (row.platformData as CampaignMetrics).loginCustomerId : undefined,
        adAccountId: row.accountId,
        name: row.name,
      })
      if (!result.success) throw new Error(result.error || 'Falha ao pausar')
      showToast.success(`Campanha "${row.name}" pausada`)
    } catch (error) {
      console.error('Erro ao pausar campanha:', error)
      showToast.error('Erro ao pausar campanha')
      throw error
    }
  }, [pauseMutation])

  // Unified enable handler - works for both Google and Meta
  const handleEnable = useCallback(async (row: UnifiedCampaignRow) => {
    try {
      const result = await enableMutation.mutateAsync({
        platform: row.platform,
        level: 'campaign',
        objectId: row.id,
        connectionId: row.connectionId,
        customerId: row.platform === 'google' ? (row.platformData as CampaignMetrics).customerId : undefined,
        loginCustomerId: row.platform === 'google' ? (row.platformData as CampaignMetrics).loginCustomerId : undefined,
        adAccountId: row.accountId,
        name: row.name,
      })
      if (!result.success) throw new Error(result.error || 'Falha ao ativar')
      showToast.success(`Campanha "${row.name}" ativada`)
    } catch (error) {
      console.error('Erro ao ativar campanha:', error)
      showToast.error('Erro ao ativar campanha')
      throw error
    }
  }, [enableMutation])

  // Unified edit budget handler
  const handleEditBudget = useCallback((row: UnifiedCampaignRow) => {
    setBudgetModalRow(row)
  }, [])

  // Unified confirm budget change
  const handleConfirmBudgetChange = useCallback(async (newBudget: number) => {
    if (!budgetModalRow) return
    try {
      const result = await budgetMutation.mutateAsync({
        platform: budgetModalRow.platform,
        campaignId: budgetModalRow.id,
        newBudget,
        connectionId: budgetModalRow.connectionId,
        budgetId: budgetModalRow.platform === 'google' ? (budgetModalRow.platformData as CampaignMetrics).budgetId : undefined,
        customerId: budgetModalRow.platform === 'google' ? (budgetModalRow.platformData as CampaignMetrics).customerId : undefined,
        loginCustomerId: budgetModalRow.platform === 'google' ? (budgetModalRow.platformData as CampaignMetrics).loginCustomerId : undefined,
        adAccountId: budgetModalRow.accountId,
      })
      if (!result.success) {
        showToast.error(result.error || 'Erro ao atualizar orçamento')
        return
      }
      showToast.success(`Orçamento atualizado para R$ ${newBudget.toFixed(2)}`)
      setBudgetModalRow(null)
    } catch (error) {
      console.error('Erro ao atualizar orçamento:', error)
      const message = error instanceof Error ? error.message : 'Erro ao atualizar orçamento'
      showToast.error(message)
    }
  }, [budgetModalRow, budgetMutation])

  // Check which platforms to show
  const showGoogleAdsContent = selectedPlatforms.includes('google')
  const showMetaAdsContent = selectedPlatforms.includes('meta')
  const showBothPlatforms = showGoogleAdsContent && showMetaAdsContent

  // Check for no connections
  const hasNoConnections = connectionsLoaded && (
    (!hasGoogleConnection && showGoogleAdsContent && !showMetaAdsContent) ||
    (!hasMetaConnection && showMetaAdsContent && !showGoogleAdsContent) ||
    (!hasGoogleConnection && !hasMetaConnection && showBothPlatforms)
  )

  const totalAccounts = googleAccounts.length + metaAccounts.length

  // Format cache time for display
  const cacheTimeText = lastUpdatedTime 
    ? formatRelativeTimeHelper(lastUpdatedTime)
    : null

  return (
    <PageLayout>
      {/* Header */}
      <PageHeader
        icon={<BarChart3 size={24} />}
        title="Central de Anúncios"
        subtitle="Gerencie campanhas de Google Ads e Meta Ads em um só lugar"
        cacheTime={cacheTimeText}
        isRefreshing={isFetching}
        onRefresh={handleForceRefresh}
        secondaryActions={
          <PlatformSelector
            selected={selectedPlatforms}
            onChange={handlePlatformChange}
          />
        }
        primaryAction={{
          label: 'Nova Campanha',
          icon: <Plus size={18} />,
          onClick: handleCreateCampaign,
        }}
      />

      {/* Sub-page Navigation */}
      <PageNav items={NAV_ITEMS} />

      {/* Filter Bar */}
      <FilterBar
        rightContent={
          totalAccounts > 1 ? (
            <AdsAccountFilter
              googleAccounts={googleAccounts}
              metaAccounts={metaAccounts}
              selectedGoogleAccountIds={selectedGoogleAccountIds}
              selectedMetaAccountIds={selectedMetaAccountIds}
              onGoogleAccountSelectionChange={setSelectedGoogleAccountIds}
              onMetaAccountSelectionChange={setSelectedMetaAccountIds}
              isLoading={isLoading}
            />
          ) : undefined
        }
      >
        <PeriodSelector value={dateRange} onChange={setDateRange} />
      </FilterBar>

      {/* Summary Cards */}
      {!hasNoConnections && (
        <AdsSummaryCards
          data={summaryData}
          isLoading={isInitialLoading}
        />
      )}

      {/* Content */}
      <div className={styles.content}>
        {hasNoConnections && (
          <div className={styles.connectionWarning}>
            <p>Conecte sua conta {showBothPlatforms ? 'do Google Ads ou Meta Ads' : showGoogleAdsContent ? 'do Google Ads' : 'do Meta Ads'} para ver métricas de performance.</p>
            <Button variant="primary" onClick={() => navigate('/connections')}>
              Conectar Contas
            </Button>
          </div>
        )}

        {!hasNoConnections && (
          <UnifiedCampaignPerformanceTable
            campaigns={unifiedCampaigns}
            isLoading={isInitialLoading}
            isFetching={isFetching}
            filters={performanceFilters}
            onFiltersChange={setPerformanceFilters}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            serverPagination={searchPagination ? {
              page: searchPagination.page,
              totalPages: searchPagination.totalPages,
              totalItems: searchPagination.total,
            } : undefined}
            onPageChange={setServerPage}
            sortConfig={sortConfig}
            onSortChange={setSortConfig}
            onPause={handlePause}
            onEnable={handleEnable}
            onEditBudget={handleEditBudget}
            onPrefetchHierarchy={handlePrefetchHierarchy}
            onPrefetchAdSetHierarchy={handlePrefetchAdSetHierarchy}
            onExpandCampaign={handleExpandCampaign}
            onExpandAdSet={handleExpandAdSet}
            progress={searchProgress}
            showProgress={showProgress}
            pendingSources={pendingSources}
            alvobotCampaignIds={alvobotCampaignIds}
            errorMessage={!isLoading && searchError ? (errorMessage || 'Erro ao carregar métricas de performance. Tente novamente.') : undefined}
            onRetry={handleForceRefresh}
          />
        )}
      </div>

      {budgetModalRow && (
        <BudgetModal
          isOpen={true}
          campaign={{
            id: budgetModalRow.id,
            name: budgetModalRow.name,
            budget: budgetModalRow.budget || 0,
            status: (budgetModalRow.status === 'ACTIVE' ? 'ENABLED' : budgetModalRow.status) as CampaignMetrics['status'],
          } as CampaignMetrics}
          onClose={() => setBudgetModalRow(null)}
          onConfirm={handleConfirmBudgetChange}
          isLoading={budgetMutation.isPending}
        />
      )}
    </PageLayout>
  )
}

export default AdsPerformancePage
