/**
 * NameAction — add_to_name / remove_from_name / replace_in_name
 *
 * Configures name manipulation actions.
 * - add_to_name: text + position (prefix/suffix)
 * - remove_from_name: text to remove
 * - replace_in_name: find text + replace with text
 */

import { useCallback } from 'react'
import type { AutomationActionType, NameActionParams, ActionParams } from '../../../types/automation'
import styles from '../ActionConfigurator.module.css'

// ============================================================================
// TYPES
// ============================================================================

type NameActionType = Extract<AutomationActionType, 'add_to_name' | 'remove_from_name' | 'replace_in_name'>

interface NameActionComponentProps {
  action: NameActionType
  params: NameActionParams
  onChange: (params: ActionParams) => void
}

// ============================================================================
// COMPONENT
// ============================================================================

export function NameAction({ action, params, onChange }: NameActionComponentProps) {
  const handleChange = useCallback(
    (field: keyof NameActionParams, value: string) => {
      onChange({ ...params, [field]: value })
    },
    [params, onChange],
  )

  if (action === 'add_to_name') {
    return (
      <div className={styles.actionForm}>
        <div className={styles.row}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Texto a adicionar</label>
            <input
              type="text"
              className={styles.nativeInput}
              value={params.text}
              onChange={(e) => handleChange('text', e.target.value)}
              placeholder="Ex: [PAUSADO] "
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Posição</label>
            <select
              className={styles.nativeSelect}
              value={params.position ?? 'suffix'}
              onChange={(e) => handleChange('position', e.target.value)}
            >
              <option value="prefix">Prefixo (início do nome)</option>
              <option value="suffix">Sufixo (final do nome)</option>
            </select>
          </div>
        </div>

        <span className={styles.fieldHint}>
          {params.position === 'prefix'
            ? `Resultado: "${params.text || '...'}Nome da Entidade"`
            : `Resultado: "Nome da Entidade${params.text || '...'}"`}
        </span>
      </div>
    )
  }

  if (action === 'remove_from_name') {
    return (
      <div className={styles.actionForm}>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Texto a remover</label>
          <input
            type="text"
            className={styles.nativeInput}
            value={params.text}
            onChange={(e) => handleChange('text', e.target.value)}
            placeholder="Ex: [PAUSADO] "
          />
          <span className={styles.fieldHint}>
            Todas as ocorrências deste texto serão removidas do nome
          </span>
        </div>
      </div>
    )
  }

  // replace_in_name
  return (
    <div className={styles.actionForm}>
      <div className={styles.row}>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Encontrar</label>
          <input
            type="text"
            className={styles.nativeInput}
            value={params.text}
            onChange={(e) => handleChange('text', e.target.value)}
            placeholder="Texto a ser encontrado"
          />
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Substituir por</label>
          <input
            type="text"
            className={styles.nativeInput}
            value={params.replaceWith ?? ''}
            onChange={(e) => handleChange('replaceWith', e.target.value)}
            placeholder="Texto de substituição"
          />
        </div>
      </div>

      <span className={styles.fieldHint}>
        Todas as ocorrências de &ldquo;{params.text || '...'}&rdquo; serão substituídas por &ldquo;
        {params.replaceWith || '...'}&rdquo;
      </span>
    </div>
  )
}
