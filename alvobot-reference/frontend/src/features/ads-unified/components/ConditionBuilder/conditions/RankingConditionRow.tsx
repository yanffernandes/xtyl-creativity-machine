/**
 * RankingConditionRow Component
 *
 * Row: [Top/Bottom ▼] [Value] [% / qtd ▼] por [Metric ▼] [Period ▼] [☑ Incluir zeros]
 *
 * Selects entities by ranking position within their peers.
 * Example: "Bottom 20% por ROAS (últimos 7d)"
 */

import { useMemo, useCallback } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/shared/components'
import { getMetricsGroupedByCategory } from '../../../constants/metrics'
import { PERIOD_OPTIONS, PERIOD_GROUP_LABELS } from '../../../constants/enums'
import type { RankingCondition, Platform, Period } from '../../../types/automation'
import styles from '../ConditionBuilder.module.css'

// ============================================================================
// TYPES
// ============================================================================

interface RankingConditionRowProps {
  condition: RankingCondition
  platform: Platform
  onUpdate: (updates: Partial<RankingCondition>) => void
  onRemove: () => void
  canRemove: boolean
  depth: number
}

// ============================================================================
// COMPONENT
// ============================================================================

export function RankingConditionRow({
  condition,
  platform,
  onUpdate,
  onRemove,
  canRemove,
  depth,
}: RankingConditionRowProps) {
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

  const handlePositionChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onUpdate({ position: e.target.value as 'top' | 'bottom' })
    },
    [onUpdate],
  )

  const handleValueChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onUpdate({ rankingValue: parseFloat(e.target.value) || 0 })
    },
    [onUpdate],
  )

  const handleTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onUpdate({ rankingType: e.target.value as 'percentage' | 'quantity' })
    },
    [onUpdate],
  )

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

  const handleIncludeZerosChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onUpdate({ includeZeros: e.target.checked })
    },
    [onUpdate],
  )

  return (
    <div className={`${styles.conditionRow} ${depth > 0 ? styles.conditionRowNested : ''}`}>
      {/* Type badge */}
      <span className={`${styles.conditionTypeBadge} ${styles.conditionTypeBadgeRanking}`}>
        Ranking
      </span>

      {/* Position (Top/Bottom) */}
      <div className={`${styles.fieldGroup} ${styles.fieldPosition}`}>
        <span className={styles.fieldLabel}>Posição</span>
        <select
          className={styles.nativeSelect}
          value={condition.position}
          onChange={handlePositionChange}
        >
          <option value="top">Top</option>
          <option value="bottom">Bottom</option>
        </select>
      </div>

      {/* Ranking value */}
      <div className={`${styles.fieldGroup} ${styles.fieldValue}`}>
        <span className={styles.fieldLabel}>Quantidade</span>
        <input
          type="number"
          className={styles.nativeInput}
          value={condition.rankingValue}
          onChange={handleValueChange}
          min="1"
          placeholder="20"
        />
      </div>

      {/* Ranking type (% or quantity) */}
      <div className={`${styles.fieldGroup} ${styles.fieldRankType}`}>
        <span className={styles.fieldLabel}>Tipo</span>
        <select
          className={styles.nativeSelect}
          value={condition.rankingType}
          onChange={handleTypeChange}
        >
          <option value="percentage">% (Porcentagem)</option>
          <option value="quantity">Qtd (Quantidade)</option>
        </select>
      </div>

      {/* "por" separator */}
      <span className={styles.comparisonSeparator}>por</span>

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

      {/* Include zeros checkbox */}
      <div className={styles.checkboxField}>
        <input
          type="checkbox"
          id={`include-zeros-${depth}`}
          checked={condition.includeZeros}
          onChange={handleIncludeZerosChange}
        />
        <label htmlFor={`include-zeros-${depth}`}>
          Incluir zeros
        </label>
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

export default RankingConditionRow
