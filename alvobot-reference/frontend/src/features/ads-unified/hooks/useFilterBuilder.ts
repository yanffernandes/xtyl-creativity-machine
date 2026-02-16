/**
 * useFilterBuilder Hook
 *
 * State management for the FilterBuilder component.
 * Manages filter groups (OR logic) containing individual filters (AND logic).
 *
 * @module ads-unified/hooks/useFilterBuilder
 */

import { useState, useCallback, useMemo } from 'react'
import { getFilterFieldsForPlatformLevel } from '../constants/filters'
import type {
  FilterGroup,
  AutomationFilter,
  AutomationFilterOperator,
  Platform,
  EntityLevel,
} from '../types/automation'

// ============================================================================
// TYPES
// ============================================================================

export interface UseFilterBuilderOptions {
  platform: Platform
  level: EntityLevel
  initialFilters?: FilterGroup[]
}

export interface UseFilterBuilderReturn {
  /** Current filter groups (OR-combined). Each group is an array of AND-combined filters. */
  groups: FilterGroup[]
  /** Replace all groups (useful for controlled mode). */
  setGroups: React.Dispatch<React.SetStateAction<FilterGroup[]>>
  /** Add a new empty filter group. */
  addGroup: () => void
  /** Remove a filter group by index. */
  removeGroup: (groupIndex: number) => void
  /** Add a filter to a specific group. */
  addFilter: (groupIndex: number) => void
  /** Remove a filter from a specific group. Removes empty groups automatically. */
  removeFilter: (groupIndex: number, filterIndex: number) => void
  /** Update a specific filter within a group. */
  updateFilter: (
    groupIndex: number,
    filterIndex: number,
    updates: Partial<AutomationFilter>,
  ) => void
  /** Available filter fields for the current platform + level combination. */
  availableFields: ReturnType<typeof getFilterFieldsForPlatformLevel>
  /** Whether the current filter configuration is valid (or empty). */
  isValid: boolean
  /** Get a list of validation error messages. */
  getValidationErrors: () => string[]
  /** Reset all filters to empty. */
  reset: () => void
}

// ============================================================================
// HOOK
// ============================================================================

export function useFilterBuilder({
  platform,
  level,
  initialFilters,
}: UseFilterBuilderOptions): UseFilterBuilderReturn {
  const [groups, setGroups] = useState<FilterGroup[]>(initialFilters ?? [])

  // ── Mutations ──

  const addGroup = useCallback(() => {
    const emptyFilter: AutomationFilter = {
      field: '',
      operator: 'EQUAL' as AutomationFilterOperator,
      value: '',
    }
    setGroups((prev) => [...prev, [emptyFilter]])
  }, [])

  const removeGroup = useCallback((groupIndex: number) => {
    setGroups((prev) => prev.filter((_, i) => i !== groupIndex))
  }, [])

  const addFilter = useCallback((groupIndex: number) => {
    const emptyFilter: AutomationFilter = {
      field: '',
      operator: 'EQUAL' as AutomationFilterOperator,
      value: '',
    }
    setGroups((prev) =>
      prev.map((group, i) =>
        i === groupIndex ? [...group, emptyFilter] : group,
      ),
    )
  }, [])

  const removeFilter = useCallback(
    (groupIndex: number, filterIndex: number) => {
      setGroups((prev) =>
        prev
          .map((group, i) =>
            i === groupIndex
              ? group.filter((_, fi) => fi !== filterIndex)
              : group,
          )
          .filter((group) => group.length > 0), // Auto-remove empty groups
      )
    },
    [],
  )

  const updateFilter = useCallback(
    (
      groupIndex: number,
      filterIndex: number,
      updates: Partial<AutomationFilter>,
    ) => {
      setGroups((prev) =>
        prev.map((group, i) =>
          i === groupIndex
            ? group.map((filter, fi) =>
                fi === filterIndex ? { ...filter, ...updates } : filter,
              )
            : group,
        ),
      )
    },
    [],
  )

  const reset = useCallback(() => setGroups([]), [])

  // ── Derived state ──

  const availableFields = useMemo(
    () => getFilterFieldsForPlatformLevel(platform, level),
    [platform, level],
  )

  const isValid = useMemo(() => {
    if (groups.length === 0) return true // No filters = all entities
    return groups.every(
      (group) =>
        group.length > 0 &&
        group.every(
          (filter) =>
            filter.field &&
            filter.operator &&
            filter.value !== '' &&
            filter.value !== undefined,
        ),
    )
  }, [groups])

  const getValidationErrors = useCallback((): string[] => {
    const errors: string[] = []
    groups.forEach((group, gi) => {
      group.forEach((filter, fi) => {
        const prefix = `Grupo ${gi + 1}, Filtro ${fi + 1}`
        if (!filter.field) {
          errors.push(`${prefix}: Campo obrigatório`)
        }
        if (!filter.operator) {
          errors.push(`${prefix}: Operador obrigatório`)
        }
        if (filter.value === '' || filter.value === undefined) {
          errors.push(`${prefix}: Valor obrigatório`)
        }
        if (filter.operator === 'REGEX' && typeof filter.value === 'string') {
          try {
            new RegExp(filter.value)
          } catch {
            errors.push(`${prefix}: Regex inválido`)
          }
        }
      })
    })
    return errors
  }, [groups])

  return {
    groups,
    setGroups,
    addGroup,
    removeGroup,
    addFilter,
    removeFilter,
    updateFilter,
    availableFields,
    isValid,
    getValidationErrors,
    reset,
  }
}
