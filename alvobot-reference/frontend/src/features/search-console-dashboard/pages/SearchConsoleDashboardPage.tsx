import { useState, useEffect, useCallback, useMemo } from 'react'
import { Search, Link as LinkIcon, AlertCircle } from 'lucide-react'
import { useConnections } from '@/features/connections/api/useConnections'
import {
  Spinner,
  Alert,
  Button,
  Card,
  CardBody,
  PageLayout,
  PageHeader,
  FilterBar,
  PeriodSelector,
  type DateRange,
  getDefault7DayRange,
} from '@/shared/components'
import { useDocumentTitle } from '@/shared/hooks'
import { useActiveSearchConsoleProperties } from '../api'
import {
  SearchConsoleSummaryCards,
  SearchConsoleTable,
  PropertyFilter,
  SearchTypeFilter,
  DeviceFilter,
} from '../components'
import { useSearchConsoleReport, useSearchConsoleExpand } from '../hooks'
import {
  type SearchConsolePrimaryGroupBy,
  type SearchConsoleSubGroupBy,
  type SearchType,
  type DeviceType,
  type ColumnVisibility,
  type SearchConsoleRow,
  type SearchConsoleSource, DEFAULT_COLUMN_VISIBILITY, VALID_SUB_GROUPINGS 
} from '../types'
import styles from './SearchConsoleDashboardPage.module.css'

// Local storage keys
const STORAGE_KEYS = {
  selectedPropertyIds: 'search-console-dashboard-selected-properties',
  columnVisibility: 'search-console-dashboard-column-visibility',
}

export function SearchConsoleDashboardPage() {
  useDocumentTitle('Search Console')

  // Date range
  const [dateRange, setDateRange] = useState<DateRange>(() => getDefault7DayRange())

  // Filters
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.selectedPropertyIds)
    return saved ? JSON.parse(saved) : []
  })
  const [searchType, setSearchType] = useState<SearchType>('web')
  const [device, setDevice] = useState<DeviceType | undefined>(undefined)

  // Table state
  const [groupBy, setGroupBy] = useState<SearchConsolePrimaryGroupBy>('query')
  const [subGroupBy, setSubGroupBy] = useState<SearchConsoleSubGroupBy>('page')
  const [sortBy, setSortBy] = useState('clicks')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageLimit] = useState(50)

  // Expansion state
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [hierarchicalData, setHierarchicalData] = useState<Map<string, SearchConsoleRow[]>>(new Map())
  const [loadingExpand, setLoadingExpand] = useState<string | null>(null)

  // Column visibility
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.columnVisibility)
    return saved ? JSON.parse(saved) : DEFAULT_COLUMN_VISIBILITY
  })

  // Fetch connections
  const { data: connections, isLoading: isLoadingConnections } = useConnections()

  // Check for Search Console connections
  const searchConsoleConnections = useMemo(() => {
    return (
      connections?.filter(
        (conn) =>
          conn.plataform_name?.toLowerCase() === 'google' &&
          (conn.metadata as { type?: string } | undefined)?.type === 'search_console' &&
          conn.is_active
      ) || []
    )
  }, [connections])

  // Fetch active properties
  const { data: activeProperties, isLoading: isLoadingProperties } = useActiveSearchConsoleProperties()

  // Build sources for API calls
  const sources: SearchConsoleSource[] = useMemo(() => {
    if (!activeProperties) return []
    return activeProperties
      .filter((p) => selectedPropertyIds.includes(p.id))
      .map((p) => ({
        connectionId: p.connectionId,
        siteUrl: p.siteUrl,
      }))
  }, [activeProperties, selectedPropertyIds])

  // Fetch report data
  const {
    data: reportData,
    isLoading: isLoadingReport,
    isError,
    error,
    refetch,
    isFetching,
  } = useSearchConsoleReport({
    activeProperties: activeProperties || [],
    selectedPropertyIds,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    groupBy,
    searchType,
    device,
    sortBy,
    sortOrder,
    search: debouncedSearchTerm,
    page: currentPage,
    limit: pageLimit,
  })

  // Expand mutation
  const expandMutation = useSearchConsoleExpand({
    sources,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    searchType,
    device,
  })

  // Format cache timestamp
  const cacheTimeText = useMemo(() => {
    if (!reportData?.cachedAt) return null

    try {
      const cacheDate = new Date(reportData.cachedAt)
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
  }, [reportData?.cachedAt])

  // Auto-select all properties on first load
  useEffect(() => {
    if (activeProperties?.length && selectedPropertyIds.length === 0) {
      const allIds = activeProperties.map((p) => p.id)
      setSelectedPropertyIds(allIds)
      localStorage.setItem(STORAGE_KEYS.selectedPropertyIds, JSON.stringify(allIds))
    }
  }, [activeProperties, selectedPropertyIds.length])

  // Save selected properties to localStorage
  useEffect(() => {
    if (selectedPropertyIds.length > 0) {
      localStorage.setItem(STORAGE_KEYS.selectedPropertyIds, JSON.stringify(selectedPropertyIds))
    }
  }, [selectedPropertyIds])

  // Save column visibility to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.columnVisibility, JSON.stringify(columnVisibility))
  }, [columnVisibility])

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [groupBy, searchType, device, debouncedSearchTerm, selectedPropertyIds, dateRange])

  // Clear expansion when groupBy changes
  useEffect(() => {
    setExpandedItems(new Set())
    setHierarchicalData(new Map())
  }, [groupBy])

  // Auto-update subGroupBy when groupBy changes
  useEffect(() => {
    const validSubGroupings = VALID_SUB_GROUPINGS[groupBy]
    if (!validSubGroupings.includes(subGroupBy)) {
      setSubGroupBy(validSubGroupings[0])
    }
  }, [groupBy, subGroupBy])

  // Handle date range change
  const handleDateRangeChange = useCallback((newRange: DateRange) => {
    setDateRange(newRange)
    setExpandedItems(new Set())
    setHierarchicalData(new Map())
  }, [])

  // Handle sort
  const handleSort = useCallback((column: string) => {
    setSortBy((prev) => {
      if (prev === column) {
        setSortOrder((order) => (order === 'desc' ? 'asc' : 'desc'))
        return column
      }
      setSortOrder('desc')
      return column
    })
  }, [])

  // Handle expand/collapse
  const handleToggleItem = useCallback(
    async (key: string, row: SearchConsoleRow) => {
      if (expandedItems.has(key)) {
        // Collapse
        setExpandedItems((prev) => {
          const next = new Set(prev)
          next.delete(key)
          return next
        })
        return
      }

      // Expand - fetch children
      setLoadingExpand(key)

      try {
        const result = await expandMutation.mutateAsync({
          primaryGroupBy: groupBy,
          subGroupBy,
          parentKey: key,
          rowSources: row.sources,
        })

        setHierarchicalData((prev) => {
          const next = new Map(prev)
          next.set(key, result.items)
          return next
        })

        setExpandedItems((prev) => {
          const next = new Set(prev)
          next.add(key)
          return next
        })
      } catch (err) {
        console.error('Failed to expand row:', err)
      } finally {
        setLoadingExpand(null)
      }
    },
    [expandedItems, expandMutation, groupBy, subGroupBy]
  )

  // Handle refresh
  const handleRefresh = useCallback(() => {
    refetch()
  }, [refetch])

  // Loading state
  const isInitialLoading = isLoadingConnections || isLoadingProperties

  // No connections
  if (!isInitialLoading && searchConsoleConnections.length === 0) {
    return (
      <PageLayout>
        <PageHeader
          icon={<Search size={24} />}
          title="Search Console"
          subtitle="Performance de busca orgânica"
        />

        <Card>
          <CardBody>
            <div className={styles.emptyState}>
              <LinkIcon size={48} className={styles.emptyIcon} />
              <h2>Nenhuma conexão encontrada</h2>
              <p>
                Conecte sua conta do Google Search Console para visualizar métricas de busca orgânica.
              </p>
              <Button variant="primary" onClick={() => (window.location.href = '/connections')}>
                Ir para Conexões
              </Button>
            </div>
          </CardBody>
        </Card>
      </PageLayout>
    )
  }

  // No active properties
  if (!isInitialLoading && activeProperties?.length === 0) {
    return (
      <PageLayout>
        <PageHeader
          icon={<Search size={24} />}
          title="Search Console"
          subtitle="Performance de busca orgânica"
        />

        <Card>
          <CardBody>
            <div className={styles.emptyState}>
              <Search size={48} className={styles.emptyIcon} />
              <h2>Nenhuma propriedade ativa</h2>
              <p>
                Ative propriedades do Search Console nas configurações de conexão para visualizar
                métricas.
              </p>
              <Button variant="primary" onClick={() => (window.location.href = '/connections')}>
                Configurar Propriedades
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
        icon={<Search size={24} />}
        title="Search Console"
        subtitle="Performance de busca orgânica"
        cacheTime={cacheTimeText}
        isRefreshing={isFetching}
        onRefresh={handleRefresh}
      />

      <FilterBar
        rightContent={
          <PropertyFilter
            properties={activeProperties || []}
            selectedIds={selectedPropertyIds}
            onChange={setSelectedPropertyIds}
          />
        }
      >
        <PeriodSelector value={dateRange} onChange={handleDateRangeChange} />
        <SearchTypeFilter value={searchType} onChange={setSearchType} />
        <DeviceFilter value={device} onChange={setDevice} />
      </FilterBar>

      {/* Error Alert */}
      {isError && (
        <Alert variant="error">
          <AlertCircle size={16} />
          <span>{error?.message || 'Erro ao carregar dados do Search Console'}</span>
        </Alert>
      )}

      {/* Failed Sources Alert */}
      {reportData?.failedSources && reportData.failedSources.length > 0 && (
        <Alert variant="warning">
          <AlertCircle size={16} />
          <div>
            <strong>Algumas propriedades falharam:</strong>
            <ul className={styles.failedList}>
              {reportData.failedSources.map((source) => (
                <li key={source.siteUrl}>
                  {source.siteUrl}: {source.error}
                </li>
              ))}
            </ul>
          </div>
        </Alert>
      )}

      {/* Summary Cards */}
      <SearchConsoleSummaryCards
        summary={reportData?.summary}
        isLoading={isInitialLoading || (isLoadingReport && !reportData)}
      />

      {/* Table */}
      <div className={styles.tableSection}>
        {isInitialLoading ? (
          <div className={styles.loading}>
            <Spinner size="lg" />
            <span>Carregando dados...</span>
          </div>
        ) : (
          <SearchConsoleTable
            data={reportData?.rows || []}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={handleSort}
            searchTerm={searchTerm}
            onSearch={setSearchTerm}
            groupBy={groupBy}
            onGroupByChange={setGroupBy}
            subGroupBy={subGroupBy}
            onSubGroupByChange={setSubGroupBy}
            expandedItems={expandedItems}
            onToggleItem={handleToggleItem}
            loadingExpand={loadingExpand}
            hierarchicalData={hierarchicalData}
            columnVisibility={columnVisibility}
            onColumnVisibilityChange={setColumnVisibility}
            isLoading={isLoadingReport && !reportData}
          />
        )}

        {/* Pagination */}
        {reportData && reportData.pagination.totalPages > 1 && (
          <div className={styles.pagination}>
            <span className={styles.paginationInfo}>
              Mostrando {(currentPage - 1) * pageLimit + 1}-
              {Math.min(currentPage * pageLimit, reportData.pagination.total)} de{' '}
              {reportData.pagination.total} resultados
            </span>
            <div className={styles.paginationButtons}>
              <button
                type="button"
                className={styles.pageButton}
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(1)}
              >
                Primeira
              </button>
              <button
                type="button"
                className={styles.pageButton}
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                Anterior
              </button>
              <span className={styles.pageIndicator}>
                Página {currentPage} de {reportData.pagination.totalPages}
              </span>
              <button
                type="button"
                className={styles.pageButton}
                disabled={currentPage === reportData.pagination.totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                Próxima
              </button>
              <button
                type="button"
                className={styles.pageButton}
                disabled={currentPage === reportData.pagination.totalPages}
                onClick={() => setCurrentPage(reportData.pagination.totalPages)}
              >
                Última
              </button>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  )
}
