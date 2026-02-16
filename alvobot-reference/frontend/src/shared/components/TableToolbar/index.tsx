/**
 * TableToolbar Component
 *
 * A standardized toolbar for data tables across all dashboards.
 * Provides consistent search, filters, column visibility, and export functionality.
 *
 * Layout: [Search] [Filters...] | [Actions...]
 */

import { memo, useState, useRef, useEffect, type ReactNode } from 'react'
import {
  Search,
  Columns3,
  Download,
  ChevronDown,
  Check,
  RotateCcw,
  FileSpreadsheet,
  FileText,
} from 'lucide-react'
import { Input } from '../Input'
import styles from './TableToolbar.module.css'

export interface ColumnConfig {
  id: string
  label: string
  visible: boolean
  /** If true, column cannot be hidden */
  required?: boolean
}

export interface TableToolbarProps {
  /** Search input value */
  searchValue?: string
  /** Search input change handler */
  onSearchChange?: (value: string) => void
  /** Search input placeholder */
  searchPlaceholder?: string
  /** Custom filter elements to render between search and actions */
  filters?: ReactNode
  /** Column visibility configuration */
  columns?: ColumnConfig[]
  /** Column visibility change handler */
  onColumnsChange?: (columns: ColumnConfig[]) => void
  /** Enable export functionality */
  enableExport?: boolean
  /** Export handlers */
  onExportCSV?: () => void
  onExportXLSX?: () => void
  /** Loading state (disables export) */
  isLoading?: boolean
  /** Additional actions to render on the right side */
  actions?: ReactNode
  /** Optional className */
  className?: string
}

export const TableToolbar = memo(function TableToolbar({
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Buscar...',
  filters,
  columns,
  onColumnsChange,
  enableExport = true,
  onExportCSV,
  onExportXLSX,
  isLoading = false,
  actions,
  className,
}: TableToolbarProps) {
  const [showColumnDropdown, setShowColumnDropdown] = useState(false)
  const [showExportDropdown, setShowExportDropdown] = useState(false)
  const columnDropdownRef = useRef<HTMLDivElement>(null)
  const exportDropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        columnDropdownRef.current &&
        !columnDropdownRef.current.contains(event.target as Node)
      ) {
        setShowColumnDropdown(false)
      }
      if (
        exportDropdownRef.current &&
        !exportDropdownRef.current.contains(event.target as Node)
      ) {
        setShowExportDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const visibleColumnsCount = columns?.filter((c) => c.visible).length ?? 0
  const totalColumnsCount = columns?.length ?? 0

  const handleToggleColumn = (columnId: string) => {
    if (!columns || !onColumnsChange) return

    const column = columns.find((c) => c.id === columnId)
    if (column?.required) return

    const updated = columns.map((c) =>
      c.id === columnId ? { ...c, visible: !c.visible } : c
    )
    onColumnsChange(updated)
  }

  const handleResetColumns = () => {
    if (!columns || !onColumnsChange) return
    const reset = columns.map((c) => ({ ...c, visible: true }))
    onColumnsChange(reset)
  }

  return (
    <div className={`${styles.toolbar} ${className ?? ''}`}>
      <div className={styles.toolbarLeft}>
        {/* Search */}
        {onSearchChange && (
          <Input
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className={styles.searchWrapper}
            leftIcon={<Search size={16} />}
            size="md"
          />
        )}

        {/* Custom filters */}
        {filters}
      </div>

      <div className={styles.toolbarRight}>
        {/* Additional actions */}
        {actions}

        {/* Column visibility selector */}
        {columns && onColumnsChange && (
          <div className={styles.columnSelectorWrapper} ref={columnDropdownRef}>
            <button
              type="button"
              className={styles.toolbarButton}
              onClick={() => setShowColumnDropdown(!showColumnDropdown)}
            >
              <Columns3 size={16} />
              <span>Colunas</span>
              <span className={styles.columnCount}>{visibleColumnsCount}</span>
            </button>

            {showColumnDropdown && (
              <div className={styles.dropdown}>
                <div className={styles.dropdownHeader}>Colunas visíveis</div>
                <div className={styles.dropdownOptions}>
                  {columns.map((column) => (
                    <button
                      key={column.id}
                      type="button"
                      className={`${styles.dropdownOption} ${
                        column.visible ? styles.dropdownOptionActive : ''
                      }`}
                      onClick={() => handleToggleColumn(column.id)}
                      disabled={column.required}
                    >
                      <span
                        className={`${styles.dropdownCheckbox} ${
                          column.visible ? styles.dropdownCheckboxActive : ''
                        }`}
                      >
                        {column.visible && <Check size={12} />}
                      </span>
                      <span className={styles.dropdownLabel}>{column.label}</span>
                    </button>
                  ))}
                </div>
                {visibleColumnsCount < totalColumnsCount && (
                  <div className={styles.dropdownFooter}>
                    <button
                      type="button"
                      className={styles.resetButton}
                      onClick={handleResetColumns}
                    >
                      <RotateCcw size={14} />
                      Mostrar todas
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Export dropdown */}
        {enableExport && (onExportCSV || onExportXLSX) && (
          <div className={styles.exportWrapper} ref={exportDropdownRef}>
            <button
              type="button"
              className={styles.toolbarButton}
              onClick={() => setShowExportDropdown(!showExportDropdown)}
              disabled={isLoading}
            >
              <Download size={16} />
              <span>Exportar</span>
              <ChevronDown size={14} />
            </button>

            {showExportDropdown && (
              <div className={styles.exportDropdown}>
                {onExportCSV && (
                  <button
                    type="button"
                    className={styles.exportOption}
                    onClick={() => {
                      onExportCSV()
                      setShowExportDropdown(false)
                    }}
                  >
                    <FileText size={16} />
                    <span>Exportar CSV</span>
                  </button>
                )}
                {onExportXLSX && (
                  <button
                    type="button"
                    className={styles.exportOption}
                    onClick={() => {
                      onExportXLSX()
                      setShowExportDropdown(false)
                    }}
                  >
                    <FileSpreadsheet size={16} />
                    <span>Exportar Excel</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
})

export default TableToolbar
