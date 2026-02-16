/**
 * Flow UTM Toggle Component
 *
 * Toggle for enabling/disabling automatic UTM tracking on flow links.
 * Displayed in the flow editor header.
 */

import { memo } from 'react'
import { Link2, Link2Off, Info } from 'lucide-react'
import styles from './FlowUtmToggle.module.css'

interface FlowUtmToggleProps {
  enabled: boolean
  onChange: (enabled: boolean) => void
  disabled?: boolean
}

export const FlowUtmToggle = memo(function FlowUtmToggle({
  enabled,
  onChange,
  disabled = false,
}: FlowUtmToggleProps) {
  const handleToggle = () => {
    if (!disabled) {
      onChange(!enabled)
    }
  }

  return (
    <div className={styles.container}>
      <button
        type="button"
        className={`${styles.toggle} ${enabled ? styles.enabled : styles.disabled}`}
        onClick={handleToggle}
        disabled={disabled}
        title={
          enabled
            ? 'UTM automático ativado - clique para desativar'
            : 'UTM automático desativado - clique para ativar'
        }
      >
        {enabled ? <Link2 size={16} /> : <Link2Off size={16} />}
        <span className={styles.label}>UTM</span>
        <span className={`${styles.status} ${enabled ? styles.on : styles.off}`}>
          {enabled ? 'ON' : 'OFF'}
        </span>
      </button>

      <div className={styles.tooltip}>
        <Info size={14} className={styles.tooltipIcon} />
        <div className={styles.tooltipContent}>
          <strong>UTM Automático</strong>
          <p>
            Quando ativado, parâmetros UTM são adicionados automaticamente aos links dos botões para
            rastreamento de conversões.
          </p>
          <p className={styles.tooltipParams}>
            utm_source, utm_campaign, utm_medium, utm_content, utm_term, xcod
          </p>
        </div>
      </div>
    </div>
  )
})
