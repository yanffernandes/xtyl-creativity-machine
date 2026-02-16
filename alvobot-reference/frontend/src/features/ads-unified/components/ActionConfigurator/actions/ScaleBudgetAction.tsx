/**
 * ScaleBudgetAction — scale_budget_by_target
 *
 * Dynamically scales budget based on a target metric value.
 * E.g., adjust budget proportionally to maintain a CPA of R$ 30.
 */

import { useCallback } from 'react'
import { Info } from 'lucide-react'
import type { ScaleBudgetParams, ActionParams, Platform } from '../../../types/automation'
import styles from '../ActionConfigurator.module.css'

// ============================================================================
// METRIC OPTIONS
// ============================================================================

const SCALE_TARGET_METRICS = [
  { value: 'cpa', label: 'CPA (Custo por Aquisição)' },
  { value: 'roas', label: 'ROAS (Retorno sobre Gasto)' },
  { value: 'cpc', label: 'CPC (Custo por Clique)' },
  { value: 'cpm', label: 'CPM (Custo por 1000 Impressões)' },
  { value: 'ctr', label: 'CTR (Taxa de Clique)' },
  { value: 'cost_per_lead', label: 'CPL (Custo por Lead)' },
]

// ============================================================================
// TYPES
// ============================================================================

interface ScaleBudgetActionProps {
  params: ScaleBudgetParams
  onChange: (params: ActionParams) => void
  platform: Platform
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ScaleBudgetAction({ params, onChange }: ScaleBudgetActionProps) {
  const handleChange = useCallback(
    (field: keyof ScaleBudgetParams, value: string | number | undefined) => {
      onChange({ ...params, [field]: value })
    },
    [params, onChange],
  )

  return (
    <div className={styles.actionForm}>
      {/* Target metric + target value */}
      <div className={styles.row}>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Métrica alvo</label>
          <select
            className={styles.nativeSelect}
            value={params.targetMetric}
            onChange={(e) => handleChange('targetMetric', e.target.value)}
          >
            <option value="" disabled>
              Selecione...
            </option>
            {SCALE_TARGET_METRICS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Valor alvo</label>
          <div className={styles.inputWrapper}>
            <span className={styles.inputPrefix}>R$</span>
            <input
              type="number"
              className={`${styles.nativeInput} ${styles.inputWithPrefix}`}
              value={params.targetValue || ''}
              onChange={(e) =>
                handleChange('targetValue', e.target.value ? Number(e.target.value) : 0)
              }
              placeholder="0,00"
              min={0}
              step={0.01}
            />
          </div>
        </div>
      </div>

      {/* Max increase / decrease percentages */}
      <div className={styles.row}>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Aumento máximo por execução</label>
          <div className={styles.inputWrapper}>
            <input
              type="number"
              className={`${styles.nativeInput} ${styles.inputWithSuffix}`}
              value={params.maxIncreasePercent ?? ''}
              onChange={(e) =>
                handleChange('maxIncreasePercent', e.target.value ? Number(e.target.value) : 0)
              }
              placeholder="30"
              min={0}
              max={100}
              step={1}
            />
            <span className={styles.inputSuffix}>%</span>
          </div>
          <span className={styles.fieldHint}>
            Limite máximo de aumento do budget por execução
          </span>
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Redução máxima por execução</label>
          <div className={styles.inputWrapper}>
            <input
              type="number"
              className={`${styles.nativeInput} ${styles.inputWithSuffix}`}
              value={params.maxDecreasePercent ?? ''}
              onChange={(e) =>
                handleChange('maxDecreasePercent', e.target.value ? Number(e.target.value) : 0)
              }
              placeholder="20"
              min={0}
              max={100}
              step={1}
            />
            <span className={styles.inputSuffix}>%</span>
          </div>
          <span className={styles.fieldHint}>
            Limite máximo de redução do budget por execução
          </span>
        </div>
      </div>

      {/* Min / Max budget guardrails */}
      <div className={styles.row}>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Budget mínimo (opcional)</label>
          <div className={styles.inputWrapper}>
            <span className={styles.inputPrefix}>R$</span>
            <input
              type="number"
              className={`${styles.nativeInput} ${styles.inputWithPrefix}`}
              value={params.minBudget ?? ''}
              onChange={(e) =>
                handleChange('minBudget', e.target.value ? Number(e.target.value) : undefined)
              }
              placeholder="Sem limite"
              min={0}
              step={0.01}
            />
          </div>
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Budget máximo (opcional)</label>
          <div className={styles.inputWrapper}>
            <span className={styles.inputPrefix}>R$</span>
            <input
              type="number"
              className={`${styles.nativeInput} ${styles.inputWithPrefix}`}
              value={params.maxBudget ?? ''}
              onChange={(e) =>
                handleChange('maxBudget', e.target.value ? Number(e.target.value) : undefined)
              }
              placeholder="Sem limite"
              min={0}
              step={0.01}
            />
          </div>
        </div>
      </div>

      {/* Info */}
      <div className={styles.infoBanner}>
        <Info className={styles.infoBannerIcon} />
        <span className={styles.infoBannerText}>
          O budget será ajustado proporcionalmente para atingir o{' '}
          {params.targetMetric?.toUpperCase() || 'alvo'} de R${' '}
          {params.targetValue || '0'}. O ajuste por execução será limitado entre{' '}
          -{params.maxDecreasePercent || 0}% e +{params.maxIncreasePercent || 0}%.
        </span>
      </div>
    </div>
  )
}
