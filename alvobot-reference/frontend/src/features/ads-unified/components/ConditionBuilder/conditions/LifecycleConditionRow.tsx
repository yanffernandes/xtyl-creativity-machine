/**
 * LifecycleConditionRow Component
 *
 * Row: [Metric ▼ (horas/dias desde criação)] [Operator ▼] [Value input]
 *
 * Entity lifecycle condition for learning phase protection.
 * Example: "Horas desde criação > 72"
 */

import { useCallback } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/shared/components'
import { CONDITION_OPERATOR_OPTIONS } from '../../../constants/enums'
import type { LifecycleCondition, ConditionOperator } from '../../../types/automation'
import styles from '../ConditionBuilder.module.css'

// ============================================================================
// TYPES
// ============================================================================

interface LifecycleConditionRowProps {
  condition: LifecycleCondition
  onUpdate: (updates: Partial<LifecycleCondition>) => void
  onRemove: () => void
  canRemove: boolean
  depth: number
}

// ============================================================================
// LIFECYCLE METRIC OPTIONS
// ============================================================================

const LIFECYCLE_METRICS = [
  { value: 'hours_since_creation', label: 'Horas desde criação', suffix: 'h' },
  { value: 'days_since_creation', label: 'Dias desde criação', suffix: 'd' },
] as const

// ============================================================================
// COMPONENT
// ============================================================================

export function LifecycleConditionRow({
  condition,
  onUpdate,
  onRemove,
  canRemove,
  depth,
}: LifecycleConditionRowProps) {
  const selectedMetric = LIFECYCLE_METRICS.find((m) => m.value === condition.metric)

  const handleMetricChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onUpdate({
        metric: e.target.value as LifecycleCondition['metric'],
      })
    },
    [onUpdate],
  )

  const handleOperatorChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onUpdate({ operator: e.target.value as ConditionOperator })
    },
    [onUpdate],
  )

  const handleValueChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onUpdate({ value: parseFloat(e.target.value) || 0 })
    },
    [onUpdate],
  )

  return (
    <div className={`${styles.conditionRow} ${depth > 0 ? styles.conditionRowNested : ''}`}>
      {/* Type badge */}
      <span className={`${styles.conditionTypeBadge} ${styles.conditionTypeBadgeLifecycle}`}>
        Ciclo de Vida
      </span>

      {/* Lifecycle metric select */}
      <div className={`${styles.fieldGroup} ${styles.fieldMetric}`}>
        <span className={styles.fieldLabel}>Métrica</span>
        <select
          className={styles.nativeSelect}
          value={condition.metric}
          onChange={handleMetricChange}
        >
          {LIFECYCLE_METRICS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {/* Operator select */}
      <div className={`${styles.fieldGroup} ${styles.fieldOperator}`}>
        <span className={styles.fieldLabel}>Operador</span>
        <select
          className={styles.nativeSelect}
          value={condition.operator}
          onChange={handleOperatorChange}
        >
          {CONDITION_OPERATOR_OPTIONS.filter((op) => op.value !== 'BETWEEN').map((op) => (
            <option key={op.value} value={op.value}>
              {op.symbol} {op.label}
            </option>
          ))}
        </select>
      </div>

      {/* Value input */}
      <div className={`${styles.fieldGroup} ${styles.fieldValue}`}>
        <span className={styles.fieldLabel}>
          Valor ({selectedMetric?.suffix ?? 'h'})
        </span>
        <input
          type="number"
          className={styles.nativeInput}
          value={condition.value}
          onChange={handleValueChange}
          min="0"
          placeholder={condition.metric === 'hours_since_creation' ? '72' : '3'}
        />
      </div>

      {/* Remove button */}
      {canRemove && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onRemove}
          className={styles.removeConditionButton}
          aria-label="Remover condição"
        >
          <X size={14} />
        </Button>
      )}
    </div>
  )
}

export default LifecycleConditionRow
