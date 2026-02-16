/**
 * ExtendEndDateAction — extend_end_date
 *
 * Extends the end date of a campaign/adset by a specified number of days.
 */

import { useCallback } from 'react'
import type { ExtendEndDateParams, ActionParams } from '../../../types/automation'
import styles from '../ActionConfigurator.module.css'

interface ExtendEndDateActionProps {
  params: ExtendEndDateParams
  onChange: (params: ActionParams) => void
}

export function ExtendEndDateAction({ params, onChange }: ExtendEndDateActionProps) {
  const handleDaysChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...params, days: e.target.value ? Number(e.target.value) : 0 })
    },
    [params, onChange],
  )

  return (
    <div className={styles.actionForm}>
      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>Estender por (dias)</label>
        <input
          type="number"
          className={styles.nativeInput}
          value={params.days || ''}
          onChange={handleDaysChange}
          placeholder="7"
          min={1}
          max={365}
          step={1}
        />
        <span className={styles.fieldHint}>
          A data de encerramento será estendida em {params.days || 0} dia
          {(params.days || 0) !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  )
}
