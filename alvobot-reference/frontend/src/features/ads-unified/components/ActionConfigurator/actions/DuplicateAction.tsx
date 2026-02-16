/**
 * DuplicateAction — duplicate
 *
 * Configures entity duplication with options for:
 * - Number of copies
 * - Name suffix
 * - Initial status of the duplicated entity
 */

import { useCallback } from 'react'
import type { DuplicateParams, ActionParams } from '../../../types/automation'
import styles from '../ActionConfigurator.module.css'

interface DuplicateActionProps {
  params: DuplicateParams
  onChange: (params: ActionParams) => void
}

export function DuplicateAction({ params, onChange }: DuplicateActionProps) {
  const handleChange = useCallback(
    (field: keyof DuplicateParams, value: string | number) => {
      onChange({ ...params, [field]: value })
    },
    [params, onChange],
  )

  return (
    <div className={styles.actionForm}>
      <div className={styles.row}>
        {/* Number of copies */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Número de cópias</label>
          <input
            type="number"
            className={styles.nativeInput}
            value={params.copies ?? 1}
            onChange={(e) =>
              handleChange('copies', e.target.value ? Number(e.target.value) : 1)
            }
            min={1}
            max={10}
            step={1}
          />
        </div>

        {/* Status of the original */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Status da cópia</label>
          <select
            className={styles.nativeSelect}
            value={params.status ?? 'paused'}
            onChange={(e) => handleChange('status', e.target.value)}
          >
            <option value="paused">Pausada</option>
            <option value="active">Ativa</option>
          </select>
          <span className={styles.fieldHint}>
            Status inicial da entidade duplicada
          </span>
        </div>
      </div>

      {/* Name suffix */}
      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>Sufixo do nome</label>
        <input
          type="text"
          className={styles.nativeInput}
          value={params.nameSuffix ?? ''}
          onChange={(e) => handleChange('nameSuffix', e.target.value)}
          placeholder=" - Cópia"
        />
        <span className={styles.fieldHint}>
          Texto adicionado ao final do nome da cópia
        </span>
      </div>
    </div>
  )
}
