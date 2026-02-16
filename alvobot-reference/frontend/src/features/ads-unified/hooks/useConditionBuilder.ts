/**
 * useConditionBuilder Hook
 *
 * State management for the recursive ConditionBuilder.
 * Handles immutable tree operations on a ConditionGroup structure.
 */

import { useState, useCallback, useMemo } from 'react'
import type {
  ConditionGroup,
  Condition,
  Platform,
  ConditionOperator,
  Period,
} from '../types/automation'

// ============================================================================
// TYPES
// ============================================================================

interface UseConditionBuilderOptions {
  platform: Platform
  initialConditions?: ConditionGroup
}

interface UseConditionBuilderReturn {
  /** Current root condition group */
  root: ConditionGroup
  /** Replace the entire root */
  setRoot: (root: ConditionGroup) => void
  /** Add a condition at a given path */
  addCondition: (path: number[], type?: Condition['type']) => void
  /** Add a nested group at a given path */
  addGroup: (path: number[], operator?: 'AND' | 'OR') => void
  /** Remove a condition or group at a given path */
  removeCondition: (path: number[]) => void
  /** Update a condition at a given path */
  updateCondition: (path: number[], updates: Partial<Condition>) => void
  /** Toggle group operator (AND ↔ OR) at a given path */
  toggleOperator: (path: number[]) => void
  /** Whether the entire tree is valid */
  isValid: boolean
  /** Whether the root has no conditions */
  isEmpty: boolean
}

// ============================================================================
// ID GENERATOR
// ============================================================================

let idCounter = 0

/** Generate a unique ID for conditions/groups (internal use only) */
export function generateConditionId(prefix: string): string {
  return `${prefix}_${Date.now()}_${idCounter++}`
}

// ============================================================================
// DEFAULT CONDITION FACTORY
// ============================================================================

/** Create a default condition based on its type */
export function createDefaultCondition(
  type: Condition['type'],
  _platform: Platform,
): Condition {
  switch (type) {
    case 'simple':
      return {
        type: 'simple',
        metric: 'impressions',
        period: 'last_7d' as Period,
        operator: 'GREATER_THAN' as ConditionOperator,
        value: 0,
      }
    case 'metric_comparison':
      return {
        type: 'metric_comparison',
        metric: 'spend',
        period: 'last_3d' as Period,
        operator: 'GREATER_THAN' as ConditionOperator,
        compareMetric: 'spend',
        comparePeriod: 'last_7d' as Period,
        compareMultiplier: 1.0,
      }
    case 'ranking':
      return {
        type: 'ranking',
        metric: 'spend',
        period: 'last_7d' as Period,
        position: 'bottom',
        rankingType: 'percentage',
        rankingValue: 20,
        includeZeros: false,
      }
    case 'time':
      return {
        type: 'time',
        operator: 'BETWEEN' as ConditionOperator,
        value: '08:00',
        valueEnd: '22:00',
      }
    case 'lifecycle':
      return {
        type: 'lifecycle',
        metric: 'hours_since_creation',
        operator: 'GREATER_THAN' as ConditionOperator,
        value: 72,
      }
  }
}

// ============================================================================
// TREE HELPERS (immutable)
// ============================================================================

function isConditionGroup(item: ConditionGroup | Condition): item is ConditionGroup {
  return 'operator' in item && 'conditions' in item && !('type' in item)
}

/**
 * Add a condition or group at a specific path in the tree.
 * Path is an array of indices: [] = root, [0] = first child of root, etc.
 */
function addAtPath(
  root: ConditionGroup,
  path: number[],
  item: ConditionGroup | Condition,
): ConditionGroup {
  if (path.length === 0) {
    return { ...root, conditions: [...root.conditions, item] }
  }

  const [head, ...rest] = path
  return {
    ...root,
    conditions: root.conditions.map((child, i) => {
      if (i !== head) return child
      if (isConditionGroup(child)) {
        return addAtPath(child, rest, item)
      }
      return child
    }),
  }
}

/**
 * Remove a condition or group at a specific path.
 * The last index in the path is the item to remove.
 */
function removeAtPath(root: ConditionGroup, path: number[]): ConditionGroup {
  if (path.length === 0) return root
  if (path.length === 1) {
    return {
      ...root,
      conditions: root.conditions.filter((_, i) => i !== path[0]),
    }
  }

  const [head, ...rest] = path
  return {
    ...root,
    conditions: root.conditions.map((child, i) => {
      if (i !== head) return child
      if (isConditionGroup(child)) {
        return removeAtPath(child, rest)
      }
      return child
    }),
  }
}

/**
 * Update a condition at a specific path with partial updates.
 */
function updateAtPath(
  root: ConditionGroup,
  path: number[],
  updates: Partial<Condition>,
): ConditionGroup {
  if (path.length === 0) return root
  if (path.length === 1) {
    return {
      ...root,
      conditions: root.conditions.map((child, i) => {
        if (i !== path[0]) return child
        if (!isConditionGroup(child)) {
          return { ...child, ...updates } as Condition
        }
        return child
      }),
    }
  }

  const [head, ...rest] = path
  return {
    ...root,
    conditions: root.conditions.map((child, i) => {
      if (i !== head) return child
      if (isConditionGroup(child)) {
        return updateAtPath(child, rest, updates)
      }
      return child
    }),
  }
}

/**
 * Toggle the operator (AND ↔ OR) at a specific path.
 */
function toggleOperatorAtPath(
  root: ConditionGroup,
  path: number[],
): ConditionGroup {
  if (path.length === 0) {
    return { ...root, operator: root.operator === 'AND' ? 'OR' : 'AND' }
  }

  const [head, ...rest] = path
  return {
    ...root,
    conditions: root.conditions.map((child, i) => {
      if (i !== head) return child
      if (isConditionGroup(child)) {
        return toggleOperatorAtPath(child, rest)
      }
      return child
    }),
  }
}

// ============================================================================
// VALIDATION
// ============================================================================

function validateCondition(condition: Condition): boolean {
  switch (condition.type) {
    case 'simple':
      return !!condition.metric && !!condition.period && !!condition.operator
    case 'metric_comparison':
      return (
        !!condition.metric &&
        !!condition.period &&
        !!condition.operator &&
        !!condition.compareMetric &&
        !!condition.comparePeriod &&
        condition.compareMultiplier > 0
      )
    case 'ranking':
      return (
        !!condition.metric &&
        !!condition.period &&
        !!condition.position &&
        !!condition.rankingType &&
        condition.rankingValue > 0
      )
    case 'time':
      return (
        !!condition.operator &&
        !!condition.value &&
        (condition.operator !== 'BETWEEN' || !!condition.valueEnd)
      )
    case 'lifecycle':
      return !!condition.metric && !!condition.operator && condition.value > 0
    default:
      return false
  }
}

function validateConditionGroup(group: ConditionGroup): boolean {
  if (group.conditions.length === 0) return false
  return group.conditions.every((child) => {
    if (isConditionGroup(child)) return validateConditionGroup(child)
    return validateCondition(child)
  })
}

// ============================================================================
// HOOK
// ============================================================================

export function useConditionBuilder({
  platform,
  initialConditions,
}: UseConditionBuilderOptions): UseConditionBuilderReturn {
  const [root, setRoot] = useState<ConditionGroup>(
    initialConditions ?? { operator: 'AND', conditions: [] },
  )

  const addCondition = useCallback(
    (path: number[], type: Condition['type'] = 'simple') => {
      const newCondition = createDefaultCondition(type, platform)
      setRoot((prev) => addAtPath(prev, path, newCondition))
    },
    [platform],
  )

  const addGroup = useCallback(
    (path: number[], operator: 'AND' | 'OR' = 'AND') => {
      const newGroup: ConditionGroup = { operator, conditions: [] }
      setRoot((prev) => addAtPath(prev, path, newGroup))
    },
    [],
  )

  const removeCondition = useCallback((path: number[]) => {
    setRoot((prev) => removeAtPath(prev, path))
  }, [])

  const updateCondition = useCallback(
    (path: number[], updates: Partial<Condition>) => {
      setRoot((prev) => updateAtPath(prev, path, updates))
    },
    [],
  )

  const toggleOperator = useCallback((path: number[]) => {
    setRoot((prev) => toggleOperatorAtPath(prev, path))
  }, [])

  const isValid = useMemo(() => validateConditionGroup(root), [root])
  const isEmpty = root.conditions.length === 0

  return {
    root,
    setRoot,
    addCondition,
    addGroup,
    removeCondition,
    updateCondition,
    toggleOperator,
    isValid,
    isEmpty,
  }
}
