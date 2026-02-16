import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { Link as LinkIcon, BarChart3 } from 'lucide-react'
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
import { useDebounce } from '@/shared/hooks'
import type { Connection } from '@/shared/types/entities'
import styles from './AnalyticsDashboardPage.module.css'
import { useActiveAnalyticsProperties } from '../api'
import {
  AnalyticsSummaryCards,
  AnalyticsDataTable,
  PropertyFilter,
  Pagination,
  DEFAULT_COLUMN_VISIBILITY,
  type ColumnVisibility,
} from '../components'
import { useAnalyticsReport, useAnalyticsExpand } from '../hooks'
import {
  type AnalyticsGroupBy,
  type AnalyticsMetrics,
  type HierarchicalItem,
  type AnalyticsRow,
  type AnalyticsSource, AnalyticsGroupBy as GroupByEnum, VALID_SUB_GROUPINGS 
} from '../types'

// localStorage keys
const STORAGE_KEY_PROPERTY_IDS = 'analytics-dashboard:selected-property-ids'
const STORAGE_KEY_COLUMN_VISIBILITY = 'analytics-dashboard:column-visibility'

// Type aliases
type SortField = keyof AnalyticsMetrics | 'label'
type SortOrder = 'asc' | 'desc'

export function AnalyticsDashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  // Flag for initial auto-select
  const hasAutoSelected = useRef(false)

  // Selected property IDs (restored from localStorage)
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PROPERTY_IDS)
      if (saved) {
        hasAutoSelected.current = true
        return JSON.parse(saved)
      }
      return []
    } catch {
      return []
    }
  })

  // Date range state
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    if (startDate && endDate) {
      return { startDate, endDate }
    }
    return getDefault7DayRange()
  })

  // Table state
  const [sortBy, setSortBy] = useState<SortField>('activeUsers')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearch = useDebounce(searchTerm, 500)

  // Grouping state
  const [groupBy, setGroupBy] = useState<AnalyticsGroupBy>(GroupByEnum.PAGE_PATH)
  const [subGroupBy, setSubGroupBy] = useState<AnalyticsGroupBy>(GroupByEnum.DATE)

  // Expansion state
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [hierarchicalData, setHierarchicalData] = useState<Map<string, HierarchicalItem[]>>(new Map())
  const [loadingExpand, setLoadingExpand] = useState<string | null>(null)

  // Column visibility
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_COLUMN_VISIBILITY)
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<ColumnVisibility>
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

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedPropertyIds, dateRange.startDate, dateRange.endDate, groupBy, debouncedSearch])

  // Fetch all connections
  const { data: connectionsData, isLoading: connectionsLoading } = useConnections()

  // Filter Analytics connections
  const analyticsConnections = useMemo(() => {
    const filtered = (connectionsData?.filter((c: Connection) => {
      const metadata = c.metadata as { type?: string } | undefined
      const isAnalytics =
        c.plataform_name === 'analytics' ||
        (c.plataform_name === 'google' && metadata?.type === 'analytics')
      return isAnalytics && c.is_active
    }) || []) as Connection[]

    console.debug('[DEBUG Analytics] connectionsData:', connectionsData)
    console.debug('[DEBUG Analytics] analyticsConnections filtered:', filtered)
    console.debug('[DEBUG Analytics] All connections platforms:', connectionsData?.map((c: Connection) => ({ id: c.id, platform: c.plataform_name, metadata: c.metadata, is_active: c.is_active })))

    return filtered
  }, [connectionsData])

  // Fetch active properties
  const connectionIds = analyticsConnections.map((c) => c.id)
  console.debug('[DEBUG Analytics] connectionIds for properties fetch:', connectionIds)

  const { data: activeProperties, isLoading: propertiesLoading, error: propertiesError } = useActiveAnalyticsProperties(
    connectionIds
  )

  // Debug active properties
  useEffect(() => {
    console.debug('[DEBUG Analytics] activeProperties:', activeProperties)
    console.debug('[DEBUG Analytics] propertiesLoading:', propertiesLoading)
    console.debug('[DEBUG Analytics] propertiesError:', propertiesError)
  }, [activeProperties, propertiesLoading, propertiesError])

  // Save selected IDs to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PROPERTY_IDS, JSON.stringify(selectedPropertyIds))
    } catch (error) {
      console.error('Failed to save property IDs to localStorage:', error)
    }
  }, [selectedPropertyIds])

  // Save column visibility to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_COLUMN_VISIBILITY, JSON.stringify(columnVisibility))
    } catch (error) {
      console.error('Failed to save column visibility to localStorage:', error)
    }
  }, [columnVisibility])

  // Auto-select all properties on first load
  useEffect(() => {
    if (propertiesLoading) return
    if (hasAutoSelected.current) return

    const allPropertyIds = (activeProperties || []).map((p) => p.propertyId)

    if (allPropertyIds.length > 0) {
      setSelectedPropertyIds(allPropertyIds)
      hasAutoSelected.current = true
    }
  }, [activeProperties, propertiesLoading])

  // Fetch report data
  const {
    rows,
    summary,
    isLoading: reportLoading,
    isError: reportError,
    refetch: refetchReport,
    sources,
    progress,
    cachedAt,
    failedSources,
    isPlaceholderData,
    pagination,
  } = useAnalyticsReport({
    activeProperties: activeProperties || [],
    selectedPropertyIds,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    groupBy,
    sortBy: sortBy === 'label' ? undefined : sortBy,
    sortOrder,
    search: debouncedSearch || undefined,
    page: currentPage,
    limit: pageLimit,
  })

  // Expand mutation
  const { expandRow } = useAnalyticsExpand()

  // DEBUG: Log report data
  useEffect(() => {
    console.debug('[DEBUG Analytics] Report data:', {
      rowsCount: rows.length,
      rows: rows.slice(0, 3), // First 3 rows
      summary,
      sources,
      reportLoading,
      reportError,
      failedSources,
      selectedPropertyIds,
      dateRange,
      groupBy,
    })
  }, [rows, summary, sources, reportLoading, reportError, failedSources, selectedPropertyIds, dateRange, groupBy])

  // Format cache timestamp
  const cacheTimeText = useMemo(() => {
    if (!cachedAt) return null

    try {
      const cacheDate = new Date(cachedAt)
      const now = new Date()
      const diffMs = now.getTime() - cacheDate.getTime()
      const diffMinutes = Math.floor(diffMs / (1000 * 60))
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

      if (diffMinutes < 1) return 'agora'
      if (diffMinutes < 60) return `há ${diffMinutes} min`
      if (diffHours < 24) return `há ${diffHours}h`
      return `há ${diffDays}d`
    } catch {
      return null
    }
  }, [cachedAt])

  // Sync date range to URL
  useEffect(() => {
    const params = new URLSearchParams()
    params.set('startDate', dateRange.startDate)
    params.set('endDate', dateRange.endDate)
    setSearchParams(params, { replace: true })
  }, [dateRange.startDate, dateRange.endDate, setSearchParams])

  // Handle date range change
  const handleDateRangeChange = useCallback((newRange: DateRange) => {
    setDateRange(newRange)
    setExpandedItems(new Set())
    setHierarchicalData(new Map())
  }, [])

  // Handle sort
  const handleSort = useCallback((field: SortField) => {
    if (sortBy === field) {
      setSortOrder((order) => (order === 'asc' ? 'desc' : 'asc'))
    } else {
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
    refetchReport()
  }, [refetchReport])

  // Handle groupBy change
  const handleGroupByChange = useCallback((newGroupBy: AnalyticsGroupBy) => {
    setGroupBy(newGroupBy)
    const validOptions = VALID_SUB_GROUPINGS[newGroupBy]
    if (!validOptions.includes(subGroupBy)) {
      setSubGroupBy(validOptions[0])
    }
  }, [subGroupBy])

  // Handle subGroupBy change
  const handleSubGroupByChange = useCallback((newSubGroupBy: AnalyticsGroupBy) => {
    setSubGroupBy(newSubGroupBy)
  }, [])

  // Handle item toggle (expand/collapse)
  const handleToggleItem = useCallback(
    async (itemKey: string, rowData?: AnalyticsRow) => {
      if (expandedItems.has(itemKey)) {
        setExpandedItems((prev) => {
          const next = new Set(prev)
          next.delete(itemKey)
          return next
        })
        return
      }

      // Check if already have data
      if (hierarchicalData.has(itemKey)) {
        setExpandedItems((prev) => new Set(prev).add(itemKey))
        return
      }

      // Skip if no valid subGroupBy
      const validOptions = VALID_SUB_GROUPINGS[groupBy]
      if (!validOptions.length) {
        return
      }

      // Build sources from rowData or use all sources
      let rowSources: AnalyticsSource[] = sources
      if (rowData?.aggregatedSources && rowData.aggregatedSources.length > 0) {
        rowSources = rowData.aggregatedSources
      } else if (rowData?.connectionId && rowData?.propertyId) {
        rowSources = [{ connectionId: rowData.connectionId, propertyId: rowData.propertyId }]
      }

      setLoadingExpand(itemKey)
      try {
        const result = await expandRow({
          sources: rowSources,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          primaryGroupBy: groupBy,
          subGroupBy,
          parentKey: itemKey,
          sortBy: sortBy === 'label' ? undefined : sortBy,
          sortOrder,
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
    [expandedItems, hierarchicalData, groupBy, subGroupBy, sources, dateRange, sortBy, sortOrder, expandRow]
  )

  // No connections state
  const hasAnyConnection = analyticsConnections.length > 0
  if (!connectionsLoading && !hasAnyConnection) {
    return (
      <PageLayout>
        <PageHeader
          icon={<BarChart3 size={24} />}
          title="Analytics"
          subtitle="Acompanhe as métricas do seu site"
        />

        <Card>
          <CardBody>
            <div className={styles.emptyState}>
              <LinkIcon size={48} className={styles.emptyIcon} />
              <h2>Nenhuma conexão encontrada</h2>
              <p>
                Conecte sua conta do Google Analytics para visualizar as métricas do seu site.
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
        icon={<BarChart3 size={24} />}
        title="Analytics"
        subtitle="Acompanhe as métricas do seu site"
        cacheTime={cacheTimeText}
        isRefreshing={reportLoading}
        onRefresh={handleRefresh}
      />

      <FilterBar
        rightContent={
          <PropertyFilter
            properties={activeProperties || []}
            selectedPropertyIds={selectedPropertyIds}
            onSelectionChange={setSelectedPropertyIds}
            isLoading={propertiesLoading}
          />
        }
      >
        <PeriodSelector value={dateRange} onChange={handleDateRangeChange} />
      </FilterBar>

      <AnalyticsSummaryCards
        data={summary || undefined}
        isLoading={(reportLoading && !summary) || connectionsLoading}
      />

      {failedSources.length > 0 && !reportLoading && (
        <Alert variant="warning" style={{ marginBottom: 'var(--space-6)' }}>
          <strong>Algumas propriedades falharam ao carregar.</strong>
          <br />
          {failedSources.map((fs) => fs.name || fs.propertyId).join(', ')}
        </Alert>
      )}

      {reportError && (
        <Alert variant="error" style={{ marginBottom: 'var(--space-6)' }}>
          <strong>Não foi possível carregar os dados de analytics.</strong>
          <br />
          Verifique sua conexão com a internet e tente novamente.
        </Alert>
      )}

      {/* Table Section */}
      <div className={`${styles.tableSection} ${isPlaceholderData ? styles.placeholderOverlay : ''}`}>
        {connectionsLoading || propertiesLoading ? (
          <div className={styles.loading}>
            <Spinner size="lg" />
            <span>Carregando...</span>
          </div>
        ) : (
          <AnalyticsDataTable
            data={rows}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={handleSort}
            onSearch={handleSearch}
            searchTerm={searchTerm}
            isLoading={reportLoading && rows.length === 0}
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
            showProgress={reportLoading && progress.total > 0}
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
          />
        )}

        {/* Pagination */}
        {pagination && !reportLoading && rows.length > 0 && (
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
