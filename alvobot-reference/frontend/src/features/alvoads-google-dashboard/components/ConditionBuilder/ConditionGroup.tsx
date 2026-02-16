/**
 * ConditionGroup Component
 * T058: Group of conditions with AND/OR operator toggle
 */

import { Button } from '@/shared/components'
import styles from './ConditionBuilder.module.css'
import { ConditionRow } from './ConditionRow'
import type { ConditionTreeWithId } from '../../hooks/useConditionBuilder'
import type { LogicalOperator, Condition } from '../../types'

interface ConditionGroupProps {
  group: ConditionTreeWithId & { type: 'group' }
  onUpdateCondition: (nodeId: string, updates: Partial<Condition>) => void
  onUpdateGroupOperator: (nodeId: string, operator: LogicalOperator) => void
  onRemoveNode: (nodeId: string) => void
  onAddCondition: (parentId: string) => void
  onAddGroup: (parentId: string) => void
  depth?: number
  canRemove?: boolean
}

export function ConditionGroup({
  group,
  onUpdateCondition,
  onUpdateGroupOperator,
  onRemoveNode,
  onAddCondition,
  onAddGroup,
  depth = 0,
  canRemove = false,
}: ConditionGroupProps) {
  const isRoot = depth === 0

  return (
    <div
      className={`${styles.conditionGroup} ${isRoot ? styles.rootGroup : ''}`}
      data-depth={depth}
    >
      {/* Group header with operator toggle */}
      <div className={styles.groupHeader}>
        <div className={styles.operatorToggle}>
          <button
            type="button"
            className={`${styles.operatorButton} ${
              group.operator === 'AND' ? styles.active : ''
            }`}
            onClick={() => onUpdateGroupOperator(group.id, 'AND')}
          >
            E (AND)
          </button>
          <button
            type="button"
            className={`${styles.operatorButton} ${
              group.operator === 'OR' ? styles.active : ''
            }`}
            onClick={() => onUpdateGroupOperator(group.id, 'OR')}
          >
            OU (OR)
          </button>
        </div>

        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onRemoveNode(group.id)}
            className={styles.removeGroupButton}
          >
            Remover grupo
          </Button>
        )}
      </div>

      {/* Group children */}
      <div className={styles.groupChildren}>
        {group.children.map((child, index) => {
          const childWithId = child as ConditionTreeWithId
          const childId = childWithId.id || `child-${index}`
          return (
            <div key={childId} className={styles.childWrapper}>
              {/* Connector line */}
              {index > 0 && (
                <div className={styles.connector}>
                  <span className={styles.connectorText}>
                    {group.operator === 'AND' ? 'E' : 'OU'}
                  </span>
                </div>
              )}

              {child.type === 'condition' ? (
                <ConditionRow
                  condition={childWithId as Condition & { id: string }}
                  onUpdate={(updates) => onUpdateCondition(childId, updates)}
                  onRemove={() => onRemoveNode(childId)}
                  canRemove={group.children.length > 1}
                />
              ) : (
                <ConditionGroup
                  group={childWithId as ConditionTreeWithId & { type: 'group' }}
                  onUpdateCondition={onUpdateCondition}
                  onUpdateGroupOperator={onUpdateGroupOperator}
                  onRemoveNode={onRemoveNode}
                  onAddCondition={onAddCondition}
                  onAddGroup={onAddGroup}
                  depth={depth + 1}
                  canRemove={true}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Add buttons */}
      <div className={styles.addButtons}>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onAddCondition(group.id)}
        >
          + Condição
        </Button>
        {depth < 2 && ( // Limit nesting depth
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onAddGroup(group.id)}
          >
            + Grupo
          </Button>
        )}
      </div>
    </div>
  )
}

export default ConditionGroup
