import { useState, useRef, useMemo, useEffect, useCallback, memo } from 'react'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  Columns3,
  Download,
  GitBranch,
  Layers,
  Loader2,
  Search,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button, Input, Select, Tooltip } from '@/shared/components'
import { useColumnResize, useColumnReorder } from '@/shared/hooks'
import { ColumnVisibilitySelector } from '../ColumnVisibilitySelector'
import styles from './AnalyticsDataTable.module.css'
import {
  AnalyticsGroupBy,
  DEFAULT_COLUMN_VISIBILITY,
  GROUP_BY_LABELS,
  VALID_SUB_GROUPINGS,
  type AnalyticsMetrics,
  type AnalyticsRow,
  type ColumnVisibility,
  type HierarchicalItem,
} from '../../types'
import { exportToCSV, exportToXLSX } from '../../utils/exportTable'
import {
  formatCurrency,
  formatDateFromGA,
  formatDurationMinSec,
  formatInteger,
  formatMonth,
  formatPercent,
  formatWeek,
} from '../../utils/formatters'

// Type aliases for clarity
type SortField = keyof AnalyticsMetrics | 'label'
type SortOrder = 'asc' | 'desc'
type AnalyticsGroupByValue = typeof AnalyticsGroupBy[keyof typeof AnalyticsGroupBy]
type PrimaryGroupBy = AnalyticsGroupByValue
type SubGroupBy = AnalyticsGroupByValue

// Extended sort field includes 'domain' which is not a metric but a row field
type ExtendedSortField = SortField | 'domain'

interface Column {
  key: ExtendedSortField
  label: string
  align: 'left' | 'right'
  format?: (value: number) => string
  sortable?: boolean
  minWidth: number
  defaultWidth: number
  tooltip?: string
}

// Default columns configuration - domain is first, then label (dimension), then metrics
// Receita aparece antes de Rejeição por solicitação do usuário
const DEFAULT_COLUMNS: Column[] = [
  { key: 'domain', label: 'Domínio', align: 'left', minWidth: 120, defaultWidth: 180, tooltip: 'Domínio do site', sortable: false },
  { key: 'label', label: 'Dimensão', align: 'left', minWidth: 150, defaultWidth: 250, tooltip: 'Valor do agrupamento selecionado' },
  { key: 'activeUsers', label: 'Usuários', align: 'right', format: formatInteger, minWidth: 80, defaultWidth: 100, tooltip: 'Usuários ativos no período' },
  { key: 'newUsers', label: 'Novos', align: 'right', format: formatInteger, minWidth: 70, defaultWidth: 90, tooltip: 'Novos usuários no período' },
  { key: 'sessions', label: 'Sessões', align: 'right', format: formatInteger, minWidth: 80, defaultWidth: 100, tooltip: 'Total de sessões' },
  { key: 'engagedSessions', label: 'Engajadas', align: 'right', format: formatInteger, minWidth: 80, defaultWidth: 100, tooltip: 'Sessões engajadas' },
  { key: 'pageViews', label: 'Visualizações', align: 'right', format: formatInteger, minWidth: 100, defaultWidth: 110, tooltip: 'Total de visualizações de página' },
  { key: 'pagesPerSession', label: 'Págs/Sessão', align: 'right', format: (v) => v.toFixed(2), minWidth: 90, defaultWidth: 100, tooltip: 'Páginas por sessão' },
  { key: 'totalRevenue', label: 'Receita', align: 'right', format: (v) => formatCurrency(v), minWidth: 90, defaultWidth: 110, tooltip: 'Receita total' },
  { key: 'bounceRate', label: 'Rejeição', align: 'right', format: formatPercent, minWidth: 80, defaultWidth: 90, tooltip: 'Taxa de rejeição' },
  { key: 'engagementRate', label: 'Engajamento', align: 'right', format: formatPercent, minWidth: 90, defaultWidth: 100, tooltip: 'Taxa de engajamento' },
  { key: 'avgSessionDuration', label: 'Duração', align: 'right', format: formatDurationMinSec, minWidth: 80, defaultWidth: 90, tooltip: 'Duração média da sessão' },
  { key: 'eventCount', label: 'Eventos', align: 'right', format: formatInteger, minWidth: 70, defaultWidth: 90, tooltip: 'Total de eventos' },
  { key: 'conversions', label: 'Conversões', align: 'right', format: formatInteger, minWidth: 90, defaultWidth: 100, tooltip: 'Total de conversões' },
]

const columns = DEFAULT_COLUMNS

export interface ProgressInfo {
  current: number
  total: number
  isProgressing: boolean
}

interface AnalyticsDataTableProps {
  data: AnalyticsRow[]
  sortBy: SortField
  sortOrder: SortOrder
  onSort: (field: SortField) => void
  onSearch: (term: string) => void
  searchTerm: string
  isLoading?: boolean
  // Hierarchical grouping
  groupBy?: PrimaryGroupBy
  onGroupByChange?: (groupBy: PrimaryGroupBy) => void
  subGroupBy?: SubGroupBy
  onSubGroupByChange?: (subGroupBy: SubGroupBy) => void
  // Hierarchical expansion
  expandedItems: Set<string>
  onToggleItem: (itemKey: string, rowData?: AnalyticsRow) => void
  loadingExpand: string | null
  hierarchicalData: Map<string, HierarchicalItem[]>
  // Column visibility
  columnVisibility?: ColumnVisibility
  onColumnVisibilityChange?: (visibility: ColumnVisibility) => void
  // Progressive loading
  progress?: ProgressInfo
  showProgress?: boolean
  // Export functionality
  startDate?: string
  endDate?: string
  // Prefetch on hover
  onPrefetchExpand?: (itemKey: string, rowData: AnalyticsRow) => void
}

export const AnalyticsDataTable = memo(function AnalyticsDataTable({
  data,
  sortBy,
  sortOrder,
  onSort,
  onSearch,
  searchTerm,
  isLoading,
  groupBy = AnalyticsGroupBy.PAGE_PATH,
  onGroupByChange,
  subGroupBy = AnalyticsGroupBy.DATE,
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
}: AnalyticsDataTableProps) {
  // Initialize column widths
  const initialWidths = columns.reduce((acc, col) => {
    acc[col.key] = col.defaultWidth
    return acc
  }, {} as Record<string, number>)

  // Table ref for auto-fit functionality
  const tableRef = useRef<HTMLTableElement>(null)

  // Column resize with auto-fit on double-click
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

  // Handle prefetch on mouse enter
  const handleRowMouseEnter = useCallback((itemKey: string, row: AnalyticsRow) => {
    if (!onPrefetchExpand) return
    if (!row.childCount || row.childCount === 0) return
    if (expandedItems.has(itemKey)) return
    if (loadingExpand === itemKey) return

    if (prefetchTimeoutRef.current) {
      clearTimeout(prefetchTimeoutRef.current)
    }

    prefetchTimeoutRef.current = setTimeout(() => {
      onPrefetchExpand(itemKey, row)
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

  // Auto-fit columns when data loads
  useEffect(() => {
    if (data.length > 0 && !isLoading && !hasAutoFitted.current) {
      const timer = setTimeout(() => {
        autoFitAllColumns()
        hasAutoFitted.current = true
      }, 100)
      return () => clearTimeout(timer)
    }
    if (isLoading) {
      hasAutoFitted.current = false
    }
  }, [data.length, isLoading, autoFitAllColumns])

  // Get valid sub-grouping options
  const validSubGroupings = useMemo(() => {
    return VALID_SUB_GROUPINGS[groupBy] || []
  }, [groupBy])

  // Primary grouping options
  const primaryGroupOptions: PrimaryGroupBy[] = [
    AnalyticsGroupBy.PAGE_PATH,
    AnalyticsGroupBy.PAGE_TITLE,
    AnalyticsGroupBy.LANDING_PAGE,
    AnalyticsGroupBy.DATE,
    AnalyticsGroupBy.WEEK,
    AnalyticsGroupBy.MONTH,
    AnalyticsGroupBy.COUNTRY,
    AnalyticsGroupBy.CITY,
    AnalyticsGroupBy.DEVICE_CATEGORY,
    AnalyticsGroupBy.BROWSER,
    AnalyticsGroupBy.OPERATING_SYSTEM,
    AnalyticsGroupBy.SOURCE_MEDIUM,
    AnalyticsGroupBy.SOURCE,
    AnalyticsGroupBy.MEDIUM,
    AnalyticsGroupBy.CAMPAIGN,
  ]

  // Map ColumnVisibility keys to column keys
  const visibilityKeyMap: Record<string, keyof ColumnVisibility> = {
    domain: 'domain',
    label: 'key',
    activeUsers: 'activeUsers',
    newUsers: 'newUsers',
    sessions: 'sessions',
    engagedSessions: 'engagedSessions',
    pageViews: 'pageViews',
    pagesPerSession: 'pagesPerSession',
    bounceRate: 'bounceRate',
    engagementRate: 'engagementRate',
    avgSessionDuration: 'avgSessionDuration',
    eventCount: 'eventCount',
    conversions: 'conversions',
    totalRevenue: 'totalRevenue',
  }

  // Filter and order visible columns
  const visibleColumns = useMemo(() => {
    const filtered = columns.filter(col => {
      const visKey = visibilityKeyMap[col.key] || col.key
      if (visKey in columnVisibility) {
        return columnVisibility[visKey as keyof ColumnVisibility]
      }
      return true
    })

    return filtered.sort((a, b) => {
      const aIndex = columnOrder.indexOf(a.key)
      const bIndex = columnOrder.indexOf(b.key)
      if (aIndex === -1 && bIndex === -1) return 0
      if (aIndex === -1) return 1
      if (bIndex === -1) return -1
      return aIndex - bIndex
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnVisibility, columnOrder])

  const getSortIcon = (field: ExtendedSortField) => {
    if (sortBy !== field) return <ArrowUpDown size={14} className={styles.sortIcon} />
    return sortOrder === 'asc' ? (
      <ArrowUp size={14} className={styles.sortIconActive} />
    ) : (
      <ArrowDown size={14} className={styles.sortIconActive} />
    )
  }

  // Determine if items should be expandable
  const isExpandable = validSubGroupings.length > 0

  // Format label based on groupBy type
  const formatLabel = useCallback((label: string, groupType: AnalyticsGroupBy): string => {
    switch (groupType) {
      case AnalyticsGroupBy.DATE:
      case AnalyticsGroupBy.DATE_HOUR:
        return formatDateFromGA(label)
      case AnalyticsGroupBy.WEEK:
        return formatWeek(label)
      case AnalyticsGroupBy.MONTH:
        return formatMonth(label)
      default:
        return label
    }
  }, [])

  // Get item key for Map lookup
  const getItemKey = useCallback((row: AnalyticsRow): string => {
    return row.key
  }, [])

  // Handle export
  const handleExport = useCallback((format: 'csv' | 'xlsx') => {
    if (format === 'csv') {
      exportToCSV(data, columnVisibility, `analytics-${startDate}-${endDate}`)
    } else {
      exportToXLSX(data, columnVisibility, `analytics-${startDate}-${endDate}`)
    }
  }, [data, columnVisibility, startDate, endDate])

  // Flatten data into virtual rows
  const virtualRows = useMemo(() => {
    const rows: Array<{
      type: 'parent' | 'child'
      row: AnalyticsRow
      child?: HierarchicalItem
      itemKey: string
      parentKey?: string
    }> = []

    data.forEach((row) => {
      const itemKey = getItemKey(row)
      const isExpanded = expandedItems.has(itemKey)
      const children = hierarchicalData.get(itemKey) || []

      rows.push({ type: 'parent', row, itemKey })

      if (isExpanded && children.length > 0) {
        children.forEach((child) => {
          rows.push({
            type: 'child',
            row,
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

  // Render metrics cell
  const renderMetricCell = useCallback((
    value: number | undefined,
    format?: (v: number) => string
  ) => {
    if (value === undefined || value === null) return '-'
    return format ? format(value) : value
  }, [])

  // Render a single row
  const renderRow = useCallback(
    (virtualRow: typeof virtualRows[number]) => {
      const { type, row, child, itemKey } = virtualRow

      if (type === 'parent') {
        const isExpanded = expandedItems.has(itemKey)
        const isLoadingRow = loadingExpand === itemKey
        const canExpand = isExpandable && (row.childCount || 0) > 0

        return (
          <tr
            key={itemKey}
            className={`${styles.row} ${styles.rowLevel0}`}
            data-row-level="0"
            onMouseEnter={canExpand ? () => handleRowMouseEnter(itemKey, row) : undefined}
            onMouseLeave={canExpand ? handleRowMouseLeave : undefined}
          >
            {visibleColumns.map((col) => {
              // Domain column
              if (col.key === 'domain') {
                return (
                  <td key={col.key} className={`${styles.cell} ${styles.cellDomain}`}>
                    <span className={styles.domainText} title={row.domain || '-'}>
                      {row.domain || '-'}
                    </span>
                  </td>
                )
              }

              // Label/Dimension column with expand button
              if (col.key === 'label') {
                return (
                  <td key={col.key} className={`${styles.cell} ${styles.cellName}`}>
                    <div className={styles.nameCell}>
                      {canExpand && (
                        <button
                          className={styles.expandBtn}
                          onClick={() => onToggleItem(itemKey, row)}
                          disabled={isLoadingRow}
                        >
                          {isLoadingRow ? (
                            <Loader2 size={14} className={styles.spinner} />
                          ) : isExpanded ? (
                            <ChevronDown size={14} />
                          ) : (
                            <ChevronRight size={14} />
                          )}
                        </button>
                      )}
                      {!canExpand && <span style={{ width: 24 }} />}
                      <span className={styles.labelText} title={row.label}>
                        {formatLabel(row.label, groupBy)}
                      </span>
                      {(row.childCount || 0) > 0 && isExpandable && (
                        <span className={styles.childCount}>({row.childCount})</span>
                      )}
                    </div>
                  </td>
                )
              }

              // Metric columns
              const value = row.metrics[col.key as keyof AnalyticsMetrics]
              return (
                <td key={col.key} className={`${styles.cell} ${styles.cellRight}`}>
                  {renderMetricCell(value, col.format)}
                </td>
              )
            })}
          </tr>
        )
      }

      if (type === 'child' && child) {
        return (
          <tr key={itemKey} className={`${styles.row} ${styles.rowLevel1}`} data-row-level="1">
            {visibleColumns.map((col) => {
              // Domain column - empty for child rows (inherited from parent)
              if (col.key === 'domain') {
                return (
                  <td key={col.key} className={`${styles.cell} ${styles.cellDomain}`}>
                    <span className={styles.domainTextChild}>-</span>
                  </td>
                )
              }

              // Label/Dimension column
              if (col.key === 'label') {
                return (
                  <td key={col.key} className={`${styles.cell} ${styles.cellName}`} style={{ paddingLeft: 48 }}>
                    <div className={styles.nameCell}>
                      <span className={styles.labelText} title={child.label}>
                        {formatLabel(child.label, child.groupType)}
                      </span>
                      <span className={styles.groupTypeBadge}>
                        {GROUP_BY_LABELS[child.groupType]}
                      </span>
                    </div>
                  </td>
                )
              }

              // Metric columns
              const value = child.metrics[col.key as keyof AnalyticsMetrics]
              return (
                <td key={col.key} className={`${styles.cell} ${styles.cellRight}`}>
                  {renderMetricCell(value, col.format)}
                </td>
              )
            })}
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
      groupBy,
      visibleColumns,
      formatLabel,
      renderMetricCell,
      handleRowMouseEnter,
      handleRowMouseLeave,
    ]
  )

  return (
    <div className={styles.container}>
      {/* Progress bar for progressive loading */}
      {showProgress && progress && progress.total > 0 && (
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${Math.max(5, (progress.current / progress.total) * 100)}%` }}
          />
          <span className={styles.progressLabel}>
            <Loader2 size={14} className={styles.progressSpinner} />
            Carregando propriedades...
          </span>
          <span className={styles.progressText}>
            {progress.current}/{progress.total}
          </span>
        </div>
      )}

      <div className={styles.toolbar}>
        {/* Toolbar Left - Search and Grouping */}
        <div className={styles.toolbarLeft}>
          <Input
            placeholder="Buscar..."
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
                    const newValidOptions = VALID_SUB_GROUPINGS[newGroupBy]
                    if (onSubGroupByChange && newValidOptions && !newValidOptions.includes(subGroupBy)) {
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
          <ColumnVisibilitySelector
            visibility={columnVisibility}
            onChange={setColumnVisibility}
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

      <div className={styles.tableWrapper} role="region" aria-label="Tabela de analytics">
        <table
          className={styles.table}
          ref={tableRef}
          aria-label="Dados de Analytics"
        >
          <thead>
            <tr role="row">
              {visibleColumns.map((col, index) => {
                const isSortable = col.sortable !== false
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
                    className={`${styles.header} ${col.align === 'right' ? styles.headerRight : ''} ${isSortable ? '' : styles.headerNoSort} ${draggedColumn === col.key ? styles.headerDragging : ''} ${dragOverColumn === col.key ? styles.headerDragOver : ''}`}
                    style={{
                      width: columnWidths[col.key] || col.defaultWidth,
                      minWidth: col.minWidth,
                      position: 'relative',
                    }}
                    onClick={() => isSortable && col.key !== 'domain' && onSort(col.key as SortField)}
                    onKeyDown={(e) => {
                      if (isSortable && col.key !== 'domain' && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault()
                        onSort(col.key as SortField)
                      }
                    }}
                  >
                    <span className={styles.headerContent}>
                      {col.label}
                      {isSortable && getSortIcon(col.key)}
                    </span>
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
              <>
                {Array.from({ length: 8 }).map((_, index) => (
                  <tr key={`skeleton-${index}`} className={styles.skeletonRow}>
                    {visibleColumns.map((col) => (
                      <td key={col.key} className={styles.cell}>
                        <div
                          className={`${styles.skeletonCell} ${col.key === 'label' ? styles.skeletonCellWide : ''}`}
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
                      Dica: Tente ampliar o período ou verificar se as propriedades estão ativas em{' '}
                      <a href="/connections">Conexões</a>.
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              virtualRows.map((rowData) => renderRow(rowData))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
})
