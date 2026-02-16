import { X } from 'lucide-react'
import styles from './MetricFilterChip.module.css'
import { formatFilterLabel } from '../../utils/metricFilters'
import type { MetricFilter } from '../../types/filters'

interface MetricFilterChipProps {
  /** O filtro a ser exibido */
  filter: MetricFilter
  /** Callback ao clicar no chip (para editar) */
  onClick?: () => void
  /** Callback ao clicar no X (para remover) */
  onRemove: () => void
}

/**
 * Chip que exibe um filtro de métrica ativo.
 * Clicável para editar, com botão X para remover.
 */
export function MetricFilterChip({ filter, onClick, onRemove }: MetricFilterChipProps) {
  const label = formatFilterLabel(filter)

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    onRemove()
  }

  return (
    <button
      type="button"
      className={styles.chip}
      onClick={onClick}
      aria-label={`Filtro: ${label}. Clique para editar.`}
    >
      <span className={styles.label}>{label}</span>
      <span
        role="button"
        tabIndex={0}
        className={styles.removeButton}
        onClick={handleRemove}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onRemove()
          }
        }}
        aria-label={`Remover filtro: ${label}`}
      >
        <X size={14} />
      </span>
    </button>
  )
}
