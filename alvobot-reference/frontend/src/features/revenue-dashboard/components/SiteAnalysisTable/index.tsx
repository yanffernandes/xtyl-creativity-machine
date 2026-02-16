import { useState, useRef, useMemo, useEffect, useCallback, memo } from 'react'
import {
  ChevronDown,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  Loader2,
  Layers,
  GitBranch,
  ExternalLink, Download, Columns3 
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input, Select, Button, Tooltip  } from '@/shared/components'
import { useColumnResize, useColumnReorder } from '@/shared/hooks'
import { formatCurrency, formatNumber, formatPercent, formatInteger } from '@/shared/utils/formatters'
import styles from './SiteAnalysisTable.module.css'
import { VALID_SUB_GROUPINGS, GROUP_BY_LABELS,
  type SiteData,
  type MetricsData,
  type SortField,
  type SortOrder,
  type RevenueSource,
  type PrimaryGroupBy,
  type SubGroupBy,
  type HierarchicalItem } from '../../types'
import { exportTable, type ExportFormat } from '../../utils/exportTable'
import {
  ColumnVisibilitySelector,
  type ColumnVisibility,
  DEFAULT_COLUMN_VISIBILITY,
} from '../ColumnVisibilitySelector'
import { SourceBadge } from '../SourceBadge'

// Re-export types for external use
export type GroupByOption = PrimaryGroupBy

interface Column {
  key: SortField | 'source'
  label: string
  align: 'left' | 'right'
  format?: (value: number, currencyCode?: string) => string
  sortable?: boolean
  minWidth: number
  defaultWidth: number
  tooltip?: string
}

// Default column order - all columns are sortable
const DEFAULT_COLUMNS: Column[] = [
  { key: 'domain', label: 'Domínio', align: 'left', minWidth: 100, defaultWidth: 180, tooltip: 'Nome do domínio ou site' },
  { key: 'site', label: 'Página', align: 'left', minWidth: 120, defaultWidth: 200, tooltip: 'Caminho da página, data ou valor do agrupamento selecionado' },
  { key: 'country', label: 'País', align: 'left', minWidth: 80, defaultWidth: 120, tooltip: 'País de origem do tráfego' },
  { key: 'source', label: 'Fonte', align: 'left', minWidth: 80, defaultWidth: 100, tooltip: 'Plataforma de origem (Ad Manager ou AdSense)' },
  {
    key: 'revenue',
    label: 'Receita',
    align: 'right',
    format: (v, currency) => formatCurrency(v, currency),
    minWidth: 80,
    defaultWidth: 110,
    tooltip: 'Receita total estimada no período',
  },
  { key: 'ecpm', label: 'eCPM', align: 'right', format: formatNumber, minWidth: 60, defaultWidth: 80, tooltip: 'Effective Cost Per Mille - Receita a cada 1.000 impressões' },
  { key: 'cpc', label: 'CPC', align: 'right', format: formatNumber, minWidth: 60, defaultWidth: 80, tooltip: 'Cost Per Click - Valor médio recebido por clique' },
  { key: 'ctr', label: 'CTR', align: 'right', format: formatPercent, minWidth: 60, defaultWidth: 80, tooltip: 'Click-Through Rate - % de impressões que resultaram em clique' },
  { key: 'clicks', label: 'Cliques', align: 'right', format: formatInteger, minWidth: 70, defaultWidth: 90, tooltip: 'Total de cliques nos anúncios' },
  { key: 'impressions', label: 'Impressões', align: 'right', format: formatInteger, minWidth: 90, defaultWidth: 110, tooltip: 'Total de anúncios exibidos' },
]

// For backward compatibility
const columns = DEFAULT_COLUMNS

/**
 * Converts ISO week format (YYYY-Www) to a user-friendly display.
 * Display: "Semana 02" (compact)
 * Tooltip: "06/01/2026 - 12/01/2026 (Seg-Dom)" with full date range
 */
function formatWeekRange(isoWeek: string): { display: string; tooltip: string; isWeek: boolean } {
  // Match ISO week format: YYYY-Www (e.g., 2026-W02)
  const match = isoWeek.match(/^(\d{4})-W(\d{2})$/)
  if (!match) {
    return { display: isoWeek, tooltip: isoWeek, isWeek: false }
  }

  const year = parseInt(match[1], 10)
  const week = parseInt(match[2], 10)

  // Calculate the first day of the ISO week (Monday)
  // ISO week 1 is the week containing January 4th
  const jan4 = new Date(year, 0, 4)
  const jan4DayOfWeek = jan4.getDay() || 7 // Convert Sunday (0) to 7
  const firstMondayOfYear = new Date(jan4)
  firstMondayOfYear.setDate(jan4.getDate() - jan4DayOfWeek + 1)

  // Calculate the Monday of the requested week
  const weekStart = new Date(firstMondayOfYear)
  weekStart.setDate(firstMondayOfYear.getDate() + (week - 1) * 7)

  // Calculate Sunday (end of week)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)

  // Format: DD/MM/YYYY
  const formatDate = (date: Date) => {
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const yr = date.getFullYear()
    return `${day}/${month}/${yr}`
  }

  // Display: "Semana 02" (compact, year shown in tooltip)
  const display = `Semana ${week.toString().padStart(2, '0')}`
  // Tooltip: Full date range with weekday indicators
  const tooltip = `${formatDate(weekStart)} a ${formatDate(weekEnd)} (Seg-Dom) • ${isoWeek}`

  return { display, tooltip, isWeek: true }
}

/**
 * Extracts the path (slug + query params) from a URL, removing the domain.
 * If the value is not a URL but starts with "/" and a domain is provided, builds the full URL.
 * This enables external link icons for Ad Manager data (which has path + domain separately).
 */
function extractUrlPath(value: string, domain?: string): { path: string; fullUrl: string; isUrl: boolean } {
  // Case 1: Already a full URL
  if (value.startsWith('http://') || value.startsWith('https://')) {
    try {
      const url = new URL(value)
      const pathWithQuery = url.pathname + url.search
      return {
        path: pathWithQuery || '/',
        fullUrl: value,
        isUrl: true
      }
    } catch {
      return { path: value, fullUrl: value, isUrl: false }
    }
  }

  // Case 2: Path starting with "/" and we have a domain - build full URL
  if (value.startsWith('/') && domain && domain.includes('.')) {
    const fullUrl = `https://${domain}${value}`
    return {
      path: value,
      fullUrl,
      isUrl: true
    }
  }

  // Case 3: Not a URL
  return { path: value, fullUrl: value, isUrl: false }
}

function extractDomainFromUrl(value: string): string {
  if (!value) return ''
  try {
    const url = new URL(value.startsWith('http') ? value : `https://${value}`)
    return url.hostname
  } catch {
    return ''
  }
}

export interface ProgressInfo {
  current: number
  total: number
  currentSource: string
}

interface SiteAnalysisTableProps {
  data: SiteData[]
  currencyCode: string
  sortBy: SortField
  sortOrder: SortOrder
  onSort: (field: SortField) => void
  onSearch: (term: string) => void
  searchTerm: string
  isLoading?: boolean
  /** Number of sources still loading (for skeleton rows) */
  pendingSources?: number
  showSource?: boolean
  sourceMap?: Map<string, RevenueSource>
  /** Map of networkId/accountId to human-readable name for tooltip on source badge */
  sourceNameMap?: Map<string, string>
  // Hierarchical grouping
  groupBy?: PrimaryGroupBy
  onGroupByChange?: (groupBy: PrimaryGroupBy) => void
  subGroupBy?: SubGroupBy
  onSubGroupByChange?: (subGroupBy: SubGroupBy) => void
  // Hierarchical expansion
  expandedItems: Set<string>
  /**
   * Callback when expanding/collapsing a row.
   * Now includes the full row data so the parent can extract connection info
   * for optimized expand queries (only query sources that have data for this row).
   */
  onToggleItem: (itemKey: string, rowData?: SiteData) => void
  loadingExpand: string | null
  hierarchicalData: Map<string, HierarchicalItem[]>
  // Column visibility (controlled from parent for aggregation decisions)
  columnVisibility?: ColumnVisibility
  onColumnVisibilityChange?: (visibility: ColumnVisibility) => void
  // Progressive loading progress bar
  progress?: ProgressInfo
  showProgress?: boolean
  // Export functionality
  startDate?: string
  endDate?: string
  // Prefetch on hover
  onPrefetchExpand?: (itemKey: string, rowData: SiteData) => void
}

export const SiteAnalysisTable = memo(function SiteAnalysisTable({
  data,
  currencyCode,
  sortBy,
  sortOrder,
  onSort,
  onSearch,
  searchTerm,
  isLoading,
  pendingSources = 0,
  showSource = false,
  sourceMap,
  sourceNameMap,
  groupBy = 'domain',
  onGroupByChange,
  subGroupBy = 'date_week',
  onSubGroupByChange,
  expandedItems,
  onToggleItem,
  loadingExpand,
  hierarchicalData,
  columnVisibility: controlledVisibility,
  onColumnVisibilityChange,
  progress,
  showProgress = false,
  startDate,
  endDate,
  onPrefetchExpand,
}: SiteAnalysisTableProps) {
  // Initialize column widths
  const initialWidths = columns.reduce((acc, col) => {
    acc[col.key] = col.defaultWidth
    return acc
  }, {} as Record<string, number>)

  // Table ref for auto-fit functionality
  const tableRef = useRef<HTMLTableElement>(null)

  // Column resize with auto-fit on double-click
  // Increased maxRowsToMeasure to include expanded child rows
  const { columnWidths, handleMouseDown, handleDoubleClick, autoFitAllColumns } = useColumnResize(
    initialWidths,
    tableRef,
    columns.map(c => ({ key: c.key, minWidth: c.minWidth })),
    { maxRowsToMeasure: 200 }
  )

  // Column reorder with drag and drop
  const {
    columnOrder,
    draggedColumn,
    dragOverColumn,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  } = useColumnReorder(columns.map(c => c.key))

  // Use controlled visibility if provided, otherwise use local state
  const [localColumnVisibility, setLocalColumnVisibility] = useState<ColumnVisibility>(DEFAULT_COLUMN_VISIBILITY)
  const columnVisibility = controlledVisibility ?? localColumnVisibility
  const setColumnVisibility = onColumnVisibilityChange ?? setLocalColumnVisibility

  // Track if auto-fit has been done for the current data
  const hasAutoFitted = useRef(false)

  // Prefetch on hover timeout ref
  const prefetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Handle prefetch on mouse enter (with 300ms delay to avoid prefetching on quick mouse movements)
  const handleRowMouseEnter = useCallback((itemKey: string, site: SiteData) => {
    // Only prefetch if:
    // 1. onPrefetchExpand callback is provided
    // 2. Row is expandable (has children)
    // 3. Row is not already expanded
    // 4. Row is not currently loading
    if (!onPrefetchExpand) return
    if (!site.childCount || site.childCount === 0) return
    if (expandedItems.has(itemKey)) return
    if (loadingExpand === itemKey) return

    // Clear any pending prefetch
    if (prefetchTimeoutRef.current) {
      clearTimeout(prefetchTimeoutRef.current)
    }

    // Delay prefetch by 300ms (user must hover for at least 300ms)
    prefetchTimeoutRef.current = setTimeout(() => {
      onPrefetchExpand(itemKey, site)
    }, 300)
  }, [onPrefetchExpand, expandedItems, loadingExpand])

  // Cancel prefetch on mouse leave
  const handleRowMouseLeave = useCallback(() => {
    if (prefetchTimeoutRef.current) {
      clearTimeout(prefetchTimeoutRef.current)
      prefetchTimeoutRef.current = null
    }
  }, [])

  // Cleanup prefetch timeout on unmount
  useEffect(() => {
    return () => {
      if (prefetchTimeoutRef.current) {
        clearTimeout(prefetchTimeoutRef.current)
      }
    }
  }, [])

  // Auto-fit columns when data loads (only once per data load)
  useEffect(() => {
    // Only auto-fit when we have data and haven't auto-fitted yet for this data
    if (data.length > 0 && !isLoading && !hasAutoFitted.current) {
      // Small delay to ensure DOM is rendered
      const timer = setTimeout(() => {
        autoFitAllColumns()
        hasAutoFitted.current = true
      }, 100)
      return () => clearTimeout(timer)
    }
    // Reset flag when data is loading (new data coming)
    if (isLoading) {
      hasAutoFitted.current = false
    }
  }, [data.length, isLoading, autoFitAllColumns])


  // Get valid sub-grouping options for current primary grouping
  const validSubGroupings = useMemo(() => {
    return VALID_SUB_GROUPINGS[groupBy] || []
  }, [groupBy])

  // Primary grouping options
  const primaryGroupOptions: PrimaryGroupBy[] = ['domain', 'url', 'url_full', 'date_day', 'date_week', 'date_month', 'country']

  // Filter and order columns based on showSource, columnVisibility, and columnOrder
  const visibleColumns = useMemo(() => {
    // First filter visible columns
    const filtered = columns.filter(col => {
      // Filter by source option
      if (col.key === 'source' && !showSource) return false
      // Filter by visibility settings
      const colKey = col.key as keyof ColumnVisibility
      if (colKey in columnVisibility) {
        return columnVisibility[colKey]
      }
      return true
    })

    // Then sort by columnOrder
    return filtered.sort((a, b) => {
      const aIndex = columnOrder.indexOf(a.key)
      const bIndex = columnOrder.indexOf(b.key)
      // If not in order array, maintain original position
      if (aIndex === -1 && bIndex === -1) return 0
      if (aIndex === -1) return 1
      if (bIndex === -1) return -1
      return aIndex - bIndex
    })
  }, [showSource, columnVisibility, columnOrder])

  const getSortIcon = (field: SortField) => {
    if (sortBy !== field) return <ArrowUpDown size={14} className={styles.sortIcon} />
    return sortOrder === 'asc' ? (
      <ArrowUp size={14} className={styles.sortIconActive} />
    ) : (
      <ArrowDown size={14} className={styles.sortIconActive} />
    )
  }

  // Determine if items should be expandable based on subGroupBy
  const isExpandable = subGroupBy !== 'none' && subGroupBy !== 'total'

  const renderMetricsRow = useCallback((
    metrics: MetricsData | HierarchicalItem['metrics'],
    label: string,
    level: 0 | 1,
    isExpanded?: boolean,
    onExpand?: () => void,
    childCount?: number,
    isLoadingExpand?: boolean,
    source?: RevenueSource,
    domain?: string,
    groupType?: string,
    country?: string,
    countryCode?: string,
    originalCurrencyCode?: string,
    originalRevenue?: number,
    exchangeRate?: number,
    sourceName?: string,
  ) => {
    return (
      <>
        {/* Domain column - shows domain at both levels when available */}
        {columnVisibility.domain && (
          <td className={`${styles.cell} ${styles.cellName}`} style={{ paddingLeft: level * 24 + 8 }}>
            <div className={styles.nameCell}>
              {isExpandable && onExpand && (
                <button
                  className={styles.expandBtn}
                  onClick={onExpand}
                  disabled={isLoadingExpand}
                >
                  {isLoadingExpand ? (
                    <Loader2 size={14} className={styles.spinner} />
                  ) : isExpanded ? (
                    <ChevronDown size={14} />
                  ) : (
                    <ChevronRight size={14} />
                  )}
                </button>
              )}
              {!isExpandable && level === 0 && <span style={{ width: 24 }} />}
              {level === 1 && <span style={{ width: 24 }} />}
              <span className={styles.labelText} title={domain || ''}>
                {domain || ''}
              </span>
            </div>
          </td>
        )}
        {/* Key-Value / Site column */}
        {columnVisibility.site && (
          <td className={`${styles.cell} ${styles.cellName}`} style={!columnVisibility.domain ? { paddingLeft: level * 24 + 8 } : undefined}>
            {(() => {
              // If domain column is hidden, show expand button here
              const showExpandHere = !columnVisibility.domain && isExpandable && onExpand

              // For child rows (level 1) with domain sub-grouping, don't show label
              // since it's already shown in the Domain column (if visible)
              if (level === 1 && groupType === 'domain' && columnVisibility.domain) {
                return (
                  <div className={styles.nameCell}>
                    <span className={styles.groupTypeBadge}>
                      {GROUP_BY_LABELS[groupType as SubGroupBy] || groupType}
                    </span>
                  </div>
                )
              }

              // Check if this is an ISO week format first
              const weekFormat = formatWeekRange(label)
              const { path, fullUrl, isUrl } = extractUrlPath(label, domain)

              // Determine what to display and tooltip
              const displayText = weekFormat.isWeek ? weekFormat.display : path
              const tooltipText = weekFormat.isWeek ? weekFormat.tooltip : fullUrl

              return (
                <div className={styles.nameCell}>
                  {showExpandHere && (
                    <button
                      className={styles.expandBtn}
                      onClick={onExpand}
                      disabled={isLoadingExpand}
                    >
                      {isLoadingExpand ? (
                        <Loader2 size={14} className={styles.spinner} />
                      ) : isExpanded ? (
                        <ChevronDown size={14} />
                      ) : (
                        <ChevronRight size={14} />
                      )}
                    </button>
                  )}
                  {!showExpandHere && !columnVisibility.domain && level === 0 && <span style={{ width: 24 }} />}
                  {!columnVisibility.domain && level === 1 && <span style={{ width: 24 }} />}
                  <span className={styles.labelText} title={tooltipText}>
                    {displayText}
                  </span>
                  {isUrl && !weekFormat.isWeek && (
                    <a
                      href={fullUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.externalLink}
                      onClick={(e) => e.stopPropagation()}
                      title="Abrir em nova aba"
                    >
                      <ExternalLink size={12} />
                    </a>
                  )}
                  {childCount !== undefined && childCount > 0 && isExpandable && (
                    <span className={styles.childCount}>({childCount})</span>
                  )}
                  {level === 1 && groupType && groupType !== 'domain' && (
                    <span className={styles.groupTypeBadge}>
                      {GROUP_BY_LABELS[groupType as SubGroupBy] || groupType}
                    </span>
                  )}
                </div>
              )
            })()}
          </td>
        )}
        {/* Country column */}
        {columnVisibility.country && (
          <td className={`${styles.cell} ${styles.cellName}`}>
            <div className={styles.nameCell}>
              {country ? (
                <span className={styles.labelText} title={`${country}${countryCode ? ` (${countryCode})` : ''}`}>
                  {countryCode ? `${countryCode}` : country}
                </span>
              ) : (
                <span className={styles.labelText}>-</span>
              )}
            </div>
          </td>
        )}
        {showSource && columnVisibility.source && (
          <td className={styles.cell}>
            {source && level === 0 && (
              <SourceBadge source={source} sourceName={sourceName} />
            )}
          </td>
        )}
        {columnVisibility.revenue && (
          <td className={`${styles.cell} ${styles.cellRight}`}>
            {formatCurrency(metrics.revenue, currencyCode)}
            {originalCurrencyCode && originalCurrencyCode !== 'USD' && (
              <Tooltip
                position="top"
                content={
                  originalRevenue !== undefined && exchangeRate !== undefined ? (
                    <div style={{ textAlign: 'left', fontSize: '12px', lineHeight: '1.5' }}>
                      <div><strong>Valor original:</strong> {formatCurrency(originalRevenue, originalCurrencyCode)}</div>
                      <div><strong>Taxa de câmbio:</strong> 1 {originalCurrencyCode} = $ {exchangeRate.toFixed(4)}</div>
                      <div><strong>Valor convertido:</strong> {formatCurrency(metrics.revenue, 'USD')}</div>
                    </div>
                  ) : exchangeRate !== undefined ? (
                    <div style={{ textAlign: 'left', fontSize: '12px', lineHeight: '1.5' }}>
                      {/* Calculate original value from converted value using exchange rate */}
                      <div><strong>Valor original:</strong> {formatCurrency(metrics.revenue / exchangeRate, originalCurrencyCode)}</div>
                      <div><strong>Taxa de câmbio:</strong> 1 {originalCurrencyCode} = $ {exchangeRate.toFixed(4)}</div>
                      <div><strong>Valor convertido:</strong> {formatCurrency(metrics.revenue, 'USD')}</div>
                    </div>
                  ) : (
                    `Valor convertido de ${originalCurrencyCode} para USD`
                  )
                }
              >
                <span className={styles.conversionIndicator}>*</span>
              </Tooltip>
            )}
          </td>
        )}
        {columnVisibility.ecpm && (
          <td className={`${styles.cell} ${styles.cellRight}`}>
            {/* eCPM/RPM: Backend may return 'rpm' or 'ecpm' depending on endpoint */}
            {formatCurrency('rpm' in metrics ? (metrics as { rpm: number }).rpm : (metrics as MetricsData).ecpm, currencyCode)}
          </td>
        )}
        {columnVisibility.cpc && (
          <td className={`${styles.cell} ${styles.cellRight}`}>{formatCurrency(metrics.cpc, currencyCode)}</td>
        )}
        {columnVisibility.ctr && (
          <td className={`${styles.cell} ${styles.cellRight}`}>{formatPercent(metrics.ctr)}</td>
        )}
        {columnVisibility.clicks && (
          <td className={`${styles.cell} ${styles.cellRight}`}>{formatInteger(metrics.clicks)}</td>
        )}
        {columnVisibility.impressions && (
          <td className={`${styles.cell} ${styles.cellRight}`}>{formatInteger(metrics.impressions)}</td>
        )}
      </>
    )
  }, [columnVisibility, currencyCode, isExpandable, showSource])

  // Generate item key for the Map lookup
  const getItemKey = useCallback((site: SiteData): string => {
    // For domain grouping, the key is domain|||keyValue
    if (groupBy === 'domain') {
      return `${site.domain}|||${site.site}`
    }
    // For URL grouping (slug or full), the key is the site (keyValue)
    if (groupBy === 'url' || groupBy === 'url_full') {
      return site.site
    }
    // For country grouping, the key is the countryCode or site
    if (groupBy === 'country') {
      return site.countryCode || site.site
    }
    // For date groupings:
    // - When domain column is visible (not aggregated), include domain in key to distinguish rows
    // - When domain column is hidden (aggregated), use just the date
    if (groupBy === 'date_day' || groupBy === 'date_week' || groupBy === 'date_month') {
      // If there's a specific domain (not aggregated), include it in the key
      if (site.domain && !site.domain.startsWith('(')) {
        return `${site.site}|||${site.domain}`
      }
    }
    // Default: just the site key (date, or aggregated)
    return site.site
  }, [groupBy])

  // Handle export
  const handleExport = useCallback((format: ExportFormat) => {
    exportTable({
      data,
      expandedItems,
      hierarchicalData,
      sourceMap,
      getItemKey,
      format,
      startDate,
      endDate,
      includeLevel: expandedItems.size > 0, // Only include level column if there are expanded items
    })
  }, [data, expandedItems, hierarchicalData, sourceMap, getItemKey, startDate, endDate])

  // Flatten data into virtual rows (parent + expanded children)
  const virtualRows = useMemo(() => {
    const rows: Array<{
      type: 'parent' | 'child'
      site: SiteData
      child?: HierarchicalItem
      itemKey: string
      parentKey?: string
    }> = []

    data.forEach((site) => {
      const itemKey = getItemKey(site)
      const isExpanded = expandedItems.has(itemKey)
      const children = hierarchicalData.get(itemKey) || []

      // Add parent row
      rows.push({ type: 'parent', site, itemKey })

      // Add expanded children
      if (isExpanded && children.length > 0) {
        children.forEach((child) => {
          rows.push({
            type: 'child',
            site,
            child,
            itemKey: `${itemKey}:${child.key}`,
            parentKey: itemKey,
          })
        })
      }
    })

    return rows
  }, [data, expandedItems, hierarchicalData, getItemKey])

  // Table body ref
  const tableBodyRef = useRef<HTMLTableSectionElement>(null)

  // Render a single row
  const renderRow = useCallback(
    (virtualRow: typeof virtualRows[number]) => {
      const { type, site, child, itemKey } = virtualRow
      const source = sourceMap?.get(site.site)

      // Get source name from networkId or accountId
      const sourceName = sourceNameMap?.get(site.networkId || '') ||
                         sourceNameMap?.get(site.accountId || '') ||
                         undefined

      if (type === 'parent') {
        const isExpanded = expandedItems.has(itemKey)
        const isLoading = loadingExpand === itemKey

        return (
          <tr
            key={itemKey}
            className={`${styles.row} ${styles.rowLevel0}`}
            data-row-level="0"
            onMouseEnter={isExpandable ? () => handleRowMouseEnter(itemKey, site) : undefined}
            onMouseLeave={isExpandable ? handleRowMouseLeave : undefined}
          >
            {renderMetricsRow(
              site.metrics,
              site.site,
              0,
              isExpanded,
              isExpandable ? () => onToggleItem(itemKey, site) : undefined,
              site.childCount,
              isLoading,
              source,
              site.domain,
              undefined, // groupType
              site.country,
              site.countryCode,
              site.originalCurrencyCode, // Currency conversion indicator
              site.originalRevenue, // Original revenue before conversion
              site.exchangeRate, // Exchange rate used for conversion
              sourceName, // Source name for tooltip
            )}
          </tr>
        )
      } if (type === 'child' && child) {
        // Check if this is optimistic placeholder data
        const isOptimistic = (child as HierarchicalItem & { isOptimistic?: boolean }).isOptimistic === true

        // Determine domain for child row based on groupType
        let childDomain = site.domain || ''
        let childCountry = child.country || site.country
        let childCountryCode = child.countryCode || site.countryCode

        if (child.groupType === 'domain') {
          // Child is grouped by domain, so the label IS the domain
          childDomain = child.label
        } else if (child.groupType === 'url' || child.groupType === 'url_full') {
          // Child is grouped by URL - prefer parent domain when it's a real domain
          if (!childDomain) {
            childDomain = extractDomainFromUrl(child.label)
          }
        } else if (child.groupType === 'country') {
          // Child is grouped by country, so the label IS the country
          childCountry = child.label
          childCountryCode = child.countryCode
        }
        // For date groupings (date_day, date_week, date_month), keep parent domain for consistency

        // OPTIMISTIC UPDATE: Show skeleton row for placeholder data
        if (isOptimistic) {
          return (
            <tr key={itemKey} className={`${styles.row} ${styles.rowLevel1} ${styles.skeletonRow}`} data-row-level="1">
              {visibleColumns.map((col) => (
                <td key={col.key} className={styles.cell}>
                  <div
                    className={`${styles.skeletonCell} ${
                      col.key === 'domain' || col.key === 'site' ? styles.skeletonCellWide : ''
                    }`}
                  />
                </td>
              ))}
            </tr>
          )
        }

        return (
          <tr key={itemKey} className={`${styles.row} ${styles.rowLevel1}`} data-row-level="1">
            {renderMetricsRow(
              child.metrics,
              child.label,
              1,
              false,
              undefined,
              child.childCount,
              false,
              source,
              childDomain,
              child.groupType,
              childCountry,
              childCountryCode,
              // Use child's own currency info (from backend) if available, otherwise fallback to parent
              child.originalCurrencyCode || site.originalCurrencyCode,
              child.originalRevenue, // Backend now provides child-specific original revenue
              child.exchangeRate || site.exchangeRate, // Backend now provides child-specific exchange rate
            )}
          </tr>
        )
      }

      return null
    },
    [
      expandedItems,
      loadingExpand,
      isExpandable,
      onToggleItem,
      sourceMap,
      sourceNameMap,
      renderMetricsRow,
      handleRowMouseEnter,
      handleRowMouseLeave,
      visibleColumns,
    ]
  )

  return (
    <div className={styles.container}>
      {/* Progress bar for progressive loading - rendered inside container for alignment */}
      {showProgress && progress && progress.total > 0 && (
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${Math.max(5, (progress.current / progress.total) * 100)}%` }}
          />
          <span className={styles.progressLabel}>
            <Loader2 size={14} className={styles.progressSpinner} />
            {progress.currentSource}
          </span>
          <span className={styles.progressText}>
            {progress.current}/{progress.total} contas
          </span>
        </div>
      )}

      <div className={styles.toolbar}>
        {/* Toolbar Left - Search and Grouping */}
        <div className={styles.toolbarLeft}>
          <Input
            placeholder="Buscar sites..."
            leftIcon={<Search size={16} />}
            value={searchTerm}
            onChange={(e) => onSearch(e.target.value)}
            className={styles.searchInput}
            size="md"
          />

          {/* Grouping Selectors */}
          {onGroupByChange && (
            <div className={styles.groupingSelectors}>
              {/* Primary Group By */}
              <div className={styles.groupByWrapper}>
                <Layers size={16} className={styles.groupIcon} />
                <Select
                  value={groupBy}
                  onValueChange={(value) => {
                    const newGroupBy = value as PrimaryGroupBy
                    onGroupByChange(newGroupBy)
                    // Reset subGroupBy to first valid option for new groupBy
                    const newValidOptions = VALID_SUB_GROUPINGS[newGroupBy]
                    if (onSubGroupByChange && !newValidOptions.includes(subGroupBy)) {
                      onSubGroupByChange(newValidOptions[0])
                    }
                  }}
                  options={primaryGroupOptions.map((option) => ({
                    value: option,
                    label: GROUP_BY_LABELS[option],
                  }))}
                  placeholder="Agrupar por..."
                  size="md"
                />
              </div>

              <span className={styles.groupBySeparator}>→</span>

              {/* Sub Group By */}
              {onSubGroupByChange && (
                <div className={styles.subGroupByWrapper}>
                  <GitBranch size={14} className={styles.groupIcon} />
                  <Select
                    value={subGroupBy}
                    onValueChange={(value) => onSubGroupByChange(value as SubGroupBy)}
                    disabled={validSubGroupings.length === 0}
                    options={validSubGroupings.map((option) => ({
                      value: option,
                      label: GROUP_BY_LABELS[option],
                    }))}
                    placeholder="Expandir por..."
                    size="md"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Toolbar Right - Column Visibility and Export */}
        <div className={styles.toolbarRight}>
          {/* Column Visibility Selector */}
          <ColumnVisibilitySelector
            visibility={columnVisibility}
            onChange={setColumnVisibility}
            showSourceColumn={showSource}
          />

          {/* Auto-fit all columns button */}
          <Tooltip content="Ajustar colunas">
            <Button
              variant="outline"
              size="icon-md"
              onClick={autoFitAllColumns}
              aria-label="Ajustar largura das colunas"
            >
              <Columns3 className="size-4" />
            </Button>
          </Tooltip>

          {/* Export dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon-md"
                disabled={data.length === 0}
                aria-label="Exportar dados"
              >
                <Download className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('xlsx')}>
                Exportar Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                Exportar CSV (.csv)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className={styles.tableWrapper} role="region" aria-label="Tabela de análise de sites">
        <table
          className={styles.table}
          ref={tableRef}
          aria-label="Análise de receita por site"
        >
          <thead>
            <tr role="row">
              {visibleColumns.map((col, index) => {
                const isSortable = col.sortable !== false && col.key !== 'source'
                const isSorted = sortBy === col.key
                const sortDirection = isSorted ? (sortOrder === 'asc' ? 'ascending' : 'descending') : undefined
                
                return (
                  <th
                    key={col.key}
                    scope="col"
                    role="columnheader"
                    aria-sort={isSortable ? (sortDirection || 'none') : undefined}
                    tabIndex={isSortable ? 0 : -1}
                    data-column-key={col.key}
                    draggable
                    onDragStart={(e) => handleDragStart(col.key, e)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => handleDragOver(col.key, e)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(col.key, e)}
                    className={`${styles.header} ${col.align === 'right' ? styles.headerRight : ''} ${col.sortable === false ? styles.headerNoSort : ''} ${draggedColumn === col.key ? styles.headerDragging : ''} ${dragOverColumn === col.key ? styles.headerDragOver : ''}`}
                    style={{
                      width: columnWidths[col.key] || col.defaultWidth,
                      minWidth: col.minWidth,
                      position: 'relative',
                    }}
                    onClick={() => isSortable && onSort(col.key as SortField)}
                    onKeyDown={(e) => {
                      if (isSortable && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault()
                        onSort(col.key as SortField)
                      }
                    }}
                  >
                    <span className={styles.headerContent}>
                      {col.label}
                      {isSortable && getSortIcon(col.key as SortField)}
                      {/* Screen reader only sort announcement */}
                      {isSorted && (
                        <span className="sr-only">
                          , ordenado {sortOrder === 'asc' ? 'crescente' : 'decrescente'}
                        </span>
                      )}
                    </span>
                    {/* Resize handle with double-click for auto-fit */}
                    {index < visibleColumns.length - 1 && (
                      <button
                        type="button"
                        className={styles.resizeHandle}
                        aria-label={`Redimensionar coluna ${col.label}`}
                        onMouseDown={(e) => handleMouseDown(col.key, e)}
                        onDoubleClick={(e) => handleDoubleClick(col.key, e)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody ref={tableBodyRef}>
            {isLoading && data.length === 0 ? (
              // Full skeleton loading (no data yet)
              <>
                {Array.from({ length: 8 }).map((_, index) => (
                  <tr key={`skeleton-${index}`} className={styles.skeletonRow}>
                    {visibleColumns.map((col) => (
                      <td key={col.key} className={styles.cell}>
                        <div
                          className={`${styles.skeletonCell} ${
                            col.key === 'domain' || col.key === 'site' ? styles.skeletonCellWide : ''
                          }`}
                          style={{ animationDelay: `${index * 0.05}s` }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </>
            ) : data.length === 0 && !isLoading ? (
              <tr role="row">
                <td colSpan={visibleColumns.length} className={styles.emptyCell}>
                  <div className={styles.empty} role="status" aria-live="polite">
                    {/* Empty state illustration */}
                    <div className={styles.emptyIllustration} aria-hidden="true">
                      <svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="10" y="20" width="100" height="60" rx="4" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" fill="none" opacity="0.3"/>
                        <path d="M35 50h50M35 60h30" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.4"/>
                        <circle cx="60" cy="35" r="8" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.4"/>
                        <path d="M56 35h8M60 31v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
                      </svg>
                    </div>
                    <strong className={styles.emptyTitle}>Nenhum dado encontrado</strong>
                    <span className={styles.emptyDescription}>
                      Não encontramos resultados para os filtros selecionados.
                    </span>
                    <span className={styles.emptyHint}>
                      Dica: Tente ampliar o período ou verificar se as redes/contas estão ativas em{' '}
                      <a href="/connections">Conexões</a>.
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              <>
                {/* Standard rendering for all rows */}
                {virtualRows.map((rowData) => renderRow(rowData))}
                {/* Skeleton rows for pending sources */}
                {pendingSources > 0 && (
                  <>
                    {Array.from({ length: pendingSources }).map((_, index) => (
                      <tr key={`pending-skeleton-${index}`} className={styles.skeletonRow}>
                        {visibleColumns.map((col) => (
                          <td key={col.key} className={styles.cell}>
                            <div
                              className={`${styles.skeletonCell} ${
                                col.key === 'domain' || col.key === 'site' ? styles.skeletonCellWide : ''
                              }`}
                              style={{ animationDelay: `${index * 0.05}s` }}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
})
