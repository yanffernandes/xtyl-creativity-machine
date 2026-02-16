/**
 * FilterGroup Component
 *
 * A card containing filters combined with AND logic.
 * Displays "E" connector badges between filters.
 * Includes "Adicionar filtro (E)" button at the bottom.
 */

import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/shared/components'
import styles from './FilterBuilder.module.css'
import { FilterRow } from './FilterRow'
import type { AutomationFilter, Platform, EntityLevel, FilterGroup as FilterGroupType } from '../../types/automation'

// ============================================================================
// TYPES
// ============================================================================

interface FilterGroupProps {
  /** Filters in this group (AND-combined). */
  filters: FilterGroupType
  /** Zero-based index of this group in the parent groups array. */
  groupIndex: number
  /** Target platform (determines available fields). */
  platform: Platform
  /** Target entity level (determines available fields). */
  level: EntityLevel
  /** Callback to update a specific filter within this group. */
  onUpdateFilter: (filterIndex: number, updates: Partial<AutomationFilter>) => void
  /** Callback to remove a specific filter from this group. */
  onRemoveFilter: (filterIndex: number) => void
  /** Callback to add a new filter to this group. */
  onAddFilter: () => void
  /** Callback to remove this entire group. */
  onRemoveGroup: () => void
  /** Whether this group can be removed (always true except if it's the only one). */
  canRemove: boolean
}

// ============================================================================
// COMPONENT
// ============================================================================

export function FilterGroup({
  filters,
  groupIndex,
  platform,
  level,
  onUpdateFilter,
  onRemoveFilter,
  onAddFilter,
  onRemoveGroup,
  canRemove,
}: FilterGroupProps) {
  return (
    <div className={styles.filterGroup}>
      {/* Group header */}
      <div className={styles.groupHeader}>
        <span className={styles.groupLabel}>
          Grupo {groupIndex + 1}
        </span>
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onRemoveGroup}
            className={styles.removeGroupButton}
            aria-label={`Remover grupo ${groupIndex + 1}`}
          >
            <Trash2 size={14} />
          </Button>
        )}
      </div>

      {/* Filter rows */}
      <div className={styles.groupFilters}>
        {filters.map((filter, filterIndex) => (
          <div key={filterIndex}>
            {/* "E" connector between filters */}
            {filterIndex > 0 && (
              <div className={styles.connector}>
                <span className={`${styles.connectorBadge} ${styles.connectorAnd}`}>
                  E
                </span>
              </div>
            )}

            <FilterRow
              filter={filter}
              platform={platform}
              level={level}
              onUpdate={(updates) => onUpdateFilter(filterIndex, updates)}
              onRemove={() => onRemoveFilter(filterIndex)}
              canRemove={filters.length > 1}
            />
          </div>
        ))}
      </div>

      {/* Add filter button */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onAddFilter}
        leftIcon={<Plus size={14} />}
        className={styles.addFilterButton}
      >
        Adicionar filtro (E)
      </Button>
    </div>
  )
}

export default FilterGroup
