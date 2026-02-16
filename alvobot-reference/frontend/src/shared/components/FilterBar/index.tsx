import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import styles from './FilterBar.module.css'

export interface FilterBarProps {
  /** Filter content on the left side (primary filters like period) */
  children: ReactNode
  /** Filter content on the right side (secondary filters like source, accounts) */
  rightContent?: ReactNode
  /** Optional class name */
  className?: string
  /** Callback to clear all filters */
  onClear?: () => void
  /** Whether to show the clear filters button (shows when filters are active) */
  showClearButton?: boolean
  /** Number of active filters (shown in badge) */
  activeFilterCount?: number
}

/**
 * FilterBar - Standard filter bar for data dashboard pages
 * 
 * Structure:
 * - Left: Primary filters (Period is always first)
 * - Right: Secondary filters (Source, Accounts, Platform, etc.)
 * - Clear filters button when filters are active
 * 
 * Based on CLAUDE.md Blueprint Section 2:
 * - Period filter always first
 * - All filters live here (not in header, not scattered)
 * - Clear filters button when filters are modified
 * 
 * UX Heuristics:
 * - H3: User Control and Freedom - Clear button lets users reset
 * - H6: Recognition over Recall - Active filter count shows state
 */
export function FilterBar({ 
  children, 
  rightContent,
  className,
  onClear,
  showClearButton = false,
  activeFilterCount,
}: FilterBarProps) {
  return (
    <div 
      className={`${styles.filterBar} ${className || ''}`}
      role="search"
      aria-label="Filtros de dados"
    >
      <div className={styles.filterBarLeft}>
        {children}
        
        {/* Clear filters button - H3: User Control and Freedom */}
        {showClearButton && onClear && (
          <button
            type="button"
            className={styles.clearButton}
            onClick={onClear}
            aria-label={activeFilterCount 
              ? `Limpar ${activeFilterCount} filtros ativos` 
              : 'Limpar filtros'
            }
          >
            <X size={14} aria-hidden="true" />
            <span>Limpar</span>
            {activeFilterCount !== undefined && activeFilterCount > 0 && (
              <span className={styles.activeCount}>{activeFilterCount}</span>
            )}
          </button>
        )}
      </div>
      
      {rightContent && (
        <div className={styles.filterBarRight}>
          {rightContent}
        </div>
      )}
    </div>
  )
}

export default FilterBar
