/**
 * FilterBuilder Component
 *
 * Main container for building automation entity filters.
 * Groups are combined with OR logic — filters within each group use AND logic.
 *
 * Visual pattern:
 * ┌─ Group 1 ─────────────────────────────┐
 * │  [field] [operator] [value]  [×]       │
 * │                 E                      │
 * │  [field] [operator] [value]  [×]       │
 * │  + Adicionar filtro (E)                │
 * └────────────────────────────────────────┘
 *                  OU
 * ┌─ Group 2 ─────────────────────────────┐
 * │  [field] [operator] [value]  [×]       │
 * │  + Adicionar filtro (E)                │
 * └────────────────────────────────────────┘
 *
 * [+ Adicionar grupo (OU)]
 */

import { useCallback } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/shared/components'
import styles from './FilterBuilder.module.css'
import { FilterGroup } from './FilterGroup'
import type {
  FilterGroup as FilterGroupType,
  AutomationFilter,
  AutomationFilterOperator,
  Platform,
  EntityLevel,
} from '../../types/automation'

// ============================================================================
// TYPES
// ============================================================================

export interface FilterBuilderProps {
  /** Target platform. */
  platform: Platform
  /** Target entity level. */
  level: EntityLevel
  /** Current filter groups (controlled). */
  groups: FilterGroupType[]
  /** Callback when filter groups change (controlled). */
  onGroupsChange: (groups: FilterGroupType[]) => void
}

// ============================================================================
// COMPONENT
// ============================================================================

export function FilterBuilder({
  platform,
  level,
  groups,
  onGroupsChange,
}: FilterBuilderProps) {
  // ── Group-level mutations ──

  const handleAddGroup = useCallback(() => {
    const emptyFilter: AutomationFilter = {
      field: '',
      operator: 'EQUAL' as AutomationFilterOperator,
      value: '',
    }
    onGroupsChange([...groups, [emptyFilter]])
  }, [groups, onGroupsChange])

  const handleRemoveGroup = useCallback(
    (groupIndex: number) => {
      onGroupsChange(groups.filter((_, i) => i !== groupIndex))
    },
    [groups, onGroupsChange],
  )

  // ── Filter-level mutations ──

  const handleUpdateFilter = useCallback(
    (groupIndex: number, filterIndex: number, updates: Partial<AutomationFilter>) => {
      const updated = groups.map((group, gi) =>
        gi === groupIndex
          ? group.map((filter, fi) =>
              fi === filterIndex ? { ...filter, ...updates } : filter,
            )
          : group,
      )
      onGroupsChange(updated)
    },
    [groups, onGroupsChange],
  )

  const handleRemoveFilter = useCallback(
    (groupIndex: number, filterIndex: number) => {
      const updated = groups
        .map((group, gi) =>
          gi === groupIndex
            ? group.filter((_, fi) => fi !== filterIndex)
            : group,
        )
        .filter((group) => group.length > 0) // Remove empty groups
      onGroupsChange(updated)
    },
    [groups, onGroupsChange],
  )

  const handleAddFilter = useCallback(
    (groupIndex: number) => {
      const emptyFilter: AutomationFilter = {
        field: '',
        operator: 'EQUAL' as AutomationFilterOperator,
        value: '',
      }
      const updated = groups.map((group, gi) =>
        gi === groupIndex ? [...group, emptyFilter] : group,
      )
      onGroupsChange(updated)
    },
    [groups, onGroupsChange],
  )

  // ── Render ──

  return (
    <div className={styles.filterBuilder}>
      {groups.length === 0 && (
        <div className={styles.emptyState}>
          <p className={styles.emptyStateText}>
            Nenhum filtro configurado. A regra será aplicada a todas as entidades.
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleAddGroup}
            leftIcon={<Plus size={14} />}
          >
            Adicionar filtro
          </Button>
        </div>
      )}

      {groups.map((group, groupIndex) => (
        <div key={groupIndex}>
          {/* "OU" connector between groups */}
          {groupIndex > 0 && (
            <div className={styles.connector}>
              <span className={`${styles.connectorBadge} ${styles.connectorOr}`}>
                OU
              </span>
            </div>
          )}

          <FilterGroup
            filters={group}
            groupIndex={groupIndex}
            platform={platform}
            level={level}
            onUpdateFilter={(filterIndex, updates) =>
              handleUpdateFilter(groupIndex, filterIndex, updates)
            }
            onRemoveFilter={(filterIndex) =>
              handleRemoveFilter(groupIndex, filterIndex)
            }
            onAddFilter={() => handleAddFilter(groupIndex)}
            onRemoveGroup={() => handleRemoveGroup(groupIndex)}
            canRemove={true}
          />
        </div>
      ))}

      {/* Add group button */}
      {groups.length > 0 && (
        <div className={styles.addGroupContainer}>
          <div className={styles.addGroupDivider} />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleAddGroup}
            leftIcon={<Plus size={14} />}
          >
            Adicionar grupo (OU)
          </Button>
          <div className={styles.addGroupDivider} />
        </div>
      )}
    </div>
  )
}

export default FilterBuilder
