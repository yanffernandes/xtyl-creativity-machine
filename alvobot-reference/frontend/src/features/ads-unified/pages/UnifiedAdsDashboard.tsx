import { useState, useCallback, useEffect, useMemo } from 'react'
import {
  BarChart3,
  Settings,
  History,
  FileEdit,
  Plus,
} from 'lucide-react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { PeriodFilter, BudgetModal } from '@/features/alvoads-google-dashboard/components'
import { useDashboardStore } from '@/features/alvoads-google-dashboard/stores/dashboardStore'
import type { CampaignMetrics } from '@/features/alvoads-google-dashboard/types'
import { useConnections } from '@/features/connections/api/useConnections'
import { useWorkspaceId } from '@/features/workspace/stores/workspaceStore'
import { 
  Button, 
  showToast,
  PageLayout,
  PageHeader,
  FilterBar,
  ContentTabs,
} from '@/shared/components'
import { useDocumentTitle, useDebounce, useDebouncedCallback } from '@/shared/hooks'
import { api } from '@/shared/utils/api'
import {
  useUnifiedAutomations,
  useUnifiedHistory,
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
import styles from './UnifiedAdsDashboard.module.css'
import { AdsAccountFilter, type GoogleAdsAccount, type MetaAdsAccount  } from '../components/AdsAccountFilter'
import { AdsSummaryCards } from '../components/AdsSummaryCards'
import { NewCampaignModal } from '../components/NewCampaignModal'
import { PlatformSelector } from '../components/PlatformSelector'
import { UnifiedAutomationView } from '../components/UnifiedAutomationView'
import {
  UnifiedCampaignPerformanceTable,
  unifiedAdObjectToRow,
  type UnifiedCampaignRow,
  type PerformanceTableFilters,
} from '../components/UnifiedCampaignPerformanceTable'
import { UnifiedHistoryView } from '../components/UnifiedHistoryView'
import { useUnifiedAdsStore, useSelectedPlatforms, useActiveTab } from '../stores/unifiedAdsStore'
import { getDateRangeFromPeriod, isValidFilter } from '../utils'
import type { DashboardTab, AdsPlatform, ActionSource, ActionStatus, AdsSource, AdsExpandResponse } from '../types'
import type { MetricFilter } from '../types/filters'


// State for refresh controls (shared between tabs row and tab content)
interface RefreshState {
  lastUpdatedTime: Date | null
  isRefreshing: boolean
  onRefresh: (() => void) | null
}

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

// Tab configuration
const TABS: Array<{ id: DashboardTab; label: string; icon: React.ReactNode }> = [
  { id: 'performance', label: 'Performance', icon: <BarChart3 size={16} /> },
  { id: 'drafts', label: 'Rascunhos', icon: <FileEdit size={16} /> },
  { id: 'automations', label: 'Automações', icon: <Settings size={16} /> },
  { id: 'history', label: 'Histórico', icon: <History size={16} /> },
]

const PERFORMANCE_ACCOUNTS_STORAGE_KEY = 'unified-ads-performance-accounts-v1'
const PERFORMANCE_FILTERS_STORAGE_KEY = 'unified-ads-performance-filters-v1'
const PERFORMANCE_PAGE_SIZE_STORAGE_KEY = 'unified-ads-performance-page-size-v1'
const HISTORY_FILTERS_STORAGE_KEY = 'unified-ads-history-filters-v1'
const HISTORY_PAGE_STORAGE_KEY = 'unified-ads-history-page-v1'

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
    return { search: '', status: 'all', objective: 'all', alvobotOnly: false, metricFilters: [] }
  }
  try {
    const raw = window.localStorage.getItem(PERFORMANCE_FILTERS_STORAGE_KEY)
    if (!raw) return { search: '', status: 'all', objective: 'all', alvobotOnly: false, metricFilters: [] }
    const parsed = JSON.parse(raw) as Partial<PerformanceTableFilters>

    // Validate and restore metric filters
    let metricFilters: MetricFilter[] = []
    if (Array.isArray(parsed.metricFilters)) {
      metricFilters = parsed.metricFilters.filter(f => isValidFilter(f))
    }

    return {
      search: typeof parsed.search === 'string' ? parsed.search : '',
      status: parsed.status === 'active' || parsed.status === 'paused' ? parsed.status : 'all',
      objective: typeof parsed.objective === 'string' ? parsed.objective : 'all',
      alvobotOnly: typeof parsed.alvobotOnly === 'boolean' ? parsed.alvobotOnly : false,
      metricFilters,
    }
  } catch {
    return { search: '', status: 'all', objective: 'all', alvobotOnly: false, metricFilters: [] }
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

const loadHistoryFilters = (): {
  source?: ActionSource | ''
  status?: ActionStatus | ''
  startDate?: string
  endDate?: string
} => {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(HISTORY_FILTERS_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, unknown>
    if (!parsed || typeof parsed !== 'object') return {}
    return {
      source: typeof parsed.source === 'string' ? (parsed.source as ActionSource | '') : undefined,
      status: typeof parsed.status === 'string' ? (parsed.status as ActionStatus | '') : undefined,
      startDate: typeof parsed.startDate === 'string' ? parsed.startDate : undefined,
      endDate: typeof parsed.endDate === 'string' ? parsed.endDate : undefined,
    }
  } catch {
    return {}
  }
}

const loadHistoryPage = (): number => {
  if (typeof window === 'undefined') return 1
  try {
    const raw = window.localStorage.getItem(HISTORY_PAGE_STORAGE_KEY)
    if (!raw) return 1
    const parsed = Number(raw)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
  } catch {
    return 1
  }
}

export function UnifiedAdsDashboard() {
  useDocumentTitle('Central de Anúncios')
  const [searchParams, setSearchParams] = useSearchParams()

  // Store state
  const selectedPlatforms = useSelectedPlatforms()
  const activeTab = useActiveTab()
  const { setActiveTab, setSelectedPlatforms } = useUnifiedAdsStore()

  // Refresh state (shared between tabs row and tab content)
  const [refreshState, setRefreshState] = useState<RefreshState>({
    lastUpdatedTime: null,
    isRefreshing: false,
    onRefresh: null,
  })

  // New campaign modal state
  const [isNewCampaignModalOpen, setIsNewCampaignModalOpen] = useState(false)

  // Get active connections to check which platforms are available
  const { data: connectionsData, isLoading: _isLoadingConnections } = useConnections({ status: 'active' })

  // Check for Google Ads connections
  const hasGoogleConnection = useMemo(() => {
    if (!connectionsData) return false
    return connectionsData.some(c => {
      if (c.plataform_name !== 'google') return false
      const metadata = c.metadata as { type?: string } | undefined
      return !metadata?.type || metadata.type === 'ads'
    })
  }, [connectionsData])

  // Check for Meta Ads connections
  const hasMetaConnection = useMemo(() => {
    if (!connectionsData) return false
    return connectionsData.some(c => {
      if (c.plataform_name !== 'meta') return false
      const metadata = c.metadata as { type?: string } | undefined
      return !metadata?.type || metadata.type === 'ads'
    })
  }, [connectionsData])

  // T064: URL-driven platform state
  const platformFromUrl = searchParams.get('platform')
  // Sync URL platform to store on mount
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
      // Default state - remove from URL
      searchParams.delete('platform')
    } else {
      searchParams.set('platform', platforms.join(','))
    }
    setSearchParams(searchParams, { replace: true })
  }, [searchParams, setSearchParams, setSelectedPlatforms])

  // URL sync for tab
  const tabFromUrl = searchParams.get('tab') as DashboardTab | null
  const validTab = tabFromUrl && TABS.some(t => t.id === tabFromUrl) ? tabFromUrl : activeTab

  // Handle tab change
  const handleTabChange = useCallback((tab: DashboardTab) => {
    setActiveTab(tab)
    if (tab === 'performance') {
      searchParams.delete('tab')
    } else {
      searchParams.set('tab', tab)
    }
    setSearchParams(searchParams, { replace: true })
  }, [searchParams, setSearchParams, setActiveTab])

  // Handle create campaign - open modal to select platform
  const handleCreateCampaign = useCallback(() => {
    setIsNewCampaignModalOpen(true)
  }, [])

  // Format cache time for display
  const cacheTimeText = refreshState.lastUpdatedTime 
    ? formatRelativeTimeHelper(refreshState.lastUpdatedTime)
    : null

  return (
    <PageLayout>
      {/* Header - Unified standard with cache/refresh */}
      <PageHeader
        icon={<BarChart3 size={24} />}
        title="Central de Anúncios"
        subtitle="Gerencie campanhas de Google Ads e Meta Ads em um só lugar"
        cacheTime={validTab === 'performance' ? cacheTimeText : null}
        isRefreshing={refreshState.isRefreshing}
        onRefresh={validTab === 'performance' ? refreshState.onRefresh ?? undefined : undefined}
        secondaryActions={
          <PlatformSelector
            selected={selectedPlatforms}
            onChange={handlePlatformChange}
          />
        }
      />

      {/* Tabs - Navigation between Performance, Automations, History */}
      <ContentTabs
        tabs={TABS}
        activeTab={validTab}
        onTabChange={(tabId) => handleTabChange(tabId as DashboardTab)}
        rightContent={
          <Button
            variant="primary"
            onClick={handleCreateCampaign}
            leftIcon={<Plus size={18} />}
          >
            Nova Campanha
          </Button>
        }
      />

      {/* Tab Content */}
      <div className={styles.tabContent}>
        {/* Performance Tab */}
        {validTab === 'performance' && (
          <PerformanceTabUnified
            selectedPlatforms={selectedPlatforms}
            onRefreshStateChange={setRefreshState}
          />
        )}

        {/* Automations Tab */}
        {validTab === 'automations' && (
          <AutomationsTab selectedPlatforms={selectedPlatforms} />
        )}

        {/* History Tab */}
        {validTab === 'history' && (
          <HistoryTab selectedPlatforms={selectedPlatforms} />
        )}
      </div>

      {/* New Campaign Modal */}
      <NewCampaignModal
        isOpen={isNewCampaignModalOpen}
        onClose={() => setIsNewCampaignModalOpen(false)}
        hasGoogleConnection={hasGoogleConnection}
        hasMetaConnection={hasMetaConnection}
      />
    </PageLayout>
  )
}

// ============================================
// Performance Tab (Unified API Version)
// Uses the new POST /ads/search endpoint for unified data fetching
// ============================================
interface PerformanceTabUnifiedProps {
  selectedPlatforms: AdsPlatform[]
  onRefreshStateChange: (state: RefreshState) => void
}

function PerformanceTabUnified({
  selectedPlatforms,
  onRefreshStateChange,
}: PerformanceTabUnifiedProps) {
  const navigate = useNavigate()
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

  // Dashboard store for period
  const { filters: googleDashboardFilters, setPeriod } = useDashboardStore()
  const period = googleDashboardFilters.period

  // Calculate date range from period
  const dateRange = useMemo(() => getDateRangeFromPeriod(period), [period])

  // Build sources array for unified API
  const sources: AdsSource[] = useMemo(() => {
    const result: AdsSource[] = []

    if (selectedPlatforms.includes('google')) {
      googleConnections.forEach(conn => {
        result.push({
          platform: 'google',
          connectionId: conn.id,
        })
      })
    }

    if (selectedPlatforms.includes('meta')) {
      metaConnections.forEach(conn => {
        result.push({
          platform: 'meta',
          connectionId: conn.id,
        })
      })
    }

    return result
  }, [selectedPlatforms, googleConnections, metaConnections])

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

  // Reset to page 1 when filters or sorting changes
  useEffect(() => {
    setServerPage(1)
  }, [debouncedSearch, apiStatus, performanceFilters.objective, performanceFilters.alvobotOnly, dateRange.startDate, dateRange.endDate, sortConfig])

  // Fetch campaigns using progressive loading (per-connection)
  const {
    items: unifiedItems,
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
    fieldGroup: 'tableView', // Only fetch fields needed for table view
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

  // Handle prefetch on row hover - build source with platform-specific IDs
  // Debounced to prevent excessive API calls when quickly moving mouse over rows
  const handlePrefetchHierarchy = useDebouncedCallback((params: {
    campaignId: string
    platform: AdsPlatform
    connectionId: string
    customerId?: string
    loginCustomerId?: string
    adAccountId?: string
  }) => {
    // Build source with platform-specific IDs required for API calls
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
  }, 150) // 150ms delay - short enough to feel responsive, long enough to debounce rapid movements

  // Handle prefetch ad set/ad group hierarchy on row hover
  // Debounced to prevent excessive API calls when quickly moving mouse over rows
  const handlePrefetchAdSetHierarchy = useDebouncedCallback((params: {
    adSetId: string
    platform: AdsPlatform
    connectionId: string
    customerId?: string
    loginCustomerId?: string
    adAccountId?: string
  }) => {
    // Build source with platform-specific IDs required for API calls
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
  }, 150) // 150ms delay - short enough to feel responsive, long enough to debounce rapid movements

  // Handle campaign expand - fetch ad sets/ad groups using unified API
  // Checks React Query cache first (from prefetch) to avoid duplicate API calls
  const handleExpandCampaign = useCallback(async (params: {
    campaignId: string
    platform: AdsPlatform
    connectionId: string
    customerId?: string
    loginCustomerId?: string
    adAccountId?: string
  }) => {
    // Check cache first - prefetch may have already loaded this data
    // Include platform and connectionId to prevent cache collisions across connections
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
      // Build source with platform-specific IDs required for API calls
      const source: AdsSource = {
        platform: params.platform,
        connectionId: params.connectionId,
        // Google Ads specific
        customerId: params.customerId,
        loginCustomerId: params.loginCustomerId,
        // Meta Ads specific
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

      // Store in cache for future use (with platform/connectionId for proper isolation)
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

  // Handle ad set expand - fetch ads using unified API
  // Checks React Query cache first (from prefetch) to avoid duplicate API calls
  const handleExpandAdSet = useCallback(async (params: {
    campaignId: string
    parentId: string
    platform: AdsPlatform
    connectionId: string
    customerId?: string
    loginCustomerId?: string
    adAccountId?: string
  }) => {
    // Check cache first - prefetch may have already loaded this data
    // Include platform and connectionId to prevent cache collisions across connections
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
      // Build source with platform-specific IDs required for API calls
      const source: AdsSource = {
        platform: params.platform,
        connectionId: params.connectionId,
        // Google Ads specific
        customerId: params.customerId,
        loginCustomerId: params.loginCustomerId,
        // Meta Ads specific
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

      // Store in cache for future use (with platform/connectionId for proper isolation)
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

  // Initialize selected accounts when data loads
  useEffect(() => {
    if (googleAccounts.length === 0) return
    setSelectedGoogleAccountIds((prev) => {
      const valid = prev.filter(id => googleAccounts.some(a => a.id === id))
      if (valid.length > 0) return valid
      return googleAccounts.map(a => a.id)
    })
  }, [googleAccounts])

  useEffect(() => {
    if (metaAccounts.length === 0) return
    setSelectedMetaAccountIds((prev) => {
      const valid = prev.filter(id => metaAccounts.some(a => a.id === id))
      if (valid.length > 0) return valid
      return metaAccounts.map(a => a.id)
    })
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

  // Convert UnifiedAdObject[] to UnifiedCampaignRow[] and filter by selected accounts
  // Note: AlvoBot filtering is now done server-side via campaignIds parameter
  const unifiedCampaigns: UnifiedCampaignRow[] = useMemo(() => {
    if (!unifiedItems.length) return []

    return unifiedItems
      .filter(item => {
        // Filter by selected accounts
        if (item.platform === 'google') {
          if (!selectedGoogleAccountIds.includes(item.connectionId)) return false
        } else if (!selectedMetaAccountIds.includes(item.accountId)) {return false}

        return true
      })
      .map(item => unifiedAdObjectToRow(item))
  }, [unifiedItems, selectedGoogleAccountIds, selectedMetaAccountIds])

  // Calculate summary data for the cards
  const summaryData = useMemo(() => {
    if (!unifiedCampaigns.length) return undefined

    const totals = unifiedCampaigns.reduce(
      (acc, c) => ({
        cost: acc.cost + (c.cost || 0),
        impressions: acc.impressions + (c.impressions || 0),
        clicks: acc.clicks + (c.clicks || 0),
        conversions: acc.conversions + (c.conversions || 0),
      }),
      { cost: 0, impressions: 0, clicks: 0, conversions: 0 }
    )

    // Calculate derived metrics
    const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0
    const cpa = totals.conversions > 0 ? totals.cost / totals.conversions : 0

    return {
      ...totals,
      ctr,
      cpa,
    }
  }, [unifiedCampaigns])

  // Loading states
  const isLoading = isLoadingSearch || isLoadingConnections
  const isFetching = isFetchingSearch
  const hasCachedData = unifiedItems.length > 0
  const isInitialLoading = isLoading && !hasCachedData

  // Derive searchError from failedSources for backwards compatibility
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

  // Report refresh state to parent
  useEffect(() => {
    onRefreshStateChange({
      lastUpdatedTime,
      isRefreshing: isFetching,
      onRefresh: handleForceRefresh,
    })
  }, [lastUpdatedTime, isFetching, handleForceRefresh, onRefreshStateChange])

  useEffect(() => {
    return () => {
      onRefreshStateChange({
        lastUpdatedTime: null,
        isRefreshing: false,
        onRefresh: null,
      })
    }
  }, [onRefreshStateChange])

  return (
    <div className={styles.contentSection}>
      <div className={styles.performanceContent}>
        {/* Filter Bar - Period and Account filters */}
        <FilterBar
          className={styles.performanceFilters}
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
          <PeriodFilter period={period} onPeriodChange={setPeriod} />
        </FilterBar>

        {/* Summary Cards */}
        {!hasNoConnections && (
          <AdsSummaryCards
            data={summaryData}
            isLoading={isInitialLoading}
          />
        )}

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
    </div>
  )
}

// ============================================
// Automations Tab
// T046-T050: User Story 4 - View Automation Rules
// ============================================
interface AutomationsTabProps {
  selectedPlatforms: AdsPlatform[]
}

function AutomationsTab({ selectedPlatforms }: AutomationsTabProps) {
  const navigate = useNavigate()

  // Fetch automations from selected platforms
  const {
    automations,
    isLoading,
    error,
  } = useUnifiedAutomations({
    platforms: selectedPlatforms,
    enabled: selectedPlatforms.length > 0,
  })

  // Handle create automation - navigate to Google Ads wizard
  const handleCreateAutomation = useCallback(() => {
    navigate('/alvoads-google?tab=automations')
  }, [navigate])

  return (
    <div className={styles.contentSection}>
      <UnifiedAutomationView
        automations={automations}
        isLoading={isLoading}
        error={error}
        selectedPlatforms={selectedPlatforms}
        onCreateAutomation={handleCreateAutomation}
      />
    </div>
  )
}

// ============================================
// History Tab
// T051-T057: User Story 5 - Review Action History
// ============================================
interface HistoryTabProps {
  selectedPlatforms: AdsPlatform[]
}

function HistoryTab({ selectedPlatforms }: HistoryTabProps) {
  // Filter state
  const [filters, setFilters] = useState<{
    source?: ActionSource | ''
    status?: ActionStatus | ''
    startDate?: string
    endDate?: string
  }>(() => loadHistoryFilters())
  const [page, setPage] = useState(() => loadHistoryPage())

  // Fetch history
  const {
    actions,
    pagination,
    isLoading,
    error,
  } = useUnifiedHistory({
    platforms: selectedPlatforms,
    source: filters.source || undefined,
    status: filters.status || undefined,
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
    page,
    limit: 20,
    enabled: selectedPlatforms.length > 0,
  })

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters: {
    source?: ActionSource | ''
    status?: ActionStatus | ''
    startDate?: string
    endDate?: string
  }) => {
    setFilters(newFilters)
    setPage(1) // Reset to first page when filters change
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(HISTORY_FILTERS_STORAGE_KEY, JSON.stringify(filters))
    } catch (error) {
      console.error('Failed to persist history filters:', error)
    }
  }, [filters])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(HISTORY_PAGE_STORAGE_KEY, String(page))
    } catch (error) {
      console.error('Failed to persist history page:', error)
    }
  }, [page])

  // Handle page change
  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage)
  }, [])

  return (
    <div className={styles.contentSection}>
      <UnifiedHistoryView
        actions={actions}
        pagination={pagination}
        isLoading={isLoading}
        error={error}
        selectedPlatforms={selectedPlatforms}
        onFilterChange={handleFilterChange}
        onPageChange={handlePageChange}
      />
    </div>
  )
}

export default UnifiedAdsDashboard
