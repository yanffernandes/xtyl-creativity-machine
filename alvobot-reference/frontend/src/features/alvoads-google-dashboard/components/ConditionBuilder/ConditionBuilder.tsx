/**
 * ConditionBuilder Component
 * T059: Main condition builder component that composes ConditionGroup and ConditionRow
 */

import { useEffect, useRef } from 'react'
import styles from './ConditionBuilder.module.css'
import { ConditionGroup } from './ConditionGroup'
import { useConditionBuilder, type ConditionTreeWithId  } from '../../hooks/useConditionBuilder'
import type { ConditionTree, Condition } from '../../types'

interface ConditionBuilderProps {
  initialConditions?: ConditionTree
  onChange?: (conditions: ConditionTree) => void
  readOnly?: boolean
}

export function ConditionBuilder({
  initialConditions,
  onChange,
  readOnly = false,
}: ConditionBuilderProps) {
  const {
    conditions,
    addCondition,
    addGroup,
    removeNode,
    updateCondition,
    updateGroupOperator,
    toConditionTree,
    getValidationErrors,
  } = useConditionBuilder(initialConditions)

  // Track if this is the initial mount to avoid triggering onChange on mount
  const isInitialMount = useRef(true)

  // Notify parent of changes whenever conditions state changes
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    if (onChange) {
      onChange(toConditionTree())
    }
  }, [conditions, onChange, toConditionTree])

  // Wrapped handlers - no need for setTimeout anymore since useEffect handles updates
  const handleUpdateCondition = (nodeId: string, updates: Partial<Condition>) => {
    updateCondition(nodeId, updates)
  }

  const handleUpdateGroupOperator = (nodeId: string, operator: 'AND' | 'OR') => {
    updateGroupOperator(nodeId, operator)
  }

  const handleRemoveNode = (nodeId: string) => {
    removeNode(nodeId)
  }

  const handleAddCondition = (parentId: string) => {
    addCondition(parentId)
  }

  const handleAddGroup = (parentId: string) => {
    addGroup(parentId)
  }

  const errors = getValidationErrors()

  if (readOnly) {
    return (
      <div className={styles.conditionBuilder}>
        <ConditionPreview conditions={conditions} />
      </div>
    )
  }

  return (
    <div className={styles.conditionBuilder}>
      <div className={styles.header}>
        <h4 className={styles.title}>Condições</h4>
        <p className={styles.description}>
          Configure quando a automação deve ser executada
        </p>
      </div>

      {conditions.type === 'group' ? (
        <ConditionGroup
          group={conditions}
          onUpdateCondition={handleUpdateCondition}
          onUpdateGroupOperator={handleUpdateGroupOperator}
          onRemoveNode={handleRemoveNode}
          onAddCondition={handleAddCondition}
          onAddGroup={handleAddGroup}
          depth={0}
          canRemove={false}
        />
      ) : (
        <div className={styles.singleCondition}>
          {/* Single condition - wrap in implicit group UI */}
          <p className={styles.singleConditionLabel}>Quando:</p>
          {/* This case shouldn't happen with current implementation */}
        </div>
      )}

      {errors.length > 0 && (
        <div className={styles.errors}>
          {errors.map((error, index) => (
            <p key={index} className={styles.error}>
              {error}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

// Read-only preview component
function ConditionPreview({ conditions }: { conditions: ConditionTreeWithId }) {
  const renderCondition = (node: ConditionTreeWithId, depth = 0): React.ReactNode => {
    if (node.type === 'condition') {
      return (
        <span className={styles.previewCondition}>
          {getMetricLabel(node.metric)} {getOperatorLabel(node.operator)} {node.value}
          {getMetricSuffix(node.metric)}
        </span>
      )
    }

    // Group
    return (
      <div className={styles.previewGroup} data-depth={depth}>
        {node.children.map((child, index) => {
          const childWithId = child as ConditionTreeWithId
          return (
            <span key={childWithId.id || index}>
              {index > 0 && (
                <span className={styles.previewOperator}>
                  {node.operator === 'AND' ? ' E ' : ' OU '}
                </span>
              )}
              {renderCondition(childWithId, depth + 1)}
            </span>
          )
        })}
      </div>
    )
  }

  return <div className={styles.preview}>{renderCondition(conditions)}</div>
}

// Helper functions for labels
function getMetricLabel(metric: string): string {
  const labels: Record<string, string> = {
    impressions: 'Impressões',
    clicks: 'Cliques',
    ctr: 'CTR',
    cost: 'Custo',
    conversions: 'Conversões',
    cpa: 'CPA',
    roas: 'ROAS',
    budget_spent_percent: 'Orçamento gasto',
    runtime_hours: 'Tempo de execução',
  }
  return labels[metric] || metric
}

function getOperatorLabel(operator: string): string {
  const labels: Record<string, string> = {
    '>': '>',
    '<': '<',
    '>=': '>=',
    '<=': '<=',
    '==': '=',
    '!=': '!=',
  }
  return labels[operator] || operator
}

function getMetricSuffix(metric: string): string {
  const suffixes: Record<string, string> = {
    ctr: '%',
    budget_spent_percent: '%',
    cost: ' R$',
    cpa: ' R$',
    roas: 'x',
    runtime_hours: 'h',
  }
  return suffixes[metric] || ''
}

export default ConditionBuilder
