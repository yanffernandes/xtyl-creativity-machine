/**
 * TimeConditionRow Component
 *
 * Row: [Operator ▼] [Time input] [- Time end (if BETWEEN)]
 *
 * Time-of-day condition.
 * Example: "Entre 08:00 e 22:00"
 */

import { useCallback } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/shared/components'
import { CONDITION_OPERATOR_OPTIONS } from '../../../constants/enums'
import type { TimeCondition, ConditionOperator } from '../../../types/automation'
import styles from '../ConditionBuilder.module.css'

// ============================================================================
// TYPES
// ============================================================================

interface TimeConditionRowProps {
  condition: TimeCondition
  onUpdate: (updates: Partial<TimeCondition>) => void
  onRemove: () => void
  canRemove: boolean
  depth: number
}

// ============================================================================
// COMPONENT
// ============================================================================

export function TimeConditionRow({
  condition,
  onUpdate,
  onRemove,
  canRemove,
  depth,
}: TimeConditionRowProps) {
  const isBetween = condition.operator === 'BETWEEN'

  const handleOperatorChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const op = e.target.value as ConditionOperator
      const updates: Partial<TimeCondition> = { operator: op }
      if (op === 'BETWEEN' && !condition.valueEnd) {
        updates.valueEnd = '22:00'
      }
      onUpdate(updates)
    },
    [condition.valueEnd, onUpdate],
  )

  const handleValueChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onUpdate({ value: e.target.value })
    },
    [onUpdate],
  )

  const handleValueEndChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onUpdate({ valueEnd: e.target.value })
    },
    [onUpdate],
  )

  return (
    <div className={`${styles.conditionRow} ${depth > 0 ? styles.conditionRowNested : ''}`}>
      {/* Type badge */}
      <span className={`${styles.conditionTypeBadge} ${styles.conditionTypeBadgeTime}`}>
        Horário
      </span>

      {/* Operator select */}
      <div className={`${styles.fieldGroup} ${styles.fieldOperator}`}>
        <span className={styles.fieldLabel}>Operador</span>
        <select
          className={styles.nativeSelect}
          value={condition.operator}
          onChange={handleOperatorChange}
        >
          {CONDITION_OPERATOR_OPTIONS.map((op) => (
            <option key={op.value} value={op.value}>
              {op.symbol} {op.label}
            </option>
          ))}
        </select>
      </div>

      {/* Time value */}
      <div className={`${styles.fieldGroup} ${styles.fieldValue}`}>
        <span className={styles.fieldLabel}>
          {isBetween ? 'Início' : 'Hora'}
        </span>
        <input
          type="time"
          className={`${styles.nativeInput} ${styles.nativeInputTime}`}
          value={condition.value}
          onChange={handleValueChange}
        />
      </div>

      {/* End time (only for BETWEEN) */}
      {isBetween && (
        <>
          <span className={styles.betweenSeparator}>e</span>
          <div className={`${styles.fieldGroup} ${styles.fieldValue}`}>
            <span className={styles.fieldLabel}>Fim</span>
            <input
              type="time"
              className={`${styles.nativeInput} ${styles.nativeInputTime}`}
              value={condition.valueEnd ?? ''}
              onChange={handleValueEndChange}
            />
          </div>
        </>
      )}

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

export default TimeConditionRow
