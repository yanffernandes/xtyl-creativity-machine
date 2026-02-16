/**
 * SetBudgetAction — set_budget
 *
 * Sets an absolute budget value.
 */

import { useCallback } from 'react'
import type { SetBudgetParams, ActionParams } from '../../../types/automation'
import styles from '../ActionConfigurator.module.css'

interface SetBudgetActionProps {
  params: SetBudgetParams
  onChange: (params: ActionParams) => void
}

export function SetBudgetAction({ params, onChange }: SetBudgetActionProps) {
  const handleAmountChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...params, amount: e.target.value ? Number(e.target.value) : 0 })
    },
    [params, onChange],
  )

  return (
    <div className={styles.actionForm}>
      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>Valor do budget</label>
        <div className={styles.inputWrapper}>
          <span className={styles.inputPrefix}>R$</span>
          <input
            type="number"
            className={`${styles.nativeInput} ${styles.inputWithPrefix}`}
            value={params.amount || ''}
            onChange={handleAmountChange}
            placeholder="0,00"
            min={0}
            step={0.01}
          />
        </div>
        <span className={styles.fieldHint}>
          O budget será definido para este valor fixo
        </span>
      </div>
    </div>
  )
}
