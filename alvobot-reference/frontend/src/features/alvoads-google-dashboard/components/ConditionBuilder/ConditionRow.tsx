/**
 * ConditionRow Component
 * T057: Individual condition row with metric, operator, and value inputs
 */

import { Select, Input, Button } from '@/shared/components'
import styles from './ConditionBuilder.module.css'
import type { Condition, MetricType, ConditionOperator } from '../../types'

interface ConditionRowProps {
  condition: Condition & { id: string }
  onUpdate: (updates: Partial<Condition>) => void
  onRemove: () => void
  canRemove: boolean
}

// Metric options with labels in Portuguese
const METRIC_OPTIONS = [
  { value: 'impressions', label: 'Impressões' },
  { value: 'clicks', label: 'Cliques' },
  { value: 'ctr', label: 'CTR (%)' },
  { value: 'cost', label: 'Custo (R$)' },
  { value: 'conversions', label: 'Conversões' },
  { value: 'cpa', label: 'CPA (R$)' },
  { value: 'roas', label: 'ROAS' },
  { value: 'budget_spent_percent', label: 'Orçamento gasto (%)' },
  { value: 'runtime_hours', label: 'Tempo de execução (h)' },
]

// Operator options
const OPERATOR_OPTIONS = [
  { value: '>', label: 'maior que' },
  { value: '<', label: 'menor que' },
  { value: '>=', label: 'maior ou igual a' },
  { value: '<=', label: 'menor ou igual a' },
  { value: '==', label: 'igual a' },
  { value: '!=', label: 'diferente de' },
]

// Get appropriate step and placeholder based on metric
const getInputConfig = (metric: MetricType) => {
  switch (metric) {
    case 'ctr':
    case 'budget_spent_percent':
      return { step: '0.1', placeholder: '0.0', suffix: '%' }
    case 'cost':
    case 'cpa':
      return { step: '0.01', placeholder: '0.00', prefix: 'R$' }
    case 'roas':
      return { step: '0.1', placeholder: '0.0', suffix: 'x' }
    case 'runtime_hours':
      return { step: '1', placeholder: '0', suffix: 'h' }
    default:
      return { step: '1', placeholder: '0' }
  }
}

export function ConditionRow({
  condition,
  onUpdate,
  onRemove,
  canRemove,
}: ConditionRowProps) {
  const inputConfig = getInputConfig(condition.metric)

  return (
    <div className={styles.conditionRow}>
      <Select
        value={condition.metric}
        onChange={(e) => onUpdate({ metric: e.target.value as MetricType })}
        className={styles.metricSelect}
        options={METRIC_OPTIONS}
      />

      <Select
        value={condition.operator}
        onChange={(e) => onUpdate({ operator: e.target.value as ConditionOperator })}
        className={styles.operatorSelect}
        options={OPERATOR_OPTIONS}
      />

      <div className={styles.valueInputWrapper}>
        {inputConfig.prefix && (
          <span className={styles.inputPrefix}>{inputConfig.prefix}</span>
        )}
        <Input
          type="number"
          value={condition.value}
          onChange={(e) => onUpdate({ value: parseFloat(e.target.value) || 0 })}
          step={inputConfig.step}
          placeholder={inputConfig.placeholder}
          className={styles.valueInput}
        />
        {inputConfig.suffix && (
          <span className={styles.inputSuffix}>{inputConfig.suffix}</span>
        )}
      </div>

      {canRemove && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className={styles.removeButton}
          aria-label="Remover condição"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M4 4L12 12M4 12L12 4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </Button>
      )}
    </div>
  )
}

export default ConditionRow
