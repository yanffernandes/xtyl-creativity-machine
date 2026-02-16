/**
 * BudgetAction — increase_budget / decrease_budget
 *
 * Configures percentage-based budget changes with optional min/max floors/ceilings.
 */

import { useCallback } from 'react'
import { Info } from 'lucide-react'
import type { AutomationActionType, BudgetChangeParams, ActionParams } from '../../../types/automation'
import styles from '../ActionConfigurator.module.css'

interface BudgetActionProps {
  action: Extract<AutomationActionType, 'increase_budget' | 'decrease_budget'>
  params: BudgetChangeParams
  onChange: (params: ActionParams) => void
}

export function BudgetAction({ action, params, onChange }: BudgetActionProps) {
  const isIncrease = action === 'increase_budget'

  const handleChange = useCallback(
    (field: keyof BudgetChangeParams, value: number | undefined) => {
      onChange({ ...params, [field]: value })
    },
    [params, onChange],
  )

  const infoText = `O budget será ${isIncrease ? 'aumentado' : 'diminuído'} em ${params.percentage || 0}%${
    params.minBudget != null ? `. Budget mínimo: R$ ${params.minBudget}` : ''
  }${params.maxBudget != null ? `. Budget máximo: R$ ${params.maxBudget}` : ''}.`

  return (
    <div className={styles.actionForm}>
      {/* Percentage */}
      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>
          Percentual de {isIncrease ? 'aumento' : 'redução'}
        </label>
        <div className={styles.inputWrapper}>
          <input
            type="number"
            className={`${styles.nativeInput} ${styles.inputWithSuffix}`}
            value={params.percentage ?? ''}
            onChange={(e) => handleChange('percentage', e.target.value ? Number(e.target.value) : 0)}
            placeholder="20"
            min={0}
            max={100}
            step={1}
          />
          <span className={styles.inputSuffix}>%</span>
        </div>
      </div>

      {/* Min / Max budget */}
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
          <span className={styles.fieldHint}>Impede que o budget fique abaixo deste valor</span>
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
          <span className={styles.fieldHint}>Impede que o budget ultrapasse este valor</span>
        </div>
      </div>

      {/* Info banner */}
      <div className={styles.infoBanner}>
        <Info className={styles.infoBannerIcon} />
        <span className={styles.infoBannerText}>{infoText}</span>
      </div>
    </div>
  )
}
