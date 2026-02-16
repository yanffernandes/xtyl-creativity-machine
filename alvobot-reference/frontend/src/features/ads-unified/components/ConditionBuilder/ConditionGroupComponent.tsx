/**
 * ConditionGroupComponent
 *
 * Renders a single ConditionGroup recursively.
 * Displays:
 * - Operator toggle badge (AND / OR) — clickable to switch
 * - List of conditions and sub-groups
 * - "Adicionar condição" with type selector dropdown
 * - "Adicionar grupo" button
 *
 * Dispatches rendering to the correct row component based on condition.type.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { Plus, FolderPlus, Trash2, ArrowLeftRight } from 'lucide-react'
import { Button } from '@/shared/components'
import { CONDITION_TYPE_OPTIONS } from '../../constants/enums'
import type {
  ConditionGroup,
  Condition,
  Platform,
} from '../../types/automation'
import { SimpleConditionRow } from './conditions/SimpleConditionRow'
import { MetricComparisonRow } from './conditions/MetricComparisonRow'
import { RankingConditionRow } from './conditions/RankingConditionRow'
import { TimeConditionRow } from './conditions/TimeConditionRow'
import { LifecycleConditionRow } from './conditions/LifecycleConditionRow'
import styles from './ConditionBuilder.module.css'

// ============================================================================
// TYPE GUARD
// ============================================================================

function isConditionGroup(item: ConditionGroup | Condition): item is ConditionGroup {
  return 'operator' in item && 'conditions' in item && !('type' in item)
}

// ============================================================================
// TYPES
// ============================================================================

interface ConditionGroupComponentProps {
  /** The condition group to render */
  group: ConditionGroup
  /** Current path in the tree (for callback identification) */
  path: number[]
  /** Target platform */
  platform: Platform
  /** Nesting depth (0 = root) */
  depth: number
  /** Add a condition at a path */
  onAddCondition: (path: number[], type?: Condition['type']) => void
  /** Add a nested group at a path */
  onAddGroup: (path: number[], operator?: 'AND' | 'OR') => void
  /** Remove an item at a path */
  onRemoveCondition: (path: number[]) => void
  /** Update a condition at a path */
  onUpdateCondition: (path: number[], updates: Partial<Condition>) => void
  /** Toggle operator at a path */
  onToggleOperator: (path: number[]) => void
  /** Whether this group can be removed (false for root) */
  canRemove: boolean
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ConditionGroupComponent({
  group,
  path,
  platform,
  depth,
  onAddCondition,
  onAddGroup,
  onRemoveCondition,
  onUpdateCondition,
  onToggleOperator,
  canRemove,
}: ConditionGroupComponentProps) {
  const [showTypeDropdown, setShowTypeDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!showTypeDropdown) return

    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowTypeDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showTypeDropdown])

  const handleToggleOperator = useCallback(() => {
    onToggleOperator(path)
  }, [onToggleOperator, path])

  const handleRemoveGroup = useCallback(() => {
    // If path is empty, we'd be removing root — not allowed.
    // The parent should remove us by our parent path + our index.
    if (path.length === 0) return
    onRemoveCondition(path)
  }, [onRemoveCondition, path])

  const handleAddConditionType = useCallback(
    (type: Condition['type']) => {
      onAddCondition(path, type)
      setShowTypeDropdown(false)
    },
    [onAddCondition, path],
  )

  const handleAddGroup = useCallback(() => {
    onAddGroup(path, 'AND')
  }, [onAddGroup, path])

  // Compute depth class
  const depthClass = depth === 1
    ? styles.conditionGroupDepth1
    : depth >= 2
      ? styles.conditionGroupDepth2
      : ''

  const operatorClass = group.operator === 'AND'
    ? styles.conditionGroupAnd
    : styles.conditionGroupOr

  return (
    <div className={`${styles.conditionGroup} ${operatorClass} ${depthClass}`}>
      {/* Group header */}
      <div className={styles.groupHeader}>
        <div className={styles.groupHeaderLeft}>
          {/* Operator toggle badge */}
          <button
            type="button"
            className={`${styles.operatorBadge} ${
              group.operator === 'AND'
                ? styles.operatorBadgeAnd
                : styles.operatorBadgeOr
            }`}
            onClick={handleToggleOperator}
            title={`Clique para alternar entre E/OU (atualmente: ${group.operator === 'AND' ? 'E — todas devem ser verdadeiras' : 'OU — pelo menos uma deve ser verdadeira'})`}
          >
            {group.operator === 'AND' ? 'E' : 'OU'}
            <ArrowLeftRight size={10} className={styles.operatorSwapIcon} />
          </button>

          <span className={styles.groupLabel}>
            {group.operator === 'AND'
              ? 'Todas as condições devem ser verdadeiras'
              : 'Pelo menos uma condição deve ser verdadeira'}
          </span>
        </div>

        {/* Remove group button */}
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={handleRemoveGroup}
            className={styles.removeGroupButton}
            aria-label="Remover grupo"
          >
            <Trash2 size={14} />
          </Button>
        )}
      </div>

      {/* Children: conditions and sub-groups */}
      <div className={styles.groupChildren}>
        {group.conditions.map((child, index) => {
          const childPath = [...path, index]

          return (
            <div key={index}>
              {/* Connector badge between items */}
              {index > 0 && (
                <div className={styles.connector}>
                  <span
                    className={`${styles.connectorBadge} ${
                      group.operator === 'AND'
                        ? styles.connectorAnd
                        : styles.connectorOr
                    }`}
                  >
                    {group.operator === 'AND' ? 'E' : 'OU'}
                  </span>
                </div>
              )}

              {isConditionGroup(child) ? (
                /* Recursive sub-group */
                <ConditionGroupComponent
                  group={child}
                  path={childPath}
                  platform={platform}
                  depth={depth + 1}
                  onAddCondition={onAddCondition}
                  onAddGroup={onAddGroup}
                  onRemoveCondition={onRemoveCondition}
                  onUpdateCondition={onUpdateCondition}
                  onToggleOperator={onToggleOperator}
                  canRemove={true}
                />
              ) : (
                /* Dispatch to correct condition row */
                <ConditionRowDispatcher
                  condition={child}
                  path={childPath}
                  platform={platform}
                  depth={depth}
                  totalConditions={group.conditions.length}
                  onUpdateCondition={onUpdateCondition}
                  onRemoveCondition={onRemoveCondition}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Add buttons */}
      <div className={styles.addButtons}>
        {/* Add condition with type selector */}
        <div className={styles.addTypeWrapper} ref={dropdownRef}>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowTypeDropdown(!showTypeDropdown)}
            leftIcon={<Plus size={14} />}
          >
            Adicionar condição
          </Button>

          {showTypeDropdown && (
            <div className={styles.addTypeDropdown}>
              {CONDITION_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={styles.addTypeOption}
                  onClick={() => handleAddConditionType(opt.value)}
                >
                  <span className={styles.addTypeOptionLabel}>{opt.label}</span>
                  <span className={styles.addTypeOptionDesc}>{opt.description}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Add nested group */}
        {depth < 2 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleAddGroup}
            leftIcon={<FolderPlus size={14} />}
          >
            Adicionar grupo
          </Button>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// CONDITION ROW DISPATCHER
// ============================================================================

interface ConditionRowDispatcherProps {
  condition: Condition
  path: number[]
  platform: Platform
  depth: number
  totalConditions: number
  onUpdateCondition: (path: number[], updates: Partial<Condition>) => void
  onRemoveCondition: (path: number[]) => void
}

function ConditionRowDispatcher({
  condition,
  path,
  platform,
  depth,
  totalConditions,
  onUpdateCondition,
  onRemoveCondition,
}: ConditionRowDispatcherProps) {
  const handleUpdate = useCallback(
    (updates: Partial<Condition>) => {
      onUpdateCondition(path, updates)
    },
    [onUpdateCondition, path],
  )

  const handleRemove = useCallback(() => {
    onRemoveCondition(path)
  }, [onRemoveCondition, path])

  const canRemove = totalConditions > 1

  switch (condition.type) {
    case 'simple':
      return (
        <SimpleConditionRow
          condition={condition}
          platform={platform}
          onUpdate={handleUpdate}
          onRemove={handleRemove}
          canRemove={canRemove}
          depth={depth}
        />
      )
    case 'metric_comparison':
      return (
        <MetricComparisonRow
          condition={condition}
          platform={platform}
          onUpdate={handleUpdate}
          onRemove={handleRemove}
          canRemove={canRemove}
          depth={depth}
        />
      )
    case 'ranking':
      return (
        <RankingConditionRow
          condition={condition}
          platform={platform}
          onUpdate={handleUpdate}
          onRemove={handleRemove}
          canRemove={canRemove}
          depth={depth}
        />
      )
    case 'time':
      return (
        <TimeConditionRow
          condition={condition}
          onUpdate={handleUpdate}
          onRemove={handleRemove}
          canRemove={canRemove}
          depth={depth}
        />
      )
    case 'lifecycle':
      return (
        <LifecycleConditionRow
          condition={condition}
          onUpdate={handleUpdate}
          onRemove={handleRemove}
          canRemove={canRemove}
          depth={depth}
        />
      )
    default:
      return null
  }
}

export default ConditionGroupComponent
