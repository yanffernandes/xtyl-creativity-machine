/**
 * SimpleConditionRow Component
 *
 * Row: [Metric ▼] [Period ▼] [Operator ▼] [Value input]
 *
 * Compares a metric against a fixed numeric threshold.
 * Example: "Impressões (últimos 7 dias) > 1000"
 */

import { useMemo, useCallback } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/shared/components'
import { getMetricsGroupedByCategory } from '../../../constants/metrics'
import { CONDITION_OPERATOR_OPTIONS, PERIOD_OPTIONS, PERIOD_GROUP_LABELS } from '../../../constants/enums'
import type { SimpleCondition, Platform, ConditionOperator, Period } from '../../../types/automation'
import styles from '../ConditionBuilder.module.css'

// ============================================================================
// TYPES
// ============================================================================

interface SimpleConditionRowProps {
  condition: SimpleCondition
  platform: Platform
  onUpdate: (updates: Partial<SimpleCondition>) => void
  onRemove: () => void
  canRemove: boolean
  depth: number
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SimpleConditionRow({
  condition,
  platform,
  onUpdate,
  onRemove,
  canRemove,
  depth,
}: SimpleConditionRowProps) {
  const groupedMetrics = useMemo(
    () => getMetricsGroupedByCategory(platform),
    [platform],
  )

  const periodsByGroup = useMemo(() => {
    const groups: Record<string, typeof PERIOD_OPTIONS> = {}
    for (const period of PERIOD_OPTIONS) {
      const groupLabel = PERIOD_GROUP_LABELS[period.group]
      if (!groups[groupLabel]) groups[groupLabel] = []
      groups[groupLabel].push(period)
    }
    return groups
  }, [])

  const isBetween = condition.operator === 'BETWEEN'

  const handleMetricChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onUpdate({ metric: e.target.value })
    },
    [onUpdate],
  )

  const handlePeriodChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onUpdate({ period: e.target.value as Period })
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
      <span className={`${styles.conditionTypeBadge} ${styles.conditionTypeBadgeSimple}`}>
        Métrica
      </span>

      {/* Metric select */}
      <div className={`${styles.fieldGroup} ${styles.fieldMetric}`}>
        <span className={styles.fieldLabel}>Métrica</span>
        <select
          className={styles.nativeSelect}
          value={condition.metric}
          onChange={handleMetricChange}
        >
          {Object.entries(groupedMetrics).map(([category, metrics]) => (
            <optgroup key={category} label={category}>
              {metrics.map((m) => (
                <option key={m.slug} value={m.slug}>
                  {m.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Period select */}
      <div className={`${styles.fieldGroup} ${styles.fieldPeriod}`}>
        <span className={styles.fieldLabel}>Período</span>
        <select
          className={styles.nativeSelect}
          value={condition.period}
          onChange={handlePeriodChange}
        >
          {Object.entries(periodsByGroup).map(([group, periods]) => (
            <optgroup key={group} label={group}>
              {periods.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </optgroup>
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
          {CONDITION_OPERATOR_OPTIONS.map((op) => (
            <option key={op.value} value={op.value}>
              {op.symbol} {op.label}
            </option>
          ))}
        </select>
      </div>

      {/* Value input */}
      <div className={`${styles.fieldGroup} ${styles.fieldValue}`}>
        <span className={styles.fieldLabel}>Valor</span>
        {isBetween ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
            <input
              type="number"
              className={`${styles.nativeInput} ${styles.nativeInputSmall}`}
              value={condition.value}
              onChange={handleValueChange}
              placeholder="Min"
            />
            <span className={styles.betweenSeparator} style={{ paddingTop: 0 }}>e</span>
            <input
              type="number"
              className={`${styles.nativeInput} ${styles.nativeInputSmall}`}
              value={0}
              onChange={() => { /* BETWEEN second value - extend type if needed */ }}
              placeholder="Max"
            />
          </div>
        ) : (
          <input
            type="number"
            className={styles.nativeInput}
            value={condition.value}
            onChange={handleValueChange}
            placeholder="0"
          />
        )}
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

export default SimpleConditionRow
