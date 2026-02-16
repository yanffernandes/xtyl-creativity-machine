/**
 * MetricComparisonRow Component
 *
 * Row: [Metric ▼] [Period ▼] [Operator ▼] [Compare Metric ▼] [Compare Period ▼] [× Multiplier]
 *
 * Compares one metric in one period against another metric in a different period.
 * Example: "CPA (últimos 3d) > 1.5× CPA (últimos 7d)"
 */

import { useMemo, useCallback } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/shared/components'
import { getMetricsGroupedByCategory } from '../../../constants/metrics'
import { CONDITION_OPERATOR_OPTIONS, PERIOD_OPTIONS, PERIOD_GROUP_LABELS } from '../../../constants/enums'
import type { MetricComparisonCondition, Platform, ConditionOperator, Period } from '../../../types/automation'
import styles from '../ConditionBuilder.module.css'

// ============================================================================
// TYPES
// ============================================================================

interface MetricComparisonRowProps {
  condition: MetricComparisonCondition
  platform: Platform
  onUpdate: (updates: Partial<MetricComparisonCondition>) => void
  onRemove: () => void
  canRemove: boolean
  depth: number
}

// ============================================================================
// COMPONENT
// ============================================================================

export function MetricComparisonRow({
  condition,
  platform,
  onUpdate,
  onRemove,
  canRemove,
  depth,
}: MetricComparisonRowProps) {
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

  const handleCompareMetricChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onUpdate({ compareMetric: e.target.value })
    },
    [onUpdate],
  )

  const handleComparePeriodChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onUpdate({ comparePeriod: e.target.value as Period })
    },
    [onUpdate],
  )

  const handleMultiplierChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onUpdate({ compareMultiplier: parseFloat(e.target.value) || 0 })
    },
    [onUpdate],
  )

  return (
    <div className={`${styles.conditionRow} ${depth > 0 ? styles.conditionRowNested : ''}`}>
      {/* Type badge */}
      <span className={`${styles.conditionTypeBadge} ${styles.conditionTypeBadgeComparison}`}>
        Comparação
      </span>

      {/* Primary metric */}
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

      {/* Primary period */}
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

      {/* Operator */}
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

      {/* Comparison metric */}
      <div className={`${styles.fieldGroup} ${styles.fieldMetric}`}>
        <span className={styles.fieldLabel}>Métrica de Comparação</span>
        <select
          className={styles.nativeSelect}
          value={condition.compareMetric}
          onChange={handleCompareMetricChange}
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

      {/* Comparison period */}
      <div className={`${styles.fieldGroup} ${styles.fieldPeriod}`}>
        <span className={styles.fieldLabel}>Período de Comparação</span>
        <select
          className={styles.nativeSelect}
          value={condition.comparePeriod}
          onChange={handleComparePeriodChange}
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

      {/* Multiplier */}
      <span className={styles.multiplierPrefix}>×</span>
      <div className={`${styles.fieldGroup} ${styles.fieldMultiplier}`}>
        <span className={styles.fieldLabel}>Multiplicador</span>
        <input
          type="number"
          className={styles.nativeInput}
          value={condition.compareMultiplier}
          onChange={handleMultiplierChange}
          step="0.1"
          min="0"
          placeholder="1.0"
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

export default MetricComparisonRow
