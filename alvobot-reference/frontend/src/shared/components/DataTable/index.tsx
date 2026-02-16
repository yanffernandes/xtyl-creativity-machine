import { useState, useMemo, useRef, useEffect } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type PaginationState,
  type RowSelectionState,
  type Column,
} from '@tanstack/react-table'
import { clsx } from 'clsx'
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search, Filter, X } from 'lucide-react'
import { useColumnResize, useColumnReorder } from '../../hooks'
import { Button } from '../Button'
import { Checkbox } from '../Checkbox'
import { Input } from '../Input'
import { Skeleton } from '../Skeleton'
import styles from './DataTable.module.css'

// Filter operator types
export type FilterOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'between'
  | 'isEmpty'
  | 'isNotEmpty'

export interface ColumnFilter {
  id: string
  operator: FilterOperator
  value: string | number
  value2?: string | number // For 'between' operator
}

export interface FilterableColumn {
  id: string
  type: 'text' | 'number'
  label?: string
}

export interface DataTableProps<TData> {
  data: TData[]
  columns: Array<ColumnDef<TData, unknown>>
  // Sorting
  enableSorting?: boolean
  defaultSorting?: SortingState
  // Filtering
  enableFiltering?: boolean
  globalFilterPlaceholder?: string
  // Column Filters
  enableColumnFilters?: boolean
  filterableColumns?: FilterableColumn[]
  // Pagination
  enablePagination?: boolean
  pageSize?: number
  pageSizeOptions?: number[]
  // Selection
  enableRowSelection?: boolean
  onRowSelectionChange?: (selectedRows: TData[]) => void
  // Column resize + reorder
  enableColumnResize?: boolean
  enableColumnReorder?: boolean
  // Row click
  onRowClick?: (row: TData) => void
  // Row ID and highlighting
  getRowId?: (row: TData) => string
  highlightedRowIds?: string[]
  // Styling
  variant?: 'default' | 'striped' | 'bordered'
  size?: 'sm' | 'md' | 'lg'
  stickyHeader?: boolean
  // States
  isLoading?: boolean
  emptyMessage?: string
  className?: string
}

// Operator labels for display
const operatorLabels: Record<FilterOperator, string> = {
  equals: 'Igual a',
  notEquals: 'Diferente de',
  contains: 'Contém',
  notContains: 'Não contém',
  startsWith: 'Começa com',
  endsWith: 'Termina com',
  gt: 'Maior que',
  gte: 'Maior ou igual',
  lt: 'Menor que',
  lte: 'Menor ou igual',
  between: 'Entre',
  isEmpty: 'Está vazio',
  isNotEmpty: 'Não está vazio',
}

// Operators available for each column type
const textOperators: FilterOperator[] = ['contains', 'notContains', 'equals', 'notEquals', 'startsWith', 'endsWith', 'isEmpty', 'isNotEmpty']
const numberOperators: FilterOperator[] = ['equals', 'notEquals', 'gt', 'gte', 'lt', 'lte', 'between', 'isEmpty', 'isNotEmpty']

// Filter popover component
function ColumnFilterPopover<TData>({
  column,
  filterConfig,
  currentFilter,
  onApply,
  onClear,
  onClose,
}: {
  column: Column<TData, unknown>
  filterConfig: FilterableColumn
  currentFilter?: ColumnFilter
  onApply: (filter: ColumnFilter) => void
  onClear: () => void
  onClose: () => void
}) {
  const [operator, setOperator] = useState<FilterOperator>(
    currentFilter?.operator || (filterConfig.type === 'number' ? 'gt' : 'contains')
  )
  const [value, setValue] = useState<string>(String(currentFilter?.value ?? ''))
  const [value2, setValue2] = useState<string>(String(currentFilter?.value2 ?? ''))
  const popoverRef = useRef<HTMLDivElement>(null)

  const operators = filterConfig.type === 'number' ? numberOperators : textOperators
  const needsValue = !['isEmpty', 'isNotEmpty'].includes(operator)
  const needsSecondValue = operator === 'between'

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  const handleApply = () => {
    const filterValue = filterConfig.type === 'number' && value ? parseFloat(value) : value
    const filterValue2 = filterConfig.type === 'number' && value2 ? parseFloat(value2) : value2

    onApply({
      id: column.id,
      operator,
      value: filterValue,
      ...(needsSecondValue && { value2: filterValue2 }),
    })
    onClose()
  }

  const handleClear = () => {
    onClear()
    onClose()
  }

  return (
    <div ref={popoverRef} className={styles.filterPopover}>
      <div className={styles.filterHeader}>
        <span className={styles.filterTitle}>
          Filtrar {filterConfig.label || column.id}
        </span>
        <button className={styles.filterCloseBtn} onClick={onClose}>
          <X size={14} />
        </button>
      </div>

      <div className={styles.filterBody}>
        <select
          className={styles.filterOperatorSelect}
          value={operator}
          onChange={(e) => setOperator(e.target.value as FilterOperator)}
        >
          {operators.map((op) => (
            <option key={op} value={op}>
              {operatorLabels[op]}
            </option>
          ))}
        </select>

        {needsValue && (
          <div className={styles.filterRow}>
            <input
              type={filterConfig.type === 'number' ? 'number' : 'text'}
              className={styles.filterValueInput}
              placeholder={needsSecondValue ? 'Valor mínimo' : 'Valor'}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleApply()}
              autoFocus
            />
          </div>
        )}

        {needsSecondValue && (
          <div className={styles.filterRow}>
            <input
              type={filterConfig.type === 'number' ? 'number' : 'text'}
              className={styles.filterValueInput}
              placeholder="Valor máximo"
              value={value2}
              onChange={(e) => setValue2(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleApply()}
            />
          </div>
        )}

        <div className={styles.filterActions}>
          <button className={styles.filterClearBtn} onClick={handleClear}>
            Limpar
          </button>
          <button
            className={styles.filterApplyBtn}
            onClick={handleApply}
            disabled={needsValue && !value}
          >
            Aplicar
          </button>
        </div>
      </div>
    </div>
  )
}


export function DataTable<TData>({
  data,
  columns,
  enableSorting = true,
  defaultSorting = [],
  enableFiltering = false,
  globalFilterPlaceholder = 'Buscar...',
  enableColumnFilters = false,
  filterableColumns = [],
  enablePagination = false,
  pageSize = 10,
  pageSizeOptions = [10, 20, 50, 100],
  enableRowSelection = false,
  onRowSelectionChange,
  enableColumnResize = true,
  enableColumnReorder = true,
  onRowClick,
  getRowId,
  highlightedRowIds = [],
  variant = 'default',
  size = 'md',
  stickyHeader = false,
  isLoading = false,
  emptyMessage = 'Nenhum dado encontrado',
  className,
}: DataTableProps<TData>) {
  const tableRef = useRef<HTMLTableElement>(null)
  const [sorting, setSorting] = useState<SortingState>(defaultSorting)
  const [globalFilter, setGlobalFilter] = useState('')
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  })
  const [openFilterColumn, setOpenFilterColumn] = useState<string | null>(null)

  const normalizedColumns = useMemo(() => {
    return columns.map((column, index) => {
      const hasId = 'id' in column && Boolean(column.id)
      const accessorKey =
        'accessorKey' in column && typeof column.accessorKey === 'string'
          ? column.accessorKey
          : undefined

      if (hasId || accessorKey) {
        return column
      }

      return {
        ...column,
        id: `col_${index}`,
      }
    })
  }, [columns])

  // Create a map of filterable columns for quick lookup
  const filterableColumnsMap = useMemo(() => {
    const map = new Map<string, FilterableColumn>()
    filterableColumns.forEach((fc) => map.set(fc.id, fc))
    return map
  }, [filterableColumns])

  // Active filters for display
  const activeFilters = useMemo(() => {
    return columnFilters.map((cf) => {
      const filterConfig = filterableColumnsMap.get(cf.id)
      const filterValue = cf.value as ColumnFilter
      return {
        id: cf.id,
        label: filterConfig?.label || cf.id,
        operator: filterValue.operator,
        value: filterValue.value,
        value2: filterValue.value2,
      }
    })
  }, [columnFilters, filterableColumnsMap])

  // Apply column filters to data manually (more reliable than TanStack's built-in)
  const filteredData = useMemo(() => {
    if (!enableColumnFilters || columnFilters.length === 0) {
      return data
    }

    return data.filter((row) => {
      return columnFilters.every((cf) => {
        const filterValue = cf.value as ColumnFilter
        const columnId = cf.id

        // Get the value from the row - handle both object and array access
        const cellValue = (row as Record<string, unknown>)[columnId]
        const { operator, value, value2 } = filterValue

        // Handle empty checks
        if (operator === 'isEmpty') {
          return cellValue === null || cellValue === undefined || cellValue === ''
        }
        if (operator === 'isNotEmpty') {
          return cellValue !== null && cellValue !== undefined && cellValue !== ''
        }

        // For number comparisons
        const filterConfig = filterableColumnsMap.get(columnId)
        if (filterConfig?.type === 'number') {
          const numCellValue = Number(cellValue)
          const numValue = Number(value)
          const numValue2 = value2 !== undefined ? Number(value2) : undefined

          if (isNaN(numCellValue)) return false

          switch (operator) {
            case 'equals':
              return numCellValue === numValue
            case 'notEquals':
              return numCellValue !== numValue
            case 'gt':
              return numCellValue > numValue
            case 'gte':
              return numCellValue >= numValue
            case 'lt':
              return numCellValue < numValue
            case 'lte':
              return numCellValue <= numValue
            case 'between':
              return numValue2 !== undefined && numCellValue >= numValue && numCellValue <= numValue2
            default:
              return true
          }
        }

        // For string comparisons
        const strCellValue = String(cellValue ?? '').toLowerCase()
        const strValue = String(value).toLowerCase()

        switch (operator) {
          case 'equals':
            return strCellValue === strValue
          case 'notEquals':
            return strCellValue !== strValue
          case 'contains':
            return strCellValue.includes(strValue)
          case 'notContains':
            return !strCellValue.includes(strValue)
          case 'startsWith':
            return strCellValue.startsWith(strValue)
          case 'endsWith':
            return strCellValue.endsWith(strValue)
          default:
            return true
        }
      })
    })
  }, [data, columnFilters, enableColumnFilters, filterableColumnsMap])

  const showPageSizeSelector = enablePagination && filteredData.length > pagination.pageSize

  // Add selection column if enabled
  const tableColumns = useMemo(() => {
    if (!enableRowSelection) return normalizedColumns

    const selectionColumn: ColumnDef<TData, unknown> = {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
          aria-label="Selecionar todos"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          disabled={!row.getCanSelect()}
          onChange={row.getToggleSelectedHandler()}
          aria-label="Selecionar linha"
        />
      ),
      enableSorting: false,
      size: 40,
    }

    return [selectionColumn, ...normalizedColumns]
  }, [enableRowSelection, normalizedColumns])

  const columnConfigs = useMemo(() => {
    return tableColumns.map((column, index) => {
      const id =
        ('id' in column && column.id) ||
        ('accessorKey' in column && typeof column.accessorKey === 'string'
          ? column.accessorKey
          : `col_${index}`)

      const meta =
        'meta' in column
          ? (column.meta as { minWidth?: number; width?: number } | undefined)
          : undefined

      return {
        key: id as string,
        minWidth: meta?.minWidth ?? ('minSize' in column ? column.minSize : undefined),
        width: meta?.width ?? ('size' in column ? column.size : undefined),
      }
    })
  }, [tableColumns])

  const initialWidths = useMemo(() => {
    const widths: Record<string, number> = {}
    columnConfigs.forEach((config) => {
      const defaultWidth = config.width ?? 160
      widths[config.key] = defaultWidth
    })
    return widths
  }, [columnConfigs])

  const { columnWidths, handleMouseDown, handleDoubleClick } = useColumnResize(
    initialWidths,
    tableRef,
    columnConfigs
  )

  const {
    columnOrder,
    setColumnOrder,
    draggedColumn,
    dragOverColumn,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  } = useColumnReorder(columnConfigs.map((config) => config.key))

  useEffect(() => {
    if (!enableColumnReorder) return
    setColumnOrder(columnConfigs.map((config) => config.key))
  }, [columnConfigs, enableColumnReorder, setColumnOrder])

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: filteredData,
    columns: tableColumns,
    state: {
      sorting,
      globalFilter,
      rowSelection,
      pagination,
      columnOrder: enableColumnReorder ? columnOrder : undefined,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: (updater) => {
      const newSelection = typeof updater === 'function' ? updater(rowSelection) : updater
      setRowSelection(newSelection)
      if (onRowSelectionChange) {
        const selectedRows = Object.keys(newSelection)
          .filter((key) => newSelection[key])
          .map((key) => filteredData[parseInt(key)])
        onRowSelectionChange(selectedRows)
      }
    },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
    getFilteredRowModel: enableFiltering ? getFilteredRowModel() : undefined,
    getPaginationRowModel: getPaginationRowModel(),
    enableRowSelection,
    onColumnOrderChange: enableColumnReorder ? setColumnOrder : undefined,
  })

  const renderSortIcon = (column: { getIsSorted: () => false | 'asc' | 'desc' }) => {
    const sorted = column.getIsSorted()
    if (!sorted) return <ChevronsUpDown size={14} className={styles.sortIconInactive} />
    if (sorted === 'asc') return <ChevronUp size={14} className={styles.sortIcon} />
    return <ChevronDown size={14} className={styles.sortIcon} />
  }

  const handleApplyFilter = (columnId: string, filter: ColumnFilter) => {
    setColumnFilters((prev) => {
      const existing = prev.filter((f) => f.id !== columnId)
      return [...existing, { id: columnId, value: filter }]
    })
  }

  const handleClearFilter = (columnId: string) => {
    setColumnFilters((prev) => prev.filter((f) => f.id !== columnId))
  }

  const handleClearAllFilters = () => {
    setColumnFilters([])
  }

  const getFilterDisplayValue = (filter: typeof activeFilters[0]) => {
    const opLabel = operatorLabels[filter.operator]
    if (['isEmpty', 'isNotEmpty'].includes(filter.operator)) {
      return opLabel
    }
    if (filter.operator === 'between') {
      return `${opLabel} ${filter.value} e ${filter.value2}`
    }
    return `${opLabel} ${filter.value}`
  }

  return (
    <div className={clsx(styles.wrapper, className)}>
      {/* Toolbar */}
      {enableFiltering && (
        <div className={styles.toolbar}>
          <div className={styles.searchWrapper}>
            <Search size={16} className={styles.searchIcon} />
            <Input
              placeholder={globalFilterPlaceholder}
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className={styles.searchInput}
            />
          </div>
          {enableRowSelection && Object.keys(rowSelection).length > 0 && (
            <span className={styles.selectionCount}>
              {Object.keys(rowSelection).filter((k) => rowSelection[k]).length} selecionado(s)
            </span>
          )}
        </div>
      )}

      {/* Active Filters Bar */}
      {enableColumnFilters && activeFilters.length > 0 && (
        <div className={styles.activeFiltersBar}>
          <span className={styles.activeFiltersLabel}>Filtros:</span>
          {activeFilters.map((filter) => (
            <span key={filter.id} className={styles.activeFilterChip}>
              <strong>{filter.label}:</strong> {getFilterDisplayValue(filter)}
              <button
                className={styles.activeFilterChipRemove}
                onClick={() => handleClearFilter(filter.id)}
              >
                <X size={12} />
              </button>
            </span>
          ))}
          {activeFilters.length > 1 && (
            <button className={styles.clearAllFiltersBtn} onClick={handleClearAllFilters}>
              Limpar todos
            </button>
          )}
        </div>
      )}

      {/* Table */}
      <div className={clsx(styles.tableWrapper, stickyHeader && styles.stickyHeader)}>
        <table
          ref={tableRef}
          className={clsx(styles.table, styles[variant], styles[`size-${size}`])}
        >
          <thead className={styles.thead}>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const filterConfig = filterableColumnsMap.get(header.column.id)
                  const isFilterable = enableColumnFilters && filterConfig
                  const hasActiveFilter = columnFilters.some((f) => f.id === header.column.id)
                  const isFilterOpen = openFilterColumn === header.column.id
                  const columnKey = header.column.id
                  const columnWidth = columnWidths[columnKey]

                  return (
                    <th
                      key={header.id}
                      data-column-key={columnKey}
                      className={clsx(
                        styles.th,
                        header.column.getCanSort() && styles.sortable,
                        isFilterable && styles.filterableHeader,
                        enableColumnReorder && styles.draggableHeader,
                        draggedColumn === columnKey && styles.draggingHeader,
                        dragOverColumn === columnKey && styles.dragOverHeader
                      )}
                      style={{ width: columnWidth || header.getSize() || undefined }}
                      draggable={enableColumnReorder}
                      onDragStart={(e) => enableColumnReorder && handleDragStart(columnKey, e)}
                      onDragEnd={(e) => enableColumnReorder && handleDragEnd(e)}
                      onDragOver={(e) => enableColumnReorder && handleDragOver(columnKey, e)}
                      onDragLeave={enableColumnReorder ? handleDragLeave : undefined}
                      onDrop={(e) => enableColumnReorder && handleDrop(columnKey, e)}
                    >
                      <div className={styles.thContent}>
                        {/* Sortable part */}
                        <button
                          type="button"
                          className={clsx(styles.sortTrigger, header.column.getCanSort() && styles.sortable)}
                          onClick={header.column.getToggleSortingHandler()}
                          disabled={!header.column.getCanSort()}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getCanSort() && renderSortIcon(header.column)}
                        </button>

                        {/* Filter icon */}
                        {isFilterable && (
                          <button
                            className={styles.filterTrigger}
                            onClick={(e) => {
                              e.stopPropagation()
                              setOpenFilterColumn(isFilterOpen ? null : header.column.id)
                            }}
                            style={{ width: 'auto', padding: '2px' }}
                          >
                            <Filter
                              size={14}
                              className={clsx(styles.filterIcon, hasActiveFilter && styles.active)}
                            />
                          </button>
                        )}
                      </div>

                      {enableColumnResize && (
                        // eslint-disable-next-line jsx-a11y/no-static-element-interactions
                        <div
                          className={styles.resizeHandle}
                          onMouseDown={(e) => handleMouseDown(columnKey, e)}
                          onDoubleClick={(e) => handleDoubleClick(columnKey, e)}
                        />
                      )}

                      {/* Filter popover */}
                      {isFilterOpen && filterConfig && (
                        <ColumnFilterPopover
                          column={header.column}
                          filterConfig={filterConfig}
                          currentFilter={columnFilters.find((f) => f.id === header.column.id)?.value as ColumnFilter | undefined}
                          onApply={(filter) => handleApplyFilter(header.column.id, filter)}
                          onClear={() => handleClearFilter(header.column.id)}
                          onClose={() => setOpenFilterColumn(null)}
                        />
                      )}
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody className={styles.tbody}>
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: pagination?.pageSize || pageSize }).map((_, index) => (
                <tr key={index} className={styles.tr}>
                  {tableColumns.map((_, colIndex) => (
                    <td key={colIndex} className={styles.td}>
                      <Skeleton variant="text" width="80%" />
                    </td>
                  ))}
                </tr>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              // Empty state
              <tr>
                <td colSpan={tableColumns.length} className={styles.emptyCell}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              // Data rows
              table.getRowModel().rows.map((row) => {
                const rowId = getRowId ? getRowId(row.original) : row.id
                const isHighlighted = highlightedRowIds.includes(rowId)
                const isClickable = !!onRowClick

                return (
                  <tr
                    key={row.id}
                    className={clsx(
                      styles.tr,
                      row.getIsSelected() && styles.selected,
                      isHighlighted && styles.highlighted,
                      isClickable && styles.clickable
                    )}
                    onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const columnKey = cell.column.id
                      const columnWidth = columnWidths[columnKey]

                      return (
                        <td
                          key={cell.id}
                          data-column-key={columnKey}
                          className={styles.td}
                          style={{ width: columnWidth || undefined }}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      )
                    })}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {enablePagination && (
        <div className={styles.pagination}>
          {showPageSizeSelector && (
            <div className={styles.pageInfo}>
              <span>Linhas por página:</span>
              <select
                value={pagination.pageSize}
                onChange={(e) => {
                  table.setPageSize(Number(e.target.value))
                }}
                className={styles.pageSizeSelect}
              >
                {pageSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
          )}
          <span className={styles.pageRange}>
            {pagination.pageIndex * pagination.pageSize + 1}-
            {Math.min((pagination.pageIndex + 1) * pagination.pageSize, filteredData.length)} de {filteredData.length}
          </span>
          <div className={styles.pageButtons}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronsLeft size={16} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft size={16} />
            </Button>
            <span className={styles.currentPage}>
              {pagination.pageIndex + 1} / {table.getPageCount()}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight size={16} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <ChevronsRight size={16} />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// Helper for creating columns
export { createColumnHelper } from '@tanstack/react-table'
export type { ColumnDef } from '@tanstack/react-table'
